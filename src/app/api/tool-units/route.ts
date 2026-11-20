import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { backfillToolUnitsIfEmptyTx, generateToolUnitsTx } from '@/lib/tool-units';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const toolId = searchParams.get('toolId');
    const code = searchParams.get('code');
    const status = searchParams.get('status');

    if (code) {
      const cleanCode = code.trim().toUpperCase();
      const unit = await prisma.toolUnit.findFirst({
        where: {
          OR: [{ unitCode: cleanCode }, { supplierCode: cleanCode }],
        },
        include: {
          tool: { include: { category: true } },
          usageLogs: {
            include: { employee: { select: { id: true, nik: true, name: true, shift: true, department: true } } },
            orderBy: { createdAt: 'desc' },
            take: 15,
          },
          loanItems: {
            where: { status: 'DIPINJAM' },
            include: {
              currentHolder: true,
              loanTransaction: { include: { employee: true } },
            },
            take: 1,
          },
        },
      });

      if (!unit) {
        return NextResponse.json(
          { error: `Kode unit barcode "${cleanCode}" tidak ditemukan di database.` },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: unit });
    }

    if (toolId) {
      const tool = await prisma.tool.findUnique({ where: { id: toolId } });
      if (!tool) {
        return NextResponse.json({ error: 'Master Tool tidak ditemukan.' }, { status: 404 });
      }

      const unitCount = await prisma.toolUnit.count({ where: { toolId } });
      if (unitCount === 0 && tool.totalStock > 0) {
        await prisma.$transaction(async (tx) => {
          await backfillToolUnitsIfEmptyTx(tx, tool);
        });
      }

      const units = await prisma.toolUnit.findMany({
        where: {
          toolId,
          ...(status ? { status } : {}),
        },
        include: {
          loanItems: {
            where: { status: 'DIPINJAM' },
            include: {
              currentHolder: { select: { id: true, nik: true, name: true, shift: true } },
              loanTransaction: { select: { transactionNumber: true, employee: { select: { nik: true, name: true } } } },
            },
            take: 1,
          },
        },
        orderBy: { unitCode: 'asc' },
      });

      return NextResponse.json({ data: units, tool });
    }

    const units = await prisma.toolUnit.findMany({
      where: status ? { status } : {},
      include: {
        tool: { select: { id: true, code: true, name: true, price: true, lifeAlertPercent: true } },
      },
      orderBy: { unitCode: 'asc' },
      take: 100,
    });

    return NextResponse.json({ data: units });
  } catch (err) {
    return NextResponse.json(
      { error: 'Gagal memuat data unit tool: ' + String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Sesi autentikasi tidak sah.' }, { status: 401 });
    }
    if (session.role === 'OPERATOR') {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const body = await request.json();
    const { toolId, quantity, maxLifeMinutes, supplierCodes } = body;

    const qty = parseInt(quantity, 10);
    if (!toolId || !qty || qty <= 0 || qty > 200) {
      return NextResponse.json(
        { error: 'Tool dan jumlah unit tambahan (1 sampai 200) wajib valid.' },
        { status: 400 }
      );
    }

    const tool = await prisma.tool.findUnique({ where: { id: toolId } });
    if (!tool) {
      return NextResponse.json({ error: 'Master Tool tidak ditemukan.' }, { status: 404 });
    }

    const unitLife =
      maxLifeMinutes !== undefined && parseInt(maxLifeMinutes, 10) >= 10
        ? parseInt(maxLifeMinutes, 10)
        : tool.maxLifeMinutes;

    const createdUnits = await prisma.$transaction(async (tx) => {
      await backfillToolUnitsIfEmptyTx(tx, tool);

      const units = await generateToolUnitsTx(tx, {
        toolId: tool.id,
        toolCode: tool.code,
        maxLifeMinutes: unitLife,
        count: qty,
        status: 'TERSEDIA',
        supplierCodes: Array.isArray(supplierCodes) ? supplierCodes : [],
      });

      await tx.tool.update({
        where: { id: tool.id },
        data: {
          totalStock: { increment: qty },
          availableStock: { increment: qty },
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'TAMBAH_UNIT_TOOL',
          adminId: session.id,
          adminName: session.name || 'Admin',
          details: `Menambahkan ${qty} unit barcode baru untuk ${tool.code} (${tool.name}): ${units.map((u) => u.unitCode).join(', ')}`,
        },
      });

      return units;
    });

    return NextResponse.json({ success: true, data: createdUnits });
  } catch (err) {
    return NextResponse.json(
      { error: 'Gagal menambahkan unit tool: ' + String(err) },
      { status: 500 }
    );
  }
}
