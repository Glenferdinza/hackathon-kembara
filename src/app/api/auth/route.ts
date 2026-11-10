import { NextResponse } from 'next/server';
import { loginAdmin, logoutAdmin, getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'ID Pengguna dan kata sandi wajib diisi.' }, { status: 400 });
    }

    const result = await loginAdmin(String(email), String(password));
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Terjadi kesalahan server saat login ' + String(err) }, { status: 500 });
  }
}

export async function DELETE() {
  await logoutAdmin();
  return NextResponse.json({ success: true });
}

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ user: session });
}
