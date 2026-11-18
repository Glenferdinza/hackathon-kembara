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
      return NextResponse.json({ error: 'Sesi autentikasi tidak valid.' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { action, notes } = body;

    const handover = await prisma.shiftHandover.findUnique({
      where: { id },
      include: {
        fromEmployee: true,
        toEmployee: true,
        toolUnit: true,
        loanItem: {
          include: { tool: true, inventory: true },
        },
      },
    });

    if (!handover) {
      return NextResponse.json({ error: 'Data pengalihan shift tidak ditemukan.' }, { status: 404 });
    }

    if (handover.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Pengalihan shift sudah diproses dengan status ${handover.status}.` },
        { status: 400 }
      );
    }

    if (action === 'ACCEPT') {
      if (session.role === 'OPERATOR' && session.employeeId !== handover.toEmployeeId) {
        return NextResponse.json(
          { error: 'Hanya Operator tujuan pengalihan yang berhak menerima serah terima ini.' },
          { status: 403 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.loanItem.update({
          where: { id: handover.loanItemId },
          data: { currentHolderId: handover.toEmployeeId },
        });

        const res = await tx.shiftHandover.update({
          where: { id },
          data: {
            status: 'ACCEPTED',
            respondedAt: new Date(),
            conditionNotes: notes?.trim()
              ? `${handover.conditionNotes ? handover.conditionNotes + ' | ' : ''}Penerima: ${notes.trim()}`
              : handover.conditionNotes,
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'TERIMA_PENGALIHAN_SHIFT',
            adminId: session.id,
            adminName: handover.toEmployee.name,
            details: `${handover.toEmployee.name} (${handover.toEmployee.nik}) menerima hak pinjam ${handover.handoverNumber} dari ${handover.fromEmployee.name} untuk ${handover.toolUnit?.unitCode || handover.loanItem.tool?.name || handover.loanItem.inventory?.name}.`,
          },
        });

        return res;
      });

      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'REJECT' || action === 'CANCEL') {
      const isRecipient = session.employeeId === handover.toEmployeeId;
      const isSender = session.employeeId === handover.fromEmployeeId;
      if (session.role === 'OPERATOR' && !isRecipient && !isSender) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
      }

      const nextStatus = action === 'CANCEL' ? 'CANCELLED' : 'REJECTED';
      const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.shiftHandover.update({
          where: { id },
          data: {
            status: nextStatus,
            respondedAt: new Date(),
            conditionNotes: notes?.trim()
              ? `${handover.conditionNotes ? handover.conditionNotes + ' | ' : ''}${nextStatus}: ${notes.trim()}`
              : handover.conditionNotes,
          },
        });

        if (nextStatus === 'REJECTED') {
          await tx.notification.create({
            data: {
              title: `Pengalihan Shift Ditolak (${handover.handoverNumber})`,
              message: `${handover.toEmployee.name} menolak serah terima item ${handover.toolUnit?.unitCode || handover.loanItem.tool?.name}. Tanggung jawab barang tetap berada pada Anda.`,
              type: 'DANGER',
              targetRole: 'OPERATOR',
              employeeId: handover.fromEmployeeId,
              link: '/operator',
            },
          });
        }

        await tx.auditLog.create({
          data: {
            action: nextStatus === 'REJECTED' ? 'TOLAK_PENGALIHAN_SHIFT' : 'BATAL_PENGALIHAN_SHIFT',
            adminId: session.id,
            adminName: session.name || 'Operator',
            details: `Pengalihan shift ${handover.handoverNumber} berstatus ${nextStatus} (${notes || 'tanpa catatan tambahan'}).`,
          },
        });

        return res;
      });

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ error: 'Aksi tidak dikenali.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Gagal memproses persetujuan pengalihan shift: ' + String(err) },
      { status: 500 }
    );
  }
}
