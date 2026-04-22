'use client'

import AuthGuard from '../../components/AuthGuard'
import Sidebar from '../../components/Sidebar'
import { wattamanNav } from '../../lib/wattaman-nav'
import Link from 'next/link'

function WattamanDashboardContent() {
  return (
    <div className="page-shell">
      <Sidebar title="Wattaman" subtitle="QR Attendance" navItems={wattamanNav} accentColor="emerald" bottomTabs={['/wattaman', '/wattaman/scan']} />
      <div className="page-content">
        <div className="h-14 lg:hidden" />

        <div className="page-header">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Wattaman Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Scan any student QR code to record attendance instantly</p>
        </div>

        <div className="page-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/wattaman/scan" className="card-hover p-5 rounded-2xl border border-slate-200 bg-white">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">📷</div>
              <h2 className="mt-4 text-lg font-semibold text-slate-800">Scan Student QR</h2>
              <p className="mt-1 text-sm text-slate-500">Open camera and scan any student ID card QR code. No class selection needed.</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WattamanDashboardPage() {
  return (
    <AuthGuard allowedRoles={['WATTAMAN', 'ADMIN']}>
      <WattamanDashboardContent />
    </AuthGuard>
  )
}
