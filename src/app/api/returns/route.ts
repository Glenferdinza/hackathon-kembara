import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();

    const { loanTransactionId, condition = 'BAIK', returnItems, notes } = body;

    if (!loanTransactionId || !returnItems || !Array.isArray(returnItems) || returnItems.length === 0) {
      return NextResponse.json({ error: 'ID transaksi peminjaman dan daftar unit yang dikembalikan wajib diisi.' }, { status: 400 });
    }

    if (!session || !session.id) {
      return NextResponse.json({ error: 'Akses ditolak. Sesi autentikasi tidak valid.' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { id: session.id } });
    if (!admin || admin.status === 'NONAKTIF') {
      return NextResponse.json({ error: 'Akun petugas tidak aktif atau tidak ditemukan.' }, { status: 403 });
    }

    const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await prisma.returnTransaction.count();
    const seq = String(count + 1).padStart(4, '0');
    const returnNumber = `RET-${datePrefix}-${seq}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch loan transaction with items
      const loan = await tx.loanTransaction.findUnique({
        where: { id: loanTransactionId },
        include: {
          items: true,
          employee: true,
        },
      });

      if (!loan) {
        throw new Error('Transaksi peminjaman tidak ditemukan.');
      }

      if (loan.status === 'SELESAI') {
        throw new Error('Transaksi ini sudah berstatus SELESAI.');
      }

      let totalReturnedQty = 0;

      // 2. Process each returned item
      for (const ret of returnItems) {
        const loanItem = loan.items.find((i) => i.id === ret.loanItemId);
        if (!loanItem) {
          throw new Error(`Item peminjaman dengan ID ${ret.loanItemId} tidak ditemukan pada transaksi ini.`);
        }

        const qtyToReturn = parseInt(ret.quantity || '1', 10);
        const remainingToReturn = loanItem.quantity - loanItem.returnedQuantity;

        if (qtyToReturn <= 0) {
          throw new Error('Jumlah unit pengembalian harus lebih dari 0.');
        }

        if (qtyToReturn > remainingToReturn) {
          throw new Error(
            `Jumlah pengembalian (${qtyToReturn}) melebihi sisa pinjaman (${remainingToReturn}) untuk item terkait!`
          );
        }

        const itemCondition = ret.condition || condition || 'BAIK';

        // Update Tool or Inventory physical stock
        if (loanItem.itemType === 'TOOL' && loanItem.toolId) {
          const tool = await tx.tool.findUnique({ where: { id: loanItem.toolId } });
          if (!tool) throw new Error('Tool tidak ditemukan di database.');

          const newBorrowed = Math.max(0, tool.borrowedStock - qtyToReturn);

          if (itemCondition === 'BAIK') {
            // Restore to available stock
            await tx.tool.update({
              where: { id: tool.id },
              data: {
                availableStock: tool.availableStock + qtyToReturn,
                borrowedStock: newBorrowed,
              },
            });
          } else if (itemCondition === 'AUS' || itemCondition === 'RUSAK' || itemCondition === 'PERBAIKAN') {
            // Move to repair stock, NOT available stock (Flowchart Hal. 4: Aus / Perawatan untuk regrind)
            await tx.tool.update({
              where: { id: tool.id },
              data: {
                repairStock: tool.repairStock + qtyToReturn,
                borrowedStock: newBorrowed,
                condition: 'PERAWATAN',
              },
            });
          } else {
            // HILANG / AFKIR
            await tx.tool.update({
              where: { id: tool.id },
              data: {
                scrapStock: tool.scrapStock + qtyToReturn,
                borrowedStock: newBorrowed,
                totalStock: Math.max(0, tool.totalStock - qtyToReturn), // Lost items reduce physical total
              },
            });
          }
        } else if (loanItem.itemType === 'INVENTORY' && loanItem.inventoryId) {
          const inv = await tx.inventory.findUnique({ where: { id: loanItem.inventoryId } });
          if (!inv) throw new Error('Inventaris tidak ditemukan di database.');

          const newBorrowed = Math.max(0, inv.borrowedStock - qtyToReturn);

          if (itemCondition === 'BAIK') {
            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                availableStock: inv.availableStock + qtyToReturn,
                borrowedStock: newBorrowed,
              },
            });
          } else if (itemCondition === 'AUS' || itemCondition === 'RUSAK' || itemCondition === 'PERBAIKAN') {
            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                repairStock: inv.repairStock + qtyToReturn,
                borrowedStock: newBorrowed,
                condition: 'PERAWATAN',
              },
            });
          } else {
            await tx.inventory.update({
              where: { id: inv.id },
              data: {
                scrapStock: inv.scrapStock + qtyToReturn,
                borrowedStock: newBorrowed,
                totalStock: Math.max(0, inv.totalStock - qtyToReturn),
              },
            });
          }
        }

        // Update LoanItem returned quantity
        const newReturnedQty = loanItem.returnedQuantity + qtyToReturn;
        const isItemComplete = newReturnedQty >= loanItem.quantity;

        await tx.loanItem.update({
          where: { id: loanItem.id },
          data: {
            returnedQuantity: newReturnedQty,
            status: isItemComplete ? (itemCondition === 'BAIK' ? 'SELESAI' : 'RUSAK') : 'DIPINJAM',
          },
        });

        totalReturnedQty += qtyToReturn;
      }

      // 3. Create ReturnTransaction
      const returnTx = await tx.returnTransaction.create({
        data: {
          returnNumber,
          loanTransactionId: loan.id,
          adminId: admin.id,
          returnDate: new Date(),
          condition,
          quantity: totalReturnedQty,
          notes: notes?.trim() || null,
        },
      });

      // 4. Check if the entire loan is now completed
      const updatedItems = await tx.loanItem.findMany({
        where: { loanTransactionId: loan.id },
      });

      const allDone = updatedItems.every((it) => it.returnedQuantity >= it.quantity);

      if (allDone) {
        await tx.loanTransaction.update({
          where: { id: loan.id },
          data: {
            status: 'SELESAI',
            actualReturnDate: new Date(),
          },
        });
      }

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          action: 'KEMBALI_TOOL',
          adminId: admin.id,
          adminName: admin.name,
          details: `Verifikasi pengembalian ${returnNumber} untuk transaksi ${loan.transactionNumber} (${totalReturnedQty} unit, kondisi: ${condition}). Status transaksi: ${allDone ? 'SELESAI' : 'PENGEMBALIAN_PARSIAL'}`,
        },
      });

      return { returnTx, allDone };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
