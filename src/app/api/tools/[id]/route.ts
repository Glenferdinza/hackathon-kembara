import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateToolUnitsTx } from '@/lib/tool-units';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const tool = await prisma.tool.findUnique({
      where: { id },
      include: {
        category: true,
        units: {
          orderBy: { unitCode: 'asc' },
        },
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

    if (!tool) {
      return NextResponse.json({ error: 'Tool tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ data: tool });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal memuat detail tool: ' + String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Akses ditolak. Sesi autentikasi tidak valid.' }, { status: 401 });
    }
    if (session.role === 'OPERATOR') {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }
    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.tool.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Tool tidak ditemukan.' }, { status: 404 });
    }

    const {
      name,
      categoryId,
      specifications,
      unit,
      location,
      condition,
      status,
      totalStock,
      price,
      maxLifeMinutes,
      lifeAlertPercent,
    } = body;

    let total = existing.totalStock;
    let available = existing.availableStock;
    let addedQty = 0;

    if (totalStock !== undefined) {
      const newTotal = parseInt(totalStock, 10);
      const lockedStock = existing.borrowedStock + existing.repairStock + existing.scrapStock;
      if (isNaN(newTotal) || newTotal < lockedStock) {
        return NextResponse.json(
          { error: `Total stok tidak boleh kurang dari unit sedang dipinjam/servis/afkir (${lockedStock} unit).` },
          { status: 400 }
        );
      }
      const diff = newTotal - existing.totalStock;
      total = newTotal;
      available = Math.max(0, newTotal - lockedStock);
      if (diff > 0) addedQty = diff;
    }

    const updatedMaxLife =
      maxLifeMinutes !== undefined
        ? Math.max(10, parseInt(maxLifeMinutes, 10) || existing.maxLifeMinutes)
        : existing.maxLifeMinutes;

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.tool.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : existing.name,
          categoryId: categoryId || existing.categoryId,
          specifications: specifications !== undefined ? specifications?.trim() || null : existing.specifications,
          unit: unit ? unit.toUpperCase() : existing.unit,
          location: location !== undefined ? location.trim() : existing.location,
          condition: condition || existing.condition,
          status: status || existing.status,
          totalStock: total,
          availableStock: available,
          price: price !== undefined ? Math.max(0, parseInt(price, 10) || 0) : existing.price,
          maxLifeMinutes: updatedMaxLife,
          lifeAlertPercent:
            lifeAlertPercent !== undefined
              ? Math.min(50, Math.max(5, parseInt(lifeAlertPercent, 10) || existing.lifeAlertPercent))
              : existing.lifeAlertPercent,
        },
      });

      if (addedQty > 0) {
        await generateToolUnitsTx(tx, {
          toolId: u.id,
          toolCode: u.code,
          maxLifeMinutes: updatedMaxLife,
          count: addedQty,
          status: 'TERSEDIA',
        });
      }

      return u;
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_TOOL',
        adminId: session?.id,
        adminName: session?.name || 'Admin',
        details: `Memperbarui data tool ${updated.code} - ${updated.name}`,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal memperbarui tool: ' + String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Akses ditolak. Sesi login tidak memiliki izin menghapus master tool.' }, { status: 403 });
    }
    const { id } = await context.params;

    const tool = await prisma.tool.findUnique({
      where: { id },
      include: { loanItems: true },
    });

    if (!tool) {
      return NextResponse.json({ error: 'Tool tidak ditemukan.' }, { status: 404 });
    }

    // Jika sudah pernah dipinjam, lakukan soft delete (status NONAKTIF) untuk menjaga integritas data audit
    if (tool.loanItems.length > 0 || tool.borrowedStock > 0) {
      await prisma.tool.update({
        where: { id },
        data: { status: 'NONAKTIF' },
      });

      await prisma.auditLog.create({
        data: {
          action: 'SOFT_DELETE_TOOL',
          adminId: session?.id,
          adminName: session?.name || 'Admin',
          details: `Menonaktifkan tool ${tool.code} karena memiliki histori transaksi`,
        },
      });

      return NextResponse.json({ success: true, message: 'Tool dinonaktifkan (soft delete) karena memiliki histori peminjaman.' });
    }

    // Jika belum pernah ada transaksi, bisa hard delete
    await prisma.tool.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE_TOOL',
        adminId: session?.id,
        adminName: session?.name || 'Admin',
        details: `Menghapus master tool: ${tool.code}`,
      },
    });

    return NextResponse.json({ success: true, message: 'Tool berhasil dihapus permanen.' });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal menghapus tool: ' + String(err) }, { status: 500 });
  }
}
