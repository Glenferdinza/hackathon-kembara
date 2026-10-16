import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // all, tools, inventories, loans, overdue

    const workbook = XLSX.utils.book_new();
    const dateStr = new Date().toISOString().slice(0, 10);

    // 1. Sheet Tools
    if (type === 'all' || type === 'tools') {
      const tools = await prisma.tool.findMany({
        include: { category: true },
        orderBy: { code: 'asc' },
      });

      const toolRows = tools.map((t, idx) => ({
        'NO': idx + 1,
        'KODE TOOL': t.code,
        'NAMA TOOL': t.name,
        'KATEGORI': t.category.name,
        'SPESIFIKASI': t.specifications || '-',
        'SATUAN': t.unit,
        'TOTAL STOK': t.totalStock,
        'STOK TERSEDIA': t.availableStock,
        'SEDANG DIPINJAM': t.borrowedStock,
        'DALAM PERBAIKAN': t.repairStock,
        'RUSAK/AFKIR': t.scrapStock,
        'LOKASI RAK': t.location,
        'KONDISI': t.condition,
        'STATUS': t.status,
      }));

      const wsTools = XLSX.utils.json_to_sheet(toolRows);
      XLSX.utils.book_append_sheet(workbook, wsTools, 'Master Tool');
    }

    // 2. Sheet Inventaris
    if (type === 'all' || type === 'inventories') {
      const inventories = await prisma.inventory.findMany({
        include: { category: true },
        orderBy: { code: 'asc' },
      });

      const invRows = inventories.map((i, idx) => ({
        'NO': idx + 1,
        'KODE INVENTARIS': i.code,
        'NAMA BARANG': i.name,
        'KATEGORI': i.category.name,
        'MEREK': i.brand || '-',
        'MODEL': i.model || '-',
        'SERIAL NUMBER': i.serialNumber || '-',
        'TIPE TRACKING': i.trackingType,
        'SATUAN': i.unit,
        'TOTAL STOK': i.totalStock,
        'STOK TERSEDIA': i.availableStock,
        'SEDANG DIPINJAM': i.borrowedStock,
        'DALAM PERBAIKAN': i.repairStock,
        'LOKASI': i.location,
        'KONDISI': i.condition,
        'STATUS': i.status,
      }));

      const wsInv = XLSX.utils.json_to_sheet(invRows);
      XLSX.utils.book_append_sheet(workbook, wsInv, 'Master Inventaris');
    }

    // 3. Sheet Peminjaman & Keterlambatan
    if (type === 'all' || type === 'loans' || type === 'overdue') {
      const now = new Date();
      const loans = await prisma.loanTransaction.findMany({
        include: {
          employee: true,
          admin: true,
          items: {
            include: { tool: true, inventory: true },
          },
        },
        orderBy: { loanDate: 'desc' },
      });

      const loanRows = loans.map((l, idx) => {
        const expTime = new Date(l.expectedReturnDate).getTime();
        const diffHours = Math.round((expTime - now.getTime()) / (1000 * 60 * 60));
        let computedStatus = l.status;
        if (l.status !== 'SELESAI') {
          if (diffHours < 0) computedStatus = 'TERLAMBAT';
          else if (diffHours <= 24) computedStatus = 'MENDEKATI_JATUH_TEMPO';
          else computedStatus = 'DIPINJAM';
        }

        const itemsStr = l.items
          .map((it) => (it.tool ? `${it.tool.code} (${it.quantity})` : `${it.inventory?.code} (${it.quantity})`))
          .join(', ');

        return {
          'NO': idx + 1,
          'NO. TRANSAKSI': l.transactionNumber,
          'ID KARYAWAN (NIK)': l.employee.nik,
          'NAMA PEMINJAM': l.employee.name,
          'DEPARTEMEN': l.employee.department,
          'NO. TELEPON': l.employee.phone || '-',
          'DAFTAR BARANG': itemsStr,
          'TANGGAL PINJAM': new Date(l.loanDate).toLocaleString('id-ID'),
          'TENGGAT KEMBALI': new Date(l.expectedReturnDate).toLocaleString('id-ID'),
          'STATUS': computedStatus,
          'KEPERLUAN': l.purpose || '-',
          'OPERATOR ADMIN': l.admin.name,
        };
      });

      const wsLoans = XLSX.utils.json_to_sheet(loanRows);
      XLSX.utils.book_append_sheet(workbook, wsLoans, 'Riwayat Transaksi');
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Laporan_ERP_PT_YPTI_${type}_${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal mengekspor file Excel: ' + String(err) }, { status: 500 });
  }
}
