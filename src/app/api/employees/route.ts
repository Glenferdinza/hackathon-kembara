import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nik = searchParams.get('nik');
    const search = searchParams.get('search');

    if (nik) {
      const employee = await prisma.employee.findUnique({
        where: { nik: nik.trim().toUpperCase() },
        include: {
          user: { select: { id: true, email: true, role: true, status: true } },
          loans: {
            where: { status: { not: 'SELESAI' } },
            include: {
              items: {
                include: { tool: true, inventory: true, toolUnit: true },
              },
            },
          },
        },
      });

      if (!employee) {
        return NextResponse.json(
          { error: `Karyawan dengan NIK / Barcode "${nik}" tidak ditemukan.` },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: employee });
    }

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { nik: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, role: true, status: true } },
      },
      orderBy: { nik: 'asc' },
    });

    return NextResponse.json({ data: employees });
  } catch (err) {
    return NextResponse.json(
      { error: 'Gagal memuat data karyawan: ' + String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json(
        { error: 'Sesi login tidak sah atau telah berakhir.' },
        { status: 401 }
      );
    }
    if (session.role === 'OPERATOR') {
      return NextResponse.json(
        { error: 'Akses ditolak. Hanya Admin atau Super Admin yang dapat mengelola data karyawan.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      action,
      id,
      nik,
      name,
      role,
      department,
      shift,
      phone,
      email,
      operatorPassword,
    } = body;

    // 1. Aktivasi / Reset Akun Login Operator untuk Karyawan yang sudah ada
    if (action === 'sync_operator_account' && id) {
      const emp = await prisma.employee.findUnique({
        where: { id },
        include: { user: true },
      });
      if (!emp) {
        return NextResponse.json({ error: 'Karyawan tidak ditemukan.' }, { status: 404 });
      }

      const rawPassword =
        typeof operatorPassword === 'string' && operatorPassword.trim().length >= 6
          ? operatorPassword.trim()
          : 'operator123';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(rawPassword, salt);

      if (emp.user) {
        await prisma.user.update({
          where: { id: emp.user.id },
          data: {
            passwordHash,
            status: emp.status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF',
            name: emp.name,
            department: emp.department,
          },
        });
      } else {
        const collision = await prisma.user.findUnique({ where: { email: emp.nik } });
        if (collision) {
          return NextResponse.json(
            { error: `ID Login "${emp.nik}" sudah dipakai oleh akun lain.` },
            { status: 409 }
          );
        }
        await prisma.user.create({
          data: {
            email: emp.nik,
            name: emp.name,
            passwordHash,
            role: 'OPERATOR',
            department: emp.department,
            status: emp.status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF',
            employeeId: emp.id,
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          action: 'AKTIVASI_AKUN_OPERATOR',
          adminId: session.id,
          adminName: session.name || 'Admin',
          details: `Aktivasi / reset akun login Operator untuk ${emp.nik} (${emp.name}).`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Akun login Operator aktif (ID: ${emp.nik}, Sandi: ${rawPassword})`,
      });
    }

    // 2. Handle Kartu Hilang / Rusak (Versi + 1)
    if (action === 'replace_card' && id) {
      const emp = await prisma.employee.findUnique({ where: { id } });
      if (!emp) {
        return NextResponse.json({ error: 'Karyawan tidak ditemukan.' }, { status: 404 });
      }

      const updated = await prisma.employee.update({
        where: { id },
        data: { cardVersion: (emp.cardVersion || 1) + 1 },
      });

      await prisma.auditLog.create({
        data: {
          action: 'PENGGANTIAN_KARTU',
          adminId: session.id,
          adminName: session.name || 'Admin',
          details: `Penerbitan kartu baru versi ${updated.cardVersion} untuk ${emp.nik} (${emp.name}) karena kartu lama hilang/rusak.`,
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Kartu baru diterbitkan: Versi ${updated.cardVersion}`,
      });
    }

    if (!nik || !name || !department) {
      return NextResponse.json(
        { error: 'NIK, Nama, dan Departemen wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanNik = String(nik).trim().toUpperCase();
    const existing = await prisma.employee.findUnique({ where: { nik: cleanNik } });
    if (existing) {
      return NextResponse.json(
        { error: `NIK / ID "${cleanNik}" sudah terdaftar. Gunakan NIK yang berbeda.` },
        { status: 409 }
      );
    }

    const rawPassword =
      typeof operatorPassword === 'string' && operatorPassword.trim().length >= 6
        ? operatorPassword.trim()
        : 'operator123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    const newEmp = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          nik: cleanNik,
          name: String(name).trim(),
          role: role || 'Operator CNC',
          department: String(department).trim(),
          shift: shift || 'Shift 1 (Pagi)',
          phone: phone ? String(phone).trim() : null,
          email: email ? String(email).trim() : null,
          status: 'AKTIF',
          cardVersion: 1,
        },
      });

      const userExists = await tx.user.findUnique({ where: { email: cleanNik } });
      if (!userExists) {
        await tx.user.create({
          data: {
            email: cleanNik,
            name: emp.name,
            passwordHash,
            role: 'OPERATOR',
            department: emp.department,
            status: 'AKTIF',
            employeeId: emp.id,
          },
        });
      }

      return emp;
    });

    await prisma.auditLog.create({
      data: {
        action: 'TAMBAH_KARYAWAN',
        adminId: session.id,
        adminName: session.name || 'Admin',
        details: `Pendaftaran anggota baru & akun login Operator: ${newEmp.nik} - ${newEmp.name} (${newEmp.department})`,
      },
    });

    return NextResponse.json({
      success: true,
      data: newEmp,
      defaultLoginInfo: { id: cleanNik, password: rawPassword },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Gagal menambahkan karyawan: ' + String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json(
        { error: 'Sesi login tidak sah atau telah berakhir.' },
        { status: 401 }
      );
    }
    if (session.role === 'OPERATOR') {
      return NextResponse.json(
        { error: 'Akses ditolak.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, role, department, shift, phone, email, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID karyawan wajib disertakan.' }, { status: 400 });
    }

    if (status === 'NONAKTIF') {
      const activeLoans = await prisma.loanTransaction.count({
        where: {
          employeeId: id,
          status: { not: 'SELESAI' },
        },
      });

      if (activeLoans > 0) {
        return NextResponse.json(
          {
            error: `Tidak dapat menonaktifkan karyawan! Karyawan masih memiliki ${activeLoans} peminjaman aktif yang belum dikembalikan. Kembalikan semua barang terlebih dahulu.`,
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(role ? { role: String(role).trim() } : {}),
        ...(department ? { department: String(department).trim() } : {}),
        ...(shift ? { shift: String(shift).trim() } : {}),
        ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
        ...(email !== undefined ? { email: email?.trim() || null } : {}),
        ...(status ? { status } : {}),
      },
      include: { user: true },
    });

    // Sinkronkan status & nama pada akun login Operator terkait jika ada
    if (updated.user) {
      await prisma.user
        .update({
          where: { id: updated.user.id },
          data: {
            name: updated.name,
            department: updated.department,
            ...(status ? { status: status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF' } : {}),
          },
        })
        .catch(() => {});
    }

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_KARYAWAN',
        adminId: session.id,
        adminName: session.name || 'Admin',
        details: `Pembaruan data karyawan: ${updated.nik} - ${updated.name} (Status: ${updated.status})`,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json(
      { error: 'Gagal memperbarui data karyawan: ' + String(err) },
      { status: 500 }
    );
  }
}
