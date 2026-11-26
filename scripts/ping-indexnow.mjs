/**
 * AI LING ADVISORY — IndexNow Instant Search Submission (Bing / ChatGPT Search / Yandex)
 * Submits core pages and the latest Think Tank dispatches to api.indexnow.org.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const HOST = 'www.ailingadvisory.com';
const INDEXNOW_KEY = 'a119ad7150274e8ba9f42c6d8e1b309c';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;
const DATA_PATH = path.join(ROOT_DIR, 'data', 'intelligence.json');

async function main() {
  const urls = new Set([
    `https://${HOST}/`,
    `https://${HOST}/dispatches/index.html`,
    `https://${HOST}/feed.xml`,
    `https://${HOST}/about.html`,
    `https://${HOST}/contact.html`,
    `https://${HOST}/sample-executive-summary.html`,
  ]);

  if (fs.existsSync(DATA_PATH)) {
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    const episodes = Array.isArray(data.episodes) ? data.episodes : [];
    // Always include cornerstones + 12 most recent dispatches
    episodes.slice(0, 16).forEach((ep) => {
      if (ep && ep.id) {
        urls.add(`https://${HOST}/dispatches/${ep.id}.html`);
      }
    });
  }

  const payload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: [...urls],
  };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });
    process.stdout.write(
      `[IndexNow] Submitted ${payload.urlList.length} URLs -> HTTP ${res.status} ${res.statusText}\n`
    );
  } catch (err) {
    process.stdout.write(`[IndexNow] Non-fatal network notice: ${err.message}\n`);
  }
}

main();
