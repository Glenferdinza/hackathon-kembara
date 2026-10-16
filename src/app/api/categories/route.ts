import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ data: categories });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal memuat kategori: ' + String(err) }, { status: 500 });
  }
}
