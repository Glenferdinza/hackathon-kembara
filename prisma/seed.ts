import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding PT YPTI Tool & Inventory ERP data...');

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
  console.log(`Created admin user: ${admin.email} (Password: admin123)`);

  // 3. Categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        code: 'CUT',
        name: 'Cutting & Milling Tools',
        itemType: 'TOOL',
        description: 'Mata pisau milling, endmill solid carbide, insert turning, drill bit',
      },
    }),
    prisma.category.create({
      data: {
        code: 'MEAS',
        name: 'Precision Measuring & QC',
        itemType: 'TOOL',
        description: 'Alat ukur presisi digital, micrometer, dial caliper, pin gauge',
      },
    }),
    prisma.category.create({
      data: {
        code: 'MOLD',
        name: 'Mould & Tooling Accessories',
        itemType: 'TOOL',
        description: 'Collet chuck, clamping kit, vise presisi, angle plate, pull stud',
      },
    }),
    prisma.category.create({
      data: {
        code: 'POW',
        name: 'Pneumatic & Hand Tools',
        itemType: 'INVENTORY',
        description: 'Pneumatic die grinder, torque wrench, heat gun, impact driver',
      },
    }),
    prisma.category.create({
      data: {
        code: 'SAFE',
        name: 'Safety & PPE Equipment',
        itemType: 'INVENTORY',
        description: 'Helm safety industri, harness fall protection, respirator 3M',
      },
    }),
    prisma.category.create({
      data: {
        code: 'IT',
        name: 'Hardware & Barcode Devices',
        itemType: 'INVENTORY',
        description: 'Handheld barcode scanner, rugged tablet QC, printer label barcode',
      },
    }),
  ]);

  const catMap = Object.fromEntries(categories.map((c) => [c.code, c.id]));

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

  // 5. Tools Master Data
  const tools = await Promise.all([
    prisma.tool.create({
      data: {
        code: 'TOL-001',
        name: 'Endmill Carbide 4 Flute D10',
        categoryId: catMap['CUT'],
        specifications: 'Diameter 10mm, 4-Flute, AlTiN Coating, HRC 55, Shank 10mm',
        unit: 'PCS',
        totalStock: 15,
        availableStock: 12,
        borrowedStock: 3,
        repairStock: 0,
        scrapStock: 0,
        location: 'Rak A-01-A',
        condition: 'BAIK',
        status: 'AKTIF',
      },
    }),
    prisma.tool.create({
      data: {
        code: 'TOL-002',
        name: 'Dial Indicator Mitutoyo 0.01mm',
        categoryId: catMap['MEAS'],
        specifications: 'Series 2046S, Range 0-10mm, Akurasi 0.013mm, Bezel Clamp',
        unit: 'UNIT',
        totalStock: 8,
        availableStock: 6,
        borrowedStock: 2,
        repairStock: 0,
        scrapStock: 0,
        location: 'Kabinet QC-02',
        condition: 'BAIK',
        status: 'AKTIF',
      },
    }),
    prisma.tool.create({
      data: {
        code: 'TOL-003',
        name: 'Micrometer Digital Mitutoyo 0-25mm',
        categoryId: catMap['MEAS'],
        specifications: 'Series 293 IP65 Coolant Proof, Resolusi 0.001mm',
        unit: 'UNIT',
        totalStock: 6,
        availableStock: 5,
        borrowedStock: 1,
        repairStock: 0,
        scrapStock: 0,
        location: 'Kabinet QC-01',
        condition: 'BAIK',
        status: 'AKTIF',
      },
    }),
    prisma.tool.create({
      data: {
        code: 'TOL-004',
        name: 'Boring Bar Sandvik CoroTurn A16R',
        categoryId: catMap['CUT'],
        specifications: 'Shank 16mm, Insert CCMT 09T308, Pengikatan Screw',
        unit: 'PCS',
        totalStock: 5,
        availableStock: 5,
        borrowedStock: 0,
        repairStock: 0,
        scrapStock: 0,
        location: 'Rak B-03-A',
        condition: 'BAIK',
        status: 'AKTIF',
      },
    }),
    prisma.tool.create({
      data: {
        code: 'TOL-005',
        name: 'Collet Chuck Holder BT40-ER32',
        categoryId: catMap['MOLD'],
        specifications: 'Taper BT40, Clamping Range 2-20mm, Balance G2.5 20.000 RPM',
        unit: 'SET',
        totalStock: 10,
        availableStock: 8,
        borrowedStock: 2,
        repairStock: 0,
        scrapStock: 0,
        location: 'Rak A-02-B',
        condition: 'BAIK',
        status: 'AKTIF',
      },
    }),
    prisma.tool.create({
      data: {
        code: 'TOL-006',
        name: 'Tap Spiral Flute M8x1.25 OSG',
        categoryId: catMap['CUT'],
        specifications: 'HSSE V-Coating untuk Blind Hole Baja dan Stainless Steel',
        unit: 'PCS',
        totalStock: 20,
        availableStock: 17,
        borrowedStock: 3,
        repairStock: 0,
        scrapStock: 0,
        location: 'Laci C-01-D',
        condition: 'BAIK',
        status: 'AKTIF',
      },
    }),
    prisma.tool.create({
      data: {
        code: 'TOL-007',
        name: 'Digital Torque Wrench Tohnichi 20-100Nm',
        categoryId: catMap['MEAS'],
        specifications: 'Drive 1/2 inch, Akurasi ±1%, Display LCD dengan Buzzer Peak',
        unit: 'UNIT',
        totalStock: 4,
        availableStock: 2,
        borrowedStock: 2,
        repairStock: 0,
        scrapStock: 0,
        location: 'Kabinet Tool-03',
        condition: 'BAIK',
        status: 'AKTIF',
      },
    }),
    prisma.tool.create({
      data: {
        code: 'TOL-008',
        name: 'Ball Nose Endmill R3x6x50',
        categoryId: catMap['CUT'],
        specifications: 'Solid Micrograin Carbide, 2 Flutes, TiSiN Coating HRC 60',
        unit: 'PCS',
        totalStock: 12,
        availableStock: 12,
        borrowedStock: 0,
        repairStock: 0,
        scrapStock: 0,
        location: 'Rak A-01-C',
        condition: 'BAIK',
        status: 'AKTIF',
      },
    }),
  ]);

  // 6. Inventories Master Data
  const inventories = await Promise.all([
    prisma.inventory.create({
      data: {
        code: 'INV-001',
        name: 'Digital Caliper Mitutoyo 150mm',
        categoryId: catMap['MEAS'],
        brand: 'Mitutoyo',
        model: '500-196-30 AOS Absolute',
        serialNumber: 'MT-2024-8891',
        trackingType: 'INDIVIDUAL',
        unit: 'UNIT',
        totalStock: 1,
        availableStock: 0,
        borrowedStock: 1,
        repairStock: 0,
        scrapStock: 0,
        location: 'Lemari QC-01',
        condition: 'BAIK',
        status: 'AKTIF',
      },
    }),
    prisma.inventory.create({
      data: {
        code: 'INV-002',
        name: 'Industrial Barcode Scanner Zebra DS2208',
        categoryId: catMap['IT'],
        brand: 'Zebra Technologies',
        model: 'DS2208 2D Imager USB',
        serialNumber: 'ZB-7731-9021',
        trackingType: 'INDIVIDUAL',
        unit: 'UNIT',
        totalStock: 1,
        availableStock: 1,
        borrowedStock: 0,
        repairStock: 0,
        scrapStock: 0,
        location: 'Meja Dispatch Tool Room',
        condition: 'BAIK',
        status: 'AKTIF',
      },
    }),
    prisma.inventory.create({
      data: {
        code: 'INV-003',
        name: 'Pneumatic Die Grinder Shinano',
        categoryId: catMap['POW'],
        brand: 'Shinano Pneumatic',
        model: 'SI-2002EX 6mm Collet',
        serialNumber: 'SH-5512-4410',
        trackingType: 'INDIVIDUAL',
        unit: 'UNIT',
        totalStock: 1,
        availableStock: 0,
        borrowedStock: 1,
        repairStock: 0,
        scrapStock: 0,
        location: 'Rak Tool Maintenance',
        condition: 'BAIK',
        status: 'AKTIF',
      },
    }),
    prisma.inventory.create({
      data: {
        code: 'INV-004',
        name: 'Rugged Tablet QC Panasonic Toughbook',
        categoryId: catMap['IT'],
        brand: 'Panasonic',
        model: 'CF-33 Rugged 12" Win11',
        serialNumber: 'TB-9910-3321',
        trackingType: 'INDIVIDUAL',
        unit: 'UNIT',
        totalStock: 1,
        availableStock: 1,
        borrowedStock: 0,
        repairStock: 0,
        scrapStock: 0,
        location: 'Ruang CMM Quality Control',
        condition: 'BAIK',
        status: 'AKTIF',
      },
    }),
    prisma.inventory.create({
      data: {
        code: 'INV-005',
        name: 'Safety Helmet MSA V-Gard with Chin Strap',
        categoryId: catMap['SAFE'],
        brand: 'MSA Safety',
        model: 'V-Gard 500 White Fas-Trac',
        serialNumber: null,
        trackingType: 'QUANTITATIVE',
        unit: 'PCS',
        totalStock: 25,
        availableStock: 20,
        borrowedStock: 5,
        repairStock: 0,
        scrapStock: 0,
        location: 'Loker Safety Store #1',
        condition: 'BAIK',
        status: 'AKTIF',
      },
    }),
    prisma.inventory.create({
      data: {
        code: 'INV-006',
        name: 'Infrared Thermometer Fluke 62 Max+',
        categoryId: catMap['MEAS'],
        brand: 'Fluke Corporation',
        model: '62 MAX+ Dual Laser IP54',
        serialNumber: 'FL-4401-2299',
        trackingType: 'INDIVIDUAL',
        unit: 'UNIT',
        totalStock: 1,
        availableStock: 0,
        borrowedStock: 0,
        repairStock: 1,
        scrapStock: 0,
        location: 'Rak Kalibrasi & Service',
        condition: 'PERAWATAN',
        status: 'AKTIF',
      },
    }),
  ]);

  // 7. Seed Active & Overdue Loan Transactions
  const now = new Date();

  // Transaksi 1: TERLAMBAT (Overdue 2 hari lalu)
  const past3Days = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const past1Day = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  const loanOverdue = await prisma.loanTransaction.create({
    data: {
      transactionNumber: 'LOAN-202610-0001',
      employeeId: employees[0].id, // Budi Santoso
      adminId: admin.id,
      loanDate: past3Days,
      expectedReturnDate: past1Day,
      status: 'TERLAMBAT',
      purpose: 'Pengerjaan Cavity Mould Plate 4-Cavity Part Otomotif',
      notes: 'Peminjaman untuk Shift 1 & 2. Melewati batas waktu pengembalian.',
      items: {
        create: [
          {
            itemType: 'TOOL',
            toolId: tools[0].id, // TOL-001 (Endmill Carbide D10)
            quantity: 2,
            returnedQuantity: 0,
            status: 'DIPINJAM',
          },
          {
            itemType: 'INVENTORY',
            inventoryId: inventories[0].id, // INV-001 (Digital Caliper Mitutoyo)
            quantity: 1,
            returnedQuantity: 0,
            status: 'DIPINJAM',
          },
        ],
      },
    },
  });

  // Transaksi 2: MENDEKATI JATUH TEMPO (Jatuh tempo 3 jam ke depan)
  const todayMorning = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const todayDueSoon = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const loanDueSoon = await prisma.loanTransaction.create({
    data: {
      transactionNumber: 'LOAN-202610-0002',
      employeeId: employees[1].id, // Dian Pratama
      adminId: admin.id,
      loanDate: todayMorning,
      expectedReturnDate: todayDueSoon,
      status: 'MENDEKATI_JATUH_TEMPO',
      purpose: 'Setup Clamping Visi Mesin Milling Makino V33i',
      notes: 'Wajib kembali sebelum oper shift sore pukul 16:30 WIB.',
      items: {
        create: [
          {
            itemType: 'TOOL',
            toolId: tools[4].id, // TOL-005 (Collet Chuck BT40)
            quantity: 2,
            returnedQuantity: 0,
            status: 'DIPINJAM',
          },
        ],
      },
    },
  });

  // Transaksi 3: AKTIF NORMAL (Jatuh tempo 2 hari ke depan)
  const future2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const loanActive = await prisma.loanTransaction.create({
    data: {
      transactionNumber: 'LOAN-202610-0003',
      employeeId: employees[3].id, // Rizky Ramadhan
      adminId: admin.id,
      loanDate: now,
      expectedReturnDate: future2Days,
      status: 'DIPINJAM',
      purpose: 'Overhaul Spindle & Penggantian Bearing Pompa Hidrolik',
      notes: 'Pekerjaan preventive maintenance berkala.',
      items: {
        create: [
          {
            itemType: 'TOOL',
            toolId: tools[6].id, // TOL-007 (Torque Wrench)
            quantity: 2,
            returnedQuantity: 0,
            status: 'DIPINJAM',
          },
          {
            itemType: 'INVENTORY',
            inventoryId: inventories[2].id, // INV-003 (Pneumatic Die Grinder)
            quantity: 1,
            returnedQuantity: 0,
            status: 'DIPINJAM',
          },
          {
            itemType: 'INVENTORY',
            inventoryId: inventories[4].id, // INV-005 (Safety Helmet)
            quantity: 5,
            returnedQuantity: 0,
            status: 'DIPINJAM',
          },
        ],
      },
    },
  });

  // Transaksi 4: SELESAI (Sudah dikembalikan)
  const past5Days = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const past2Days = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const loanFinished = await prisma.loanTransaction.create({
    data: {
      transactionNumber: 'LOAN-202610-0004',
      employeeId: employees[2].id, // Eko Wahyudi
      adminId: admin.id,
      loanDate: past5Days,
      expectedReturnDate: past2Days,
      actualReturnDate: past2Days,
      status: 'SELESAI',
      purpose: 'Inspeksi Dimensi Final Part Aluminium Aerospace Bracket',
      notes: 'Semua barang dikembalikan dalam kondisi bersih dan terkalibrasi.',
      items: {
        create: [
          {
            itemType: 'TOOL',
            toolId: tools[2].id, // TOL-003 (Micrometer Digital)
            quantity: 1,
            returnedQuantity: 1,
            status: 'SELESAI',
          },
        ],
      },
    },
  });

  // Catat riwayat pengembalian untuk Transaksi 4
  await prisma.returnTransaction.create({
    data: {
      returnNumber: 'RET-202610-0001',
      loanTransactionId: loanFinished.id,
      adminId: admin.id,
      returnDate: past2Days,
      condition: 'BAIK',
      quantity: 1,
      notes: 'Pemeriksaan fisik lulus QC, baterai mikrometer normal.',
    },
  });

  // 8. Notifications
  await prisma.notification.createMany({
    data: [
      {
        title: 'Transaksi Terlambat: LOAN-202610-0001',
        message: 'Budi Santoso (Machining CNC) belum mengembalikan 2 unit Endmill D10 & 1 Caliper Digital. Jatuh tempo kemarin.',
        type: 'OVERDUE',
        isRead: false,
        link: '/monitoring',
      },
      {
        title: 'Mendekati Jatuh Tempo: LOAN-202610-0002',
        message: 'Dian Pratama (Mould Making) meminjam 2 unit Collet BT40, batas waktu hari ini pukul 16:30.',
        type: 'WARNING',
        isRead: false,
        link: '/monitoring',
      },
      {
        title: 'Pemeliharaan Aset: INV-006',
        message: 'Infrared Thermometer Fluke 62 Max+ dijadwalkan kalibrasi tahunan.',
        type: 'INFO',
        isRead: true,
        link: '/master-inventory',
      },
    ],
  });

  // 9. Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'SYSTEM_INITIALIZATION',
        adminName: 'Agung Setiawan',
        details: 'Database seeding & inisialisasi master data perkakas dan inventaris PT YPTI.',
      },
      {
        action: 'TRANSAKSI_PEMINJAMAN',
        adminName: 'Agung Setiawan',
        details: 'Mencatat peminjaman LOAN-202610-0001 untuk Budi Santoso (NIK: EMP-0101).',
      },
      {
        action: 'TRANSAKSI_PEMINJAMAN',
        adminName: 'Agung Setiawan',
        details: 'Mencatat peminjaman LOAN-202610-0002 untuk Dian Pratama (NIK: EMP-0102).',
      },
      {
        action: 'TRANSAKSI_PENGEMBALIAN',
        adminName: 'Agung Setiawan',
        details: 'Verifikasi pengembalian RET-202610-0001 untuk transaksi LOAN-202610-0004.',
      },
    ],
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
