import type { Prisma } from '@prisma/client';

/**
 * Menghasilkan record unit individual (ToolUnit) unik untuk suatu Master Tool
 * di dalam transaksi Prisma. Format baku: <TOOL_CODE>-U01, -U02, dst.
 */
export async function generateToolUnitsTx(
  tx: Prisma.TransactionClient,
  params: {
    toolId: string;
    toolCode: string;
    maxLifeMinutes: number;
    count: number;
    status?: string;
    supplierCodes?: string[];
  }
) {
  const { toolId, toolCode, maxLifeMinutes, count, status = 'TERSEDIA', supplierCodes = [] } = params;
  if (count <= 0) return [];

  const existing = await tx.toolUnit.findMany({
    where: { toolId },
    select: { unitCode: true },
  });

  let maxSeq = 0;
  const usedSet = new Set(existing.map((u) => u.unitCode.toUpperCase()));
  const seqRegex = /-U(\d+)$/i;

  for (const row of existing) {
    const m = row.unitCode.match(seqRegex);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxSeq) maxSeq = n;
    }
  }

  const createdUnits = [];
  for (let i = 0; i < count; i++) {
    maxSeq += 1;
    let candidate = `${toolCode.toUpperCase()}-U${String(maxSeq).padStart(2, '0')}`;
    while (usedSet.has(candidate)) {
      maxSeq += 1;
      candidate = `${toolCode.toUpperCase()}-U${String(maxSeq).padStart(2, '0')}`;
    }
    usedSet.add(candidate);

    const created = await tx.toolUnit.create({
      data: {
        toolId,
        unitCode: candidate,
        supplierCode: supplierCodes[i]?.trim() || null,
        maxLifeMinutes,
        usedLifeMinutes: 0,
        remainingLifeMinutes: maxLifeMinutes,
        resharpenCount: 0,
        status,
      },
    });
    createdUnits.push(created);
  }

  return createdUnits;
}

/**
 * Mengisi otomatis ToolUnit bagi data Tool lama yang belum memiliki baris unit individual.
 */
export async function backfillToolUnitsIfEmptyTx(
  tx: Prisma.TransactionClient,
  tool: {
    id: string;
    code: string;
    maxLifeMinutes: number;
    totalStock: number;
    availableStock: number;
    borrowedStock: number;
    repairStock: number;
  }
) {
  const existingCount = await tx.toolUnit.count({ where: { toolId: tool.id } });
  if (existingCount > 0 || tool.totalStock <= 0) return [];

  const availUnits = await generateToolUnitsTx(tx, {
    toolId: tool.id,
    toolCode: tool.code,
    maxLifeMinutes: tool.maxLifeMinutes || 1200,
    count: Math.max(0, tool.availableStock),
    status: 'TERSEDIA',
  });

  const borrowedUnits = await generateToolUnitsTx(tx, {
    toolId: tool.id,
    toolCode: tool.code,
    maxLifeMinutes: tool.maxLifeMinutes || 1200,
    count: Math.max(0, tool.borrowedStock),
    status: 'DIPINJAM',
  });

  const repairUnits = await generateToolUnitsTx(tx, {
    toolId: tool.id,
    toolCode: tool.code,
    maxLifeMinutes: tool.maxLifeMinutes || 1200,
    count: Math.max(0, tool.repairStock),
    status: 'PERLU_ASAH',
  });

  return [...availUnits, ...borrowedUnits, ...repairUnits];
}
