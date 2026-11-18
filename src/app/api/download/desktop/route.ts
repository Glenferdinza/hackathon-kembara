import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultUsers } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const TOKEN_TTL_MS = 5 * 60 * 1000;
const DEFAULT_GITHUB_LATEST_API =
  'https://api.github.com/repos/Glenferdinza/hackathon-kembara/releases/latest';

interface DownloadTokenPayload {
  uid: string;
  email: string;
  deviceName: string;
  exp: number;
}

function getSigningSecret(): string {
  return (
    process.env.NEXTAUTH_SECRET ||
    process.env.SESSION_SECRET ||
    'ypti-erp-desktop-download-fallback-secret'
  );
}

function createDownloadToken(payload: DownloadTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyDownloadToken(token: string): DownloadTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encoded, providedSig] = parts;
  if (!encoded || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');

  const bufProvided = Buffer.from(providedSig, 'utf8');
  const bufExpected = Buffer.from(expectedSig, 'utf8');
  if (bufProvided.length !== bufExpected.length) return null;
  if (!crypto.timingSafeEqual(bufProvided, bufExpected)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as DownloadTokenPayload;
    if (!parsed || typeof parsed.exp !== 'number' || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function findLocalInstaller(): { filePath: string; fileName: string; sizeBytes: number } | null {
  try {
    const explicitPath = process.env.DESKTOP_EXE_PATH?.trim();
    if (explicitPath && fs.existsSync(/*turbopackIgnore: true*/ explicitPath)) {
      const stat = fs.statSync(/*turbopackIgnore: true*/ explicitPath);
      if (stat.isFile()) {
        return {
          filePath: explicitPath,
          fileName: path.basename(explicitPath),
          sizeBytes: stat.size,
        };
      }
    }

    const cwd = process.cwd();
    const candidateDirs = [
      path.resolve(/*turbopackIgnore: true*/ cwd, 'public', 'downloads'),
      path.resolve(/*turbopackIgnore: true*/ cwd, 'desktop', 'dist'),
      path.resolve(/*turbopackIgnore: true*/ cwd, '..', '..', 'public', 'downloads'),
      path.resolve(/*turbopackIgnore: true*/ cwd, '..', '..', 'desktop', 'dist'),
    ];

    for (const dir of candidateDirs) {
      if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) continue;
      const entries = fs.readdirSync(/*turbopackIgnore: true*/ dir);
      const exeFiles = entries
        .filter((name) => name.toLowerCase().endsWith('.exe') && !name.includes('__uninstaller'))
        .map((name) => {
          const full = path.join(/*turbopackIgnore: true*/ dir, name);
          const stat = fs.statSync(/*turbopackIgnore: true*/ full);
          return { filePath: full, fileName: name, sizeBytes: stat.size, mtimeMs: stat.mtimeMs };
        })
        .filter((item) => item.sizeBytes > 1024 * 1024)
        .sort((a, b) => b.mtimeMs - a.mtimeMs);

      if (exeFiles.length > 0) {
        const best = exeFiles[0];
        return { filePath: best.filePath, fileName: best.fileName, sizeBytes: best.sizeBytes };
      }
    }
  } catch {
    // Di runtime edge/serverless yang membatasi fs, lanjutkan ke lookup GitHub Releases
  }
  return null;
}

async function resolveRemoteInstallerUrl(): Promise<{ url: string; fileName: string } | null> {
  const directEnvUrl = process.env.DESKTOP_EXE_DIRECT_URL?.trim();
  if (directEnvUrl) {
    const cleanName = directEnvUrl.split('/').pop()?.split('?')[0] || 'PT-YPTI-ToolRoom-Setup.exe';
    return { url: directEnvUrl, fileName: cleanName };
  }

  try {
    const apiUrl = process.env.GITHUB_RELEASE_API_URL?.trim() || DEFAULT_GITHUB_LATEST_API;
    const res = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'pt-ypti-erp-desktop-gate',
      },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const release = (await res.json()) as {
      assets?: Array<{ name?: string; browser_download_url?: string }>;
    };

    const exeAsset = release.assets?.find(
      (a) =>
        typeof a.name === 'string' &&
        a.name.toLowerCase().endsWith('.exe') &&
        typeof a.browser_download_url === 'string'
    );

    if (exeAsset?.browser_download_url && exeAsset.name) {
      return { url: exeAsset.browser_download_url, fileName: exeAsset.name };
    }
  } catch {
    // Abaikan timeout atau jaringan offline
  }

  return null;
}

export async function POST(request: Request) {
  try {
    await ensureDefaultUsers();
    const body = await request.json();
    const email = String(body?.email || '').trim();
    const password = String(body?.password || '');
    const deviceName = String(body?.deviceName || '').trim();
    const notes = String(body?.notes || '').trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'ID Pengguna Admin dan kata sandi wajib diisi untuk verifikasi unduhan.' },
        { status: 400 }
      );
    }

    if (deviceName.length < 3) {
      return NextResponse.json(
        { error: 'Nama perangkat atau lokasi PC wajib diisi minimal 3 karakter.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    });

    if (!user || user.status === 'NONAKTIF') {
      return NextResponse.json(
        { error: 'Akun Admin tidak ditemukan atau berstatus nonaktif.' },
        { status: 401 }
      );
    }

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          error:
            'Unduhan installer desktop (.exe) hanya diizinkan untuk Admin atau Super Admin Tool Room. Operator produksi dapat memasang aplikasi melalui kartu PWA di halaman ini.',
        },
        { status: 403 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Kata sandi verifikasi tidak sesuai.' },
        { status: 401 }
      );
    }

    await prisma.auditLog.create({
      data: {
        action: 'UNDUH_INSTALLER_DESKTOP',
        adminId: user.id,
        adminName: user.name,
        details: `Verifikasi unduhan installer Windows (.exe) untuk perangkat "${deviceName}"${
          notes ? ` | Keperluan: ${notes}` : ''
        } (${user.role}, ID: ${user.email}).`,
      },
    });

    const exp = Date.now() + TOKEN_TTL_MS;
    const token = createDownloadToken({
      uid: user.id,
      email: user.email,
      deviceName,
      exp,
    });

    const localInstaller = findLocalInstaller();
    const remoteInstaller = localInstaller ? null : await resolveRemoteInstallerUrl();

    return NextResponse.json({
      success: true,
      downloadUrl: `/api/download/desktop?token=${encodeURIComponent(token)}`,
      expiresAt: new Date(exp).toISOString(),
      expiresInSeconds: Math.floor(TOKEN_TTL_MS / 1000),
      deviceName,
      verifiedBy: `${user.name} (${user.email})`,
      installerReady: Boolean(localInstaller || remoteInstaller),
      sourceMode: localInstaller ? 'local' : remoteInstaller ? 'github' : 'unavailable',
      fileName:
        localInstaller?.fileName ||
        remoteInstaller?.fileName ||
        'PT-YPTI-ToolRoom-Setup-1.0.0.exe',
      fileSizeBytes: localInstaller?.sizeBytes || null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Gagal memverifikasi akses unduhan: ' + String(err) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') || '';
  const verified = verifyDownloadToken(token);

  if (!verified) {
    return NextResponse.json(
      {
        error:
          'Token unduhan tidak valid atau sudah kedaluwarsa (batas 5 menit). Silakan verifikasi ulang form akses.',
      },
      { status: 401 }
    );
  }

  const localInstaller = findLocalInstaller();
  if (localInstaller) {
    const nodeStream = fs.createReadStream(/*turbopackIgnore: true*/ localInstaller.filePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.microsoft.portable-executable',
        'Content-Disposition': `attachment; filename="${localInstaller.fileName}"`,
        'Content-Length': String(localInstaller.sizeBytes),
        'Cache-Control': 'no-store',
      },
    });
  }

  const remoteInstaller = await resolveRemoteInstallerUrl();
  if (remoteInstaller) {
    return NextResponse.redirect(remoteInstaller.url, { status: 302 });
  }

  return NextResponse.json(
    {
      error:
        'Berkas installer Windows (.exe) belum tersedia di server lokal maupun GitHub Releases. Jalankan npm run build:win pada folder desktop atau terbitkan tag rilis v* terlebih dahulu.',
    },
    { status: 404 }
  );
}
