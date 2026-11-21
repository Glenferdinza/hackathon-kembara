import { NextResponse } from 'next/server';
import { loginAdmin, logoutAdmin, getSession, updateOwnAccountProfile } from '@/lib/auth';

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

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Sesi login tidak ditemukan atau telah berakhir.' }, { status: 401 });
    }

    const body = await request.json();
    const result = await updateOwnAccountProfile(session.id, {
      name: body?.name,
      currentPassword: body?.currentPassword,
      newPassword: body?.newPassword,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Gagal memperbarui akun ' + String(err) }, { status: 500 });
  }
}
