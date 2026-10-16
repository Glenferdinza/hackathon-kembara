import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const condition = searchParams.get('condition') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
        { specifications: { contains: search } },
        { location: { contains: search } },
      ];
    }

    if (category) {
      where.categoryId = category;
    }

    if (condition) {
      where.condition = condition;
    }

    if (status) {
      where.status = status;
    }

    const [tools, total] = await Promise.all([
      prisma.tool.findMany({
        where,
        include: { category: true },
        orderBy: { code: 'asc' },
        skip,
        take: limit,
      }),
      prisma.tool.count({ where }),
    ]);

    return NextResponse.json({
      data: tools,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal memuat master data tool: ' + String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();

    const { code, name, categoryId, specifications, unit, totalStock, location, condition } = body;

    if (!code || !name || !categoryId || !location) {
      return NextResponse.json({ error: 'Kode, nama tool, kategori, dan lokasi rak wajib diisi.' }, { status: 400 });
    }

    const existing = await prisma.tool.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json({ error: `Kode tool "${code}" sudah terdaftar di sistem!` }, { status: 400 });
    }

    const stock = parseInt(totalStock || '1', 10);

    const tool = await prisma.tool.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        categoryId,
        specifications: specifications?.trim() || null,
        unit: (unit || 'PCS').toUpperCase(),
        totalStock: stock,
        availableStock: stock,
        borrowedStock: 0,
        repairStock: 0,
        scrapStock: 0,
        location: location.trim(),
        condition: condition || 'BAIK',
        status: 'AKTIF',
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'TAMBAH_TOOL',
        adminId: session?.id,
        adminName: session?.name || 'Admin',
        details: `Menambahkan master tool baru: ${tool.code} - ${tool.name} (Stok: ${tool.totalStock})`,
      },
    });

    return NextResponse.json({ success: true, data: tool });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal menyimpan master tool: ' + String(err) }, { status: 500 });
  }
}
