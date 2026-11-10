import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, ensureDefaultUsers } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Akses ditolak. Hanya Super Admin yang dapat mengelola akun pengguna.' },
        { status: 403 }
      );
    }

    await ensureDefaultUsers();

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const roleFilter = searchParams.get('role') || '';
    const statusFilter = searchParams.get('status') || '';

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            loans: true,
            returns: true,
          },
        },
      },
    });

    const filtered = users
      .filter((u) => {
        if (roleFilter && u.role !== roleFilter) return false;
        if (statusFilter && u.status !== statusFilter) return false;
        if (search) {
          const matchName = u.name.toLowerCase().includes(search);
          const matchEmail = u.email.toLowerCase().includes(search);
          const matchDept = (u.department || '').toLowerCase().includes(search);
          return matchName || matchEmail || matchDept;
        }
        return true;
      })
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department || 'Tool Room & Warehouse',
        status: u.status || 'AKTIF',
        createdAt: u.createdAt,
        loansHandled: u._count.loans,
        returnsHandled: u._count.returns,
      }));

    return NextResponse.json({ data: filtered });
  } catch (err) {
    return NextResponse.json(
      { error: 'Gagal memuat daftar akun pengguna ' + String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Akses ditolak. Hanya Super Admin yang dapat menambahkan akun pengguna.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password, role, department, status } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nama lengkap, ID Login (angka), dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim();
    if (!/^\d+$/.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'ID Login wajib berupa angka saja (contoh 10004).' },
        { status: 400 }
      );
    }

    if (String(password).length < 6) {
      return NextResponse.json(
        { error: 'Kata sandi minimal harus terdiri dari 6 karakter.' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json(
        { error: `ID Login ${cleanEmail} sudah terdaftar pada akun lain.` },
        { status: 400 }
      );
    }

    const validRoles = ['SUPER_ADMIN', 'OPERATOR', 'SUPERVISOR'];
    const targetRole = validRoles.includes(role) ? role : 'OPERATOR';
    const targetStatus = status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(password), salt);

    const created = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: cleanEmail,
        passwordHash,
        role: targetRole,
        department: department ? String(department).trim() : 'Tool Room & Warehouse',
        status: targetStatus,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'TAMBAH_AKUN_PENGGUNA',
        adminId: session.id,
        adminName: session.name,
        details: `Menambahkan akun pengguna baru ${created.name} (${created.email}) dengan hak akses ${created.role}.`,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        department: created.department,
        status: created.status,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Gagal menambahkan akun pengguna ' + String(err) },
      { status: 500 }
    );
  }
}

