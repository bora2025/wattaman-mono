'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AuthGuard from '../../components/AuthGuard'
import Sidebar from '../../components/Sidebar'
import { adminNav } from '../../lib/admin-nav'
import { apiFetch } from '../../lib/api'
import { useLanguage } from '../../lib/i18n'

const quickActions = [
  {
    titleKey: 'admin.search',
    descKey: 'admin.searchDesc',
    href: '/admin/search',
    icon: '🔍',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    titleKey: 'admin.manageUsers',
    descKey: 'admin.manageUsersDesc',
    href: '/admin/users',
    icon: '👥',
    color: 'from-blue-500 to-blue-600',
  },
  {
    titleKey: 'admin.manageClasses',
    descKey: 'admin.manageClassesDesc',
    href: '/admin/classes',
    icon: '📖',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    titleKey: 'admin.viewReports',
    descKey: 'admin.viewReportsDesc',
    href: '/admin/reports',
    icon: '📈',
    color: 'from-violet-500 to-violet-600',
  },
  {
    titleKey: 'admin.idCard',
    descKey: 'admin.idCardDesc',
    href: '/admin/qr-codes',
    icon: '🪪',
    color: 'from-amber-500 to-amber-600',
  },
  {
    titleKey: 'admin.editAttendance',
    descKey: 'admin.editAttendanceDesc',
    href: '/admin/attendance/edit',
    icon: '✏️',
    color: 'from-teal-500 to-teal-600',
  },
  {
    titleKey: 'admin.editStaffAttendance',
    descKey: 'admin.editStaffAttendanceDesc',
    href: '/admin/staff-attendance/edit',
    icon: '✏️',
    color: 'from-pink-500 to-pink-600',
  },
  {
    titleKey: 'admin.auditLogs',
    descKey: 'admin.auditLogsDesc',
    href: '/admin/audit',
    icon: '🔍',
    color: 'from-slate-500 to-slate-600',
  },
  {
    titleKey: 'admin.notifications',
    descKey: 'admin.notificationsDesc',
    href: '/admin/notifications',
    icon: '🔔',
    color: 'from-rose-500 to-rose-600',
  },
  {
    titleKey: 'admin.cardDesigner',
    descKey: 'admin.cardDesignerDesc',
    href: '/admin/card-designer',
    icon: '🪪',
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
          {/* Mobile spacer */}
          <div className="h-14 lg:hidden" />
          <div className="page-header">
            <h1 className="text-2xl font-bold text-slate-800">{t('admin.title')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('admin.subtitle')}</p>
          </div>
          <div className="page-body space-y-6">

            {/* System Status Bar */}
            {status && (
              <div className="card p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-medium text-slate-700">{t('admin.systemOnline')}</span>
                  </div>
                  {status.lastUpdated && (
                    <div className="text-xs sm:text-sm text-slate-500">
                      {t('admin.lastUpdated')}: <span className="font-medium text-slate-700">{timeAgo(status.lastUpdated)}</span>
                      <span className="text-slate-400 ml-1 hidden sm:inline">({formatCambodiaTime(status.lastUpdated)})</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 sm:gap-4 sm:ml-auto text-xs sm:text-sm">
                    <span className="text-slate-500">👥 <span className="font-semibold text-slate-700">{status.totalUsers}</span> {t('common.users')}</span>
                    <span className="text-slate-500">🎓 <span className="font-semibold text-slate-700">{status.totalStudents}</span> {t('common.students')}</span>
                    <span className="text-slate-500">📖 <span className="font-semibold text-slate-700">{status.totalClasses}</span> {t('common.classes')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions Grid */}
            <h2 className="text-base sm:text-lg font-semibold text-slate-700 mb-3 sm:mb-4">{t('admin.quickActions')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="card-hover p-3 sm:p-5 h-full cursor-pointer">
                    <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-lg sm:text-xl shadow-sm mb-2 sm:mb-3`}>
                      {action.icon}
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-0.5 sm:mb-1 text-sm sm:text-base">{t(action.titleKey)}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed hidden xs:block">{t(action.descKey)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}