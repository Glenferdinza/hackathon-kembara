import { cookies, headers } from 'next/headers';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { signSessionToken, verifySessionToken } from './session-token';

const SESSION_COOKIE = 'ypti_erp_session';

async function resolveSecureCookieFlag(): Promise<boolean> {
  if (process.env.FORCE_SECURE_COOKIE === 'true') return true;
  if (process.env.FORCE_SECURE_COOKIE === 'false') return false;
  try {
    const h = await headers();
    const proto = h.get('x-forwarded-proto') || '';
    if (proto.toLowerCase().includes('https')) return true;
    const origin = h.get('origin') || '';
    if (origin.startsWith('https://')) return true;
  } catch {
    // ignore headers access errors
  }
  return false;
}

export interface AdminSession {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | string;
  department: string;
  status: string;
  employeeId?: string | null;
  employeeNik?: string | null;
}

let hasEnsuredDefaults = false;

export async function ensureDefaultUsers() {
  if (hasEnsuredDefaults) return;
  hasEnsuredDefaults = true;

  // Migrasi otomatis akun email lama ke ID angka murni (10001, 10002)
  const legacyMigrations = [
    { oldId: 'admin@ypti.co.id', newId: '10001' },
    { oldId: 'operator@ypti.co.id', newId: '10002' },
    { oldId: 'supervisor@ypti.co.id', newId: '10002' },
  ];

  for (const mig of legacyMigrations) {
    const oldUser = await prisma.user.findUnique({ where: { email: mig.oldId } });
    if (oldUser) {
      const targetExists = await prisma.user.findUnique({ where: { email: mig.newId } });
      if (!targetExists) {
        await prisma.user
          .update({
            where: { id: oldUser.id },
            data: { email: mig.newId },
          })
          .catch(() => {});
      }
    }
  }

  // Migrasi role lama (SUPERVISOR) menjadi ADMIN; pertahankan role OPERATOR untuk akun karyawan
  await prisma.user
    .updateMany({
      where: { role: 'SUPERVISOR' },
      data: { role: 'ADMIN' },
    })
    .catch(() => {});

  const count = await prisma.user.count();
  if (count === 0) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);
    await prisma.user.createMany({
      data: [
        {
          email: '10001',
          name: 'Agung Setiawan',
          passwordHash,
          role: 'SUPER_ADMIN',
          department: 'Pimpinan & Tool Room Head',
          status: 'AKTIF',
        },
        {
          email: '10002',
          name: 'Rizky Pratama',
          passwordHash,
          role: 'ADMIN',
          department: 'Admin Tool Room & Gudang',
          status: 'AKTIF',
        },
      ],
    });
  } else {
    // Pastikan akun 10001 adalah SUPER_ADMIN
    await prisma.user
      .update({
        where: { email: '10001' },
        data: { role: 'SUPER_ADMIN' },
      })
      .catch(() => {});

    // Pastikan akun 10002 terdaftar sebagai ADMIN
    const hasAdmin = await prisma.user.findUnique({ where: { email: '10002' } });
    if (!hasAdmin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);
      await prisma.user
        .create({
          data: {
            email: '10002',
            name: 'Rizky Pratama',
            passwordHash,
            role: 'ADMIN',
            department: 'Admin Tool Room & Gudang',
            status: 'AKTIF',
          },
        })
        .catch(() => {});
    } else if (hasAdmin.role !== 'ADMIN' && hasAdmin.role !== 'SUPER_ADMIN') {
      await prisma.user
        .update({
          where: { id: hasAdmin.id },
          data: { role: 'ADMIN' },
        })
        .catch(() => {});
    }
  }
}

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionValue) return null;

  try {
    const parsed = await verifySessionToken<AdminSession>(sessionValue);
    if (!parsed?.id) return null;

    // Timeout guard 2500ms agar tidak menggantung jika cold-start Supabase lambat di edge
    let dbUser = null;
    try {
      const dbPromise = prisma.user.findUnique({
        where: { id: parsed.id },
        include: {
          employee: {
            select: { id: true, nik: true, department: true },
          },
        },
      });
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('DB_TIMEOUT')), 2500)
      );
      dbUser = await Promise.race([dbPromise, timeoutPromise]);
    } catch {
      // Jika database timeout atau cold start di Cloudflare, gunakan data cookie valid agar user tidak mental
      if (parsed.status !== 'NONAKTIF') {
        return parsed;
      }
      return null;
    }

    if (!dbUser || dbUser.status === 'NONAKTIF') {
      return null;
    }

    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      department: dbUser.department || dbUser.employee?.department || 'Tool Room & Warehouse',
      status: dbUser.status || 'AKTIF',
      employeeId: dbUser.employeeId ?? dbUser.employee?.id ?? null,
      employeeNik: dbUser.employee?.nik ?? null,
    };
  } catch {
    return null;
  }
}

export async function loginAdmin(
  usernameInput: string,
  passwordPlain: string
): Promise<{ success: boolean; error?: string; user?: AdminSession }> {
  await ensureDefaultUsers();

  const cleanUsername = usernameInput.trim();
  let user = await prisma.user.findUnique({
    where: { email: cleanUsername },
    include: {
      employee: {
        select: { id: true, nik: true, department: true },
      },
    },
  });

  if (!user && cleanUsername.toUpperCase() !== cleanUsername) {
    user = await prisma.user.findUnique({
      where: { email: cleanUsername.toUpperCase() },
      include: {
        employee: {
          select: { id: true, nik: true, department: true },
        },
      },
    });
  }

  if (!user) {
    return { success: false, error: 'ID Pengguna tidak ditemukan dalam sistem.' };
  }

  if (user.status === 'NONAKTIF') {
    return {
      success: false,
      error: 'Akses ID Pengguna ini sedang dinonaktifkan oleh Administrator.',
    };
  }

  const isValid = await bcrypt.compare(passwordPlain, user.passwordHash);
  if (!isValid) {
    return { success: false, error: 'Kata sandi yang dimasukkan tidak sesuai.' };
  }

  const sessionData: AdminSession = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department || user.employee?.department || 'Tool Room & Central Warehouse',
    status: user.status || 'AKTIF',
    employeeId: user.employeeId ?? user.employee?.id ?? null,
    employeeNik: user.employee?.nik ?? null,
  };

  const [cookieStore, signedToken, isSecure] = await Promise.all([
    cookies(),
    signSessionToken(sessionData),
    resolveSecureCookieFlag(),
  ]);
  cookieStore.set(SESSION_COOKIE, signedToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  await prisma.auditLog
    .create({
      data: {
        action: 'LOGIN_SISTEM',
        adminId: user.id,
        adminName: user.name,
        details: `Pengguna ${user.name} (ID ${user.email}, ${user.role}) masuk ke dalam sistem.`,
      },
    })
    .catch(() => {});

  return { success: true, user: sessionData };
}

export async function updateOwnAccountProfile(
  userId: string,
  payload: { name?: string; currentPassword?: string; newPassword?: string }
): Promise<{ success: boolean; error?: string; user?: AdminSession }> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: {
        select: { id: true, nik: true, department: true },
      },
    },
  });

  if (!dbUser || dbUser.status === 'NONAKTIF') {
    return { success: false, error: 'Akun pengguna tidak ditemukan atau berstatus nonaktif.' };
  }

  const updateData: { name?: string; passwordHash?: string } = {};
  const trimmedName = typeof payload.name === 'string' ? payload.name.trim() : '';
  const currentPassword = typeof payload.currentPassword === 'string' ? payload.currentPassword : '';
  const newPassword = typeof payload.newPassword === 'string' ? payload.newPassword : '';

  if (trimmedName && dbUser.role !== 'OPERATOR' && trimmedName !== dbUser.name) {
    if (trimmedName.length < 2) {
      return { success: false, error: 'Nama tampilan minimal terdiri dari 2 karakter.' };
    }
    updateData.name = trimmedName;
  }

  if (newPassword) {
    if (!currentPassword) {
      return { success: false, error: 'Kata sandi saat ini wajib diisi untuk mengganti sandi.' };
    }
    const isMatch = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!isMatch) {
      return { success: false, error: 'Kata sandi saat ini tidak sesuai.' };
    }
    if (newPassword.length < 6) {
      return { success: false, error: 'Kata sandi baru minimal terdiri dari 6 karakter.' };
    }
    const salt = await bcrypt.genSalt(10);
    updateData.passwordHash = await bcrypt.hash(newPassword, salt);
  }

  if (Object.keys(updateData).length === 0) {
    return { success: false, error: 'Tidak ada perubahan nama atau kata sandi untuk disimpan.' };
  }

  const updated = await prisma.user.update({
    where: { id: dbUser.id },
    data: updateData,
  });

  const sessionData: AdminSession = {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    department: updated.department || dbUser.employee?.department || 'Tool Room & Central Warehouse',
    status: updated.status || 'AKTIF',
    employeeId: updated.employeeId ?? dbUser.employee?.id ?? null,
    employeeNik: dbUser.employee?.nik ?? null,
  };

  const [cookieStore, signedToken, isSecure] = await Promise.all([
    cookies(),
    signSessionToken(sessionData),
    resolveSecureCookieFlag(),
  ]);
  cookieStore.set(SESSION_COOKIE, signedToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  await prisma.auditLog
    .create({
      data: {
        action: 'PERBARUI_PROFIL_MANDIRI',
        adminId: updated.id,
        adminName: updated.name,
        details: `Pengguna ${updated.name} (ID ${updated.email}) memperbarui ${
          updateData.name && updateData.passwordHash
            ? 'nama dan kata sandi'
            : updateData.passwordHash
            ? 'kata sandi'
            : 'nama tampilan'
        } secara mandiri.`,
      },
    })
    .catch(() => {});

  return { success: true, user: sessionData };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
