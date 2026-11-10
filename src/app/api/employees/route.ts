import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nik = searchParams.get('nik');
    const search = searchParams.get('search');

    if (nik) {
      const employee = await prisma.employee.findUnique({
        where: { nik: nik.trim().toUpperCase() },
        include: {
          loans: {
            where: { status: { not: 'SELESAI' } },
            include: {
              items: {
                include: { tool: true, inventory: true },
              },
            },
          },
        },
      });

      if (!employee) {
        return NextResponse.json({ error: `Karyawan dengan NIK / Barcode "${nik}" tidak ditemukan.` }, { status: 404 });
      }

      return NextResponse.json({ data: employee });
    }

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { nik: { contains: search } },
        { name: { contains: search } },
        { department: { contains: search } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { nik: 'asc' },
    });

    return NextResponse.json({ data: employees });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal memuat data karyawan: ' + String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Sesi login tidak sah atau telah berakhir.' }, { status: 401 });
    }
    const body = await request.json();
    const { action, id, nik, name, role, department, shift, phone, email } = body;

    // Handle Kartu Hilang / Rusak (Versi + 1)
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

      return NextResponse.json({ success: true, data: updated, message: `Kartu baru diterbitkan: Versi ${updated.cardVersion}` });
    }

    if (!nik || !name || !department) {
      return NextResponse.json({ error: 'NIK, Nama, dan Departemen wajib diisi.' }, { status: 400 });
    }

    const cleanNik = nik.trim().toUpperCase();
    const existing = await prisma.employee.findUnique({ where: { cleanNik: cleanNik } } as any).catch(() => prisma.employee.findUnique({ where: { nik: cleanNik } }));
    if (existing) {
      return NextResponse.json({ error: `NIK / ID "${cleanNik}" sudah terdaftar. Gunakan NIK yang berbeda.` }, { status: 409 });
    }

    const newEmp = await prisma.employee.create({
      data: {
        nik: cleanNik,
        name: name.trim(),
        role: role || 'Operator CNC',
        department: department.trim(),
        shift: shift || 'Shift 1 (Pagi)',
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        status: 'AKTIF',
        cardVersion: 1,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'TAMBAH_KARYAWAN',
        adminId: session.id,
        adminName: session.name || 'Admin',
        details: `Pendaftaran anggota baru: ${newEmp.nik} - ${newEmp.name} (${newEmp.department})`,
      },
    });

    return NextResponse.json({ success: true, data: newEmp });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal menambahkan karyawan: ' + String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Sesi login tidak sah atau telah berakhir.' }, { status: 401 });
    }
    const body = await request.json();
    const { id, name, role, department, shift, phone, email, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID karyawan wajib disertakan.' }, { status: 400 });
    }

    // Flowchart Rule: Dinonaktifkan & masih ada pinjaman aktif? -> Peringatan: kembalikan semua barang dulu
    if (status === 'NONAKTIF') {
      const activeLoans = await prisma.loanTransaction.count({
        where: {
          employeeId: id,
          status: { not: 'SELESAI' },
        },
      });

      if (activeLoans > 0) {
        return NextResponse.json({
          error: `Tidak dapat menonaktifkan karyawan! Karyawan masih memiliki ${activeLoans} peminjaman aktif yang belum dikembalikan. Kembalikan semua barang terlebih dahulu.`,
        }, { status: 400 });
      }
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(role ? { role: role.trim() } : {}),
        ...(department ? { department: department.trim() } : {}),
        ...(shift ? { shift: shift.trim() } : {}),
        ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
        ...(email !== undefined ? { email: email?.trim() || null } : {}),
        ...(status ? { status } : {}),
      },
    });

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
    return NextResponse.json({ error: 'Gagal memperbarui data karyawan: ' + String(err) }, { status: 500 });
  }
}
