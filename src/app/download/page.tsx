'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Download, Monitor, Smartphone, CheckCircle2, ExternalLink } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const RELEASE_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_DESKTOP_RELEASE_URL ||
  'https://github.com/Glenferdinza/hackathon-kembara/releases/latest';

function DownloadContent({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [installingPwa, setInstallingPwa] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const syncDisplayMode = () => {
      if (mediaQuery.matches) {
        setPwaInstalled(true);
      }
    };

    const timer = window.setTimeout(syncDisplayMode, 0);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setPwaInstalled(true);
      setInstallFeedback('Aplikasi berhasil dipasang pada perangkat Anda.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery.addEventListener('change', syncDisplayMode);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', syncDisplayMode);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    setInstallingPwa(true);
    setInstallFeedback('');
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallFeedback('Pemasangan aplikasi diterima oleh browser.');
      } else {
        setInstallFeedback('Pemasangan dibatalkan. Anda dapat memasang kapan saja dari menu browser.');
      }
      setDeferredPrompt(null);
    } catch {
      setInstallFeedback('Browser tidak memunculkan dialog pemasangan otomatis.');
    } finally {
      setInstallingPwa(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 mb-2">
            DISTRIBUSI RESMI PT YPTI
          </span>
          <h1 className="text-lg font-bold font-heading text-slate-900">
            Unduh Aplikasi Desktop &amp; Perangkat Mobile
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Pilih installer desktop Windows untuk PC loket Admin Tool Room atau pasang aplikasi web langsung ke HP dan tablet Operator tanpa menginstal Node.js maupun paket developer tambahan.
          </p>
        </div>

        {!isAuthenticated && (
          <Link
            href="/login"
            className="shrink-0 inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-[#1E40AF] bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
          >
            Kembali ke Halaman Login
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-white border border-slate-200 rounded flex flex-col">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Monitor className="w-4 h-4 text-[#1E40AF]" />
              <h2 className="text-sm font-bold font-heading text-slate-900">
                Aplikasi Desktop Windows (.exe)
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#1E40AF] border border-blue-200">
              PC ADMIN TOOL ROOM
            </span>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between space-y-5 text-xs text-slate-600">
            <div className="space-y-3">
              <p className="leading-relaxed">
                Dirancang khusus untuk komputer loket Tool Room PT YPTI. Aplikasi berjalan dalam jendela desktop mandiri, terhubung ke database server pusat secara real-time, mendukung scanner QR USB, serta cetak stiker QR unit perkakas.
              </p>

              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Format Berkas</span>
                  <span className="font-mono font-semibold text-slate-800">Installer Windows (.exe)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Sistem Operasi</span>
                  <span className="font-semibold text-slate-800">Windows 10 / 11 (64-bit)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Kebutuhan Tambahan</span>
                  <span className="font-semibold text-slate-800">Tidak perlu install Node.js</span>
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <a
                href={RELEASE_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Installer Windows (.exe)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <p className="text-[11px] text-slate-500 text-center">
                Berkas rilis resmi diambil dari halaman GitHub Releases PT YPTI Tool Room ERP.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded flex flex-col">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold font-heading text-slate-900">
                Pemasangan Cepat Web App (PWA)
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              HP / TABLET OPERATOR
            </span>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between space-y-5 text-xs text-slate-600">
            <div className="space-y-3">
              <p className="leading-relaxed">
                Cocok untuk Operator produksi di area mesin maupun Admin yang ingin membuka sistem layaknya aplikasi native tanpa mengunduh file installer besar. Mendukung kamera scan QR dan foto bukti Shift Handover.
              </p>

              <div className="border-t border-slate-100 pt-3 space-y-1.5">
                <p className="font-semibold text-slate-800">Panduan Instalasi Manual Browser</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li>Chrome / Edge Desktop, klik ikon pasang di sisi kanan kolom alamat web.</li>
                  <li>Android Chrome, buka menu titik tiga lalu pilih Tambah ke Layar Utama atau Instal Aplikasi.</li>
                  <li>iOS Safari, ketuk tombol Bagikan lalu pilih Tambah ke Layar Utama.</li>
                </ul>
              </div>

              {installFeedback && (
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                  {installFeedback}
                </div>
              )}
            </div>

            <div className="pt-2 space-y-2">
              {pwaInstalled ? (
                <div className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aplikasi Sudah Terpasang di Perangkat Ini</span>
                </div>
              ) : deferredPrompt ? (
                <button
                  type="button"
                  onClick={handleInstallPwa}
                  disabled={installingPwa}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 disabled:bg-slate-300 rounded transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{installingPwa ? 'Memasang Aplikasi...' : 'Pasang Aplikasi di Perangkat Ini'}</span>
                </button>
              ) : (
                <div className="w-full px-4 py-2.5 text-center text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded">
                  Gunakan Menu Instalasi Browser Anda (Chrome / Edge / Safari)
                </div>
              )}
              <p className="text-[11px] text-slate-500 text-center">
                Tombol pasang 1-klik aktif otomatis pada browser yang mendukung prompt PWA.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function DownloadPage() {
  const [authState, setAuthState] = useState<'checking' | 'auth' | 'guest'>('checking');

  useEffect(() => {
    let active = true;
    const verifySession = async () => {
      try {
        const res = await fetch('/api/auth', { cache: 'no-store' });
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.id) {
            setAuthState('auth');
            return;
          }
        }
        setAuthState('guest');
      } catch {
        if (active) setAuthState('guest');
      }
    };

    verifySession();
    return () => {
      active = false;
    };
  }, []);

  if (authState === 'auth') {
    return (
      <AppShell>
        <DownloadContent isAuthenticated />
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/ypti-logo.png"
            alt="PT YPTI Logo"
            className="h-9 w-auto object-contain"
          />
          <span className="hidden sm:inline-block text-xs font-bold font-heading text-slate-800 uppercase tracking-tight">
            Tool Room &amp; Inventory ERP
          </span>
        </div>

        <Link
          href="/login"
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors"
        >
          Masuk ke Sistem
        </Link>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        <DownloadContent isAuthenticated={false} />
      </main>
    </div>
  );
}
