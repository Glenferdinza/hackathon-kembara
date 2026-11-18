import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Sesi autentikasi tidak sah.' }, { status: 401 });
    }
    if (session.role === 'OPERATOR') {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { action, supplierCode, notes, maxLifeMinutes } = body;

    const unit = await prisma.toolUnit.findUnique({
      where: { id },
      include: { tool: true },
    });

    if (!unit) {
      return NextResponse.json({ error: 'Unit tool tidak ditemukan.' }, { status: 404 });
    }

    if (action === 'RESHARPEN') {
      if (unit.status === 'DIPINJAM' || unit.status === 'DISIAPKAN') {
        return NextResponse.json(
          { error: 'Unit sedang dipinjam atau disiapkan. Kembalikan terlebih dahulu sebelum reset asah.' },
          { status: 400 }
        );
      }

      const nextMaxLife =
        maxLifeMinutes !== undefined && parseInt(maxLifeMinutes, 10) >= 10
          ? parseInt(maxLifeMinutes, 10)
          : unit.maxLifeMinutes;

      const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.toolUnit.update({
          where: { id },
          data: {
            maxLifeMinutes: nextMaxLife,
            remainingLifeMinutes: nextMaxLife,
            resharpenCount: { increment: 1 },
            status: 'TERSEDIA',
            notes: notes?.trim() || `Diasah ulang & reset umur pakai (${nextMaxLife} menit)`,
          },
        });

        if (unit.status === 'PERLU_ASAH' || unit.status === 'RUSAK') {
          await tx.tool.update({
            where: { id: unit.toolId },
            data: {
              repairStock: unit.tool.repairStock > 0 ? { decrement: 1 } : undefined,
              availableStock: { increment: 1 },
            },
          });
        }

        await tx.auditLog.create({
          data: {
            action: 'ASAH_RESET_UMUR_TOOL',
            adminId: session.id,
            adminName: session.name || 'Admin',
            details: `Reset umur pakai unit ${unit.unitCode} pasca asah ulang (ke-${res.resharpenCount}) menjadi ${nextMaxLife} menit, status kembali TERSEDIA.`,
          },
        });

        return res;
      });

      return NextResponse.json({ success: true, data: updated });
    }

    const updated = await prisma.toolUnit.update({
      where: { id },
      data: {
        ...(supplierCode !== undefined ? { supplierCode: supplierCode?.trim().toUpperCase() || null } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json(
      { error: 'Gagal memperbarui unit tool: ' + String(err) },
      { status: 500 }
    );
  }
}
