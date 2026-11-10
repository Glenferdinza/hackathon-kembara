import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const inventory = await prisma.inventory.findUnique({
      where: { id },
      include: {
        category: true,
        loanItems: {
          include: {
            loanTransaction: {
              include: { employee: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!inventory) {
      return NextResponse.json({ error: 'Inventaris tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ data: inventory });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal memuat detail inventaris: ' + String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Sesi login tidak sah atau telah berakhir.' }, { status: 401 });
    }
    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.inventory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Inventaris tidak ditemukan.' }, { status: 404 });
    }

    const { name, categoryId, brand, model, serialNumber, trackingType, unit, location, condition, status, totalStock } = body;

    let total = existing.totalStock;
    let available = existing.availableStock;

    if (totalStock !== undefined && existing.trackingType !== 'INDIVIDUAL') {
      const newTotal = parseInt(totalStock, 10);
      const diff = newTotal - existing.totalStock;
      total = newTotal;
      available = Math.max(0, existing.availableStock + diff);
    }

    const updated = await prisma.inventory.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        categoryId: categoryId || existing.categoryId,
        brand: brand !== undefined ? brand?.trim() || null : existing.brand,
        model: model !== undefined ? model?.trim() || null : existing.model,
        serialNumber: serialNumber !== undefined ? serialNumber?.trim() || null : existing.serialNumber,
        trackingType: trackingType || existing.trackingType,
        unit: unit ? unit.toUpperCase() : existing.unit,
        location: location !== undefined ? location.trim() : existing.location,
        condition: condition || existing.condition,
        status: status || existing.status,
        totalStock: total,
        availableStock: available,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_INVENTARIS',
        adminId: session?.id,
        adminName: session?.name || 'Admin',
        details: `Memperbarui data inventaris ${updated.code} - ${updated.name}`,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal memperbarui inventaris: ' + String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Sesi login tidak sah atau telah berakhir.' }, { status: 401 });
    }
    if (session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Super Admin yang diizinkan menghapus master inventaris.' }, { status: 403 });
    }
    const { id } = await context.params;

    const inventory = await prisma.inventory.findUnique({
      where: { id },
      include: { loanItems: true },
    });

    if (!inventory) {
      return NextResponse.json({ error: 'Inventaris tidak ditemukan.' }, { status: 404 });
    }

    if (inventory.loanItems.length > 0 || inventory.borrowedStock > 0) {
      await prisma.inventory.update({
        where: { id },
        data: { status: 'NONAKTIF' },
      });

      await prisma.auditLog.create({
        data: {
          action: 'SOFT_DELETE_INVENTARIS',
          adminId: session?.id,
          adminName: session?.name || 'Admin',
          details: `Menonaktifkan inventaris ${inventory.code} karena memiliki histori peminjaman`,
        },
      });

      return NextResponse.json({ success: true, message: 'Inventaris dinonaktifkan (soft delete) karena memiliki histori peminjaman.' });
    }

    await prisma.inventory.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE_INVENTARIS',
        adminId: session?.id,
        adminName: session?.name || 'Admin',
        details: `Menghapus master inventaris: ${inventory.code}`,
      },
    });

    return NextResponse.json({ success: true, message: 'Inventaris berhasil dihapus permanen.' });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal menghapus inventaris: ' + String(err) }, { status: 500 });
  }
}
