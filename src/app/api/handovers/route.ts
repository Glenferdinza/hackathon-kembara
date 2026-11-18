import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Sesi autentikasi tidak valid.' }, { status: 401 });
    }

    const where =
      session.role === 'OPERATOR' && session.employeeId
        ? {
            OR: [
              { toEmployeeId: session.employeeId },
              { fromEmployeeId: session.employeeId },
            ],
          }
        : {};

    const handovers = await prisma.shiftHandover.findMany({
      where,
      include: {
        fromEmployee: { select: { id: true, nik: true, name: true, shift: true, department: true } },
        toEmployee: { select: { id: true, nik: true, name: true, shift: true, department: true } },
        toolUnit: {
          select: {
            id: true,
            unitCode: true,
            maxLifeMinutes: true,
            remainingLifeMinutes: true,
            usedLifeMinutes: true,
            status: true,
          },
        },
        loanItem: {
          include: {
            tool: { select: { id: true, code: true, name: true, lifeAlertPercent: true } },
            inventory: { select: { id: true, code: true, name: true } },
          },
        },
        loanTransaction: {
          select: { id: true, transactionNumber: true, expectedReturnDate: true, purpose: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ data: handovers });
  } catch (err) {
    return NextResponse.json(
      { error: 'Gagal memuat daftar pengalihan shift: ' + String(err) },
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
    const { loanItemId, toEmployeeId, usedMinutes, proofImageData, conditionNotes } = body;

    if (!loanItemId || !toEmployeeId) {
      return NextResponse.json(
        { error: 'Item pinjaman dan Operator penerima pengalihan wajib dipilih.' },
        { status: 400 }
      );
    }

    const parsedMinutes = parseInt(String(usedMinutes ?? ''), 10);
    if (isNaN(parsedMinutes) || parsedMinutes < 0) {
      return NextResponse.json(
        { error: 'Durasi pemakaian (menit) wajib diisi angka valid minimal 0.' },
        { status: 400 }
      );
    }

    if (proofImageData && String(proofImageData).length > 2_800_000) {
      return NextResponse.json(
        { error: 'Ukuran lampiran gambar bukti terlalu besar (maksimal 2 MB).' },
        { status: 400 }
      );
    }

    const loanItem = await prisma.loanItem.findUnique({
      where: { id: loanItemId },
      include: {
        loanTransaction: { include: { employee: true } },
        tool: true,
        inventory: true,
        toolUnit: true,
      },
    });

    if (!loanItem || loanItem.status !== 'DIPINJAM') {
      return NextResponse.json(
        { error: 'Item pinjaman tidak aktif atau sudah dikembalikan.' },
        { status: 400 }
      );
    }

    const activeHolderId = loanItem.currentHolderId || loanItem.loanTransaction.employeeId;
    if (session.role === 'OPERATOR' && session.employeeId !== activeHolderId) {
      return NextResponse.json(
        { error: 'Anda bukan pemegang aktif item ini sehingga tidak dapat mengalihkannya.' },
        { status: 403 }
      );
    }

    if (toEmployeeId === activeHolderId) {
      return NextResponse.json(
        { error: 'Operator penerima tidak boleh sama dengan pemegang saat ini.' },
        { status: 400 }
      );
    }

    const targetEmp = await prisma.employee.findUnique({ where: { id: toEmployeeId } });
    if (!targetEmp || targetEmp.status === 'NONAKTIF') {
      return NextResponse.json(
        { error: 'Operator penerima tidak ditemukan atau tidak aktif.' },
        { status: 400 }
      );
    }

    const existingPending = await prisma.shiftHandover.findFirst({
      where: { loanItemId, status: 'PENDING' },
    });
    if (existingPending) {
      return NextResponse.json(
        { error: `Item ini sudah memiliki pengalihan berstatus menunggu persetujuan (${existingPending.handoverNumber}).` },
        { status: 400 }
      );
    }

    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    const handoverNumber = `HOV-${ym}-${rand}`;

    const created = await prisma.$transaction(async (tx) => {
      let remainingAfter = loanItem.toolUnit?.remainingLifeMinutes ?? 0;

      if (loanItem.toolUnitId && loanItem.toolUnit) {
        remainingAfter = Math.max(0, loanItem.toolUnit.remainingLifeMinutes - parsedMinutes);
        await tx.toolUnit.update({
          where: { id: loanItem.toolUnitId },
          data: {
            usedLifeMinutes: { increment: parsedMinutes },
            remainingLifeMinutes: remainingAfter,
          },
        });

        await tx.toolUsageLog.create({
          data: {
            toolUnitId: loanItem.toolUnitId,
            employeeId: activeHolderId,
            loanTransactionId: loanItem.loanTransactionId,
            usedMinutes: parsedMinutes,
            remainingAfter,
            actionType: 'HANDOVER',
            notes: conditionNotes?.trim() || `Pemakaian sebelum dialihkan ke ${targetEmp.name}`,
          },
        });

        const alertPct = loanItem.tool?.lifeAlertPercent || 15;
        const pctLeft =
          loanItem.toolUnit.maxLifeMinutes > 0
            ? (remainingAfter / loanItem.toolUnit.maxLifeMinutes) * 100
            : 100;

        if (pctLeft <= alertPct) {
          await tx.notification.create({
            data: {
              title: `Peringatan Umur Pakai Kritis: ${loanItem.toolUnit.unitCode}`,
              message: `Sisa umur pakai tinggal ${remainingAfter} menit (${pctLeft.toFixed(0)}%). Segera kembalikan ke Tool Room setelah shift selesai.`,
              type: 'DANGER',
              targetRole: 'ALL',
              employeeId: toEmployeeId,
              link: '/operator',
            },
          });
        }
      }

      const hov = await tx.shiftHandover.create({
        data: {
          handoverNumber,
          loanTransactionId: loanItem.loanTransactionId,
          loanItemId: loanItem.id,
          toolUnitId: loanItem.toolUnitId,
          fromEmployeeId: activeHolderId,
          toEmployeeId: targetEmp.id,
          usedMinutes: parsedMinutes,
          proofImageData: proofImageData || null,
          conditionNotes: conditionNotes?.trim() || null,
          status: 'PENDING',
        },
      });

      const fromHolder = await tx.employee.findUnique({ where: { id: activeHolderId } });

      await tx.notification.create({
        data: {
          title: `Waiting List Pengalihan Shift (${handoverNumber})`,
          message: `${fromHolder?.name || 'Operator'} mengalihkan ${loanItem.toolUnit?.unitCode || loanItem.tool?.name || loanItem.inventory?.name} kepada Anda. Cek fisik lalu Terima/Tolak.`,
          type: 'WARNING',
          targetRole: 'OPERATOR',
          employeeId: targetEmp.id,
          link: '/operator',
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'AJUKAN_PENGALIHAN_SHIFT',
          adminId: session.id,
          adminName: fromHolder?.name || session.name || 'Operator',
          details: `Pengajuan alih pinjam ${handoverNumber} dari ${fromHolder?.name} ke ${targetEmp.name} (Pemakaian: ${parsedMinutes} mnt, Sisa umur: ${remainingAfter} mnt).`,
        },
      });

      return hov;
    });

    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    return NextResponse.json(
      { error: 'Gagal membuat pengalihan hak pinjam: ' + String(err) },
      { status: 500 }
    );
  }
}
