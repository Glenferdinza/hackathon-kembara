import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, '..');

const allowLocal = process.argv.includes('--allow-local');
const urlArg = process.argv.find((arg) => arg.startsWith('--url='));
const rawUrl = (
  (urlArg ? urlArg.slice('--url='.length) : process.env.DESKTOP_APP_URL) ||
  (allowLocal ? 'http://localhost:3000' : '')
).trim();

if (!rawUrl) {
  console.error(
    'DESKTOP_APP_URL wajib diisi sebelum memaketkan .exe (contoh: https://ypti-toolroom.vercel.app)'
  );
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(rawUrl);
} catch {
  console.error(`URL DESKTOP_APP_URL tidak valid: "${rawUrl}"`);
  process.exit(1);
}

if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
  console.error(`Protokol URL harus http atau https, diterima: ${parsed.protocol}`);
  process.exit(1);
}

const targetUrl = rawUrl.replace(/\/+$/, '');
const outPath = path.join(desktopRoot, 'app-config.json');

fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      targetUrl,
      builtAt: new Date().toISOString(),
    },
    null,
    2
  ) + '\n',
  'utf8'
);

console.log(`Konfigurasi desktop ditulis ke ${outPath} (${targetUrl})`);
