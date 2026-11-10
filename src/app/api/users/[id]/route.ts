import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Akses ditolak. Hanya Super Admin yang dapat mengubah hak akses.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, role, department, status, newPassword } = body;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Akun pengguna tidak ditemukan.' }, { status: 404 });
    }

    // Proteksi anti-lockout bagi akun Super Admin yang sedang aktif digunakan
    if (targetUser.id === session.id) {
      if (status === 'NONAKTIF') {
        return NextResponse.json(
          { error: 'Anda tidak dapat menonaktifkan akun Super Admin yang sedang Anda gunakan.' },
          { status: 400 }
        );
      }
      if (role && role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Anda tidak dapat menurunkan level akses akun Super Admin Anda sendiri.' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = String(name).trim();
    if (email) {
      const cleanEmail = String(email).trim();
      if (!/^\d+$/.test(cleanEmail)) {
        return NextResponse.json(
          { error: 'ID Login wajib berupa angka saja (contoh 10004).' },
          { status: 400 }
        );
      }
      if (cleanEmail !== targetUser.email) {
        const duplicate = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (duplicate) {
          return NextResponse.json(
            { error: `ID Login ${cleanEmail} sudah digunakan oleh akun lain.` },
            { status: 400 }
          );
        }
        updateData.email = cleanEmail;
      }
    }
    if (department !== undefined) updateData.department = String(department).trim();
    if (role && ['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      updateData.role = role;
    }
    if (status && ['AKTIF', 'NONAKTIF'].includes(status)) {
      updateData.status = status;
    }

    if (newPassword && String(newPassword).trim().length > 0) {
      if (String(newPassword).trim().length < 6) {
        return NextResponse.json(
          { error: 'Kata sandi baru minimal harus terdiri dari 6 karakter.' },
          { status: 400 }
        );
      }
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(String(newPassword).trim(), salt);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        action: 'UBAH_AKSES_PENGGUNA',
        adminId: session.id,
        adminName: session.name,
        details: `Memperbarui akun ${updated.name} (${updated.email}) menjadi Role ${updated.role} dan Status ${updated.status}.`,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        department: updated.department,
        status: updated.status,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Gagal memperbarui akun pengguna ' + String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Akses ditolak. Hanya Super Admin yang dapat menghapus akun pengguna.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (id === session.id) {
      return NextResponse.json(
        { error: 'Anda tidak dapat menghapus akun Super Admin yang sedang Anda gunakan.' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { loans: true, returns: true },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Akun pengguna tidak ditemukan.' }, { status: 404 });
    }

    if (targetUser._count.loans > 0 || targetUser._count.returns > 0) {
      return NextResponse.json(
        {
          error:
            'Akun ini memiliki riwayat pencatatan transaksi di sistem. Silakan ubah status akun menjadi NONAKTIF agar jejak audit tetap terjaga.',
        },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'HAPUS_AKUN_PENGGUNA',
        adminId: session.id,
        adminName: session.name,
        details: `Menghapus akun pengguna ${targetUser.name} (${targetUser.email}).`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: 'Gagal menghapus akun pengguna ' + String(err) },
      { status: 500 }
    );
  }
}

