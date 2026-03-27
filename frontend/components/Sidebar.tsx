'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface SidebarProps {
  title: string;
  subtitle?: string;
  navItems: NavItem[];
  accentColor?: string;
}

const colorMap: Record<string, { bg: string; text: string; hover: string; active: string; ring: string; gradient: string }> = {
  indigo: {
    bg: 'bg-indigo-600',
    text: 'text-indigo-100',
    hover: 'hover:bg-indigo-700/50',
    active: 'bg-white/15 text-white font-semibold',
    ring: 'ring-indigo-500',
    gradient: 'from-indigo-700 to-indigo-900',
  },
  emerald: {
    bg: 'bg-emerald-600',
    text: 'text-emerald-100',
    hover: 'hover:bg-emerald-700/50',
    active: 'bg-white/15 text-white font-semibold',
    ring: 'ring-emerald-500',
    gradient: 'from-emerald-700 to-emerald-900',
  },
  sky: {
    bg: 'bg-sky-600',
    text: 'text-sky-100',
    hover: 'hover:bg-sky-700/50',
    active: 'bg-white/15 text-white font-semibold',
    ring: 'ring-sky-500',
    gradient: 'from-sky-700 to-sky-900',
  },
};

export default function Sidebar({ title, subtitle, navItems, accentColor = 'indigo' }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const colors = colorMap[accentColor] || colorMap.indigo;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    localStorage.removeItem('role');
    router.push('/login');
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 z-40 bg-gradient-to-r ${colors.gradient} text-white px-4 py-3 flex items-center justify-between shadow-lg`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-sm font-bold">
            {title.charAt(0)}
          </div>
          <span className="font-semibold text-sm">{title}</span>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile overlay */}
      {collapsed && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setCollapsed(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 lg:z-auto
        h-screen w-64 bg-gradient-to-b ${colors.gradient} text-white
        flex flex-col shadow-xl
        transition-transform duration-300 ease-in-out
        ${collapsed ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        {/* Logo area */}
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg font-bold backdrop-blur-sm">
              {title.charAt(0)}
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">{title}</h1>
              {subtitle && <p className="text-xs text-white/60 mt-0.5">{subtitle}</p>}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setCollapsed(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? colors.active
                    : `${colors.text} ${colors.hover}`
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <Link
            href="/"
            onClick={() => setCollapsed(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${colors.text} ${colors.hover} transition-colors`}
          >
            <span className="text-lg leading-none">🏠</span>
            <span>Back to Home</span>
          </Link>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full text-left ${colors.text} ${colors.hover} transition-colors`}
          >
            <span className="text-lg leading-none">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
