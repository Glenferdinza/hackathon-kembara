import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateToolUnitsTx } from '@/lib/tool-units';

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

    const res = NextResponse.json({
      data: tools,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
    // Cache at Cloudflare Edge for fast subsequent reads
    res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return res;
  } catch (err) {
    return NextResponse.json({ error: 'Gagal memuat master data tool: ' + String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Akses ditolak. Sesi autentikasi tidak valid.' }, { status: 401 });
    }
    if (session.role === 'OPERATOR') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Admin yang dapat menambah master tool.' }, { status: 403 });
    }
    const body = await request.json();

    const {
      code,
      name,
      categoryId,
      specifications,
      unit,
      totalStock,
      location,
      condition,
      price,
      maxLifeMinutes,
      lifeAlertPercent,
    } = body;

    if (!code || !name || !categoryId || !location) {
      return NextResponse.json({ error: 'Kode, nama tool, kategori, dan lokasi rak wajib diisi.' }, { status: 400 });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const existing = await prisma.tool.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json({ error: `Kode tool "${cleanCode}" sudah terdaftar di sistem!` }, { status: 400 });
    }

    const stock = Math.max(0, parseInt(totalStock || '1', 10) || 0);
    const parsedPrice = Math.max(0, parseInt(price ?? '0', 10) || 0);
    const parsedMaxLife = Math.max(10, parseInt(maxLifeMinutes ?? '1200', 10) || 1200);
    const parsedAlertPct = Math.min(50, Math.max(5, parseInt(lifeAlertPercent ?? '15', 10) || 15));

    const result = await prisma.$transaction(async (tx) => {
      const tool = await tx.tool.create({
        data: {
          code: cleanCode,
          name: name.trim(),
          categoryId,
          specifications: specifications?.trim() || null,
          unit: (unit || 'PCS').toUpperCase(),
          price: parsedPrice,
          maxLifeMinutes: parsedMaxLife,
          lifeAlertPercent: parsedAlertPct,
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

      const generatedUnits = await generateToolUnitsTx(tx, {
        toolId: tool.id,
        toolCode: tool.code,
        maxLifeMinutes: parsedMaxLife,
        count: stock,
        status: 'TERSEDIA',
      });

      await tx.auditLog.create({
        data: {
          action: 'TAMBAH_TOOL',
          adminId: session.id,
          adminName: session.name || 'Admin',
          details: `Menambahkan master tool baru: ${tool.code} - ${tool.name} (Stok: ${tool.totalStock}, Harga: Rp${parsedPrice.toLocaleString('id-ID')}, Umur: ${parsedMaxLife} menit)`,
        },
      });

      return { tool, units: generatedUnits };
    });

    return NextResponse.json({ success: true, data: result.tool, units: result.units });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal menyimpan master tool: ' + String(err) }, { status: 500 });
  }
}
