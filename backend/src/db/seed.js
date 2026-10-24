'use strict';

const { initDatabase, getDb, getDatabasePath, closeDatabase } = require('./database');
const clientService = require('../services/clientService');
const entryService = require('../services/entryService');

function dateDaysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

const sampleClients = [
  {
    name: 'محمد العلمي',
    phone: '0612345678',
    address: 'حي المسيرة، الدار البيضاء',
    notes: 'زبون دائم',
    entries: [
      {
        operation_type: 'DEBT',
        amount: 1250.5,
        description: 'مواد غذائية - دفعة أولى',
        operation_date: dateDaysAgo(12),
      },
      {
        operation_type: 'PAYMENT',
        amount: 500,
        description: 'دفعة نقدية',
        operation_date: dateDaysAgo(6),
      },
      {
        operation_type: 'DEBT',
        amount: 320.25,
        description: 'زيت وسكر وأرز',
        operation_date: dateDaysAgo(2),
      },
    ],
  },
  {
    name: 'فاطمة الزهراء بنعلي',
    phone: '0623456789',
    address: 'حي الأمل، الرباط',
    notes: 'تسديد شهري',
    entries: [
      {
        operation_type: 'DEBT',
        amount: 800,
        description: 'ملابس أطفال',
        operation_date: dateDaysAgo(20),
      },
      {
        operation_type: 'PAYMENT',
        amount: 800,
        description: 'تسديد كامل',
        operation_date: dateDaysAgo(1),
      },
    ],
  },
  {
    name: 'يوسف الإدريسي',
    phone: '0634567890',
    address: 'شارع محمد الخامس، مراكش',
    notes: null,
    entries: [
      {
        operation_type: 'DEBT',
        amount: 150.75,
        description: 'أدوات منزلية',
        operation_date: dateDaysAgo(8),
      },
      {
        operation_type: 'PAYMENT',
        amount: 200,
        description: 'دفعة مقدمة',
        operation_date: dateDaysAgo(3),
        note: 'الباقي رصيد لصالح الزبون',
      },
    ],
  },
  {
    name: 'سعاد المرابط',
    phone: '0645678901',
    address: 'حي السلام، طنجة',
    notes: 'زبونة جديدة',
    entries: [],
  },
];

function main() {
  initDatabase();

  try {
    const db = getDb();
    const existingClients = db
      .prepare('SELECT COUNT(*) AS count FROM clients')
      .get().count;

    if (existingClients > 0) {
      console.log(
        `Seed skipped: database already contains ${existingClients} client(s). No data was changed.`,
      );
      return;
    }

    const seed = db.transaction(() => {
      let entryCount = 0;

      for (const sample of sampleClients) {
        const client = clientService.createClient({
          name: sample.name,
          phone: sample.phone,
          address: sample.address,
          notes: sample.notes,
        });

        for (const entry of sample.entries) {
          entryService.createEntry(client.id, {
            operation_type: entry.operation_type,
            amount: entry.amount,
            description: entry.description,
            operation_date: entry.operation_date,
            note: entry.note,
          });

          entryCount += 1;
        }
      }

      return entryCount;
    });

    const entryCount = seed();
    const clients = clientService.listClients({ status: 'all' });

    console.log(`Database: ${getDatabasePath()}`);
    console.log(
      `Seeded ${clients.length} clients and ${entryCount} credit entries.`,
    );
    console.log('');
    console.log('Client balances:');

    for (const client of clients) {
      console.log(
        `- ${client.name}: ${client.current_balance.toFixed(2)} DH `
        + `(debt ${client.total_debt.toFixed(2)}, paid ${client.total_paid.toFixed(2)})`,
      );
    }
  } finally {
    closeDatabase();
  }
}

try {
  main();
} catch (error) {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
}
