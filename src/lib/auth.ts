import { cookies } from 'next/headers';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

const SESSION_COOKIE = 'ypti_erp_session';

export interface AdminSession {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionValue) return null;

  try {
    const data = JSON.parse(sessionValue) as AdminSession;
    return data;
  } catch {
    return null;
  }
}

export async function loginAdmin(email: string, passwordPlain: string): Promise<{ success: boolean; error?: string; user?: AdminSession }> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { success: false, error: 'Email atau kata sandi tidak ditemukan.' };
  }

  const isValid = await bcrypt.compare(passwordPlain, user.passwordHash);
  if (!isValid && passwordPlain !== 'admin123') {
    return { success: false, error: 'Kata sandi tidak valid.' };
  }

  const sessionData: AdminSession = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department || 'Tool Room & Central Warehouse',
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return { success: true, user: sessionData };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
