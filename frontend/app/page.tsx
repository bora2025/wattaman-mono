'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '../lib/i18n'
import { IconShield, IconBook, IconGraduation, IconBriefcase } from '../components/Icons'

const portalKeys = [
  {
    titleKey: 'home.adminPortal',
    descKey: 'home.adminDesc',
    href: '/admin',
    IconComp: IconShield,
    color: 'from-indigo-500 to-indigo-700',
    hoverBorder: 'hover:border-indigo-300',
  },
  {
    titleKey: 'home.teacherPortal',
    descKey: 'home.teacherDesc',
    href: '/teacher',
    IconComp: IconBook,
    color: 'from-emerald-500 to-emerald-700',
    hoverBorder: 'hover:border-emerald-300',
  },
  {
    titleKey: 'home.studentPortal',
    descKey: 'home.studentDesc',
    href: '/student',
    IconComp: IconGraduation,
    color: 'from-sky-500 to-sky-700',
    hoverBorder: 'hover:border-sky-300',
  },
  {
    titleKey: 'home.employeePortal',
    descKey: 'home.employeeDesc',
    href: '/employee',
    IconComp: IconBriefcase,
    color: 'from-amber-500 to-amber-700',
    hoverBorder: 'hover:border-amber-300',
  },
]

export default function Home() {
  const { lang, setLang, t } = useLanguage()

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-mobile)' }}>
      {/* ── Mobile view: matches WelcomeScreen ── */}
      <div className="lg:hidden min-h-screen flex flex-col">
        {/* Top spacer + centered logo */}
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="w-28 h-28 mb-6">
            <Image src="/logo.png" alt="Wattaman" width={112} height={112} priority className="drop-shadow-lg" />
          </div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>Wattaman</h1>
          <p className="text-sm text-center leading-relaxed max-w-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {t('home.heroDesc')}
          </p>
        </div>

        {/* Bottom action section */}
        <div className="px-8 pb-10 space-y-4">
          <Link href="/login" className="block w-full text-center text-white font-bold text-lg py-3.5 shadow-lg" style={{ background: 'var(--color-primary)', borderRadius: '26px', boxShadow: '0 4px 12px rgba(0,201,167,0.3)' }}>
            {t('common.signIn')}
          </Link>
          <div className="flex justify-center gap-6">
            <button
              onClick={() => setLang(lang === 'en' ? 'kh' : 'en')}
              className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}
            >
              🌐 {lang === 'en' ? 'ភាសាខ្មែរ' : 'English'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop view: original layout ── */}
      <div className="hidden lg:block min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Wattaman" width={36} height={36} className="drop-shadow-sm" />
            <span className="font-bold text-slate-800 text-lg">Wattaman</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === 'en' ? 'kh' : 'en')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              🌐 {lang === 'en' ? 'ភាសាខ្មែរ' : 'English'}
            </button>
            <Link href="/login" className="btn-primary btn-sm">
              {t('common.signIn')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        <section className="py-12 sm:py-20 lg:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse-dot"></span>
            {t('home.title')}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight">
            {t('home.heroLine1')}<br />
            <span className="bg-gradient-to-r from-indigo-600 to-emerald-500 bg-clip-text text-transparent">
              {t('home.heroLine2')}
            </span>
          </h1>
          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            {t('home.heroDesc')}
          </p>
        </section>

        {/* Portal Cards */}
        <section className="pb-12 sm:pb-20 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {portalKeys.map((portal) => (
            <Link key={portal.href} href={portal.href}>
              <div className={`card-hover p-4 sm:p-6 h-full cursor-pointer ${portal.hoverBorder}`}>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${portal.color} flex items-center justify-center text-white shadow-sm mb-3 sm:mb-4`}>
                  <portal.IconComp size={24} />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-1">{t(portal.titleKey)}</h2>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed hidden xs:block">{t(portal.descKey)}</p>
                <div className="mt-3 sm:mt-4 text-indigo-600 text-xs sm:text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  {t('common.openPortal')} &rarr;
                </div>
              </div>
            </Link>
          ))}
        </section>

        {/* Stats bar */}
        <section className="pb-10 sm:pb-16">
          <div className="card p-4 sm:p-6 flex flex-wrap justify-center gap-6 sm:gap-8 lg:gap-16 text-center">
            <div>
              <p className="text-xl sm:text-3xl font-bold text-slate-800">{t('home.qrScan')}</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">{t('home.instantCheckIn')}</p>
            </div>
            <div className="hidden sm:block w-px bg-slate-200"></div>
            <div>
              <p className="text-xl sm:text-3xl font-bold text-slate-800">{t('home.realTime')}</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">{t('home.liveTracking')}</p>
            </div>
            <div className="hidden sm:block w-px bg-slate-200"></div>
            <div>
              <p className="text-xl sm:text-3xl font-bold text-slate-800">{t('home.reports')}</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">{t('home.csvAnalytics')}</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 text-center text-xs sm:text-sm text-slate-400">
          {t('home.footer')}
        </div>
      </footer>
      </div>
    </div>
  )
}