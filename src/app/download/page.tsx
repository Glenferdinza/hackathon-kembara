'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Download, Monitor, Smartphone, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UnlockedDownloadState {
  downloadUrl: string;
  expiresAtMs: number;
  deviceName: string;
  verifiedBy: string;
  installerReady: boolean;
  sourceMode: 'local' | 'github' | 'unavailable';
  fileName: string;
  fileSizeBytes: number | null;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return 'Sekitar 85 - 95 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCountdown(secondsLeft: number): string {
  const safe = Math.max(0, secondsLeft);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function DownloadContent({
  isAuthenticated,
  sessionUser,
}: {
  isAuthenticated: boolean;
  sessionUser: SessionUser | null;
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [installingPwa, setInstallingPwa] = useState(false);
  const [installFeedback, setInstallFeedback] = useState('');

  // Form verifikasi akses unduhan .exe
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [unlocked, setUnlocked] = useState<UnlockedDownloadState | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const isOperatorRole = sessionUser?.role === 'OPERATOR';
  const isAdminLoggedIn =
    sessionUser?.role === 'ADMIN' || sessionUser?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (isAdminLoggedIn && sessionUser?.email) {
      const timer = window.setTimeout(() => {
        setAdminId((prev) => prev || sessionUser.email);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [isAdminLoggedIn, sessionUser?.email]);

  useEffect(() => {
    if (!unlocked) return undefined;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((unlocked.expiresAtMs - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    const initTimer = window.setTimeout(updateTimer, 0);
    const interval = window.setInterval(updateTimer, 1000);
    return () => {
      window.clearTimeout(initTimer);
      window.clearInterval(interval);
    };
  }, [unlocked]);

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

  const handleVerifyAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const effectiveId = isAdminLoggedIn && sessionUser ? sessionUser.email : adminId.trim();
      const res = await fetch('/api/download/desktop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: effectiveId,
          password,
          deviceName: deviceName.trim(),
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data?.error || 'Verifikasi akses unduhan gagal.');
        return;
      }

      const expiresAtMs = new Date(data.expiresAt).getTime();
      setUnlocked({
        downloadUrl: data.downloadUrl,
        expiresAtMs,
        deviceName: data.deviceName,
        verifiedBy: data.verifiedBy,
        installerReady: Boolean(data.installerReady),
        sourceMode: data.sourceMode,
        fileName: data.fileName,
        fileSizeBytes: data.fileSizeBytes ?? null,
      });
      setSecondsLeft(Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000)));
      setPassword('');
    } catch {
      setFormError('Gagal menghubungi server verifikasi. Periksa koneksi jaringan Anda.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetVerification = () => {
    setUnlocked(null);
    setSecondsLeft(0);
    setFormError('');
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
            Pilih installer Windows (.exe) khusus PC Admin Tool Room atau pasang Web App (PWA) ke HP dan tablet Operator. Seluruh data peminjaman, unit QR, dan handover tersinkron otomatis secara real-time dengan server pusat tanpa menyimpan kredensial database di perangkat pengguna.
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <section className="bg-white border border-slate-200 rounded flex flex-col">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Monitor className="w-4 h-4 text-[#1E40AF]" />
              <h2 className="text-sm font-bold font-heading text-slate-900">
                Aplikasi Desktop Windows (.exe)
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#1E40AF] border border-blue-200">
              KHUSUS ADMIN TOOL ROOM
            </span>
          </div>

          <div className="p-5 space-y-4 text-xs text-slate-600">
            <p className="leading-relaxed">
              Installer desktop Windows untuk komputer loket Tool Room. Setelah terpasang, aplikasi otomatis terhubung aman ke server pusat PT YPTI serta mendukung scanner QR USB dan cetak stiker QR.
            </p>

            <div className="border-t border-slate-100 pt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Keamanan Unduhan</span>
                <span className="font-semibold text-slate-800">Verifikasi Admin &amp; Tercatat AuditLog</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Keamanan Biner</span>
                <span className="font-semibold text-slate-800">Thin-Client (Tanpa Kredensial DB)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Target Perangkat</span>
                <span className="font-semibold text-slate-800">Windows 10 / 11 (64-bit)</span>
              </div>
            </div>

            {isOperatorRole ? (
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="p-3.5 rounded bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed">
                  Anda sedang masuk sebagai <strong>Operator Produksi ({sessionUser?.email})</strong>. Unduhan installer desktop Windows (.exe) hanya diotorisasi untuk akun Admin atau Super Admin Tool Room. Untuk HP atau tablet kerja di area mesin, gunakan tombol pemasangan <strong>Web App (PWA)</strong> di panel sebelah.
                </div>
              </div>
            ) : unlocked ? (
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div className="p-3.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-bold text-emerald-900">
                      <ShieldCheck className="w-4 h-4" />
                      Akses Unduhan Terverifikasi
                    </span>
                    <span className="font-mono font-bold tabular-nums text-[11px] px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-900">
                      {secondsLeft > 0 ? `Berlaku ${formatCountdown(secondsLeft)}` : 'Token Kedaluwarsa'}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-900">
                    Petugas {unlocked.verifiedBy} | Perangkat {unlocked.deviceName}
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    Berkas {unlocked.fileName} ({formatFileSize(unlocked.fileSizeBytes)})
                  </div>
                </div>

                {!unlocked.installerReady && (
                  <div className="p-3 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                    Berkas installer .exe belum ditemukan di penyimpanan lokal server maupun GitHub Releases. Pastikan tim IT sudah menjalankan build desktop atau merilis tag versi rilis terlebih dahulu.
                  </div>
                )}

                {secondsLeft > 0 ? (
                  <a
                    href={unlocked.downloadUrl}
                    download={unlocked.fileName}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 rounded transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh {unlocked.fileName} Sekarang</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetVerification}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Token Habis, Verifikasi Ulang</span>
                  </button>
                )}

                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-[11px] text-slate-600">
                  <p className="font-semibold text-slate-800">Langkah Pemasangan di Windows</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Klik dua kali berkas .exe yang selesai diunduh untuk memulai wizard instalasi.</li>
                    <li>Jika muncul peringatan keamanan Windows SmartScreen, pilih More info lalu klik Run anyway.</li>
                    <li>Buka ikon PT YPTI Tool Room ERP di Desktop lalu login; seluruh data langsung tersinkron otomatis.</li>
                  </ol>
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={handleResetVerification}
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Ganti Perangkat atau Verifikasi Ulang
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleVerifyAccess} className="border-t border-slate-100 pt-4 space-y-3">
                <div className="text-[11px] font-semibold text-slate-800">
                  Form Verifikasi Akses Unduhan Perangkat
                </div>

                {formError && (
                  <div className="p-2.5 rounded bg-red-50 border border-red-200 text-[11px] font-medium text-red-800 leading-snug">
                    {formError}
                  </div>
                )}

                <div>
                  <label htmlFor="dl-admin-id" className="block font-semibold text-slate-700 mb-1">
                    ID Pengguna Admin / Super Admin *
                  </label>
                  <input
                    id="dl-admin-id"
                    type="text"
                    required
                    readOnly={isAdminLoggedIn}
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase())}
                    placeholder="Contoh 10001 atau 10002"
                    className={`w-full border border-slate-300 rounded px-3 py-2 text-xs font-mono font-bold tabular-nums text-slate-900 focus:outline-none focus:border-[#1E40AF] ${
                      isAdminLoggedIn ? 'bg-slate-50 text-slate-700' : 'bg-white'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="dl-password" className="font-semibold text-slate-700">
                      Kata Sandi Konfirmasi *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                    </button>
                  </div>
                  <input
                    id="dl-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi akun Admin"
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>

                <div>
                  <label htmlFor="dl-device" className="block font-semibold text-slate-700 mb-1">
                    Nama Perangkat / Lokasi PC *
                  </label>
                  <input
                    id="dl-device"
                    type="text"
                    required
                    minLength={3}
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="Contoh PC Loket Tool Room 1"
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>

                <div>
                  <label htmlFor="dl-notes" className="block font-semibold text-slate-700 mb-1">
                    Keperluan Instalasi (Opsional)
                  </label>
                  <input
                    id="dl-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh Penggantian PC loket shift pagi"
                    className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#1E40AF]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 disabled:bg-slate-300 rounded transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Memverifikasi Izin...' : 'Verifikasi Akses & Buka Unduhan (.exe)'}</span>
                </button>
              </form>
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded flex flex-col">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
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
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let active = true;
    const verifySession = async () => {
      try {
        const res = await fetch('/api/auth', { cache: 'no-store' });
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.id) {
            setSessionUser(data.user as SessionUser);
            setAuthState('auth');
            return;
          }
        }
        setSessionUser(null);
        setAuthState('guest');
      } catch {
        if (active) {
          setSessionUser(null);
          setAuthState('guest');
        }
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
        <DownloadContent isAuthenticated sessionUser={sessionUser} />
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
        <DownloadContent isAuthenticated={false} sessionUser={null} />
      </main>
    </div>
  );
}
