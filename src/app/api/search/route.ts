import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q) {
      const [tools, inventories, employees] = await Promise.all([
        prisma.tool.findMany({
          where: { status: 'AKTIF' },
          select: {
            id: true,
            code: true,
            name: true,
            location: true,
            availableStock: true,
            unit: true,
          },
          orderBy: { availableStock: 'desc' },
          take: 3,
        }),
        prisma.inventory.findMany({
          where: { status: 'AKTIF' },
          select: {
            id: true,
            code: true,
            name: true,
            brand: true,
            location: true,
            availableStock: true,
            unit: true,
          },
          orderBy: { availableStock: 'desc' },
          take: 3,
        }),
        prisma.employee.findMany({
          where: { status: 'AKTIF' },
          select: {
            id: true,
            nik: true,
            name: true,
            department: true,
            shift: true,
          },
          orderBy: { name: 'asc' },
          take: 3,
        }),
      ]);

      return NextResponse.json({
        tools,
        inventories,
        employees,
        loans: [],
      });
    }

    const [tools, inventories, employees, loans] = await Promise.all([
      prisma.tool.findMany({
        where: {
          status: 'AKTIF',
          OR: [
            { code: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
            { location: { contains: q, mode: 'insensitive' } },
            { specifications: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          code: true,
          name: true,
          location: true,
          availableStock: true,
          unit: true,
        },
        take: 4,
      }),
      prisma.inventory.findMany({
        where: {
          status: 'AKTIF',
          OR: [
            { code: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
            { brand: { contains: q, mode: 'insensitive' } },
            { model: { contains: q, mode: 'insensitive' } },
            { serialNumber: { contains: q, mode: 'insensitive' } },
            { location: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          code: true,
          name: true,
          brand: true,
          location: true,
          availableStock: true,
          unit: true,
        },
        take: 4,
      }),
      prisma.employee.findMany({
        where: {
          status: 'AKTIF',
          OR: [
            { nik: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
            { department: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          nik: true,
          name: true,
          department: true,
          shift: true,
        },
        take: 4,
      }),
      prisma.loanTransaction.findMany({
        where: {
          status: { not: 'SELESAI' },
          OR: [
            { transactionNumber: { contains: q, mode: 'insensitive' } },
            { employee: { name: { contains: q, mode: 'insensitive' } } },
            { employee: { nik: { contains: q, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          transactionNumber: true,
          status: true,
          employee: {
            select: {
              nik: true,
              name: true,
              department: true,
            },
          },
        },
        take: 3,
      }),
    ]);

    return NextResponse.json({
      tools,
      inventories,
      employees,
      loans,
    });
  } catch (error) {
    console.error('Error in global search API', error);
    return NextResponse.json(
      { tools: [], inventories: [], employees: [], loans: [] },
      { status: 500 }
    );
  }
}

