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
    const { action, assignments, rejectionReason } = body;

    const existingReq = await prisma.loanRequest.findUnique({
      where: { id },
      include: {
        employee: true,
        items: {
          include: {
            tool: true,
            inventory: true,
          },
        },
      },
    });

    if (!existingReq) {
      return NextResponse.json({ error: 'Permintaan peminjaman tidak ditemukan.' }, { status: 404 });
    }

    // 1. ADMIN_PREPARE: Admin memindai QR Code unit tool & klik OK / Siap Diambil
    if (action === 'ADMIN_PREPARE') {
      if (session.role === 'OPERATOR') {
        return NextResponse.json({ error: 'Hanya Admin Tool Room yang dapat menyiapkan barang.' }, { status: 403 });
      }
      if (existingReq.status !== 'MENUNGGU_ADMIN') {
        return NextResponse.json(
          { error: `Request berstatus "${existingReq.status}" dan tidak dapat diproses ulang.` },
          { status: 400 }
        );
      }

      const assignmentMap = new Map<string, string[]>();
      if (Array.isArray(assignments)) {
        for (const a of assignments) {
          if (a.requestItemId && Array.isArray(a.unitIds)) {
            assignmentMap.set(a.requestItemId, a.unitIds);
          }
        }
      }

      // Validasi seluruh item TOOL wajib memiliki unit QR sejumlah requestedQty
      const allAssignedUnitIds: string[] = [];
      for (const item of existingReq.items) {
        if (item.itemType === 'TOOL') {
          const unitIds = assignmentMap.get(item.id) || [];
          if (unitIds.length !== item.requestedQty) {
            return NextResponse.json(
              {
                error: `Item "${item.tool?.name}" membutuhkan scan tepat ${item.requestedQty} unit QR (baru terpindai ${unitIds.length}).`,
              },
              { status: 400 }
            );
          }
          const uniqueSet = new Set(unitIds);
          if (uniqueSet.size !== unitIds.length) {
            return NextResponse.json(
              { error: `Terdapat duplikasi scan unit QR pada item "${item.tool?.name}".` },
              { status: 400 }
            );
          }
          allAssignedUnitIds.push(...unitIds);
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        // Verifikasi & kunci seluruh ToolUnit yang discan Admin
        for (const item of existingReq.items) {
          if (item.itemType === 'TOOL') {
            const unitIds = assignmentMap.get(item.id) || [];
            const dbUnits = await tx.toolUnit.findMany({
              where: { id: { in: unitIds } },
            });

            if (dbUnits.length !== unitIds.length) {
              throw new Error('Sebagian kode unit QR tidak ditemukan di database.');
            }
            for (const u of dbUnits) {
              if (u.toolId !== item.toolId) {
                throw new Error(`Unit ${u.unitCode} bukan milik perkakas "${item.tool?.name}".`);
              }
              if (u.status !== 'TERSEDIA') {
                throw new Error(`Unit ${u.unitCode} tidak tersedia (status saat ini: ${u.status}).`);
              }
            }

            await tx.toolUnit.updateMany({
              where: { id: { in: unitIds } },
              data: { status: 'DISIAPKAN' },
            });

            await tx.loanRequestItem.update({
              where: { id: item.id },
              data: { assignedUnitIds: JSON.stringify(unitIds) },
            });
          }
        }

        const reqUpdated = await tx.loanRequest.update({
          where: { id },
          data: {
            status: 'SIAP_DIAMBIL',
            adminId: session.id,
          },
        });

        await tx.notification.create({
          data: {
            title: `Barang Siap Diambil (${existingReq.requestNumber})`,
            message: `Admin ${session.name} telah menyiapkan unit QR yang Anda ajukan. Cek fisik & klik Terima di portal Anda.`,
            type: 'INFO',
            targetRole: 'OPERATOR',
            employeeId: existingReq.employeeId,
            link: '/operator',
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'SIAPKAN_REQUEST_PINJAM',
            adminId: session.id,
            adminName: session.name || 'Admin',
            details: `Admin menyiapkan request ${existingReq.requestNumber} untuk ${existingReq.employee.name} (${allAssignedUnitIds.length} unit QR dipindai).`,
          },
        });

        return reqUpdated;
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // 2. ADMIN_REJECT: Admin menolak pengajuan sebelum disiapkan
    if (action === 'ADMIN_REJECT') {
      if (session.role === 'OPERATOR') {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
      }
      if (existingReq.status !== 'MENUNGGU_ADMIN') {
        return NextResponse.json({ error: 'Status request sudah tidak dapat ditolak.' }, { status: 400 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.loanRequest.update({
          where: { id },
          data: {
            status: 'DITOLAK',
            adminId: session.id,
            rejectionReason: rejectionReason?.trim() || 'Ditolak oleh Admin Tool Room',
          },
        });

        await tx.notification.create({
          data: {
            title: `Request Ditolak (${existingReq.requestNumber})`,
            message: rejectionReason?.trim() || 'Permintaan pinjam Anda ditolak oleh Admin Tool Room.',
            type: 'WARNING',
            targetRole: 'OPERATOR',
            employeeId: existingReq.employeeId,
            link: '/operator',
          },
        });

        return res;
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // 3. OPERATOR_ACCEPT: Operator mengecek fisik & klik Terima -> resmi menjadi LoanTransaction DIPINJAM
    if (action === 'OPERATOR_ACCEPT') {
      if (session.role === 'OPERATOR' && existingReq.employeeId !== session.employeeId) {
        return NextResponse.json({ error: 'Anda hanya dapat mengonfirmasi request milik Anda sendiri.' }, { status: 403 });
      }
      if (existingReq.status !== 'SIAP_DIAMBIL') {
        return NextResponse.json(
          { error: 'Barang belum berstatus SIAP_DIAMBIL oleh Admin Tool Room.' },
          { status: 400 }
        );
      }

      const now = new Date();
      const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const rand = Math.floor(1000 + Math.random() * 9000);
      const transactionNumber = `LOAN-${ym}-${rand}`;

      const result = await prisma.$transaction(async (tx) => {
        const loanItemsToCreate: Array<{
          itemType: string;
          toolId?: string | null;
          toolUnitId?: string | null;
          inventoryId?: string | null;
          currentHolderId: string;
          quantity: number;
          status: string;
        }> = [];

        for (const reqItem of existingReq.items) {
          if (reqItem.itemType === 'TOOL' && reqItem.toolId) {
            let unitIds: string[] = [];
            try {
              unitIds = reqItem.assignedUnitIds ? JSON.parse(reqItem.assignedUnitIds) : [];
            } catch {
              unitIds = [];
            }
            if (unitIds.length !== reqItem.requestedQty) {
              throw new Error('Data unit QR yang disiapkan tidak lengkap.');
            }

            const tool = await tx.tool.findUnique({ where: { id: reqItem.toolId } });
            if (!tool || tool.availableStock < unitIds.length) {
              throw new Error(`Stok "${tool?.name}" tidak mencukupi untuk diserahterimakan.`);
            }

            await tx.tool.update({
              where: { id: tool.id },
              data: {
                availableStock: { decrement: unitIds.length },
                borrowedStock: { increment: unitIds.length },
              },
            });

            await tx.toolUnit.updateMany({
              where: { id: { in: unitIds } },
              data: { status: 'DIPINJAM' },
            });

            for (const uid of unitIds) {
              loanItemsToCreate.push({
                itemType: 'TOOL',
                toolId: tool.id,
                toolUnitId: uid,
                currentHolderId: existingReq.employeeId,
                quantity: 1,
                status: 'DIPINJAM',
              });
            }
          } else if (reqItem.itemType === 'INVENTORY' && reqItem.inventoryId) {
            const inv = await tx.inventory.findUnique({ where: { id: reqItem.inventoryId } });
            if (!inv || inv.availableStock < reqItem.requestedQty) {
              throw new Error(`Stok "${inv?.name}" tidak mencukupi.`);
            }

            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                availableStock: { decrement: reqItem.requestedQty },
                borrowedStock: { increment: reqItem.requestedQty },
              },
            });

            loanItemsToCreate.push({
              itemType: 'INVENTORY',
              inventoryId: inv.id,
              currentHolderId: existingReq.employeeId,
              quantity: reqItem.requestedQty,
              status: 'DIPINJAM',
            });
          }
        }

        const adminUserId = existingReq.adminId || session.id;
        const loanTx = await tx.loanTransaction.create({
          data: {
            transactionNumber,
            employeeId: existingReq.employeeId,
            adminId: adminUserId,
            expectedReturnDate: existingReq.expectedReturnDate,
            purpose: existingReq.purpose || 'Peminjaman Request Operator',
            notes: `Dikonfirmasi dari request ${existingReq.requestNumber}`,
            status: 'DIPINJAM',
            items: {
              create: loanItemsToCreate,
            },
          },
          include: { items: true },
        });

        const updatedReq = await tx.loanRequest.update({
          where: { id },
          data: {
            status: 'DITERIMA',
            loanTransactionId: loanTx.id,
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'TERIMA_REQUEST_PINJAM',
            adminId: session.id,
            adminName: existingReq.employee.name,
            details: `Operator ${existingReq.employee.name} (${existingReq.employee.nik}) menerima fisik barang request ${existingReq.requestNumber} → Transaksi aktif ${transactionNumber}.`,
          },
        });

        return { updatedReq, loanTx };
      });

      return NextResponse.json({ success: true, data: result.updatedReq, loan: result.loanTx });
    }

    // 4. OPERATOR_REJECT / CANCEL: Operator menolak barang yang disiapkan atau membatalkan request
    if (action === 'OPERATOR_REJECT' || action === 'CANCEL') {
      if (session.role === 'OPERATOR' && existingReq.employeeId !== session.employeeId) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
      }
      if (!['MENUNGGU_ADMIN', 'SIAP_DIAMBIL'].includes(existingReq.status)) {
        return NextResponse.json({ error: 'Request ini sudah selesai diproses.' }, { status: 400 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        for (const reqItem of existingReq.items) {
          if (reqItem.assignedUnitIds) {
            try {
              const ids = JSON.parse(reqItem.assignedUnitIds) as string[];
              if (Array.isArray(ids) && ids.length > 0) {
                await tx.toolUnit.updateMany({
                  where: { id: { in: ids }, status: 'DISIAPKAN' },
                  data: { status: 'TERSEDIA' },
                });
              }
            } catch {
              // ignore
            }
          }
        }

        const nextStatus = action === 'CANCEL' ? 'DIBATALKAN' : 'DITOLAK';
        const res = await tx.loanRequest.update({
          where: { id },
          data: {
            status: nextStatus,
            rejectionReason:
              rejectionReason?.trim() ||
              (action === 'CANCEL'
                ? 'Dibatalkan oleh Operator'
                : 'Ditolak oleh Operator saat pengecekan fisik'),
          },
        });

        await tx.notification.create({
          data: {
            title: `Request ${nextStatus === 'DITOLAK' ? 'Ditolak Operator' : 'Dibatalkan'} (${existingReq.requestNumber})`,
            message: `${existingReq.employee.name} ${nextStatus === 'DITOLAK' ? 'menolak penerimaan barang' : 'membatalkan pengajuan'}. Unit QR otomatis dikembalikan ke status TERSEDIA.`,
            type: 'WARNING',
            targetRole: 'ADMIN',
            link: '/requests',
          },
        });

        return res;
      });

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ error: 'Aksi tidak dikenali.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || 'Gagal memproses request pinjam.' }, { status: 400 });
  }
}
