import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'ALL'; // ALL, OVERDUE, DUE_SOON
    const search = searchParams.get('search') || '';

    const now = new Date();

    const loans = await prisma.loanTransaction.findMany({
      where: {
        status: { not: 'SELESAI' },
      },
      include: {
        employee: true,
        items: {
          include: {
            tool: true,
            inventory: true,
          },
        },
      },
      orderBy: { expectedReturnDate: 'asc' },
    });

    const enriched = loans.map((loan) => {
      const expTime = new Date(loan.expectedReturnDate).getTime();
      const diffMs = expTime - now.getTime();
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));

      let status = 'DIPINJAM';
      let durationText = '';

      if (diffMs < 0) {
        status = 'TERLAMBAT';
        const absHours = Math.abs(diffHours);
        const days = Math.floor(absHours / 24);
        const remHours = absHours % 24;
        durationText = days > 0 ? `Terlambat ${days} hari ${remHours} jam` : `Terlambat ${absHours} jam`;
      } else if (diffHours <= 24) {
        status = 'MENDEKATI_JATUH_TEMPO';
        durationText = `Tersisa ${diffHours} jam`;
      } else {
        const days = Math.floor(diffHours / 24);
        durationText = `Tersisa ${days} hari`;
      }

      const itemsList = loan.items
        .map((i) => {
          const name = i.tool ? `${i.tool.code} - ${i.tool.name}` : `${i.inventory?.code} - ${i.inventory?.name}`;
          const unreturned = i.quantity - i.returnedQuantity;
          return `${name} (${unreturned} unit)`;
        })
        .join(', ');

      // WhatsApp reminder link & template
      let waLink = null;
      let emailLink = null;

      if (loan.employee.phone) {
        // Clean phone number: remove +, -, spaces
        let phone = loan.employee.phone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) {
          phone = '62' + phone.slice(1);
        }
        const message = `Halo Sdr/i ${loan.employee.name} (${loan.employee.department}),\n\nMengingatkan perihal peminjaman perkakas di Tool Room PT YPTI dengan No. Transaksi *${loan.transactionNumber}*:\nBarang: ${itemsList}\nTenggat Pengembalian: ${new Date(loan.expectedReturnDate).toLocaleString('id-ID')}\nStatus: *${status === 'TERLAMBAT' ? 'SUDAH MELEWATI TENGGAT' : 'JATUH TEMPO HARI INI'}*.\n\nMohon untuk segera mengembalikan unit tersebut ke ruang Tool Room / Gudang Pusat untuk verifikasi kondisi barang.\n\nTerima kasih.\n*Admin Tool Room PT YPTI*`;
        waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      }

      if (loan.employee.email) {
        const subject = `[PENGINGAT TOOL ROOM PT YPTI] Pengembalian ${loan.transactionNumber}`;
        const body = `Halo ${loan.employee.name},\n\nMengingatkan perihal peminjaman alat:\nNo. Transaksi: ${loan.transactionNumber}\nBarang: ${itemsList}\nTenggat Pengembalian: ${new Date(loan.expectedReturnDate).toLocaleString('id-ID')}\n\nMohon segera dikembalikan ke Tool Room PT YPTI.\n\nSalam,\nAdmin Tool Room`;
        emailLink = `mailto:${loan.employee.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }

      return {
        id: loan.id,
        transactionNumber: loan.transactionNumber,
        employee: loan.employee,
        loanDate: loan.loanDate,
        expectedReturnDate: loan.expectedReturnDate,
        purpose: loan.purpose,
        notes: loan.notes,
        status,
        diffHours,
        durationText,
        items: loan.items,
        itemsList,
        waLink,
        emailLink,
      };
    });

    let filtered = enriched;
    if (filter === 'OVERDUE') {
      filtered = enriched.filter((l) => l.status === 'TERLAMBAT');
    } else if (filter === 'DUE_SOON') {
      filtered = enriched.filter((l) => l.status === 'MENDEKATI_JATUH_TEMPO');
    }

    if (search) {
      filtered = filtered.filter(
        (l) =>
          l.transactionNumber.toLowerCase().includes(search.toLowerCase()) ||
          l.employee.name.toLowerCase().includes(search.toLowerCase()) ||
          l.employee.nik.toLowerCase().includes(search.toLowerCase()) ||
          l.employee.department.toLowerCase().includes(search.toLowerCase())
      );
    }

    return NextResponse.json({
      data: filtered,
      counts: {
        total: enriched.length,
        overdue: enriched.filter((l) => l.status === 'TERLAMBAT').length,
        dueSoon: enriched.filter((l) => l.status === 'MENDEKATI_JATUH_TEMPO').length,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal memuat monitoring keterlambatan: ' + String(err) }, { status: 500 });
  }
}
