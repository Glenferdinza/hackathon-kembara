'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@ypti.co.id');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    const targetEmail = customEmail || email;
    const targetPass = customPass || password;

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPass }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Autentikasi gagal.');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    setEmail('admin@ypti.co.id');
    setPassword('admin123');
    handleLogin(undefined, 'admin@ypti.co.id', 'admin123');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-md border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-6">
        {/* Brand Header with Official Logo */}
        <div className="text-center space-y-2">
          <img
            src="/ypti-logo.png"
            alt="PT. YPTI Logo"
            className="h-12 w-auto mx-auto object-contain"
          />
          <h1 className="text-sm font-bold font-heading text-slate-900 tracking-tight">
            TOOL ROOM &amp; INVENTORY ERP
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">
            Sistem Manajemen Peminjaman Perkakas &amp; Aset Fisik
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-[#D94841] font-medium leading-snug">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Email Akun Petugas / Admin *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ypti.co.id"
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#1E40AF] focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Kata Sandi *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#1E40AF] focus:bg-white transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-xs font-bold text-white bg-[#1E40AF] hover:bg-[#1D4ED8] disabled:bg-slate-300 rounded transition-colors shadow-xs"
          >
            {loading ? 'Memverifikasi...' : 'Masuk ke Dashboard ERP'}
          </button>
        </form>

        {/* 1-Click Fast Demo Login for Presentation / Judges */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            disabled={loading}
            className="w-full py-2 px-3 text-xs font-bold text-[#1E40AF] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors text-center"
          >
            1-Klik Masuk sebagai Super Admin (Demo Hackathon)
          </button>
        </div>

        {/* Database & System Info */}
        <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-500 space-y-1">
          <div className="font-semibold text-slate-700">
            Mode Eksekusi Lokal 1-Klik (.BAT)
          </div>
          <p>
            Sistem beroperasi 100% offline dengan database relasional lokal dan skema kompatibel penuh PostgreSQL.
          </p>
        </div>
      </div>
    </div>
  );
}
