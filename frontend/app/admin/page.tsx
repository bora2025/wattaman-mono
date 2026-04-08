'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AuthGuard from '../../components/AuthGuard'
import Sidebar from '../../components/Sidebar'
import { adminNav } from '../../lib/admin-nav'
import { apiFetch } from '../../lib/api'
import { useLanguage } from '../../lib/i18n'
import { iconMap } from '../../components/Icons'

const quickActions = [
  {
    titleKey: 'admin.search',
    descKey: 'admin.searchDesc',
    href: '/admin/search',
    icon: 'search',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    titleKey: 'admin.manageUsers',
    descKey: 'admin.manageUsersDesc',
    href: '/admin/users',
    icon: 'users',
    color: 'from-blue-500 to-blue-600',
  },
  {
    titleKey: 'admin.manageClasses',
    descKey: 'admin.manageClassesDesc',
    href: '/admin/classes',
    icon: 'book',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    titleKey: 'admin.viewReports',
    descKey: 'admin.viewReportsDesc',
    href: '/admin/reports',
    icon: 'chart',
    color: 'from-violet-500 to-violet-600',
  },
  {
    titleKey: 'admin.idCard',
    descKey: 'admin.idCardDesc',
    href: '/admin/qr-codes',
    icon: 'id-card',
    color: 'from-amber-500 to-amber-600',
  },
  {
    titleKey: 'admin.editAttendance',
    descKey: 'admin.editAttendanceDesc',
    href: '/admin/attendance/edit',
    icon: 'edit',
    color: 'from-teal-500 to-teal-600',
  },
  {
    titleKey: 'admin.editStaffAttendance',
    descKey: 'admin.editStaffAttendanceDesc',
    href: '/admin/staff-attendance/edit',
    icon: 'edit',
    color: 'from-pink-500 to-pink-600',
  },
  {
    titleKey: 'admin.auditLogs',
    descKey: 'admin.auditLogsDesc',
    href: '/admin/audit',
    icon: 'clipboard',
    color: 'from-slate-500 to-slate-600',
  },
  {
    titleKey: 'admin.notifications',
    descKey: 'admin.notificationsDesc',
    href: '/admin/notifications',
    icon: 'bell',
    color: 'from-rose-500 to-rose-600',
  },
  {
    titleKey: 'admin.cardDesigner',
    descKey: 'admin.cardDesignerDesc',
    href: '/admin/card-designer',
    icon: 'design',
    color: 'from-cyan-500 to-cyan-600',
  },
]

interface SystemStatus {
  lastUpdated: string | null
  totalStudents: number
  totalClasses: number
  totalUsers: number
}

function formatCambodiaTime(iso: string): string {
  const d = new Date(iso)
  const cambodia = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  const date = cambodia.toISOString().split('T')[0]
  const time = cambodia.toISOString().slice(11, 16)
  return `${date} ${time} (GMT+7)`
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function AdminDashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    apiFetch('/api/reports/system-status')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStatus(data) })
      .catch(() => {})
  }, [])

  return (
    <AuthGuard requiredRole="ADMIN">
      <div className="page-shell">
        <Sidebar
          title="Admin Panel"
          subtitle="Wattaman"
          navItems={adminNav}
          accentColor="indigo"
        />
        <div className="page-content lg:ml-0">
          {/* Mobile spacer for top bar */}
          <div className="h-14 lg:hidden" />

          {/* ── Mobile: page header matches mobile app ── */}
          <div className="page-header">
            <h1 className="text-xl lg:text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{t('admin.title')}</h1>
            <p className="text-xs lg:text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{t('admin.subtitle')}</p>
          </div>

          <div className="page-body space-y-5">

            {/* System Status Bar */}
            {status && (
              <div className="card p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--color-primary)' }}></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: 'var(--color-primary)' }}></span>
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{t('admin.systemOnline')}</span>
                  </div>
                  {status.lastUpdated && (
                    <div className="text-xs sm:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('admin.lastUpdated')}: <span className="font-medium" style={{ color: 'var(--color-text)' }}>{timeAgo(status.lastUpdated)}</span>
                      <span className="ml-1 hidden sm:inline" style={{ color: 'var(--color-text-light)' }}>({formatCambodiaTime(status.lastUpdated)})</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 sm:gap-4 sm:ml-auto text-xs sm:text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>👥 <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{status.totalUsers}</span> {t('common.users')}</span>
                    <span>🎓 <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{status.totalStudents}</span> {t('common.students')}</span>
                    <span>📖 <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{status.totalClasses}</span> {t('common.classes')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Mobile: 4-col dashed action grid (matches DashboardScreen) ── */}
            <div className="lg:hidden">
              <div className="grid grid-cols-4 gap-2">
                {quickActions.map((action) => (
                  <Link key={action.href} href={action.href}>
                    <div className="action-card-mobile">
                      <span className="action-icon" style={{ color: 'var(--color-icon)' }}>
                        {(() => { const I = iconMap[action.icon]; return I ? <I size={26} /> : action.icon; })()}
                      </span>
                      <span className="action-label">{t(action.titleKey)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* ── Desktop: original card grid ── */}
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">{t('admin.quickActions')}</h2>
              <div className="grid grid-cols-3 gap-4">
                {quickActions.map((action) => (
                  <Link key={action.href} href={action.href}>
                    <div className="card-hover p-5 h-full cursor-pointer">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-sm mb-3`}>
                        {(() => { const I = iconMap[action.icon]; return I ? <I size={22} /> : action.icon; })()}
                      </div>
                      <h3 className="font-semibold text-slate-800 mb-1">{t(action.titleKey)}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{t(action.descKey)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}