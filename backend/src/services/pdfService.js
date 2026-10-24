'use strict';

const puppeteer = require('puppeteer');
const reportService = require('./reportService');
const templateService = require('./templateService');

const PDF_TIMEOUT_MS = 20000;
const MAX_CONCURRENT_RENDERS = 4;

let browserPromise = null;
let browserInstance = null;
let activeRenders = 0;
const renderQueue = [];

function getLaunchOptions() {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    || process.env.CHROME_PATH
    || undefined;

  const args = [
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--font-render-hinting=none',
    '--no-first-run',
    '--no-default-browser-check',
  ];

  if (process.env.PDF_NO_SANDBOX === '1') {
    args.push('--no-sandbox', '--disable-setuid-sandbox');
  }

  return {
    headless: true,
    executablePath,
    args,
    protocolTimeout: PDF_TIMEOUT_MS,
  };
}

async function getBrowser() {
  if (browserInstance?.connected) {
    return browserInstance;
  }

  if (!browserPromise) {
    browserPromise = puppeteer.launch(getLaunchOptions())
      .then((browser) => {
        browserInstance = browser;

        browser.on('disconnected', () => {
          if (browserInstance === browser) {
            browserInstance = null;
            browserPromise = null;
          }
        });

        return browser;
      })
      .catch((error) => {
        browserPromise = null;
        throw error;
      });
  }

  return browserPromise;
}

async function acquireRenderSlot() {
  if (activeRenders >= MAX_CONCURRENT_RENDERS) {
    await new Promise((resolve) => renderQueue.push(resolve));
  }

  activeRenders += 1;
}

function releaseRenderSlot() {
  activeRenders = Math.max(0, activeRenders - 1);
  const next = renderQueue.shift();

  if (next) {
    next();
  }
}

/**
 * Render a trusted HTML document with Chromium. The page is sandboxed by the
 * template's CSP, JavaScript is disabled, and every data value is escaped by
 * templateService before it reaches this function.
 */
async function renderHtmlToPdf(html) {
  await acquireRenderSlot();
  let page = null;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setJavaScriptEnabled(false);
    await page.setCacheEnabled(false);
    await page.setDefaultTimeout(PDF_TIMEOUT_MS);
    await page.setContent(html, {
      waitUntil: 'load',
      timeout: PDF_TIMEOUT_MS,
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.emulateMediaType('print');

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });

    return Buffer.from(pdf);
  } finally {
    if (page) {
      await page.close().catch(() => {
        // The browser may already be gone. The rendered buffer (if any) is
        // still valid, and the next request will launch a fresh browser.
      });
    }

    releaseRenderSlot();
  }
}

async function generateClientStatementPdf(clientId, range = {}) {
  const data = reportService.getClientStatement(clientId, range);
  const html = templateService.renderClientStatement(data);
  const buffer = await renderHtmlToPdf(html);

  return {
    buffer,
    filename: `credet-client-${clientId}.pdf`,
  };
}

async function generateGeneralReportPdf({ filter = 'all' } = {}) {
  const data = reportService.getGeneralReport({ filter });
  const html = templateService.renderGeneralReport(data);
  const buffer = await renderHtmlToPdf(html);

  return {
    buffer,
    filename: `credet-general-report-${data.generated.dateStamp}.pdf`,
  };
}

async function generateReceiptPdf(entryId) {
  const data = reportService.getEntryReceipt(entryId);
  const html = templateService.renderReceipt(data);
  const buffer = await renderHtmlToPdf(html);

  return {
    buffer,
    filename: `credet-receipt-${entryId}.pdf`,
  };
}

async function warmUpPdfEngine() {
  await getBrowser();
}

async function closePdfEngine() {
  const pendingLaunch = browserPromise;
  const browser = browserInstance;

  browserPromise = null;
  browserInstance = null;

  if (pendingLaunch) {
    try {
      const launchedBrowser = await pendingLaunch;

      if (launchedBrowser && launchedBrowser !== browser) {
        await launchedBrowser.close();
      }
    } catch {
      // A failed launch has nothing to close.
    }
  }

  if (browser) {
    try {
      await browser.close();
    } catch {
      // Shutdown is best effort; the OS will reap any remaining child process.
    }
  }
}

module.exports = {
  generateClientStatementPdf,
  generateGeneralReportPdf,
  generateReceiptPdf,
  warmUpPdfEngine,
  closePdfEngine,
};
