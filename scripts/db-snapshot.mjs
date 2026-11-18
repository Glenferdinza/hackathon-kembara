import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const DEFAULT_SNAPSHOT_PATH = path.resolve(
  process.cwd(),
  'deploy/snapshot/ypti-db-snapshot.json'
);

// Urutan topologis sesuai ketergantungan foreign key pada prisma/schema.prisma
const TABLE_ORDER = [
  'employee',
  'category',
  'user',
  'tool',
  'inventory',
  'toolUnit',
  'loanRequest',
  'loanTransaction',
  'loanRequestItem',
  'loanItem',
  'returnTransaction',
  'shiftHandover',
  'toolUsageLog',
  'notification',
  'auditLog',
];

function createClient(databaseUrl) {
  if (databaseUrl) {
    return new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
  }
  return new PrismaClient();
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function exportSnapshot(outputPath = DEFAULT_SNAPSHOT_PATH, sourceUrl) {
  const prisma = createClient(sourceUrl);
  try {
    await prisma.$connect();
    const tables = {};
    const counts = {};

    for (const modelKey of TABLE_ORDER) {
      try {
        const rows = await prisma[modelKey].findMany();
        tables[modelKey] = rows;
        counts[modelKey] = rows.length;
      } catch (err) {
        const code = err?.code || '';
        if (code === 'P2021') {
          console.warn(`[WARN] Tabel "${modelKey}" belum ada pada database sumber, diisi kosong.`);
          tables[modelKey] = [];
          counts[modelKey] = 0;
        } else {
          throw err;
        }
      }
    }

    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      counts,
      tables,
    };

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`[SNAPSHOT EXPORT] Berhasil mengekspor snapshot ke ${outputPath}`);
    console.log('[SNAPSHOT COUNTS]', JSON.stringify(counts));
    return payload;
  } finally {
    await prisma.$disconnect();
  }
}

export async function importSnapshot(
  inputPath = DEFAULT_SNAPSHOT_PATH,
  { replace = false, targetUrl } = {}
) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Berkas snapshot tidak ditemukan: ${inputPath}`);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const snapshot = JSON.parse(raw);
  const tables = snapshot?.tables;
  if (!tables || typeof tables !== 'object') {
    throw new Error('Format berkas snapshot tidak valid (properti "tables" tidak ditemukan).');
  }

  const prisma = createClient(targetUrl);
  try {
    await prisma.$connect();

    await prisma.$transaction(
      async (tx) => {
        if (replace) {
          for (const modelKey of [...TABLE_ORDER].reverse()) {
            await tx[modelKey].deleteMany({});
          }
        }

        for (const modelKey of TABLE_ORDER) {
          const rows = Array.isArray(tables[modelKey]) ? tables[modelKey] : [];
          if (rows.length === 0) continue;

          for (const batch of chunkArray(rows, 500)) {
            await tx[modelKey].createMany({
              data: batch,
              skipDuplicates: true,
            });
          }
        }
      },
      { timeout: 120000 }
    );

    console.log(`[SNAPSHOT IMPORT] Berhasil memulihkan snapshot dari ${inputPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function runCli() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log('Penggunaan:');
    console.log('  node scripts/db-snapshot.mjs export [outputPath] [--source=URL]');
    console.log('  node scripts/db-snapshot.mjs import [inputPath] [--replace]');
    process.exit(0);
  }

  const mode = args[0];
  const positionalPath = args.slice(1).find((arg) => !arg.startsWith('--'));
  const replace = args.includes('--replace');
  const sourceArg = args.find((arg) => arg.startsWith('--source='));
  const sourceUrl = sourceArg ? sourceArg.slice('--source='.length) : undefined;

  if (mode === 'export') {
    await exportSnapshot(positionalPath || DEFAULT_SNAPSHOT_PATH, sourceUrl);
  } else if (mode === 'import') {
    await importSnapshot(positionalPath || DEFAULT_SNAPSHOT_PATH, { replace });
  } else {
    console.error(`Perintah tidak dikenal: ${mode}`);
    process.exit(1);
  }
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  runCli().catch((err) => {
    console.error('[SNAPSHOT ERROR]', err);
    process.exit(1);
  });
}
