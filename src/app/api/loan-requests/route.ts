import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Sesi autentikasi tidak valid.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('countOnly') === 'true';
    const statusFilter = searchParams.get('status') || '';

    if (countOnly) {
      const [waitingAdminCount, readyForOperatorCount] = await Promise.all([
        prisma.loanRequest.count({ where: { status: 'MENUNGGU_ADMIN' } }),
        session.employeeId
          ? prisma.loanRequest.count({
              where: { employeeId: session.employeeId, status: 'SIAP_DIAMBIL' },
            })
          : Promise.resolve(0),
      ]);
      return NextResponse.json({ waitingAdminCount, readyForOperatorCount });
    }

    const where: Record<string, unknown> = {};
    if (session.role === 'OPERATOR') {
      if (!session.employeeId) {
        return NextResponse.json({ data: [] });
      }
      where.employeeId = session.employeeId;
    }
    if (statusFilter) {
      where.status = statusFilter;
    }

    const requests = await prisma.loanRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, nik: true, name: true, department: true, shift: true } },
        admin: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            tool: { select: { id: true, code: true, name: true, location: true, unit: true, maxLifeMinutes: true, availableStock: true } },
            inventory: { select: { id: true, code: true, name: true, location: true, unit: true, availableStock: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Kumpulkan seluruh unitId yang sudah di-assign agar bisa ditampilkan detail unitCode + umur pakainya
    const allUnitIds = new Set<string>();
    for (const req of requests) {
      for (const item of req.items) {
        if (item.assignedUnitIds) {
          try {
            const parsed = JSON.parse(item.assignedUnitIds) as string[];
            if (Array.isArray(parsed)) parsed.forEach((uid) => allUnitIds.add(uid));
          } catch {
            // ignore
          }
        }
      }
    }

    const units =
      allUnitIds.size > 0
        ? await prisma.toolUnit.findMany({
            where: { id: { in: Array.from(allUnitIds) } },
            select: {
              id: true,
              unitCode: true,
              maxLifeMinutes: true,
              remainingLifeMinutes: true,
              status: true,
            },
          })
        : [];
    const unitMap = Object.fromEntries(units.map((u) => [u.id, u]));

    const enriched = requests.map((req) => ({
      ...req,
      items: req.items.map((item) => {
        let assignedUnits: typeof units = [];
        if (item.assignedUnitIds) {
          try {
            const ids = JSON.parse(item.assignedUnitIds) as string[];
            if (Array.isArray(ids)) {
              assignedUnits = ids.map((id) => unitMap[id]).filter(Boolean);
            }
          } catch {
            // ignore
          }
        }
        return { ...item, assignedUnits };
      }),
    }));

    return NextResponse.json({ data: enriched });
  } catch (err) {
    return NextResponse.json(
      { error: 'Gagal memuat antrean request pinjam: ' + String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Sesi autentikasi tidak valid.' }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId: bodyEmpId, purpose, expectedReturnDate, items } = body;

    const targetEmployeeId =
      session.role === 'OPERATOR' ? session.employeeId : bodyEmpId || session.employeeId;

    if (!targetEmployeeId) {
      return NextResponse.json(
        { error: 'Akun Operator belum terhubung ke profil Data Karyawan.' },
        { status: 400 }
      );
    }

    if (!expectedReturnDate || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Tenggat kembali dan minimal 1 perkakas/inventaris wajib dipilih.' },
        { status: 400 }
      );
    }

    const expDate = new Date(expectedReturnDate);
    if (isNaN(expDate.getTime())) {
      return NextResponse.json({ error: 'Format tenggat pengembalian tidak valid.' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { id: targetEmployeeId } });
    if (!employee || employee.status === 'NONAKTIF') {
      return NextResponse.json({ error: 'Profil karyawan tidak aktif atau tidak ditemukan.' }, { status: 400 });
    }

    // Validasi stok awal tiap item
    for (const item of items) {
      const qty = parseInt(item.requestedQty || item.quantity || '1', 10);
      if (!qty || qty <= 0) {
        return NextResponse.json({ error: 'Jumlah permintaan tiap item minimal 1.' }, { status: 400 });
      }
      if (item.itemType === 'TOOL' && item.toolId) {
        const tool = await prisma.tool.findUnique({ where: { id: item.toolId } });
        if (!tool || tool.availableStock < qty) {
          return NextResponse.json(
            { error: `Stok "${tool?.name || 'Tool'}" tidak mencukupi (tersedia ${tool?.availableStock ?? 0}).` },
            { status: 400 }
          );
        }
      } else if (item.itemType === 'INVENTORY' && item.inventoryId) {
        const inv = await prisma.inventory.findUnique({ where: { id: item.inventoryId } });
        if (!inv || inv.availableStock < qty) {
          return NextResponse.json(
            { error: `Stok "${inv?.name || 'Inventaris'}" tidak mencukupi (tersedia ${inv?.availableStock ?? 0}).` },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json({ error: 'Item request tidak valid.' }, { status: 400 });
      }
    }

    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    const requestNumber = `REQ-${ym}-${rand}`;

    const created = await prisma.$transaction(async (tx) => {
      const req = await tx.loanRequest.create({
        data: {
          requestNumber,
          employeeId: employee.id,
          purpose: purpose?.trim() || 'Keperluan Pekerjaan Lantai Produksi',
          expectedReturnDate: expDate,
          status: 'MENUNGGU_ADMIN',
          items: {
            create: items.map((item: { itemType: string; toolId?: string; inventoryId?: string; requestedQty?: number; quantity?: number }) => ({
              itemType: item.itemType,
              toolId: item.itemType === 'TOOL' ? item.toolId : null,
              inventoryId: item.itemType === 'INVENTORY' ? item.inventoryId : null,
              requestedQty: parseInt(String(item.requestedQty || item.quantity || 1), 10),
            })),
          },
        },
        include: { items: true },
      });

      await tx.notification.create({
        data: {
          title: `Request Pinjam Baru: ${requestNumber}`,
          message: `${employee.name} (${employee.nik}) mengajukan ${items.length} jenis barang. Segera siapkan dan scan QR unit.`,
          type: 'INFO',
          targetRole: 'ADMIN',
          link: '/requests',
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'REQUEST_PINJAM',
          adminId: session.id,
          adminName: employee.name,
          details: `Operator ${employee.name} (${employee.nik}) mengajukan request peminjaman ${requestNumber} (${items.length} item).`,
        },
      });

      return req;
    });

    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    return NextResponse.json(
      { error: 'Gagal mengirim request peminjaman: ' + String(err) },
      { status: 500 }
    );
  }
}
