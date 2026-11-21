'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userId.trim(), password }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Autentikasi gagal. Periksa kembali ID Pengguna dan kata sandi.');
      } else {
        if (typeof window !== 'undefined' && json.user) {
          sessionStorage.setItem('ypti_erp_active_user', JSON.stringify(json.user));
        }
        const targetDest = json.user?.role === 'OPERATOR' ? '/operator' : '/';
        router.push(targetDest);
        router.refresh();
      }
    } catch {
      setError('Terjadi gangguan jaringan saat menghubungkan ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded border border-slate-200 p-6 sm:p-7 space-y-5">
        <div className="text-center space-y-2 pb-2 border-b border-slate-100">
          <Image
            src="/ypti-logo.png"
            alt="Logo PT YPTI"
            width={176}
            height={44}
            priority
            className="h-11 w-auto mx-auto object-contain"
          />
          <h1 className="text-sm font-bold font-heading text-slate-900 tracking-tight uppercase">
            Tool Room &amp; Inventory ERP
          </h1>
          <p className="text-xs text-slate-600 text-balance">
            Silakan masuk menggunakan ID Pengguna resmi{' '}
            <span className="whitespace-nowrap font-semibold text-slate-700">PT YPTI</span>
          </p>
        </div>

        {error && (
          <div className="p-3 bg-slate-100 border border-slate-300 rounded text-xs text-slate-900 font-semibold leading-snug">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label htmlFor="login-userid" className="block font-semibold text-slate-700 mb-1.5">
              ID Pengguna / NIK Karyawan *
            </label>
            <input
              id="login-userid"
              type="text"
              required
              autoComplete="username"
              value={userId}
              onChange={(e) => setUserId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase())}
              placeholder="Masukkan ID pengguna atau NIK"
              className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs font-mono font-bold tabular-nums placeholder:font-sans placeholder:font-normal placeholder:text-slate-500 text-slate-900 focus:outline-none focus:border-[#1E40AF] transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="font-semibold text-slate-700">
                Kata Sandi *
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                {showPassword ? 'Sembunyikan' : 'Tampilkan'}
              </button>
            </div>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi akun"
              className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#1E40AF] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#1E40AF] hover:bg-blue-800 disabled:bg-slate-300 rounded transition-colors cursor-pointer"
          >
            {loading ? 'Memverifikasi Akses...' : 'Masuk ke Sistem'}
          </button>
        </form>

        <div className="pt-3 border-t border-slate-100 text-center">
          <Link
            href="/download"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#1E40AF] transition-colors"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="underline">Unduh Aplikasi</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
