import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const trackingType = searchParams.get('trackingType') || '';
    const condition = searchParams.get('condition') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.categoryId = category;
    }

    if (trackingType) {
      where.trackingType = trackingType;
    }

    if (condition) {
      where.condition = condition;
    }

    if (status) {
      where.status = status;
    }

    const [inventories, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: { category: true },
        orderBy: { code: 'asc' },
        skip,
        take: limit,
      }),
      prisma.inventory.count({ where }),
    ]);

    const res = NextResponse.json({
      data: inventories,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
    res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return res;
  } catch (err) {
    return NextResponse.json({ error: 'Gagal memuat master data inventaris: ' + String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Sesi login tidak sah atau telah berakhir.' }, { status: 401 });
    }
    if (!['SUPER_ADMIN', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Admin Tool Room yang berhak menambah inventaris.' }, { status: 403 });
    }
    const body = await request.json();

    const { code, name, categoryId, brand, model, serialNumber, trackingType, unit, totalStock, location, condition } = body;

    if (!code || !name || !categoryId || !location) {
      return NextResponse.json({ error: 'Kode, nama inventaris, kategori, dan lokasi penyimpanan wajib diisi.' }, { status: 400 });
    }

    const existing = await prisma.inventory.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json({ error: `Kode inventaris "${code}" sudah terdaftar di sistem!` }, { status: 400 });
    }

    const isIndividual = trackingType === 'INDIVIDUAL';
    const stock = isIndividual ? 1 : parseInt(totalStock || '1', 10);

    const inventory = await prisma.inventory.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        categoryId,
        brand: brand?.trim() || null,
        model: model?.trim() || null,
        serialNumber: serialNumber?.trim() || null,
        trackingType: isIndividual ? 'INDIVIDUAL' : 'QUANTITATIVE',
        unit: (unit || (isIndividual ? 'UNIT' : 'PCS')).toUpperCase(),
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
        action: 'TAMBAH_INVENTARIS',
        adminId: session?.id,
        adminName: session?.name || 'Admin',
        details: `Menambahkan inventaris baru: ${inventory.code} - ${inventory.name} (Tipe: ${inventory.trackingType})`,
      },
    });

    return NextResponse.json({ success: true, data: inventory });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal menyimpan master inventaris: ' + String(err) }, { status: 500 });
  }
}
