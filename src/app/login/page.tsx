'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('10001');
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
        router.push('/');
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
          <img
            src="/ypti-logo.png"
            alt="Logo PT YPTI"
            className="h-11 w-auto mx-auto object-contain"
          />
          <h1 className="text-sm font-bold font-heading text-slate-900 tracking-tight uppercase">
            Tool Room &amp; Inventory ERP
          </h1>
          <p className="text-[11px] text-slate-500">
            Silakan masuk menggunakan Nomor ID Pengguna resmi PT YPTI
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
              ID Pengguna (Angka) *
            </label>
            <input
              id="login-userid"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              autoComplete="username"
              value={userId}
              onChange={(e) => setUserId(e.target.value.replace(/\D/g, ''))}
              placeholder="Contoh 10001"
              className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs font-mono font-bold tabular-nums text-slate-900 focus:outline-none focus:border-[#1E40AF] transition-colors"
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
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 underline cursor-pointer"
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
      </div>
    </div>
  );
}
