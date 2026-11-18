import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Running non-destructive backfill v2 (Operator accounts + ToolUnit QR + currentHolderId)...');

  // 1. Backfill Operator accounts for Employees without User
  const employees = await prisma.employee.findMany({
    include: { user: true },
  });
  const salt = await bcrypt.genSalt(10);
  const defaultHash = await bcrypt.hash('operator123', salt);

  let createdUsers = 0;
  for (const emp of employees) {
    if (!emp.user) {
      const collision = await prisma.user.findUnique({ where: { email: emp.nik } });
      if (!collision) {
        await prisma.user.create({
          data: {
            email: emp.nik,
            name: emp.name,
            passwordHash: defaultHash,
            role: 'OPERATOR',
            department: emp.department,
            status: emp.status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF',
            employeeId: emp.id,
          },
        });
        createdUsers += 1;
      }
    }
  }
  console.log(`Created ${createdUsers} Operator login accounts (ID: NIK, pass: operator123).`);

  // 2. Backfill ToolUnit QR rows for Tools without units
  const tools = await prisma.tool.findMany({
    include: { _count: { select: { units: true } } },
  });

  const batchUnits: Array<{
    toolId: string;
    unitCode: string;
    maxLifeMinutes: number;
    remainingLifeMinutes: number;
    status: string;
  }> = [];

  for (const t of tools) {
    if (t._count.units === 0 && t.totalStock > 0) {
      let seq = 1;
      for (let i = 0; i < Math.max(0, t.availableStock); i++) {
        batchUnits.push({
          toolId: t.id,
          unitCode: `${t.code}-U${String(seq++).padStart(2, '0')}`,
          maxLifeMinutes: t.maxLifeMinutes || 1200,
          remainingLifeMinutes: t.maxLifeMinutes || 1200,
          status: 'TERSEDIA',
        });
      }
      for (let i = 0; i < Math.max(0, t.borrowedStock); i++) {
        batchUnits.push({
          toolId: t.id,
          unitCode: `${t.code}-U${String(seq++).padStart(2, '0')}`,
          maxLifeMinutes: t.maxLifeMinutes || 1200,
          remainingLifeMinutes: t.maxLifeMinutes || 1200,
          status: 'DIPINJAM',
        });
      }
      for (let i = 0; i < Math.max(0, t.repairStock); i++) {
        batchUnits.push({
          toolId: t.id,
          unitCode: `${t.code}-U${String(seq++).padStart(2, '0')}`,
          maxLifeMinutes: t.maxLifeMinutes || 1200,
          remainingLifeMinutes: t.maxLifeMinutes || 1200,
          status: 'PERLU_ASAH',
        });
      }
    }
  }

  if (batchUnits.length > 0) {
    await prisma.toolUnit.createMany({ data: batchUnits, skipDuplicates: true });
  }
  console.log(`Generated ${batchUnits.length} ToolUnit QR records.`);

  // 3. Backfill currentHolderId on active LoanItems
  const openItems = await prisma.loanItem.findMany({
    where: { currentHolderId: null },
    include: { loanTransaction: { select: { employeeId: true } } },
  });
  for (const item of openItems) {
    await prisma.loanItem.update({
      where: { id: item.id },
      data: { currentHolderId: item.loanTransaction.employeeId },
    });
  }
  console.log(`Updated currentHolderId on ${openItems.length} LoanItem rows.`);
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
