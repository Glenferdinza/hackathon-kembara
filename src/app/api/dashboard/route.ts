import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();

    // 1. Tool KPIs
    const tools = await prisma.tool.findMany({
      where: { status: 'AKTIF' },
      include: { category: true },
      orderBy: { code: 'asc' },
    });

    const totalToolTypes = tools.length;
    const totalToolUnits = tools.reduce((acc, t) => acc + t.totalStock, 0);
    const availableTools = tools.reduce((acc, t) => acc + t.availableStock, 0);
    const borrowedTools = tools.reduce((acc, t) => acc + t.borrowedStock, 0);
    const repairTools = tools.reduce((acc, t) => acc + t.repairStock, 0);
    const scrapTools = tools.reduce((acc, t) => acc + t.scrapStock, 0);

    // 2. Inventory KPIs
    const inventories = await prisma.inventory.findMany({
      where: { status: 'AKTIF' },
      include: { category: true },
      orderBy: { code: 'asc' },
    });

    const totalInventoryTypes = inventories.length;
    const totalInventoryUnits = inventories.reduce((acc, i) => acc + i.totalStock, 0);
    const availableInventories = inventories.reduce((acc, i) => acc + i.availableStock, 0);
    const borrowedInventories = inventories.reduce((acc, i) => acc + i.borrowedStock, 0);
    const repairInventories = inventories.reduce((acc, i) => acc + i.repairStock, 0);
    const scrapInventories = inventories.reduce((acc, i) => acc + i.scrapStock, 0);

    // 3. Transactions KPIs
    const allLoans = await prisma.loanTransaction.findMany({
      include: {
        employee: true,
        items: {
          include: {
            tool: true,
            inventory: true,
          },
        },
      },
      orderBy: { expectedReturnDate: 'asc' },
    });

    // Auto-update status based on current time
    const activeLoans = allLoans.filter((l) => l.status !== 'SELESAI');
    
    let overdueCount = 0;
    let dueSoonCount = 0;

    for (const loan of activeLoans) {
      const exp = new Date(loan.expectedReturnDate).getTime();
      const diffHours = (exp - now.getTime()) / (1000 * 60 * 60);

      if (diffHours < 0) {
        overdueCount++;
      } else if (diffHours <= 24) {
        dueSoonCount++;
      }
    }

    // 4. Combined Stock Table (Flowchart Hal. 2: Stok Barang)
    const allStockItems = [
      ...tools.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        type: 'Tool',
        category: t.category.name,
        location: t.location,
        unit: t.unit,
        totalStock: t.totalStock,
        availableStock: t.availableStock,
        borrowedStock: t.borrowedStock,
        repairStock: t.repairStock,
        scrapStock: t.scrapStock,
        minStock: t.minStock || 5,
        isLowStock: t.availableStock <= (t.minStock || 5),
      })),
      ...inventories.map((i) => ({
        id: i.id,
        code: i.code,
        name: i.name,
        type: 'Inventaris',
        category: i.category.name,
        location: i.location,
        unit: i.unit,
        totalStock: i.totalStock,
        availableStock: i.availableStock,
        borrowedStock: i.borrowedStock,
        repairStock: i.repairStock,
        scrapStock: i.scrapStock,
        minStock: i.minStock || 2,
        isLowStock: i.availableStock <= (i.minStock || 2),
      })),
    ];

    const lowStockCount = allStockItems.filter((i) => i.isLowStock).length;

    // 5. Bar Chart: Stock by Category
    const categoryStats: Record<string, { name: string; total: number; available: number; borrowed: number }> = {};
    for (const t of tools) {
      const catName = t.category.name;
      if (!categoryStats[catName]) {
        categoryStats[catName] = { name: catName, total: 0, available: 0, borrowed: 0 };
      }
      categoryStats[catName].total += t.totalStock;
      categoryStats[catName].available += t.availableStock;
      categoryStats[catName].borrowed += t.borrowedStock;
    }
    for (const inv of inventories) {
      const catName = inv.category.name;
      if (!categoryStats[catName]) {
        categoryStats[catName] = { name: catName, total: 0, available: 0, borrowed: 0 };
      }
      categoryStats[catName].total += inv.totalStock;
      categoryStats[catName].available += inv.availableStock;
      categoryStats[catName].borrowed += inv.borrowedStock;
    }

    const barChartData = Object.values(categoryStats);

    // 6. Donut Chart: Physical Stock Composition ("Kamar Stok")
    const totalPhysicalUnits = totalToolUnits + totalInventoryUnits;
    const totalAvailable = availableTools + availableInventories;
    const totalBorrowed = borrowedTools + borrowedInventories;
    const totalRepair = repairTools + repairInventories;
    const totalScrap = scrapTools + scrapInventories;

    const donutChartData = [
      { name: 'Stok Tersedia', value: totalAvailable, color: '#1E40AF' }, // Corporate Precision Blue
      { name: 'Sedang Dipinjam', value: totalBorrowed, color: '#64748B' }, // Slate Blue
      { name: 'Dalam Perbaikan', value: totalRepair, color: '#D97706' }, // Muted Amber
      { name: 'Rusak / Afkir', value: totalScrap, color: '#991B1B' }, // Deep Rose/Burgundy
    ];

    // 7. Action Items Panel ("Menunggu Tindakan")
    const actionItems = [];
    if (overdueCount > 0) {
      actionItems.push({
        id: 'act-overdue',
        type: 'DANGER',
        title: 'Tindak Lanjut Keterlambatan',
        description: `${overdueCount} transaksi telah melewati tenggat waktu pengembalian. Segera hubungi peminjam via WhatsApp.`,
        link: '/monitoring',
      });
    }
    if (dueSoonCount > 0) {
      actionItems.push({
        id: 'act-due-soon',
        type: 'WARNING',
        title: 'Jatuh Tempo Hari Ini',
        description: `${dueSoonCount} transaksi jatuh tempo dalam waktu kurang dari 24 jam shift kerja.`,
        link: '/monitoring',
      });
    }
    if (lowStockCount > 0) {
      actionItems.push({
        id: 'act-low-stock',
        type: 'WARNING',
        title: 'Peringatan Stok Menipis',
        description: `${lowStockCount} barang memiliki stok siap pakai di bawah batas minimum. Perlu pengadaan stok baru.`,
        link: '/master-tool',
      });
    }
    if (totalRepair > 0) {
      actionItems.push({
        id: 'act-repair',
        type: 'INFO',
        title: 'Verifikasi Barang Rusak / Servis',
        description: `${totalRepair} unit barang berada di status perbaikan atau memerlukan kalibrasi ulang.`,
        link: '/master-inventory',
      });
    }

    // 8. Upcoming & Active Due Loans (Flowchart Hal. 2: Sedang Dipinjam)
    const upcomingLoans = activeLoans.map((l) => {
      const exp = new Date(l.expectedReturnDate).getTime();
      const diffHours = (exp - now.getTime()) / (1000 * 60 * 60);
      const isOverdue = diffHours < 0;
      const isDueToday = !isOverdue && diffHours <= 24;
      const isDueH1 = !isOverdue && !isDueToday && diffHours <= 48;

      let statusLabel = 'Aman';
      if (isOverdue) statusLabel = 'Terlambat';
      else if (isDueToday) statusLabel = 'Hari Ini';
      else if (isDueH1) statusLabel = 'H-1';

      return {
        id: l.id,
        transactionNumber: l.transactionNumber,
        borrowerName: l.employee.name,
        borrowerNik: l.employee.nik,
        borrowerDept: l.employee.department,
        borrowerPhone: l.employee.phone,
        loanDate: l.loanDate,
        expectedReturnDate: l.expectedReturnDate,
        purpose: l.purpose,
        itemsCount: l.items.reduce((acc, it) => acc + it.quantity, 0),
        itemsSummary: l.items
          .map((it) => `${it.tool ? it.tool.name : it.inventory?.name} (${it.quantity})`)
          .filter(Boolean)
          .join(', '),
        status: isOverdue ? 'TERLAMBAT' : isDueToday ? 'MENDEKATI_JATUH_TEMPO' : 'DIPINJAM',
        statusLabel,
      };
    });

    // 9. Notifications (Flowchart Hal. 6)
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      kpi: {
        totalToolTypes,
        totalToolUnits,
        availableTools,
        borrowedTools,
        totalInventoryTypes,
        totalInventoryUnits,
        availableInventories,
        borrowedInventories,
        totalPhysicalUnits,
        totalAvailable,
        totalBorrowed,
        activeLoansCount: activeLoans.length,
        overdueLoansCount: overdueCount,
        dueSoonCount,
        lowStockCount,
      },
      barChartData,
      donutChartData,
      actionItems,
      upcomingLoans,
      allStockItems,
      notifications,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat analitik dashboard: ' + String(error) }, { status: 500 });
  }
}
