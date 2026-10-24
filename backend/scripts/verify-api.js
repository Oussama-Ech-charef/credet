'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const Database = require('better-sqlite3');

const { initDatabase, getDb, closeDatabase } = require('../src/db/database');
const { roundMoney } = require('../src/utils/money');
const pdfService = require('../src/services/pdfService');
const reportService = require('../src/services/reportService');
const templateService = require('../src/services/templateService');

const backendRoot = path.resolve(__dirname, '..');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'credet-verify-'));
const databasePath = path.join(temporaryDirectory, 'nested', 'credet-verify.db');

let server = null;
let baseUrl = '';
let checkCount = 0;

async function check(name, handler) {
  try {
    await handler();
    checkCount += 1;
    console.log(`[PASS] ${name}`);
  } catch (error) {
    console.error(`[FAIL] ${name}`);
    throw error;
  }
}

async function request(method, endpoint, body, options = {}) {
  const headers = { ...(options.headers || {}) };
  let payload;

  if (body !== undefined) {
    if (options.rawBody) {
      payload = body;
    } else {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      payload = JSON.stringify(body);
    }
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    body: payload,
  });

  const contentType = response.headers.get('content-type') || '';
  let data;

  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = Buffer.from(await response.arrayBuffer());
  }

  return {
    status: response.status,
    headers: response.headers,
    data,
  };
}

function sumMoney(values) {
  const cents = values.reduce(
    (total, value) => total + Math.round(Number(value) * 100),
    0,
  );

  return cents / 100;
}

const ARABIC_TEXT_PATTERN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

async function inspectPdf(buffer, pagesToRead = 1) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const document = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: true,
    verbosity: 0,
  }).promise;

  try {
    const pageCount = document.numPages;
    const firstPage = await document.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1 });
    const texts = [];

    for (let pageNumber = 1; pageNumber <= Math.min(pageCount, pagesToRead); pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      texts.push(textContent.items.map((item) => item.str).join(''));
    }

    return {
      pageCount,
      width: viewport.width,
      height: viewport.height,
      texts,
    };
  } finally {
    await document.destroy();
  }
}

function assertPdfResponse(response, dispositionPattern) {
  assert.equal(response.status, 200);
  assert.ok(Buffer.isBuffer(response.data));
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.match(
    response.headers.get('content-disposition') || '',
    dispositionPattern,
  );
  assert.equal(
    Number(response.headers.get('content-length')),
    response.data.length,
  );
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(
    response.headers.get('access-control-expose-headers') || '',
    /Content-Disposition/i,
  );
  assert.equal(response.data.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.match(response.data.toString('latin1').trimEnd(), /%%EOF$/);
  assert.ok(response.data.length > 10_000);
  assert.match(response.data.toString('latin1'), /Cairo/);
}

function assertA4Pdf(inspection) {
  assert.ok(
    Math.abs(inspection.width - 595.28) < 2,
    `unexpected PDF width: ${inspection.width}`,
  );
  assert.ok(
    Math.abs(inspection.height - 841.89) < 2,
    `unexpected PDF height: ${inspection.height}`,
  );
}

async function startServer() {
  initDatabase(databasePath);

  const app = require('../src/app');

  server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    instance.on('error', reject);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function stopServer() {
  if (!server) {
    return;
  }

  const currentServer = server;
  server = null;

  await new Promise((resolve, reject) => {
    currentServer.close((error) => (error ? reject(error) : resolve()));
  });
}

async function cleanup() {
  try {
    await stopServer();
  } catch (error) {
    console.error(`[cleanup] ${error.message}`);
  }

  try {
    await pdfService.closePdfEngine();
  } catch (error) {
    console.error(`[cleanup] ${error.message}`);
  }

  try {
    closeDatabase();
  } catch (error) {
    console.error(`[cleanup] ${error.message}`);
  }

  try {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  } catch (error) {
    console.error(`[cleanup] ${error.message}`);
  }
}

async function main() {
  await startServer();

  const db = getDb();
  const today = db.prepare("SELECT DATE('now') AS today").get().today;
  const clients = {};
  const entries = {};

  await check('database opens in WAL mode with foreign keys and NORMAL synchronous', () => {
    assert.equal(
      String(db.pragma('journal_mode', { simple: true })).toLowerCase(),
      'wal',
    );
    assert.equal(Number(db.pragma('foreign_keys', { simple: true })), 1);
    assert.equal(Number(db.pragma('synchronous', { simple: true })), 1);
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
    assert.equal(initDatabase(databasePath), db);
    assert.equal(fs.existsSync(path.dirname(databasePath)), true);
    assert.equal(fs.existsSync(databasePath), true);
  });

  await check('schema creates tables, indexes, and the default settings row', () => {
    const tableNames = db
      .prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name IN ('clients', 'credit_entries', 'app_settings')
        ORDER BY name
      `)
      .all()
      .map((row) => row.name);

    assert.deepEqual(tableNames, ['app_settings', 'clients', 'credit_entries']);

    const indexNames = db
      .prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'index'
          AND name IN (
            'idx_clients_name',
            'idx_clients_phone',
            'idx_entries_client_id',
            'idx_entries_operation_date'
          )
        ORDER BY name
      `)
      .all()
      .map((row) => row.name);

    assert.deepEqual(indexNames, [
      'idx_clients_name',
      'idx_clients_phone',
      'idx_entries_client_id',
      'idx_entries_operation_date',
    ]);

    const settings = db.prepare('SELECT * FROM app_settings WHERE id = 1').get();
    assert.ok(settings);
    assert.equal(settings.shop_name, 'Credet Shop');
    assert.equal(settings.currency, 'DH');
    assert.equal(settings.pin_code, null);
  });

  await check('empty database returns empty collections and zeroed stats', async () => {
    let response = await request('GET', '/api/clients');
    assert.equal(response.status, 200);
    assert.deepEqual(response.data, []);

    response = await request('GET', '/api/stats/overview');
    assert.equal(response.status, 200);
    assert.deepEqual(response.data, {
      total_debtors: 0,
      total_receivable_amount: 0,
      total_collected_today: 0,
      recent_activity: [],
    });

    response = await request('POST', '/api/backup/export-json');
    assert.equal(response.status, 200);
    assert.deepEqual(response.data, { clients: [], entries: [] });
  });

  await check('HTTP errors are JSON and do not leak internal details', async () => {
    let response = await request('GET', '/api/does-not-exist');
    assert.equal(response.status, 404);
    assert.deepEqual(response.data, { error: 'Not found' });

    response = await request('POST', '/api/clients', '{"name":', {
      rawBody: true,
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(response.status, 400);
    assert.equal(response.data.error, 'Invalid JSON body');

    response = await request('POST', '/api/clients', {
      name: 'x'.repeat(120 * 1024),
    });
    assert.equal(response.status, 413);
    assert.equal(response.data.error, 'Request body is too large');
  });

  await check('CORS headers support web and mobile clients and preflight', async () => {
    let response = await request('GET', '/api/clients', undefined, {
      headers: { Origin: 'http://localhost:3000' },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.match(
      response.headers.get('access-control-expose-headers') || '',
      /Content-Disposition/i,
    );

    const preflight = await fetch(`${baseUrl}/api/clients`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
  });

  await check('empty database backup is a valid SQLite snapshot', async () => {
    const response = await request('GET', '/api/backup/download');
    assert.equal(response.status, 200);
    assert.ok(Buffer.isBuffer(response.data));
    assert.equal(
      response.data.subarray(0, 16).toString('utf8'),
      'SQLite format 3\u0000',
    );
    assert.match(response.headers.get('content-disposition') || '', /credet\.db/);

    const emptyBackupPath = path.join(temporaryDirectory, 'empty-backup.db');
    fs.writeFileSync(emptyBackupPath, response.data);

    const backupDb = new Database(emptyBackupPath, {
      readonly: true,
      fileMustExist: true,
    });

    assert.equal(
      backupDb.prepare('SELECT COUNT(*) AS count FROM clients').get().count,
      0,
    );
    assert.equal(
      backupDb.prepare('SELECT COUNT(*) AS count FROM credit_entries').get().count,
      0,
    );
    backupDb.close();
  });

  await check('client validation rejects malformed payloads', async () => {
    const invalidPayloads = [
      {},
      { name: '   ' },
      { name: 123 },
      { name: 'x'.repeat(151) },
      { name: 'Valid', phone: 123 },
      { name: 'Valid', address: {} },
      { name: 'Valid', notes: [] },
    ];

    for (const payload of invalidPayloads) {
      const response = await request('POST', '/api/clients', payload);
      assert.equal(response.status, 400, JSON.stringify(payload));
      assert.equal(typeof response.data.error, 'string');
    }

    let response = await request('POST', '/api/clients', []);
    assert.equal(response.status, 400);
    assert.equal(response.data.error, 'Request body must be a JSON object');

    response = await request('GET', '/api/clients/not-a-number');
    assert.equal(response.status, 400);

    response = await request('GET', '/api/clients/999999');
    assert.equal(response.status, 404);
    assert.equal(response.data.error, 'Client not found');

    response = await request('GET', '/api/clients');
    assert.deepEqual(response.data, []);
  });

  await check('clients are created with UTF-8 text and zero balances', async () => {
    const payloads = {
      alice: {
        name: 'Alice Martin',
        phone: '0600000001',
        address: 'Casablanca',
        notes: 'Regular customer',
      },
      bob: {
        name: 'Bob Advance',
        phone: '0600000002',
        address: 'Rabat',
      },
      mohamed: {
        name: 'محمد العلمي',
        phone: '+212 6 11 22 33 44',
        address: 'حي المسيرة، الدار البيضاء',
        notes: 'زبون دائم',
      },
      percent: {
        name: 'Percent % Shop',
        phone: '0600000004',
        address: 'Safe_Street',
      },
      empty: {
        name: 'Empty Ledger',
      },
    };

    for (const [key, payload] of Object.entries(payloads)) {
      const response = await request('POST', '/api/clients', payload);
      assert.equal(response.status, 201);
      assert.ok(Number.isInteger(response.data.id) && response.data.id > 0);
      assert.equal(response.data.name, payload.name);
      assert.equal(response.data.is_archived, false);
      assert.equal(typeof response.data.created_at, 'string');
      assert.equal(typeof response.data.updated_at, 'string');
      clients[key] = response.data;
    }

    assert.equal(clients.empty.phone, null);
    assert.equal(clients.empty.address, null);
    assert.equal(clients.empty.notes, null);
    assert.equal(clients.mohamed.name, 'محمد العلمي');

    const list = await request('GET', '/api/clients');
    assert.equal(list.status, 200);
    assert.equal(list.data.length, 5);

    for (const client of list.data) {
      assert.equal(client.total_debt, 0);
      assert.equal(client.total_paid, 0);
      assert.equal(client.current_balance, 0);
      assert.equal(client.entries_count, 0);
      assert.equal(client.last_operation_date, null);
    }

    const detail = await request('GET', `/api/clients/${clients.alice.id}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.data.client.id, clients.alice.id);
    assert.equal(detail.data.client.name, 'Alice Martin');
    assert.equal(detail.data.total_debt, 0);
    assert.equal(detail.data.total_paid, 0);
    assert.equal(detail.data.current_balance, 0);
  });

  await check('real-time search matches name, phone, address, and literal wildcards', async () => {
    async function search(term, status) {
      const query = new URLSearchParams({ search: term });

      if (status) {
        query.set('status', status);
      }

      const response = await request('GET', `/api/clients?${query.toString()}`);
      assert.equal(response.status, 200);
      return response.data;
    }

    let results = await search('alice');
    assert.deepEqual(results.map((client) => client.id), [clients.alice.id]);

    results = await search('0600000002');
    assert.deepEqual(results.map((client) => client.id), [clients.bob.id]);

    results = await search('المسيرة');
    assert.deepEqual(results.map((client) => client.id), [clients.mohamed.id]);

    results = await search('%');
    assert.deepEqual(results.map((client) => client.id), [clients.percent.id]);

    results = await search('_');
    assert.deepEqual(results.map((client) => client.id), [clients.percent.id]);

    results = await search("' OR 1=1 --");
    assert.deepEqual(results, []);

    results = await search('no-such-client');
    assert.deepEqual(results, []);

    assert.equal((await search('', 'all')).length, 5);
    assert.equal((await search('', 'debt')).length, 0);
    assert.equal((await search('', 'settled')).length, 5);
    assert.equal((await search('alice', 'settled')).length, 1);

    const response = await request('GET', '/api/clients?status=archived');
    assert.equal(response.status, 400);
    assert.equal(response.data.error, 'status must be all, debt, or settled');
  });

  await check('client updates support partial data, clearing fields, and validation', async () => {
    let response = await request('PUT', `/api/clients/${clients.alice.id}`, {
      phone: '0600000099',
      notes: 'Updated note',
    });
    assert.equal(response.status, 200);
    assert.equal(response.data.success, true);
    assert.equal(response.data.client.phone, '0600000099');
    assert.equal(response.data.client.notes, 'Updated note');
    assert.equal(response.data.client.name, 'Alice Martin');

    response = await request('PUT', `/api/clients/${clients.alice.id}`, {
      name: '  Alice Martin  ',
    });
    assert.equal(response.status, 200);
    assert.equal(response.data.client.name, 'Alice Martin');

    response = await request('PUT', `/api/clients/${clients.alice.id}`, {
      phone: null,
    });
    assert.equal(response.status, 200);
    assert.equal(response.data.client.phone, null);

    response = await request('PUT', `/api/clients/${clients.alice.id}`, {});
    assert.equal(response.status, 400);

    response = await request('PUT', `/api/clients/${clients.alice.id}`, {
      name: '',
    });
    assert.equal(response.status, 400);

    response = await request('PUT', `/api/clients/${clients.alice.id}`, {
      unknown: 'field',
    });
    assert.equal(response.status, 400);

    response = await request('PUT', '/api/clients/999999', { name: 'Ghost' });
    assert.equal(response.status, 404);

    response = await request('DELETE', '/api/clients/999999');
    assert.equal(response.status, 404);

    response = await request('PUT', `/api/clients/${clients.alice.id}`, {
      phone: '0600000001',
    });
    assert.equal(response.status, 200);
    assert.equal(response.data.client.phone, '0600000001');
  });

  await check('entry validation rejects malformed payloads and bad dates', async () => {
    const base = {
      operation_type: 'DEBT',
      amount: 10,
      description: 'Test entry',
    };

    const invalidPayloads = [
      { amount: 10, description: 'Missing type' },
      { ...base, operation_type: 'LOAN' },
      { ...base, operation_type: null },
      { ...base, amount: 0 },
      { ...base, amount: -5 },
      { ...base, amount: 'abc' },
      { ...base, amount: null },
      { ...base, amount: 0.001 },
      { ...base, description: undefined },
      { ...base, description: '   ' },
      { ...base, operation_date: '2026-02-30' },
      { ...base, operation_date: '01/01/2026' },
      { ...base, operation_date: null },
      { ...base, note: 'x'.repeat(2001) },
    ];

    for (const payload of invalidPayloads) {
      const response = await request(
        'POST',
        `/api/clients/${clients.alice.id}/entries`,
        payload,
      );
      assert.equal(response.status, 400, JSON.stringify(payload));
    }

    let response = await request(
      'POST',
      '/api/clients/999999/entries',
      base,
    );
    assert.equal(response.status, 404);
    assert.equal(response.data.error, 'Client not found');

    response = await request('GET', `/api/clients/${clients.alice.id}/entries`);
    assert.deepEqual(response.data, []);

    response = await request('GET', '/api/clients/999999/entries');
    assert.equal(response.status, 404);

    response = await request(
      'GET',
      `/api/clients/${clients.alice.id}/entries?from=2026-13-01`,
    );
    assert.equal(response.status, 400);

    response = await request(
      'GET',
      `/api/clients/${clients.alice.id}/entries?from=2026-02-01&to=2026-01-01`,
    );
    assert.equal(response.status, 400);

    response = await request('PUT', '/api/entries/999999', { amount: 1 });
    assert.equal(response.status, 404);

    response = await request('DELETE', '/api/entries/999999');
    assert.equal(response.status, 404);

    response = await request('PUT', '/api/entries/not-a-number', { amount: 1 });
    assert.equal(response.status, 400);
  });

  await check('debts and payments calculate balances with decimal precision', async () => {
    let response = await request(
      'POST',
      `/api/clients/${clients.alice.id}/entries`,
      {
        operation_type: 'DEBT',
        amount: 100.1,
        description: 'Invoice A-1',
        operation_date: '2026-01-10',
      },
    );
    assert.equal(response.status, 201);
    assert.equal(response.data.amount, 100.1);
    assert.equal(response.data.total_debt, 100.1);
    assert.equal(response.data.total_paid, 0);
    assert.equal(response.data.current_balance, 100.1);
    entries.aliceDebt = response.data;

    response = await request(
      'POST',
      `/api/clients/${clients.alice.id}/entries`,
      {
        operation_type: 'PAYMENT',
        amount: 50.05,
        description: 'Payment A-1',
        operation_date: '2026-01-15',
      },
    );
    assert.equal(response.status, 201);
    assert.equal(response.data.current_balance, 50.05);
    entries.alicePayment = response.data;

    response = await request(
      'POST',
      `/api/clients/${clients.alice.id}/entries`,
      {
        operation_type: 'PAYMENT',
        amount: 25.05,
        description: 'Payment A-2',
        operation_date: '2026-01-20',
      },
    );
    assert.equal(response.status, 201);
    assert.equal(response.data.current_balance, 25);
    entries.aliceSecondPayment = response.data;

    response = await request('GET', `/api/clients/${clients.alice.id}`);
    assert.equal(response.status, 200);
    assert.equal(response.data.total_debt, 100.1);
    assert.equal(response.data.total_paid, 75.1);
    assert.equal(response.data.current_balance, 25);
    assert.equal(response.data.client.entries_count, 3);

    response = await request(
      'GET',
      `/api/clients/${clients.alice.id}/entries`,
    );
    assert.equal(response.status, 200);
    assert.equal(response.data.length, 3);
    assert.deepEqual(
      response.data.map((entry) => entry.id),
      [
        entries.aliceDebt.id,
        entries.alicePayment.id,
        entries.aliceSecondPayment.id,
      ],
    );

    response = await request(
      'POST',
      `/api/clients/${clients.bob.id}/entries`,
      {
        operation_type: 'DEBT',
        amount: 0.1,
        description: 'Decimal one',
      },
    );
    assert.equal(response.status, 201);
    assert.equal(response.data.operation_date, today);
    entries.bobDebtOne = response.data;

    response = await request(
      'POST',
      `/api/clients/${clients.bob.id}/entries`,
      {
        operation_type: 'DEBT',
        amount: 0.2,
        description: 'Decimal two',
      },
    );
    assert.equal(response.status, 201);
    assert.equal(response.data.total_debt, 0.3);
    assert.equal(response.data.current_balance, 0.3);
    entries.bobDebtTwo = response.data;

    response = await request(
      'POST',
      `/api/clients/${clients.bob.id}/entries`,
      {
        operation_type: 'PAYMENT',
        amount: 10,
        description: 'Advance payment',
      },
    );
    assert.equal(response.status, 201);
    assert.equal(response.data.current_balance, -9.7);
    entries.bobPayment = response.data;

    response = await request('GET', `/api/clients/${clients.bob.id}`);
    assert.equal(response.data.current_balance, -9.7);
    assert.equal(response.data.total_debt, 0.3);
    assert.equal(response.data.total_paid, 10);
  });

  await check('amounts round half-up to two decimals and strings are accepted', async () => {
    let response = await request(
      'POST',
      `/api/clients/${clients.mohamed.id}/entries`,
      {
        operation_type: 'DEBT',
        amount: 10.005,
        description: 'Rounded amount',
      },
    );
    assert.equal(response.status, 201);
    assert.equal(response.data.amount, 10.01);
    assert.equal(response.data.current_balance, 10.01);
    entries.mohamedFirst = response.data;

    response = await request(
      'POST',
      `/api/clients/${clients.mohamed.id}/entries`,
      {
        operation_type: 'DEBT',
        amount: '12.34',
        description: "O'Brien & sons <script>",
      },
    );
    assert.equal(response.status, 201);
    assert.equal(response.data.amount, 12.34);
    assert.equal(response.data.description, "O'Brien & sons <script>");
    assert.equal(response.data.current_balance, 22.35);
    entries.mohamedSecond = response.data;

    response = await request(
      'POST',
      `/api/clients/${clients.mohamed.id}/entries`,
      {
        operation_type: 'DEBT',
        amount: 0.005,
        description: 'Smallest rounded amount',
      },
    );
    assert.equal(response.status, 201);
    assert.equal(response.data.amount, 0.01);
    assert.equal(response.data.current_balance, 22.36);
    entries.mohamedThird = response.data;
  });

  await check('concurrent writes are serialized without losing entries', async () => {
    const responses = await Promise.all([
      request('POST', `/api/clients/${clients.empty.id}/entries`, {
        operation_type: 'DEBT',
        amount: 1.11,
        description: 'Concurrent one',
      }),
      request('POST', `/api/clients/${clients.empty.id}/entries`, {
        operation_type: 'DEBT',
        amount: 2.22,
        description: 'Concurrent two',
      }),
    ]);

    assert.deepEqual(
      responses.map((response) => response.status),
      [201, 201],
    );

    const detail = await request('GET', `/api/clients/${clients.empty.id}`);
    assert.equal(detail.data.total_debt, 3.33);
    assert.equal(detail.data.current_balance, 3.33);
    assert.equal(detail.data.client.entries_count, 2);
  });

  await check('ledger date filters are inclusive and validated', async () => {
    async function entriesFor(query) {
      const response = await request(
        'GET',
        `/api/clients/${clients.alice.id}/entries${query}`,
      );
      assert.equal(response.status, 200);
      return response.data;
    }

    let result = await entriesFor('?from=2026-01-15&to=2026-01-15');
    assert.deepEqual(
      result.map((entry) => entry.id),
      [entries.alicePayment.id],
    );

    result = await entriesFor('?from=2026-01-11');
    assert.deepEqual(
      result.map((entry) => entry.id),
      [entries.alicePayment.id, entries.aliceSecondPayment.id],
    );

    result = await entriesFor('?to=2026-01-15');
    assert.deepEqual(
      result.map((entry) => entry.id),
      [entries.aliceDebt.id, entries.alicePayment.id],
    );

    result = await entriesFor('?from=2026-02-01');
    assert.deepEqual(result, []);
  });

  await check('editing and deleting entries recalculates the balance immediately', async () => {
    let response = await request(
      'PUT',
      `/api/entries/${entries.aliceDebt.id}`,
      {
        amount: 60.1,
        description: 'Invoice A-1 corrected',
        note: 'Corrected after review',
        operation_date: '2026-01-12',
      },
    );
    assert.equal(response.status, 200);
    assert.equal(response.data.success, true);
    assert.equal(response.data.amount, 60.1);
    assert.equal(response.data.description, 'Invoice A-1 corrected');
    assert.equal(response.data.note, 'Corrected after review');
    assert.equal(response.data.operation_date, '2026-01-12');
    assert.equal(response.data.current_balance, -15);
    entries.aliceDebt = response.data;

    response = await request(
      'PUT',
      `/api/entries/${entries.aliceSecondPayment.id}`,
      { operation_type: 'DEBT' },
    );
    assert.equal(response.status, 200);
    assert.equal(response.data.operation_type, 'DEBT');
    assert.equal(response.data.total_debt, 85.15);
    assert.equal(response.data.total_paid, 50.05);
    assert.equal(response.data.current_balance, 35.1);
    entries.aliceSecondPayment = response.data;

    response = await request(
      'PUT',
      `/api/entries/${entries.aliceDebt.id}`,
      { operation_date: '2026-01-11' },
    );
    assert.equal(response.status, 200);
    assert.equal(response.data.operation_date, '2026-01-11');
    assert.equal(response.data.current_balance, 35.1);

    response = await request(
      'PUT',
      `/api/entries/${entries.aliceDebt.id}`,
      { note: null },
    );
    assert.equal(response.status, 200);
    assert.equal(response.data.note, null);

    for (const payload of [
      {},
      { unknown: true },
      { amount: 0 },
      { operation_type: 'LOAN' },
    ]) {
      response = await request(
        'PUT',
        `/api/entries/${entries.aliceDebt.id}`,
        payload,
      );
      assert.equal(response.status, 400, JSON.stringify(payload));
    }

    response = await request(
      'DELETE',
      `/api/entries/${entries.alicePayment.id}`,
    );
    assert.equal(response.status, 200);
    assert.equal(response.data.success, true);
    assert.equal(response.data.client_id, clients.alice.id);
    assert.equal(response.data.total_debt, 85.15);
    assert.equal(response.data.total_paid, 0);
    assert.equal(response.data.current_balance, 85.15);

    response = await request(
      'DELETE',
      `/api/entries/${entries.alicePayment.id}`,
    );
    assert.equal(response.status, 404);

    response = await request(
      'GET',
      `/api/clients/${clients.alice.id}/entries`,
    );
    assert.equal(response.data.length, 2);
  });

  await check('deleting a client cascades entries and preserves other clients', async () => {
    let response = await request('POST', '/api/clients', {
      name: 'Cascade Client',
    });
    assert.equal(response.status, 201);
    const cascadeClient = response.data;

    for (const amount of [5.55, 6.66]) {
      response = await request(
        'POST',
        `/api/clients/${cascadeClient.id}/entries`,
        {
          operation_type: 'DEBT',
          amount,
          description: 'Cascade entry',
        },
      );
      assert.equal(response.status, 201);
    }

    const before = db
      .prepare('SELECT COUNT(*) AS count FROM credit_entries')
      .get().count;

    response = await request(
      'DELETE',
      `/api/clients/${cascadeClient.id}`,
    );
    assert.equal(response.status, 200);
    assert.equal(response.data.success, true);
    assert.equal(response.data.deleted_entries, 2);

    const after = db
      .prepare('SELECT COUNT(*) AS count FROM credit_entries')
      .get().count;
    assert.equal(after, before - 2);
    assert.equal(
      db
        .prepare('SELECT COUNT(*) AS count FROM credit_entries WHERE client_id = ?')
        .get(cascadeClient.id).count,
      0,
    );

    response = await request('GET', `/api/clients/${cascadeClient.id}`);
    assert.equal(response.status, 404);

    response = await request(
      'DELETE',
      `/api/clients/${cascadeClient.id}`,
    );
    assert.equal(response.status, 404);

    const alice = await request('GET', `/api/clients/${clients.alice.id}`);
    assert.equal(alice.data.current_balance, 85.15);
  });

  await check('client status filters use dynamic balances', async () => {
    const all = (await request('GET', '/api/clients?status=all')).data;
    const debt = (await request('GET', '/api/clients?status=debt')).data;
    const settled = (await request('GET', '/api/clients?status=settled')).data;
    const sortIds = (items) => items
      .map((client) => client.id)
      .sort((left, right) => left - right);

    assert.equal(all.length, 5);
    assert.deepEqual(
      sortIds(debt),
      sortIds([clients.alice, clients.mohamed, clients.empty]),
    );
    assert.deepEqual(
      sortIds(settled),
      sortIds([clients.bob, clients.percent]),
    );
    assert.equal(debt.length + settled.length, all.length);
    assert.ok(settled.some((client) => client.current_balance < 0));
  });

  await check('stats overview reflects receivables, today payments, and recent activity', async () => {
    let response = await request('POST', '/api/clients', {
      name: 'Stats Client',
      phone: '0600000099',
    });
    assert.equal(response.status, 201);
    const statsClient = response.data;

    response = await request(
      'POST',
      `/api/clients/${statsClient.id}/entries`,
      {
        operation_type: 'DEBT',
        amount: 100,
        description: 'Stats debt',
      },
    );
    assert.equal(response.status, 201);
    const statsDebt = response.data;

    response = await request(
      'POST',
      `/api/clients/${statsClient.id}/entries`,
      {
        operation_type: 'PAYMENT',
        amount: 40,
        description: 'Stats payment',
      },
    );
    assert.equal(response.status, 201);
    const statsPayment = response.data;

    const allClients = (await request('GET', '/api/clients')).data;
    const expectedDebtors = allClients.filter(
      (client) => client.current_balance > 0,
    ).length;
    const expectedReceivable = sumMoney(
      allClients
        .filter((client) => client.current_balance > 0)
        .map((client) => client.current_balance),
    );
    const expectedCollectedToday = roundMoney(
      db
        .prepare(`
          SELECT COALESCE(SUM(e.amount), 0) AS total
          FROM credit_entries e
          JOIN clients c ON c.id = e.client_id
          WHERE e.operation_type = 'PAYMENT'
            AND e.operation_date = DATE('now')
            AND c.is_archived = 0
        `)
        .get().total,
    );

    response = await request('GET', '/api/stats/overview');
    assert.equal(response.status, 200);
    assert.equal(response.data.total_debtors, expectedDebtors);
    assert.equal(response.data.total_receivable_amount, expectedReceivable);
    assert.equal(response.data.total_collected_today, expectedCollectedToday);
    assert.ok(response.data.total_collected_today >= 40);
    assert.equal(response.data.recent_activity.length, 10);
    assert.equal(response.data.recent_activity[0].id, statsPayment.id);
    assert.equal(response.data.recent_activity[0].client_name, 'Stats Client');
    assert.equal(response.data.recent_activity[0].amount, 40);
    assert.equal(response.data.recent_activity[0].operation_type, 'PAYMENT');

    entries.stats = {
      client: statsClient,
      debt: statsDebt,
      payment: statsPayment,
    };
  });

  await check('SQLite backup downloads a consistent snapshot of committed data', async () => {
    const liveClientCount = db
      .prepare('SELECT COUNT(*) AS count FROM clients')
      .get().count;
    const liveEntryCount = db
      .prepare('SELECT COUNT(*) AS count FROM credit_entries')
      .get().count;

    const response = await request('GET', '/api/backup/download');
    assert.equal(response.status, 200);
    assert.ok(Buffer.isBuffer(response.data));
    assert.equal(
      response.data.subarray(0, 16).toString('utf8'),
      'SQLite format 3\u0000',
    );
    assert.match(response.headers.get('content-disposition') || '', /credet\.db/);

    const backupPath = path.join(temporaryDirectory, 'downloaded-credet.db');
    fs.writeFileSync(backupPath, response.data);

    const backupDb = new Database(backupPath, {
      readonly: true,
      fileMustExist: true,
    });

    assert.equal(backupDb.pragma('integrity_check', { simple: true }), 'ok');
    assert.equal(
      backupDb.prepare('SELECT COUNT(*) AS count FROM clients').get().count,
      liveClientCount,
    );
    assert.equal(
      backupDb.prepare('SELECT COUNT(*) AS count FROM credit_entries').get().count,
      liveEntryCount,
    );
    assert.equal(
      backupDb
        .prepare('SELECT amount FROM credit_entries WHERE id = ?')
        .get(entries.stats.payment.id).amount,
      40,
    );
    backupDb.close();
  });

  await check('JSON export contains every client and entry with exact values', async () => {
    const response = await request('POST', '/api/backup/export-json');
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.data.clients));
    assert.ok(Array.isArray(response.data.entries));
    assert.match(
      response.headers.get('content-disposition') || '',
      /credet-backup-.*\.json/,
    );

    const liveClientCount = db
      .prepare('SELECT COUNT(*) AS count FROM clients')
      .get().count;
    const liveEntryCount = db
      .prepare('SELECT COUNT(*) AS count FROM credit_entries')
      .get().count;

    assert.equal(response.data.clients.length, liveClientCount);
    assert.equal(response.data.entries.length, liveEntryCount);

    const arabicClient = response.data.clients.find(
      (client) => client.name === 'محمد العلمي',
    );
    assert.ok(arabicClient);
    assert.equal(arabicClient.phone, '+212 6 11 22 33 44');

    const exportedPayment = response.data.entries.find(
      (entry) => entry.id === entries.stats.payment.id,
    );
    assert.ok(exportedPayment);
    assert.equal(exportedPayment.amount, 40);
    assert.equal(exportedPayment.description, 'Stats payment');
  });

  await check('PDF statement is valid A4 Arabic with download headers and warm rendering under 1.5s', async () => {
    await pdfService.warmUpPdfEngine();

    const statementUrl = `/api/reports/client/${clients.mohamed.id}/pdf`;
    const expectedDisposition = new RegExp(
      `^inline; filename="credet-client-${clients.mohamed.id}\\.pdf"$`,
    );
    const startedAt = Date.now();
    const response = await request('GET', statementUrl);
    const elapsed = Date.now() - startedAt;

    assertPdfResponse(response, expectedDisposition);
    assert.ok(elapsed < 1500, `warm statement PDF took ${elapsed} ms`);

    const inspection = await inspectPdf(response.data);
    assert.equal(inspection.pageCount, 1);
    assertA4Pdf(inspection);
    assert.match(inspection.texts[0], ARABIC_TEXT_PATTERN);
    assert.match(inspection.texts[0], /\d/);

    const secondStartedAt = Date.now();
    const secondResponse = await request('GET', statementUrl);
    const secondElapsed = Date.now() - secondStartedAt;

    assertPdfResponse(secondResponse, expectedDisposition);
    assert.ok(
      secondElapsed < 1500,
      `second warm statement PDF took ${secondElapsed} ms`,
    );
  });

  await check('PDF statement applies date filters and rejects invalid requests', async () => {
    const expectedDisposition = new RegExp(
      `^inline; filename="credet-client-${clients.mohamed.id}\\.pdf"$`,
    );
    const filtered = await request(
      'GET',
      `/api/reports/client/${clients.mohamed.id}/pdf?from=2026-01-01&to=2026-12-31`,
    );

    assertPdfResponse(filtered, expectedDisposition);
    const inspection = await inspectPdf(filtered.data);
    assert.equal(inspection.pageCount, 1);
    assert.match(inspection.texts[0], ARABIC_TEXT_PATTERN);

    let response = await request(
      'GET',
      `/api/reports/client/${clients.mohamed.id}/pdf?from=2026-12-31&to=2026-01-01`,
    );
    assert.equal(response.status, 400);
    assert.equal(response.data.error, 'from must be before or equal to to');

    response = await request(
      'GET',
      `/api/reports/client/${clients.mohamed.id}/pdf?from=2026-13-01`,
    );
    assert.equal(response.status, 400);

    response = await request('GET', '/api/reports/client/not-a-number/pdf');
    assert.equal(response.status, 400);

    response = await request('GET', '/api/reports/client/999999/pdf');
    assert.equal(response.status, 404);
    assert.equal(response.data.error, 'Client not found');
  });

  await check('general report PDF renders all clients and the debt-only filter', async () => {
    let response = await request('GET', '/api/reports/general/pdf');
    assertPdfResponse(
      response,
      /^inline; filename="credet-general-report-\d{8}\.pdf"$/,
    );

    let inspection = await inspectPdf(response.data);
    assert.equal(inspection.pageCount, 1);
    assertA4Pdf(inspection);
    assert.match(inspection.texts[0], ARABIC_TEXT_PATTERN);
    assert.match(inspection.texts[0], /Bob\s*Advance/);

    response = await request('GET', '/api/reports/general/pdf?filter=debt_only');
    assertPdfResponse(
      response,
      /^inline; filename="credet-general-report-\d{8}\.pdf"$/,
    );

    inspection = await inspectPdf(response.data);
    assert.equal(inspection.pageCount, 1);
    assert.match(inspection.texts[0], ARABIC_TEXT_PATTERN);
    assert.doesNotMatch(inspection.texts[0], /Bob\s*Advance/);

    response = await request('GET', '/api/reports/general/pdf?filter=invalid');
    assert.equal(response.status, 400);
    assert.equal(response.data.error, 'filter must be all or debt_only');
  });

  await check('receipt PDF renders one transaction with A4 Arabic output', async () => {
    const entryId = entries.stats.payment.id;
    const response = await request(
      'GET',
      `/api/reports/entry/${entryId}/receipt/pdf`,
    );

    assertPdfResponse(
      response,
      new RegExp(`^inline; filename="credet-receipt-${entryId}\\.pdf"$`),
    );

    const inspection = await inspectPdf(response.data);
    assert.equal(inspection.pageCount, 1);
    assertA4Pdf(inspection);
    assert.match(inspection.texts[0], ARABIC_TEXT_PATTERN);

    const missing = await request('GET', '/api/reports/entry/999999/receipt/pdf');
    assert.equal(missing.status, 404);
    assert.equal(missing.data.error, 'Entry not found');
  });

  await check('empty client statement renders the empty state without failing', async () => {
    const emptyClient = await request('POST', '/api/clients', {
      name: 'PDF Empty Ledger',
    });
    assert.equal(emptyClient.status, 201);

    const response = await request(
      'GET',
      `/api/reports/client/${emptyClient.data.id}/pdf`,
    );

    assertPdfResponse(
      response,
      new RegExp(`^inline; filename="credet-client-${emptyClient.data.id}\\.pdf"$`),
    );

    const inspection = await inspectPdf(response.data);
    assert.equal(inspection.pageCount, 1);
    assert.match(inspection.texts[0], ARABIC_TEXT_PATTERN);
  });

  await check('PDF templates escape untrusted client and entry text', async () => {
    const xssClient = await request('POST', '/api/clients', {
      name: '<script>alert(1)</script>',
      phone: '"><img src=x onerror=alert(1)>',
      address: 'Line 1\nLine 2',
      notes: '<b>note</b>',
    });
    assert.equal(xssClient.status, 201);

    const xssEntry = await request(
      'POST',
      `/api/clients/${xssClient.data.id}/entries`,
      {
        operation_type: 'DEBT',
        amount: 10,
        description: '<script>alert("xss")</script>',
        operation_date: '2026-01-01',
        note: '<img src=x>',
      },
    );
    assert.equal(xssEntry.status, 201);

    const data = reportService.getClientStatement(xssClient.data.id);
    const html = templateService.renderClientStatement(data);

    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html, /&lt;script&gt;alert\(&quot;xss&quot;\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>alert/);
    assert.doesNotMatch(html, /<img src=x/);
    assert.match(html, /Content-Security-Policy/);
    assert.match(html, /script-src 'none'/);
    assert.match(html, /data:font\/ttf;base64,/);
    assert.doesNotMatch(html, /https?:\/\//);

    const response = await request(
      'GET',
      `/api/reports/client/${xssClient.data.id}/pdf`,
    );
    assertPdfResponse(
      response,
      new RegExp(`^inline; filename="credet-client-${xssClient.data.id}\\.pdf"$`),
    );

    const inspection = await inspectPdf(response.data);
    assert.equal(inspection.pageCount, 1);
    assert.match(inspection.texts[0], ARABIC_TEXT_PATTERN);
  });

  await check('multi-page statement PDF paginates A4 content cleanly', async () => {
    const multiClient = await request('POST', '/api/clients', {
      name: 'PDF Multi Page',
      phone: '0600000088',
      address: 'Test address',
    });
    assert.equal(multiClient.status, 201);

    const insertEntry = db.prepare(`
      INSERT INTO credit_entries (
        client_id, operation_type, amount, description, operation_date
      ) VALUES (?, ?, ?, ?, ?)
    `);
    const insertEntries = db.transaction(() => {
      for (let index = 1; index <= 80; index += 1) {
        const day = String(((index - 1) % 28) + 1).padStart(2, '0');
        const month = String(Math.floor((index - 1) / 28) + 1).padStart(2, '0');
        const isPayment = index % 4 === 0;

        insertEntry.run(
          multiClient.data.id,
          isPayment ? 'PAYMENT' : 'DEBT',
          isPayment ? 50 : 100 + index,
          isPayment
            ? `دفعة جزئية رقم ${index}`
            : `سلعة تجريبية رقم ${index} — وصف أطول قليلاً لاختبار التفاف النص`,
          `2026-${month}-${day}`,
        );
      }
    });
    insertEntries();

    const response = await request(
      'GET',
      `/api/reports/client/${multiClient.data.id}/pdf`,
    );
    assertPdfResponse(
      response,
      new RegExp(`^inline; filename="credet-client-${multiClient.data.id}\\.pdf"$`),
    );

    const inspection = await inspectPdf(response.data, 2);
    assert.ok(
      inspection.pageCount >= 2,
      `expected multiple pages, got ${inspection.pageCount}`,
    );
    assert.equal(inspection.texts.length, 2);
    assertA4Pdf(inspection);
    assert.match(inspection.texts[0], ARABIC_TEXT_PATTERN);
    assert.match(inspection.texts[1], ARABIC_TEXT_PATTERN);
  });

  await check('multi-page general report keeps table content flowing across A4 pages', async () => {
    const insertClient = db.prepare('INSERT INTO clients (name) VALUES (?)');
    const insertClients = db.transaction(() => {
      for (let index = 1; index <= 35; index += 1) {
        insertClient.run(`PDF Bulk Client ${String(index).padStart(2, '0')}`);
      }
    });
    insertClients();

    const response = await request('GET', '/api/reports/general/pdf');
    assertPdfResponse(
      response,
      /^inline; filename="credet-general-report-\d{8}\.pdf"$/,
    );

    const inspection = await inspectPdf(response.data, 2);
    assert.ok(
      inspection.pageCount >= 2,
      `expected multiple report pages, got ${inspection.pageCount}`,
    );
    assert.equal(inspection.texts.length, 2);
    assertA4Pdf(inspection);
    assert.match(inspection.texts[0], ARABIC_TEXT_PATTERN);
    assert.match(inspection.texts[1], ARABIC_TEXT_PATTERN);
  });

  await check('seed script populates empty data, is safe to rerun, and preserves decimals', () => {
    const seedDatabasePath = path.join(temporaryDirectory, 'seed-verify.db');
    const seedScript = path.join(backendRoot, 'src', 'db', 'seed.js');
    const env = {
      ...process.env,
      DB_PATH: seedDatabasePath,
      NODE_ENV: 'test',
    };

    let result = spawnSync(process.execPath, [seedScript], {
      cwd: backendRoot,
      env,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);

    let seedDb = new Database(seedDatabasePath, { fileMustExist: true });
    assert.equal(
      seedDb.prepare('SELECT COUNT(*) AS count FROM clients').get().count,
      4,
    );
    assert.equal(
      seedDb.prepare('SELECT COUNT(*) AS count FROM credit_entries').get().count,
      7,
    );

    const clientBalance = seedDb
      .prepare(`
        SELECT COALESCE(
          SUM(CASE WHEN operation_type = 'DEBT' THEN amount ELSE -amount END),
          0
        ) AS balance
        FROM credit_entries
        WHERE client_id = (SELECT id FROM clients WHERE name = ?)
      `)
      .get('محمد العلمي').balance;
    assert.equal(roundMoney(clientBalance), 1070.75);

    const advanceBalance = seedDb
      .prepare(`
        SELECT COALESCE(
          SUM(CASE WHEN operation_type = 'DEBT' THEN amount ELSE -amount END),
          0
        ) AS balance
        FROM credit_entries
        WHERE client_id = (SELECT id FROM clients WHERE name = ?)
      `)
      .get('يوسف الإدريسي').balance;
    assert.equal(roundMoney(advanceBalance), -49.25);
    seedDb.close();

    result = spawnSync(process.execPath, [seedScript], {
      cwd: backendRoot,
      env,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /Seed skipped/i);

    seedDb = new Database(seedDatabasePath, { fileMustExist: true });
    assert.equal(
      seedDb.prepare('SELECT COUNT(*) AS count FROM clients').get().count,
      4,
    );
    assert.equal(
      seedDb.prepare('SELECT COUNT(*) AS count FROM credit_entries').get().count,
      7,
    );
    seedDb.close();
  });

  await check('database constraints block invalid rows even when the API is bypassed', () => {
    assert.throws(
      () => db
        .prepare(`
          INSERT INTO credit_entries (client_id, operation_type, amount, description)
          VALUES (?, 'LOAN', 10, 'Invalid type')
        `)
        .run(clients.alice.id),
      /CHECK constraint failed/,
    );

    assert.throws(
      () => db
        .prepare(`
          INSERT INTO credit_entries (client_id, operation_type, amount, description)
          VALUES (?, 'DEBT', 0, 'Invalid amount')
        `)
        .run(clients.alice.id),
      /CHECK constraint failed/,
    );

    assert.throws(
      () => db
        .prepare(`
          INSERT INTO credit_entries (client_id, operation_type, amount, description)
          VALUES (999999, 'DEBT', 10, 'Missing client')
        `)
        .run(),
      /FOREIGN KEY constraint failed/,
    );

    assert.throws(
      () => db.prepare('INSERT INTO app_settings (id) VALUES (2)').run(),
      /CHECK constraint failed/,
    );

    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
  });

  await check('final foreign key and integrity checks pass', () => {
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
    assert.deepEqual(db.pragma('foreign_key_check'), []);
  });
}

main()
  .then(() => {
    console.log(`\nAll ${checkCount} checks passed.`);
  })
  .catch((error) => {
    console.error('\nVerification failed.');
    console.error(error.stack || error);
    process.exitCode = 1;
  })
  .finally(cleanup);
