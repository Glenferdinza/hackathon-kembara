import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: 'Sesi autentikasi tidak valid.' }, { status: 401 });
    }

    const empId = session.employeeId;
    if (!empId) {
      return NextResponse.json({
        pendingActionCount: 0,
        incomingHandovers: [],
        readyRequests: [],
        waitingAdminRequests: [],
        heldItems: [],
        criticalLifeCount: 0,
        recentNotifications: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('countOnly') === 'true';

    if (countOnly) {
      const [handoverCnt, readyCnt] = await Promise.all([
        prisma.shiftHandover.count({ where: { toEmployeeId: empId, status: 'PENDING' } }),
        prisma.loanRequest.count({ where: { employeeId: empId, status: 'SIAP_DIAMBIL' } }),
      ]);
      return NextResponse.json({ pendingActionCount: handoverCnt + readyCnt });
    }

    const [incomingHandovers, readyRequestsRaw, waitingAdminRequests, heldItems, recentNotifications] = await Promise.all([
      prisma.shiftHandover.findMany({
        where: { toEmployeeId: empId, status: 'PENDING' },
        include: {
          fromEmployee: { select: { id: true, nik: true, name: true, shift: true, department: true } },
          toolUnit: {
            select: {
              id: true,
              unitCode: true,
              maxLifeMinutes: true,
              remainingLifeMinutes: true,
              usedLifeMinutes: true,
            },
          },
          loanItem: {
            include: {
              tool: { select: { id: true, code: true, name: true, lifeAlertPercent: true } },
              inventory: { select: { id: true, code: true, name: true } },
            },
          },
          loanTransaction: {
            select: { id: true, transactionNumber: true, expectedReturnDate: true, purpose: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.loanRequest.findMany({
        where: { employeeId: empId, status: 'SIAP_DIAMBIL' },
        include: {
          admin: { select: { name: true, email: true } },
          items: {
            include: {
              tool: { select: { id: true, code: true, name: true, location: true, maxLifeMinutes: true } },
              inventory: { select: { id: true, code: true, name: true, location: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.loanRequest.findMany({
        where: { employeeId: empId, status: 'MENUNGGU_ADMIN' },
        include: {
          items: {
            include: {
              tool: { select: { id: true, code: true, name: true } },
              inventory: { select: { id: true, code: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.loanItem.findMany({
        where: {
          status: 'DIPINJAM',
          OR: [
            { currentHolderId: empId },
            {
              currentHolderId: null,
              loanTransaction: { employeeId: empId },
            },
          ],
        },
        include: {
          tool: { select: { id: true, code: true, name: true, location: true, price: true, lifeAlertPercent: true } },
          inventory: { select: { id: true, code: true, name: true, location: true } },
          toolUnit: {
            select: {
              id: true,
              unitCode: true,
              maxLifeMinutes: true,
              usedLifeMinutes: true,
              remainingLifeMinutes: true,
              status: true,
            },
          },
          loanTransaction: {
            select: {
              id: true,
              transactionNumber: true,
              loanDate: true,
              expectedReturnDate: true,
              purpose: true,
              employee: { select: { id: true, nik: true, name: true } },
            },
          },
          handovers: {
            where: { status: 'PENDING' },
            include: {
              toEmployee: { select: { id: true, nik: true, name: true, shift: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.findMany({
        where: {
          employeeId: empId,
          targetRole: { in: ['OPERATOR', 'ALL'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    // Resolve unit details for readyRequestsRaw
    const unitIds = new Set<string>();
    for (const r of readyRequestsRaw) {
      for (const it of r.items) {
        if (it.assignedUnitIds) {
          try {
            const arr = JSON.parse(it.assignedUnitIds) as string[];
            if (Array.isArray(arr)) arr.forEach((id) => unitIds.add(id));
          } catch {
            // ignore
          }
        }
      }
    }
    const unitRows =
      unitIds.size > 0
        ? await prisma.toolUnit.findMany({
            where: { id: { in: Array.from(unitIds) } },
            select: { id: true, unitCode: true, maxLifeMinutes: true, remainingLifeMinutes: true },
          })
        : [];
    const unitMap = Object.fromEntries(unitRows.map((u) => [u.id, u]));

    const readyRequests = readyRequestsRaw.map((r) => ({
      ...r,
      items: r.items.map((it) => {
        let assignedUnits: typeof unitRows = [];
        if (it.assignedUnitIds) {
          try {
            const arr = JSON.parse(it.assignedUnitIds) as string[];
            if (Array.isArray(arr)) assignedUnits = arr.map((id) => unitMap[id]).filter(Boolean);
          } catch {
            // ignore
          }
        }
        return { ...it, assignedUnits };
      }),
    }));

    let criticalLifeCount = 0;
    for (const hi of heldItems) {
      if (hi.toolUnit && hi.toolUnit.maxLifeMinutes > 0) {
        const pct = (hi.toolUnit.remainingLifeMinutes / hi.toolUnit.maxLifeMinutes) * 100;
        const alertPct = hi.tool?.lifeAlertPercent || 15;
        if (pct <= alertPct) criticalLifeCount += 1;
      }
    }

    return NextResponse.json({
      pendingActionCount: incomingHandovers.length + readyRequests.length,
      incomingHandovers,
      readyRequests,
      waitingAdminRequests,
      heldItems,
      criticalLifeCount,
      recentNotifications,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Gagal memuat ringkasan portal operator: ' + String(err) },
      { status: 500 }
    );
  }
}
