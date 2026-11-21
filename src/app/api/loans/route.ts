import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const employeeId = searchParams.get('employeeId') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const now = new Date();
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { transactionNumber: { contains: search, mode: 'insensitive' } },
        { employee: { name: { contains: search, mode: 'insensitive' } } },
        { employee: { nik: { contains: search, mode: 'insensitive' } } },
        { purpose: { contains: search, mode: 'insensitive' } },
        { items: { some: { toolUnit: { unitCode: { contains: search.toUpperCase(), mode: 'insensitive' } } } } },
        { items: { some: { currentHolder: { name: { contains: search, mode: 'insensitive' } } } } },
      ];
    }

    if (status) {
      if (status === 'TERLAMBAT') {
        where.status = { not: 'SELESAI' };
        where.expectedReturnDate = { lt: now };
      } else {
        where.status = status;
      }
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    const [loans, total] = await Promise.all([
      prisma.loanTransaction.findMany({
        where,
        include: {
          employee: true,
          admin: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              tool: { include: { category: true } },
              toolUnit: true,
              currentHolder: { select: { id: true, nik: true, name: true, shift: true, phone: true } },
              inventory: { include: { category: true } },
            },
          },
          returns: true,
        },
        orderBy: { loanDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.loanTransaction.count({ where }),
    ]);

    // Format loans with dynamic overdue logic
    const enrichedLoans = loans.map((l) => {
      let currentStatus = l.status;
      if (currentStatus !== 'SELESAI') {
        const expTime = new Date(l.expectedReturnDate).getTime();
        const diffMs = expTime - now.getTime();
        if (diffMs < 0) {
          currentStatus = 'TERLAMBAT';
        } else if (diffMs <= 24 * 60 * 60 * 1000) {
          currentStatus = 'MENDEKATI_JATUH_TEMPO';
        } else {
          currentStatus = 'DIPINJAM';
        }
      }

      return {
        ...l,
        computedStatus: currentStatus,
      };
    });

    return NextResponse.json({
      data: enrichedLoans,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal memuat daftar peminjaman: ' + String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();

    const { employeeId, expectedReturnDate, purpose, notes, items } = body;

    if (!employeeId || !expectedReturnDate || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Peminjam (karyawan), tenggat pengembalian, dan minimal 1 barang wajib diisi.' },
        { status: 400 }
      );
    }

    const expDate = new Date(expectedReturnDate);
    if (isNaN(expDate.getTime())) {
      return NextResponse.json({ error: 'Format tenggat pengembalian tidak valid.' }, { status: 400 });
    }

    // Sesi petugas loket wajib valid
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Akses ditolak. Sesi autentikasi tidak valid.' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { id: session.id } });
    if (!admin || admin.status === 'NONAKTIF') {
      return NextResponse.json({ error: 'Akun petugas tidak aktif atau tidak ditemukan.' }, { status: 403 });
    }

    // Generate unique transaction number with year and sequence: LOAN-YYYYMM-XXXX
    const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '');
    const prefix = `LOAN-${datePrefix}-`;
    const latestLoan = await prisma.loanTransaction.findFirst({
      where: { transactionNumber: { startsWith: prefix } },
      orderBy: { transactionNumber: 'desc' },
      select: { transactionNumber: true },
    });
    const lastSeq = latestLoan ? parseInt(latestLoan.transactionNumber.slice(prefix.length), 10) : 0;
    const seq = String((Number.isFinite(lastSeq) ? lastSeq : 0) + 1).padStart(4, '0');
    const transactionNumber = `${prefix}${seq}`;

    // Execute atomic transaction: Check stock -> Deduct available -> Add borrowed -> Create loan
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify employee
      const employee = await tx.employee.findUnique({ where: { id: employeeId } });
      if (!employee) {
        throw new Error('Data peminjam tidak ditemukan.');
      }
      if (employee.status === 'NONAKTIF') {
        throw new Error(`Karyawan ${employee.name} berstatus NONAKTIF dan tidak diizinkan meminjam.`);
      }

      const itemCreateData = [];

      // 2. Validate and adjust stock for each item
      for (const item of items) {
        const qty = parseInt(item.quantity || '1', 10);
        if (qty <= 0) {
          throw new Error('Jumlah peminjaman harus lebih besar dari 0.');
        }

        if (item.itemType === 'TOOL') {
          const tool = await tx.tool.findUnique({ where: { id: item.id } });
          if (!tool) {
            throw new Error(`Tool dengan ID ${item.id} tidak ditemukan.`);
          }
          if (tool.status !== 'AKTIF') {
            throw new Error(`Tool "${tool.name}" sedang nonaktif.`);
          }
          if (tool.availableStock < qty) {
            throw new Error(`Stok "${tool.name}" tidak mencukupi! Tersedia: ${tool.availableStock}, Diminta: ${qty}.`);
          }

          const totalUnitsForTool = await tx.toolUnit.count({ where: { toolId: tool.id } });
          if (totalUnitsForTool > 0) {
            let assignedUnits = [] as Array<{ id: string }>;

            if (item.toolUnitId) {
              const specificUnit = await tx.toolUnit.findUnique({ where: { id: String(item.toolUnitId) } });
              if (!specificUnit || specificUnit.toolId !== tool.id) {
                throw new Error(`Unit barcode yang dipilih tidak sesuai dengan master "${tool.name}".`);
              }
              if (specificUnit.status !== 'TERSEDIA') {
                throw new Error(`Unit ${specificUnit.unitCode} berstatus ${specificUnit.status} dan tidak dapat dipinjam.`);
              }
              assignedUnits = [{ id: specificUnit.id }];
              if (qty > 1) {
                const extraUnits = await tx.toolUnit.findMany({
                  where: { toolId: tool.id, status: 'TERSEDIA', id: { not: specificUnit.id } },
                  orderBy: { unitCode: 'asc' },
                  take: qty - 1,
                  select: { id: true },
                });
                assignedUnits.push(...extraUnits);
              }
            } else {
              assignedUnits = await tx.toolUnit.findMany({
                where: { toolId: tool.id, status: 'TERSEDIA' },
                orderBy: { unitCode: 'asc' },
                take: qty,
                select: { id: true },
              });
            }

            if (assignedUnits.length < qty) {
              throw new Error(
                `Unit fisik "${tool.name}" yang siap pinjam hanya ${assignedUnits.length} unit (sebagian sedang dikunci di antrean request operator).`
              );
            }

            await tx.toolUnit.updateMany({
              where: { id: { in: assignedUnits.map((u) => u.id) } },
              data: { status: 'DIPINJAM' },
            });

            await tx.tool.update({
              where: { id: tool.id },
              data: {
                availableStock: tool.availableStock - qty,
                borrowedStock: tool.borrowedStock + qty,
              },
            });

            for (const unit of assignedUnits) {
              itemCreateData.push({
                itemType: 'TOOL',
                toolId: tool.id,
                toolUnitId: unit.id,
                currentHolderId: employee.id,
                quantity: 1,
                returnedQuantity: 0,
                status: 'DIPINJAM',
              });
            }
          } else {
            // Legacy tool tanpa record ToolUnit individual
            await tx.tool.update({
              where: { id: tool.id },
              data: {
                availableStock: tool.availableStock - qty,
                borrowedStock: tool.borrowedStock + qty,
              },
            });

            itemCreateData.push({
              itemType: 'TOOL',
              toolId: tool.id,
              currentHolderId: employee.id,
              quantity: qty,
              returnedQuantity: 0,
              status: 'DIPINJAM',
            });
          }
        } else if (item.itemType === 'INVENTORY') {
          const inv = await tx.inventory.findUnique({ where: { id: item.id } });
          if (!inv) {
            throw new Error(`Inventaris dengan ID ${item.id} tidak ditemukan.`);
          }
          if (inv.status !== 'AKTIF') {
            throw new Error(`Inventaris "${inv.name}" sedang nonaktif.`);
          }
          if (inv.availableStock < qty) {
            throw new Error(`Stok "${inv.name}" tidak mencukupi! Tersedia: ${inv.availableStock}, Diminta: ${qty}.`);
          }

          // Atomically update Inventory stock
          await tx.inventory.update({
            where: { id: inv.id },
            data: {
              availableStock: inv.availableStock - qty,
              borrowedStock: inv.borrowedStock + qty,
            },
          });

          itemCreateData.push({
            itemType: 'INVENTORY',
            inventoryId: inv.id,
            currentHolderId: employee.id,
            quantity: qty,
            returnedQuantity: 0,
            status: 'DIPINJAM',
          });
        } else {
          throw new Error(`Tipe barang "${item.itemType}" tidak dikenal.`);
        }
      }

      // 3. Create Loan Transaction
      const loan = await tx.loanTransaction.create({
        data: {
          transactionNumber,
          employeeId: employee.id,
          adminId: admin.id,
          loanDate: new Date(),
          expectedReturnDate: expDate,
          status: 'DIPINJAM',
          purpose: purpose?.trim() || null,
          notes: notes?.trim() || null,
          items: {
            create: itemCreateData,
          },
        },
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

      // 4. Create Audit Log
      await tx.auditLog.create({
        data: {
          action: 'PINJAM_TOOL',
          adminId: admin.id,
          adminName: admin.name,
          details: `Mencatat peminjaman ${transactionNumber} untuk ${employee.name} (${employee.nik}). Total item: ${items.length}`,
        },
      });

      return loan;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// -------------------------------------------------------------
// PATCH: PERPANJANG TENGGAT JATUH TEMPO (Flowchart Hal. 2)
// -------------------------------------------------------------
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Akses ditolak. Sesi autentikasi tidak valid.' }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { id: session.id } });
    if (!admin || admin.status === 'NONAKTIF') {
      return NextResponse.json({ error: 'Akun petugas tidak aktif atau tidak ditemukan.' }, { status: 403 });
    }

    const body = await request.json();
    const { loanId, newExpectedReturnDate, reason } = body;

    if (!loanId || !newExpectedReturnDate) {
      return NextResponse.json({ error: 'ID peminjaman dan tanggal jatuh tempo baru wajib diisi.' }, { status: 400 });
    }

    const expDate = new Date(newExpectedReturnDate);
    if (isNaN(expDate.getTime()) || expDate <= new Date()) {
      return NextResponse.json({ error: 'Tanggal perpanjangan harus setelah waktu sekarang.' }, { status: 400 });
    }

    const loan = await prisma.loanTransaction.findUnique({
      where: { id: loanId },
      include: { employee: true },
    });

    if (!loan) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }
    if (loan.status === 'SELESAI') {
      return NextResponse.json({ error: 'Transaksi yang sudah selesai tidak dapat diperpanjang.' }, { status: 400 });
    }

    const updated = await prisma.loanTransaction.update({
      where: { id: loanId },
      data: {
        expectedReturnDate: expDate,
        status: 'DIPINJAM',
        notes: reason ? `${loan.notes ? loan.notes + ' | ' : ''}Perpanjangan: ${reason}` : loan.notes,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'PERPANJANG_PINJAMAN',
        adminName: admin.name,
        details: `Perpanjangan tenggat transaksi ${loan.transactionNumber} (${loan.employee.name}) hingga ${expDate.toLocaleString('id-ID')}. Alasan: ${reason || '-'}`,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

