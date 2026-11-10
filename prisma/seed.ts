import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as xlsx from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding real database from SAMPEL_DATABASE_INVENTARIS_TOOLS.xlsx...');

  // 1. Clean existing records (in reverse dependency order)
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.returnTransaction.deleteMany({});
  await prisma.loanItem.deleteMany({});
  await prisma.loanTransaction.deleteMany({});
  await prisma.tool.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Admin User
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@ypti.co.id',
      name: 'Agung Setiawan',
      passwordHash,
      role: 'SUPER_ADMIN',
      department: 'Tool Room & Central Warehouse',
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // 3. Categories
  const categoryDefs = [
    { code: 'CAT-TOOL-ARB', name: 'Arbor & Toolholder Assembly', itemType: 'TOOL', description: 'BT40, BT50, HSK, ER Collet Arbors, Milling Chucks, Side Lock Arbors' },
    { code: 'CAT-TOOL-HLD', name: 'Cutting Insert Holders & Bars', itemType: 'TOOL', description: 'Endmill holders, Ballnose insert holders, Boring bars, Turning holders' },
    { code: 'CAT-TOOL-COL', name: 'Precision Collet System', itemType: 'TOOL', description: 'ER16, ER20, ER25, ER32, TG100 collet chucks' },
    { code: 'CAT-TOOL-FAS', name: 'Machine Fastener Keys & Wrenches', itemType: 'TOOL', description: 'Kunci L Long Ball Tekiro per mesin CNC & workshop' },
    { code: 'CAT-TOOL-CLP', name: 'Clamping Fixtures, Vise & Jigs', itemType: 'TOOL', description: 'Clamping kit, step blocks, toe clamps, vise presisi' },
    { code: 'CAT-TOOL-PLS', name: 'Pull Studs & Retention Knobs', itemType: 'TOOL', description: 'Pull stud retention knobs untuk spindle mesin milling' },
    { code: 'CAT-TOOL-TIP', name: 'Carbide Inserts & Cutting Tips', itemType: 'TOOL', description: 'Mata insert carbide, turning tips, milling tips' },
    { code: 'CAT-INV-MEAS', name: 'Precision Measuring & QC', itemType: 'INVENTORY', description: 'Dial indicators, calipers, micrometers, height gauges' },
    { code: 'CAT-INV-POW', name: 'Power & Pneumatic Tools', itemType: 'INVENTORY', description: 'Pneumatic grinders, industrial drills, power tools' },
    { code: 'CAT-INV-HAND', name: 'Industrial Hand Tools', itemType: 'INVENTORY', description: 'Palu, tang, obeng, kunci pas workshop' },
    { code: 'CAT-INV-FAC', name: 'Workshop Storage & Facilities', itemType: 'INVENTORY', description: 'Lemari perkakas, rak kabinet workshop' },
  ];

  const categories = await Promise.all(
    categoryDefs.map((cat) => prisma.category.create({ data: cat }))
  );
  const catMap = Object.fromEntries(categories.map((c) => [c.code, c.id]));
  console.log(`Created ${categories.length} categories.`);

  // 4. Employees (Peminjam)
  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        nik: 'EMP-0101',
        name: 'Budi Santoso',
        role: 'Operator CNC Milling',
        department: 'Machining CNC',
        shift: 'Shift 1 (Pagi)',
        phone: '6281234567890',
        email: 'budi.santoso@ypti.co.id',
      },
    }),
    prisma.employee.create({
      data: {
        nik: 'EMP-0102',
        name: 'Dian Pratama',
        role: 'Teknisi Mould Making',
        department: 'Mould Making',
        shift: 'Shift 1 (Pagi)',
        phone: '6281398765432',
        email: 'dian.pratama@ypti.co.id',
      },
    }),
    prisma.employee.create({
      data: {
        nik: 'EMP-0103',
        name: 'Eko Wahyudi',
        role: 'Quality Control Inspector',
        department: 'Quality Control',
        shift: 'Shift 2 (Siang)',
        phone: '6281512349876',
        email: 'eko.wahyudi@ypti.co.id',
      },
    }),
    prisma.employee.create({
      data: {
        nik: 'EMP-0104',
        name: 'Rizky Ramadhan',
        role: 'Maintenance Engineer',
        department: 'Maintenance & Facility',
        shift: 'Non-shift',
        phone: '6282145678901',
        email: 'rizky.r@ypti.co.id',
      },
    }),
    prisma.employee.create({
      data: {
        nik: 'EMP-0105',
        name: 'Siti Nurhaliza',
        role: 'CAD/CAM Programmer',
        department: 'Tooling Design & CAD/CAM',
        shift: 'Non-shift',
        phone: '6287789012345',
        email: 'siti.n@ypti.co.id',
      },
    }),
  ]);
  console.log(`Created ${employees.length} employees.`);

  // 5. Read real data from Excel
  const excelPath = path.join(process.cwd(), 'SAMPEL_DATABASE_INVENTARIS_TOOLS.xlsx');
  const wb = xlsx.readFile(excelPath);
  const ws = wb.Sheets['DATABASE'];

  const toolBatch: any[] = [];
  const inventoryBatch: any[] = [];

  for (let r = 5; r <= 1700; r++) {
    const getVal = (col: number) => {
      const cell = ws[xlsx.utils.encode_cell({ r, c: col })];
      return cell ? cell.v : null;
    };

    const inventaris = String(getVal(0) || '').trim();
    const toolNo = String(getVal(1) || '').trim();
    const jenis = String(getVal(2) || '').trim();
    const deskripsi = String(getVal(3) || '').trim();
    if (!toolNo || !deskripsi) continue;

    const brand = String(getVal(4) || '').trim();
    const kode = String(getVal(5) || '').trim();
    const dimensi = String(getVal(6) || '').trim();
    const sat = String(getVal(7) || 'PCS').trim().toUpperCase();
    const kategori = String(getVal(8) || 'PERALATAN MESIN').trim().toUpperCase();
    const rawQty = getVal(9);
    const qty = typeof rawQty === 'number' ? rawQty : parseInt(String(rawQty), 10) || 0;
    const rawSaldo = getVal(16);
    const saldoAkhir = typeof rawSaldo === 'number' ? rawSaldo : (typeof rawQty === 'number' ? rawQty : 0);

    const j = jenis.toUpperCase();
    let catCode = 'CAT-TOOL-ARB';
    let isInventory = false;

    if (j.includes('MEASURING')) {
      catCode = 'CAT-INV-MEAS';
      isInventory = true;
    } else if (j.includes('POWER TOOL')) {
      catCode = 'CAT-INV-POW';
      isInventory = true;
    } else if (j.includes('HAND TOOL')) {
      catCode = 'CAT-INV-HAND';
      isInventory = true;
    } else if (j.includes('LEMARI')) {
      catCode = 'CAT-INV-FAC';
      isInventory = true;
    } else if (j.includes('ARBOR')) {
      catCode = 'CAT-TOOL-ARB';
    } else if (j.includes('HOLDER')) {
      catCode = 'CAT-TOOL-HLD';
    } else if (j.includes('COLLET')) {
      catCode = 'CAT-TOOL-COL';
    } else if (j.includes('FASTENER')) {
      catCode = 'CAT-TOOL-FAS';
    } else if (j.includes('CLAMPING') || j.includes('VISE') || j.includes('JIG')) {
      catCode = 'CAT-TOOL-CLP';
    } else if (j.includes('PULL STUD')) {
      catCode = 'CAT-TOOL-PLS';
    } else if (j.includes('TIP')) {
      catCode = 'CAT-TOOL-TIP';
    } else {
      catCode = kategori.includes('BANTU') ? 'CAT-INV-HAND' : 'CAT-TOOL-ARB';
      isInventory = kategori.includes('BANTU');
    }

    const categoryId = catMap[catCode] || catMap['CAT-TOOL-ARB'];
    const specParts = [];
    if (brand) specParts.push(`Brand: ${brand}`);
    if (kode) specParts.push(`Kode: ${kode}`);
    if (dimensi) specParts.push(`Dimensi: ${dimensi}`);
    const specs = specParts.join(' | ') || undefined;

    const available = Math.max(0, saldoAkhir);
    const minStock = qty > 5 ? 2 : 1;

    if (isInventory) {
      inventoryBatch.push({
        code: toolNo,
        name: deskripsi === jenis ? `${deskripsi} ${dimensi}`.trim() : `${deskripsi} (${jenis})`,
        categoryId,
        brand: brand || null,
        model: kode || null,
        serialNumber: dimensi || null,
        trackingType: j.includes('MEASURING') ? 'INDIVIDUAL' : 'QUANTITATIVE',
        unit: sat || 'UNIT',
        totalStock: qty,
        availableStock: available,
        borrowedStock: 0,
        repairStock: 0,
        scrapStock: 0,
        minStock,
        location: inventaris ? `Area ${inventaris}` : 'Tool Room Central',
        condition: 'BAIK',
        status: 'AKTIF',
      });
    } else {
      toolBatch.push({
        code: toolNo,
        name: deskripsi === jenis ? `${jenis} ${kode || dimensi}`.trim() : `${jenis} - ${deskripsi}`,
        categoryId,
        specifications: specs || null,
        unit: sat || 'PCS',
        totalStock: qty,
        availableStock: available,
        borrowedStock: 0,
        repairStock: 0,
        scrapStock: 0,
        minStock,
        location: inventaris ? `Mesin ${inventaris}` : 'Rak Tool Room Central',
        condition: 'BAIK',
        status: 'AKTIF',
      });
    }
  }

  console.log(`Inserting ${toolBatch.length} Tools in batch...`);
  await prisma.tool.createMany({ data: toolBatch });

  console.log(`Inserting ${inventoryBatch.length} Inventories in batch...`);
  await prisma.inventory.createMany({ data: inventoryBatch });

  // 6. Realistic Active Loans
  console.log('Seeding realistic operational loans and notifications...');
  const sampleTools = await prisma.tool.findMany({ take: 5, where: { availableStock: { gt: 1 } } });
  const sampleInvs = await prisma.inventory.findMany({ take: 2, where: { availableStock: { gt: 0 } } });

  const now = new Date();
  const past3Days = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Loan 1: Overdue
  const loan1 = await prisma.loanTransaction.create({
    data: {
      transactionNumber: 'LOAN-202610-0001',
      employee: { connect: { id: employees[0].id } },
      admin: { connect: { id: admin.id } },
      loanDate: past3Days,
      expectedReturnDate: yesterday,
      purpose: 'Pengerjaan Part Machining Dies Cavity Plat 4-Cavity',
      status: 'TERLAMBAT',
      items: {
        create: [
          {
            itemType: 'TOOL',
            tool: { connect: { id: sampleTools[0].id } },
            quantity: 1,
            status: 'DIPINJAM',
          },
          {
            itemType: 'INVENTORY',
            inventory: { connect: { id: sampleInvs[0].id } },
            quantity: 1,
            status: 'DIPINJAM',
          },
        ],
      },
    },
  });

  // Loan 2: Due Today
  const loan2 = await prisma.loanTransaction.create({
    data: {
      transactionNumber: 'LOAN-202610-0002',
      employee: { connect: { id: employees[1].id } },
      admin: { connect: { id: admin.id } },
      loanDate: yesterday,
      expectedReturnDate: in2Hours,
      purpose: 'Setup Clamping Visi Mesin Makino V33i',
      status: 'DIPINJAM',
      items: {
        create: [
          {
            itemType: 'TOOL',
            tool: { connect: { id: sampleTools[1].id } },
            quantity: 1,
            status: 'DIPINJAM',
          },
        ],
      },
    },
  });

  // Loan 3: Ongoing
  const loan3 = await prisma.loanTransaction.create({
    data: {
      transactionNumber: 'LOAN-202610-0003',
      employee: { connect: { id: employees[3].id } },
      admin: { connect: { id: admin.id } },
      loanDate: now,
      expectedReturnDate: in3Days,
      purpose: 'Overhaul Spindle & Pemeliharaan Pompa Hidrolik',
      status: 'DIPINJAM',
      items: {
        create: [
          {
            itemType: 'TOOL',
            tool: { connect: { id: sampleTools[2].id } },
            quantity: 1,
            status: 'DIPINJAM',
          },
        ],
      },
    },
  });

  // Adjust stock for loaned items
  if (sampleTools[0]) {
    await prisma.tool.update({
      where: { id: sampleTools[0].id },
      data: { availableStock: { decrement: 1 }, borrowedStock: { increment: 1 } },
    });
  }
  if (sampleInvs[0]) {
    await prisma.inventory.update({
      where: { id: sampleInvs[0].id },
      data: { availableStock: { decrement: 1 }, borrowedStock: { increment: 1 } },
    });
  }
  if (sampleTools[1]) {
    await prisma.tool.update({
      where: { id: sampleTools[1].id },
      data: { availableStock: { decrement: 1 }, borrowedStock: { increment: 1 } },
    });
  }
  if (sampleTools[2]) {
    await prisma.tool.update({
      where: { id: sampleTools[2].id },
      data: { availableStock: { decrement: 1 }, borrowedStock: { increment: 1 } },
    });
  }

  // 7. Notifications
  await prisma.notification.createMany({
    data: [
      {
        title: `Transaksi Terlambat: ${loan1.transactionNumber}`,
        message: `${employees[0].name} (${employees[0].department}) belum mengembalikan perkakas jatuh tempo kemarin.`,
        type: 'OVERDUE',
        isRead: false,
        link: '/monitoring',
      },
      {
        title: `Mendekati Tenggat Waktu: ${loan2.transactionNumber}`,
        message: `${employees[1].name} (${employees[1].department}) memiliki pinjaman aktif jatuh tempo hari ini.`,
        type: 'WARNING',
        isRead: false,
        link: '/monitoring',
      },
    ],
  });

  console.log('Real data seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
