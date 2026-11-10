import { cookies } from 'next/headers';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

const SESSION_COOKIE = 'ypti_erp_session';

export interface AdminSession {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | string;
  department: string;
  status: string;
}

export async function ensureDefaultUsers() {
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

  // Migrasi role lama (OPERATOR, SUPERVISOR) menjadi ADMIN
  await prisma.user
    .updateMany({
      where: { role: { in: ['OPERATOR', 'SUPERVISOR'] } },
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
    const parsed = JSON.parse(sessionValue) as AdminSession;
    if (!parsed?.id) return null;

    const dbUser = await prisma.user.findUnique({
      where: { id: parsed.id },
    });

    if (!dbUser || dbUser.status === 'NONAKTIF') {
      return null;
    }

    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      department: dbUser.department || 'Tool Room & Warehouse',
      status: dbUser.status || 'AKTIF',
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
  const user = await prisma.user.findUnique({
    where: { email: cleanUsername },
  });

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
    department: user.department || 'Tool Room & Central Warehouse',
    status: user.status || 'AKTIF',
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
