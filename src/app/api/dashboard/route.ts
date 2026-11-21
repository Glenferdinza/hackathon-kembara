import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const summaryOnly = searchParams.get('summaryOnly') === '1';
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

    // 3. Transactions KPIs (hanya muat transaksi aktif di database, hindari scan seluruh riwayat SELESAI)
    const activeLoans = await prisma.loanTransaction.findMany({
      where: { status: { not: 'SELESAI' } },
      include: {
        employee: true,
        items: {
          include: {
            tool: true,
            inventory: true,
            currentHolder: {
              select: { id: true, nik: true, name: true, department: true, phone: true },
            },
          },
        },
      },
      orderBy: { expectedReturnDate: 'asc' },
    });

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

    // 4. Combined Stock Table (Zero Alarm Fatigue: hanya alert bila unit tersedia berkurang menyentuh/di bawah minStock, bukan saat 1/1 unit penuh di rak)
    const allStockItems = [
      ...tools.map((t) => {
        const effectiveMin = t.minStock > 0 ? t.minStock : 0;
        const isLowStock =
          t.totalStock > 0 &&
          (effectiveMin > 0
            ? t.availableStock <= effectiveMin && t.availableStock < t.totalStock
            : t.availableStock === 0);
        return {
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
          minStock: effectiveMin,
          isLowStock,
        };
      }),
      ...inventories.map((i) => {
        const effectiveMin = i.minStock > 0 ? i.minStock : 0;
        const isLowStock =
          i.totalStock > 0 &&
          (effectiveMin > 0
            ? i.availableStock <= effectiveMin && i.availableStock < i.totalStock
            : i.availableStock === 0);
        return {
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
          minStock: effectiveMin,
          isLowStock,
        };
      }),
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

    // 7. Action Items Panel ("Menunggu Tindakan") + Urgent Classification
    const [pendingRequestsCount, activeToolUnits] = await Promise.all([
      prisma.loanRequest.count({ where: { status: 'MENUNGGU_ADMIN' } }),
      prisma.toolUnit.findMany({
        where: { status: { in: ['TERSEDIA', 'DISIAPKAN', 'DIPINJAM'] } },
        select: {
          maxLifeMinutes: true,
          remainingLifeMinutes: true,
          tool: { select: { lifeAlertPercent: true } },
        },
      }),
    ]);

    let criticalLifeCount = 0;
    for (const unit of activeToolUnits) {
      if (unit.maxLifeMinutes > 0) {
        const pct = (unit.remainingLifeMinutes / unit.maxLifeMinutes) * 100;
        const alertPct = unit.tool?.lifeAlertPercent || 15;
        if (pct <= alertPct) criticalLifeCount++;
      }
    }

    const actionItems: Array<{
      id: string;
      dismissKey: string;
      type: string;
      urgent: boolean;
      title: string;
      description: string;
      link: string;
    }> = [];

    if (overdueCount > 0) {
      actionItems.push({
        id: 'act-overdue',
        dismissKey: `act-overdue:${overdueCount}`,
        type: 'DANGER',
        urgent: true,
        title: 'Tindak Lanjut Keterlambatan',
        description: `${overdueCount} transaksi telah melewati tenggat waktu pengembalian. Segera hubungi peminjam via WhatsApp.`,
        link: '/monitoring',
      });
    }
    if (pendingRequestsCount > 0) {
      actionItems.push({
        id: 'act-pending-requests',
        dismissKey: `act-pending-requests:${pendingRequestsCount}`,
        type: 'DANGER',
        urgent: true,
        title: 'Antrean Request Pinjam Baru',
        description: `${pendingRequestsCount} pengajuan pinjaman operator menunggu disiapkan dan scan barcode unit.`,
        link: '/requests',
      });
    }
    if (criticalLifeCount > 0) {
      actionItems.push({
        id: 'act-critical-life',
        dismissKey: `act-critical-life:${criticalLifeCount}`,
        type: 'DANGER',
        urgent: true,
        title: 'Peringatan Umur Pakai Kritis',
        description: `${criticalLifeCount} unit perkakas mendekati batas umur pakai kritis. Perlu pengecekan dan jadwal pengasahan segera.`,
        link: '/scan-tool',
      });
    }
    if (dueSoonCount > 0) {
      actionItems.push({
        id: 'act-due-soon',
        dismissKey: `act-due-soon:${dueSoonCount}`,
        type: 'WARNING',
        urgent: false,
        title: 'Jatuh Tempo Hari Ini',
        description: `${dueSoonCount} transaksi jatuh tempo dalam waktu kurang dari 24 jam shift kerja.`,
        link: '/monitoring',
      });
    }
    if (lowStockCount > 0) {
      actionItems.push({
        id: 'act-low-stock',
        dismissKey: `act-low-stock:${lowStockCount}`,
        type: 'WARNING',
        urgent: false,
        title: 'Peringatan Stok Menipis',
        description: `${lowStockCount} barang memiliki stok siap pakai di bawah batas minimum. Perlu pengadaan stok baru.`,
        link: '/master-tool',
      });
    }
    if (totalRepair > 0) {
      actionItems.push({
        id: 'act-repair',
        dismissKey: `act-repair:${totalRepair}`,
        type: 'INFO',
        urgent: false,
        title: 'Verifikasi Barang Rusak / Asah',
        description: `${totalRepair} unit barang berada di status perlu asah atau perbaikan.`,
        link: '/history?tab=umur_pakai',
      });
    }

    // 8. Upcoming & Active Due Loans (arah pemegang fisik terakhir / currentHolder)
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

      const activeHolder =
        l.items.find((it) => it.status === 'DIPINJAM' && it.currentHolder && it.currentHolder.id !== l.employee.id)
          ?.currentHolder ||
        l.items.find((it) => it.status === 'DIPINJAM' && it.currentHolder)?.currentHolder ||
        l.employee;

      return {
        id: l.id,
        transactionNumber: l.transactionNumber,
        borrowerName: activeHolder.name,
        borrowerNik: activeHolder.nik,
        borrowerDept: activeHolder.department,
        borrowerPhone: activeHolder.phone,
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

    // 9. Notifications (khusus role Admin / Umum, cegah kebocoran notif privat OPERATOR)
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [{ targetRole: null }, { targetRole: { in: ['ADMIN', 'ALL'] } }],
      },
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
      barChartData: summaryOnly ? [] : barChartData,
      donutChartData: summaryOnly ? [] : donutChartData,
      actionItems,
      upcomingLoans: summaryOnly ? [] : upcomingLoans,
      allStockItems: summaryOnly ? [] : allStockItems,
      notifications,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat analitik dashboard: ' + String(error) }, { status: 500 });
  }
}
