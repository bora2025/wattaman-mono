'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '../../lib/i18n';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        const role = data.user?.role;
        if (role) localStorage.setItem('role', role);

        const adminRoles = ['ADMIN'];
        const teacherRoles = ['TEACHER'];
        const studentRoles = ['STUDENT'];
        let dest = '/employee';
        if (adminRoles.includes(role)) dest = '/admin';
        else if (teacherRoles.includes(role)) dest = '/teacher';
        else if (studentRoles.includes(role)) dest = '/student';
        router.push(dest);
      } else {
        setError(t('login.invalidCredentials'));
        setLoading(false);
      }
    } catch {
      setError(t('login.error'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Mobile: teal header + white card (matches LoginScreen.tsx) ── */}
      <div className="lg:hidden min-h-screen flex flex-col">
        {/* Teal header */}
        <div className="relative px-5 pt-12 pb-20 flex flex-col items-center justify-center" style={{ background: 'var(--color-primary)' }}>
          <Link href="/" className="absolute left-4 top-12 text-white text-sm font-semibold flex items-center gap-1">
            ← {t('login.backToHome')}
          </Link>
          <div className="w-16 h-16 mb-3">
            <Image src="/logo.png" alt="Wattaman" width={64} height={64} priority className="drop-shadow-md brightness-0 invert" />
          </div>
          <h1 className="text-[28px] font-bold text-white">{t('login.welcome')}</h1>
        </div>

        {/* White card overlapping header */}
        <div className="flex-1 bg-white -mt-6" style={{ borderRadius: '30px 30px 0 0' }}>
          <form onSubmit={handleLogin} className="px-8 pt-10 pb-8 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[15px] font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{t('common.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[15px] font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{t('common.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-lg"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="pt-6 flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="text-white font-bold text-lg py-3.5 disabled:opacity-60"
                style={{ background: 'var(--color-primary)', borderRadius: '26px', width: '70%', boxShadow: '0 4px 12px rgba(0,201,167,0.3)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {t('login.signingIn')}
                  </span>
                ) : (
                  t('common.signIn')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Desktop: original card layout ── */}
      <div className="hidden lg:flex lg:flex-col lg:min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="Wattaman" width={36} height={36} className="drop-shadow-sm" />
              <span className="font-bold text-slate-800 text-lg">Wattaman</span>
            </Link>
          </div>
        </header>

        {/* Login Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <Image src="/logo.png" alt="Wattaman" width={56} height={56} className="drop-shadow-lg mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-slate-900">{t('login.welcome')}</h1>
              <p className="text-sm text-slate-500 mt-1">{t('login.subtitle')}</p>
            </div>

            <form onSubmit={handleLogin} className="card p-6 space-y-4" style={{ borderColor: '#e2e8f0' }}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="form-label">{t('common.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="form-label">{t('common.password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {t('login.signingIn')}
                  </span>
                ) : (
                  t('common.signIn')
                )}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-6">
              <Link href="/" className="text-indigo-500 hover:text-indigo-700 transition-colors">
                {t('login.backToHome')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}