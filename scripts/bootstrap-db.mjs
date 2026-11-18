import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { exportSnapshot, importSnapshot } from './db-snapshot.mjs';

const SNAPSHOT_PATH = path.resolve(
  process.cwd(),
  'deploy/snapshot/ypti-db-snapshot.json'
);

function runStep(command, args) {
  const isWin = process.platform === 'win32';
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: isWin,
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`Perintah gagal (${command} ${args.join(' ')}), exit code ${result.status}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log('[BOOTSTRAP DRY-RUN] Mode simulasi aktif.');
    console.log('[BOOTSTRAP DRY-RUN] Langkah 1: npx prisma db push --skip-generate');
    console.log(
      `[BOOTSTRAP DRY-RUN] Snapshot terdeteksi: ${fs.existsSync(SNAPSHOT_PATH) ? SNAPSHOT_PATH : 'tidak ada (akan fallback ke SOURCE_DATABASE_URL atau prisma/seed.ts)'}`
    );
    console.log('[BOOTSTRAP DRY-RUN] Langkah akhir: npx tsx prisma/backfill-v2.ts');
    return;
  }

  console.log('[1/4] Sinkronisasi skema Prisma ke PostgreSQL lokal...');
  runStep('npx', ['prisma', 'db', 'push', '--skip-generate']);

  const prisma = new PrismaClient();
  let userCount = 0;
  let toolCount = 0;

  try {
    await prisma.$connect();
    userCount = await prisma.user.count();
    toolCount = await prisma.tool.count();
  } finally {
    await prisma.$disconnect();
  }

  if (userCount > 0 || toolCount > 0) {
    console.log(
      `[2/4] Database lokal sudah berisi data (${userCount} pengguna, ${toolCount} tool). Melewati restore/seed agar transaksi berjalan tetap aman.`
    );
  } else if (fs.existsSync(SNAPSHOT_PATH)) {
    console.log(`[2/4] Menemukan snapshot migrasi di ${SNAPSHOT_PATH}. Memulihkan database...`);
    await importSnapshot(SNAPSHOT_PATH, { replace: false });
  } else if (process.env.SOURCE_DATABASE_URL && process.env.SOURCE_DATABASE_URL.trim()) {
    console.log('[2/4] Menarik snapshot langsung dari SOURCE_DATABASE_URL...');
    const tempSnapshot = path.join(os.tmpdir(), 'ypti-live-migration.json');
    await exportSnapshot(tempSnapshot, process.env.SOURCE_DATABASE_URL.trim());
    await importSnapshot(tempSnapshot, { replace: false });
    if (fs.existsSync(tempSnapshot)) fs.unlinkSync(tempSnapshot);
  } else {
    console.log('[2/4] Snapshot tidak ditemukan. Menjalankan seed awal dari Excel resmi PT YPTI...');
    runStep('npx', ['tsx', 'prisma/seed.ts']);
  }

  console.log('[3/4] Menjalankan backfill v2 idempoten (Akun Operator NIK + Unit QR)...');
  runStep('npx', ['tsx', 'prisma/backfill-v2.ts']);

  console.log('[4/4] Inisialisasi & migrasi database PT YPTI selesai.');
}

main().catch((err) => {
  console.error('[BOOTSTRAP ERROR]', err);
  process.exit(1);
});
