import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'transactions'; // transactions, usage, delinquency, lifespan, audit
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);
    const skip = (page - 1) * limit;

    // 1. RIWAYAT TRANSAKSI (HAL. 8 - TAB 1)
    if (tab === 'transactions') {
      const where: Record<string, unknown> = {};
      if (search) {
        where.OR = [
          { transactionNumber: { contains: search } },
          { employee: { name: { contains: search } } },
          { employee: { nik: { contains: search } } },
          { purpose: { contains: search } },
        ];
      }

      const [transactions, total] = await Promise.all([
        prisma.loanTransaction.findMany({
          where,
          include: {
            employee: true,
            admin: { select: { name: true, role: true } },
            items: {
              include: {
                tool: { select: { code: true, name: true, category: { select: { name: true } } } },
                inventory: { select: { code: true, name: true, category: { select: { name: true } } } },
              },
            },
            returns: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.loanTransaction.count({ where }),
      ]);

      return NextResponse.json({
        data: transactions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // 2. PEMAKAIAN & FREKUENSI (HAL. 8 - TAB 2)
    if (tab === 'usage') {
      const allLoanItems = await prisma.loanItem.findMany({
        include: {
          tool: { select: { id: true, code: true, name: true, category: { select: { name: true } }, totalStock: true, availableStock: true, minStock: true } },
          inventory: { select: { id: true, code: true, name: true, category: { select: { name: true } }, brand: true, totalStock: true, availableStock: true, minStock: true } },
        },
      });

      const usageMap: Record<string, {
        code: string;
        name: string;
        category: string;
        type: string;
        brand: string;
        totalStock: number;
        availableStock: number;
        minStock: number;
        timesBorrowed: number;
        totalQtyBorrowed: number;
      }> = {};

      allLoanItems.forEach((item: any) => {
        const itemObj = item.tool || item.inventory;
        if (!itemObj) return;
        const key = itemObj.code;
        if (!usageMap[key]) {
          usageMap[key] = {
            code: itemObj.code,
            name: itemObj.name,
            category: itemObj.category?.name || '-',
            type: itemObj.category?.name || '-',
            brand: itemObj.brand || '-',
            totalStock: itemObj.totalStock,
            availableStock: itemObj.availableStock,
            minStock: itemObj.minStock || 2,
            timesBorrowed: 0,
            totalQtyBorrowed: 0,
          };
        }
        usageMap[key].timesBorrowed += 1;
        usageMap[key].totalQtyBorrowed += item.quantity;
      });

      let usageList = Object.values(usageMap);
      if (search) {
        usageList = usageList.filter((u) =>
          u.code.toLowerCase().includes(search.toLowerCase()) ||
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.category.toLowerCase().includes(search.toLowerCase())
        );
      }
      usageList.sort((a, b) => b.totalQtyBorrowed - a.totalQtyBorrowed);

      return NextResponse.json({
        data: usageList,
        total: usageList.length,
      });
    }

    // 3. KETERLAMBATAN PER PEKERJA (HAL. 8 - TAB 3)
    if (tab === 'delinquency') {
      const employees = await prisma.employee.findMany({
        include: {
          loans: {
            where: {
              OR: [
                { status: 'TERLAMBAT' },
                {
                  status: 'SELESAI',
                  actualReturnDate: { not: null },
                },
              ],
            },
            include: {
              items: {
                include: { tool: true, inventory: true },
              },
            },
          },
        },
      });

      const delinquencyData = employees.map((emp) => {
        const overdueLoans = emp.loans.filter((l) => l.status === 'TERLAMBAT');
        const pastLateLoans = emp.loans.filter(
          (l) => l.status === 'SELESAI' && l.actualReturnDate && l.actualReturnDate > l.expectedReturnDate
        );
        const totalLateOccurrences = overdueLoans.length + pastLateLoans.length;

        return {
          id: emp.id,
          nik: emp.nik,
          name: emp.name,
          department: emp.department,
          shift: emp.shift || '-',
          phone: emp.phone || '-',
          status: emp.status,
          currentOverdueCount: overdueLoans.length,
          pastLateCount: pastLateLoans.length,
          totalLateCount: totalLateOccurrences,
          overdueDetails: overdueLoans.map((l) => ({
            loanNumber: l.transactionNumber,
            expectedReturn: l.expectedReturnDate,
            items: l.items.map((i) => i.tool?.name || i.inventory?.name).join(', '),
          })),
        };
      })
      .filter((d) => d.totalLateCount > 0 || (search ? d.name.toLowerCase().includes(search.toLowerCase()) || d.nik.toLowerCase().includes(search.toLowerCase()) : false))
      .sort((a, b) => b.currentOverdueCount - a.currentOverdueCount || b.totalLateCount - a.totalLateCount);

      return NextResponse.json({
        data: delinquencyData,
        total: delinquencyData.length,
      });
    }

    // 4. UMUR PAKAI & KONDISI (HAL. 8 - TAB 4)
    if (tab === 'lifespan') {
      const returns = await prisma.returnTransaction.findMany({
        include: {
          loanTransaction: {
            include: {
              employee: true,
              items: {
                include: { tool: true, inventory: true },
              },
            },
          },
        },
        orderBy: { returnDate: 'desc' },
      });

      const [tools, inventories] = await Promise.all([
        prisma.tool.findMany({
          select: {
            id: true,
            code: true,
            name: true,
            category: { select: { name: true } },
            totalStock: true,
            availableStock: true,
            repairStock: true,
            scrapStock: true,
          },
        }),
        prisma.inventory.findMany({
          select: {
            id: true,
            code: true,
            name: true,
            category: { select: { name: true } },
            totalStock: true,
            availableStock: true,
            repairStock: true,
            scrapStock: true,
          },
        }),
      ]);

      const conditionSummary = {
        totalReturns: returns.length,
        baikCount: returns.filter((r) => r.condition === 'BAIK').length,
        ausCount: returns.filter((r) => r.condition === 'AUS').length,
        rusakCount: returns.filter((r) => r.condition === 'RUSAK').length,
        hilangCount: returns.filter((r) => r.condition === 'HILANG').length,
      };

      const itemsInMaintenance = [
        ...tools.map((t) => ({ ...t, itemType: 'TOOL' as const, type: t.category?.name || '-' })),
        ...inventories.map((i) => ({ ...i, itemType: 'INVENTORY' as const, type: i.category?.name || '-' })),
      ].filter((i) => i.repairStock > 0 || i.scrapStock > 0);

      return NextResponse.json({
        summary: conditionSummary,
        maintenanceItems: itemsInMaintenance,
        returnLogs: returns.slice(0, 50),
      });
    }

    // 5. AUDIT LOGS (FALLBACK)
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { details: { contains: search } },
        { adminName: { contains: search } },
        { action: { contains: search } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal memuat log riwayat ' + String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, itemType } = body;

    if (action !== 'complete_repair' || !id || !itemType) {
      return NextResponse.json({ error: 'Parameter penyelesaian servis tidak valid.' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (itemType === 'TOOL') {
        const tool = await tx.tool.findUnique({ where: { id } });
        if (!tool || tool.repairStock <= 0) {
          throw new Error('Perkakas tidak memiliki antrean servis/regrind aktif.');
        }
        const restoredQty = tool.repairStock;
        const updated = await tx.tool.update({
          where: { id },
          data: {
            availableStock: { increment: restoredQty },
            repairStock: 0,
            condition: 'BAIK',
          },
        });
        await tx.auditLog.create({
          data: {
            action: 'SELESAI_SERVIS',
            adminName: 'Admin Tool Room',
            details: `Servis / Regrind selesai untuk ${tool.code} (${tool.name}). ${restoredQty} unit dikembalikan ke stok tersedia.`,
          },
        });
        return updated;
      } else {
        const inv = await tx.inventory.findUnique({ where: { id } });
        if (!inv || inv.repairStock <= 0) {
          throw new Error('Inventaris tidak memiliki antrean servis aktif.');
        }
        const restoredQty = inv.repairStock;
        const updated = await tx.inventory.update({
          where: { id },
          data: {
            availableStock: { increment: restoredQty },
            repairStock: 0,
            condition: 'BAIK',
          },
        });
        await tx.auditLog.create({
          data: {
            action: 'SELESAI_SERVIS',
            adminName: 'Admin Tool Room',
            details: `Servis selesai untuk ${inv.code} (${inv.name}). ${restoredQty} unit dikembalikan ke stok tersedia.`,
          },
        });
        return updated;
      }
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Gagal menyelesaikan servis.' },
      { status: 400 }
    );
  }
}
