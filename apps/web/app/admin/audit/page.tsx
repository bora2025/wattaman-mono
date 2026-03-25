"use client"

import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import AuthGuard from '../../../components/AuthGuard'
import { adminNav } from '../../../lib/admin-nav'
import { apiFetch } from '../../../lib/api'

interface AuditLog {
  id: string
  student: {
    user: {
      name: string
    }
  }
  class: {
    name: string
  }
  status: string
  markedBy: {
    name: string
  }
  timestamp: string
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const res = await apiFetch('/api/reports/audit-logs')
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) setLogs(data)
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }

  return (
    <AuthGuard requiredRole="ADMIN">
      <div className="page-shell">
        <Sidebar title="Admin Panel" subtitle="SchoolSync" navItems={adminNav} accentColor="indigo" />
        <div className="page-content">
          <div className="h-14 lg:hidden" />
          <div className="page-header">
            <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>
            <p className="text-sm text-slate-500 mt-1">Recent attendance activity log</p>
          </div>
          <div className="page-body">
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Student</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Class</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Marked By</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-700">{log.student.user.name}</td>
                      <td className="px-4 py-3 text-slate-700">{log.class.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          log.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' :
                          log.status === 'LATE' ? 'bg-amber-100 text-amber-700' :
                          log.status === 'ABSENT' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>{log.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{log.markedBy.name}</td>
                      <td className="px-4 py-3 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No audit logs found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}