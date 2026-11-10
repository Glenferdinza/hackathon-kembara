import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import * as XLSX from 'xlsx';

function sanitizeCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    str = str.replace(/^[=+\-@\t\r]+/, '');
  }
  return str;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Sesi login tidak sah atau telah berakhir.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'tool';
    const mode = (formData.get('mode') as string) || 'preview'; // preview or commit

    if (!file) {
      return NextResponse.json({ error: 'File Excel (.xlsx) wajib diunggah.' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file melebihi batas maksimal 5 MB.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = XLSX.utils.sheet_to_json<any>(worksheet);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'File Excel kosong atau tidak memiliki baris data.' }, { status: 400 });
    }

    const categories = await prisma.category.findMany();
    const catMap = Object.fromEntries(categories.map((c) => [c.code.toUpperCase(), c.id]));
    const defaultCatId = categories[0]?.id;

    if (type === 'tool') {
      const existingTools = await prisma.tool.findMany({ select: { code: true } });
      const existingCodes = new Set(existingTools.map((t) => t.code.toUpperCase()));

      const parsedRows = rows.map((r, index) => {
        const code = sanitizeCell(r['KODE TOOL'] || r['KODE'] || r['code']).toUpperCase();
        const name = sanitizeCell(r['NAMA TOOL'] || r['NAMA'] || r['name']);
        const catCode = sanitizeCell(r['KODE KATEGORI'] || r['KATEGORI']).toUpperCase();
        const specs = sanitizeCell(r['SPESIFIKASI']);
        const unit = (sanitizeCell(r['SATUAN']) || 'PCS').toUpperCase();
        const stockStr = sanitizeCell(r['JUMLAH STOK'] || r['STOK'] || '1');
        const location = sanitizeCell(r['LOKASI RAK'] || r['LOKASI']) || 'Gudang Utama';
        const condition = (sanitizeCell(r['KONDISI']) || 'BAIK').toUpperCase();

        const errors: string[] = [];
        if (!code) errors.push('Kode tool wajib diisi');
        if (!name) errors.push('Nama tool wajib diisi');
        if (existingCodes.has(code)) errors.push(`Kode ${code} sudah ada di database`);

        const categoryId = catMap[catCode] || defaultCatId;
        const totalStock = isNaN(parseInt(stockStr, 10)) ? 1 : Math.max(1, parseInt(stockStr, 10));

        return {
          rowNumber: index + 2,
          code,
          name,
          categoryId,
          categoryName: catCode || 'CUT',
          specifications: specs || null,
          unit,
          totalStock,
          location,
          condition: ['BAIK', 'PERAWATAN', 'RUSAK'].includes(condition) ? condition : 'BAIK',
          isValid: errors.length === 0,
          errors,
        };
      });

      if (mode === 'preview') {
        return NextResponse.json({
          type: 'tool',
          totalRows: parsedRows.length,
          validCount: parsedRows.filter((r) => r.isValid).length,
          invalidCount: parsedRows.filter((r) => !r.isValid).length,
          rows: parsedRows,
        });
      }

      // COMMIT MODE
      const validRows = parsedRows.filter((r) => r.isValid);
      let importedCount = 0;

      for (const row of validRows) {
        await prisma.tool.create({
          data: {
            code: row.code,
            name: row.name,
            categoryId: row.categoryId,
            specifications: row.specifications,
            unit: row.unit,
            totalStock: row.totalStock,
            availableStock: row.totalStock,
            borrowedStock: 0,
            repairStock: 0,
            scrapStock: 0,
            location: row.location,
            condition: row.condition,
            status: 'AKTIF',
          },
        });
        importedCount++;
      }

      await prisma.auditLog.create({
        data: {
          action: 'IMPORT_EXCEL',
          adminId: session?.id,
          adminName: session?.name || 'Admin',
          details: `Mengimpor ${importedCount} master tool dari file ${file.name}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil mengimpor ${importedCount} data master tool.`,
        importedCount,
        skippedCount: parsedRows.length - importedCount,
      });
    } else {
      // INVENTORY
      const existingInvs = await prisma.inventory.findMany({ select: { code: true } });
      const existingCodes = new Set(existingInvs.map((i) => i.code.toUpperCase()));

      const parsedRows = rows.map((r, index) => {
        const code = sanitizeCell(r['KODE INVENTARIS'] || r['KODE']).toUpperCase();
        const name = sanitizeCell(r['NAMA BARANG'] || r['NAMA']);
        const catCode = sanitizeCell(r['KODE KATEGORI']).toUpperCase();
        const brand = sanitizeCell(r['MEREK']);
        const model = sanitizeCell(r['MODEL']);
        const serialNumber = sanitizeCell(r['SERIAL NUMBER']);
        const trackingType = (sanitizeCell(r['TIPE TRACKING']) || (serialNumber ? 'INDIVIDUAL' : 'QUANTITATIVE')).toUpperCase();
        const unit = (sanitizeCell(r['SATUAN']) || 'UNIT').toUpperCase();
        const stockStr = sanitizeCell(r['JUMLAH STOK'] || '1');
        const location = sanitizeCell(r['LOKASI']) || 'Gudang Pusat';
        const condition = (sanitizeCell(r['KONDISI']) || 'BAIK').toUpperCase();

        const errors: string[] = [];
        if (!code) errors.push('Kode inventaris wajib diisi');
        if (!name) errors.push('Nama barang wajib diisi');
        if (existingCodes.has(code)) errors.push(`Kode ${code} sudah ada di database`);

        const categoryId = catMap[catCode] || defaultCatId;
        const totalStock = trackingType === 'INDIVIDUAL' ? 1 : isNaN(parseInt(stockStr, 10)) ? 1 : Math.max(1, parseInt(stockStr, 10));

        return {
          rowNumber: index + 2,
          code,
          name,
          categoryId,
          categoryName: catCode || 'IT',
          brand: brand || null,
          model: model || null,
          serialNumber: serialNumber || null,
          trackingType: trackingType === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'QUANTITATIVE',
          unit,
          totalStock,
          location,
          condition: ['BAIK', 'PERAWATAN', 'RUSAK'].includes(condition) ? condition : 'BAIK',
          isValid: errors.length === 0,
          errors,
        };
      });

      if (mode === 'preview') {
        return NextResponse.json({
          type: 'inventory',
          totalRows: parsedRows.length,
          validCount: parsedRows.filter((r) => r.isValid).length,
          invalidCount: parsedRows.filter((r) => !r.isValid).length,
          rows: parsedRows,
        });
      }

      // COMMIT MODE
      const validRows = parsedRows.filter((r) => r.isValid);
      let importedCount = 0;

      for (const row of validRows) {
        await prisma.inventory.create({
          data: {
            code: row.code,
            name: row.name,
            categoryId: row.categoryId,
            brand: row.brand,
            model: row.model,
            serialNumber: row.serialNumber,
            trackingType: row.trackingType,
            unit: row.unit,
            totalStock: row.totalStock,
            availableStock: row.totalStock,
            borrowedStock: 0,
            repairStock: 0,
            scrapStock: 0,
            location: row.location,
            condition: row.condition,
            status: 'AKTIF',
          },
        });
        importedCount++;
      }

      await prisma.auditLog.create({
        data: {
          action: 'IMPORT_EXCEL',
          adminId: session?.id,
          adminName: session?.name || 'Admin',
          details: `Mengimpor ${importedCount} master inventaris dari file ${file.name}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil mengimpor ${importedCount} data master inventaris.`,
        importedCount,
        skippedCount: parsedRows.length - importedCount,
      });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Gagal memproses file Excel: ' + String(err) }, { status: 500 });
  }
}
