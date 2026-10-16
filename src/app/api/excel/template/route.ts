import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'tool';

    let data: Record<string, string | number>[] = [];
    let filename = 'Template_Master_Tool_PT_YPTI.xlsx';

    if (type === 'tool') {
      filename = 'Template_Master_Tool_PT_YPTI.xlsx';
      data = [
        {
          'KODE TOOL': 'TOL-901',
          'NAMA TOOL': 'Endmill Carbide D12 4-Flute',
          'KODE KATEGORI': 'CUT',
          'SPESIFIKASI': 'Solid Carbide AlTiN, HRC 55, Shank 12mm',
          'SATUAN': 'PCS',
          'JUMLAH STOK': 10,
          'LOKASI RAK': 'Rak A-03-B',
          'KONDISI': 'BAIK',
        },
        {
          'KODE TOOL': 'TOL-902',
          'NAMA TOOL': 'Pin Gauge Set 1.000 - 10.000mm',
          'KODE KATEGORI': 'MEAS',
          'SPESIFIKASI': 'Toleransi ±0.001mm Grade 1 Steel',
          'SATUAN': 'SET',
          'JUMLAH STOK': 2,
          'LOKASI RAK': 'Kabinet QC-03',
          'KONDISI': 'BAIK',
        },
      ];
    } else {
      filename = 'Template_Master_Inventaris_PT_YPTI.xlsx';
      data = [
        {
          'KODE INVENTARIS': 'INV-901',
          'NAMA BARANG': 'Pneumatic Impact Wrench 1/2 Inch',
          'KODE KATEGORI': 'POW',
          'MEREK': 'Ingersoll Rand',
          'MODEL': '231C 1/2"',
          'SERIAL NUMBER': 'IR-8821-440',
          'TIPE TRACKING': 'INDIVIDUAL',
          'SATUAN': 'UNIT',
          'JUMLAH STOK': 1,
          'LOKASI': 'Lemari Maintenance-01',
          'KONDISI': 'BAIK',
        },
        {
          'KODE INVENTARIS': 'INV-902',
          'NAMA BARANG': 'Sarung Tangan Safety Cut Resistant Level 5',
          'KODE KATEGORI': 'SAFE',
          'MEREK': 'Ansell',
          'MODEL': 'HyFlex 11-735',
          'SERIAL NUMBER': '',
          'TIPE TRACKING': 'QUANTITATIVE',
          'SATUAN': 'PASANG',
          'JUMLAH STOK': 50,
          'LOKASI': 'Gudang APD Rak 2',
          'KONDISI': 'BAIK',
        },
      ];
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, type === 'tool' ? 'Master Tool' : 'Master Inventaris');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal men-generate template: ' + String(err) }, { status: 500 });
  }
}
