'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AuthGuard from '../../components/AuthGuard'
import Sidebar from '../../components/Sidebar'
import { adminNav } from '../../lib/admin-nav'
import { apiFetch } from '../../lib/api'

const quickActions = [
  {
    title: 'Search',
    description: 'Find students, teachers, and staff quickly.',
    href: '/admin/search',
    icon: '🔍',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    title: 'Manage Users',
    description: 'Add, edit, import/export users via CSV.',
    href: '/admin/users',
    icon: '👥',
    color: 'from-blue-500 to-blue-600',
  },
  {
    title: 'Manage Classes',
    description: 'Create classes and assign students.',
    href: '/admin/classes',
    icon: '📖',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    title: 'View Reports',
    description: 'Analytics and attendance summaries.',
    href: '/admin/reports',
    icon: '📈',
    color: 'from-violet-500 to-violet-600',
  },
  {
    title: 'ID Card',
    description: 'Create and download student ID cards.',
    href: '/admin/qr-codes',
    icon: '🪪',
    color: 'from-amber-500 to-amber-600',
  },
  {
    title: 'Edit Attendance',
    description: 'Edit student attendance: present, absent, permission.',
    href: '/admin/attendance/edit',
    icon: '✏️',
    color: 'from-teal-500 to-teal-600',
  },
  {
    title: 'Edit Staff Attendance',
    description: 'Edit staff attendance: present, absent, permission.',
    href: '/admin/staff-attendance/edit',
    icon: '✏️',
    color: 'from-pink-500 to-pink-600',
  },
  {
    title: 'Audit Logs',
    description: 'Track who marked attendance and when.',
    href: '/admin/audit',
    icon: '🔍',
    color: 'from-slate-500 to-slate-600',
  },
  {
    title: 'Notifications',
    description: 'Configure email/SMS alerts for absences.',
    href: '/admin/notifications',
    icon: '🔔',
    color: 'from-rose-500 to-rose-600',
  },
  {
    title: 'Card Designer',
    description: 'Customize cards with logos, text, colors, and sizes.',
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
          subtitle="SchoolSync"
          navItems={adminNav}
          accentColor="indigo"
        />
        <div className="page-content lg:ml-0">
          {/* Mobile spacer */}
          <div className="h-14 lg:hidden" />
          <div className="page-header">
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Welcome back! Here&apos;s your admin overview.</p>
          </div>
          <div className="page-body space-y-6">

            {/* System Status Bar */}
            {status && (
              <div className="card p-4">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-medium text-slate-700">System Online</span>
                  </div>
                  {status.lastUpdated && (
                    <div className="text-sm text-slate-500">
                      Last updated: <span className="font-medium text-slate-700">{timeAgo(status.lastUpdated)}</span>
                      <span className="text-slate-400 ml-1">({formatCambodiaTime(status.lastUpdated)})</span>
                    </div>
                  )}
                  <div className="flex gap-4 ml-auto text-sm">
                    <span className="text-slate-500">👥 <span className="font-semibold text-slate-700">{status.totalUsers}</span> Users</span>
                    <span className="text-slate-500">🎓 <span className="font-semibold text-slate-700">{status.totalStudents}</span> Students</span>
                    <span className="text-slate-500">📖 <span className="font-semibold text-slate-700">{status.totalClasses}</span> Classes</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions Grid */}
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="card-hover p-5 h-full cursor-pointer">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-xl shadow-sm mb-3`}>
                      {action.icon}
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">{action.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{action.description}</p>
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