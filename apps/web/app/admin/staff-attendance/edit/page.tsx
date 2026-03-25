'use client'

import { useState, useEffect } from 'react'
import Sidebar from '../../../../components/Sidebar'
import { adminNav } from '../../../../lib/admin-nav'
import { apiFetch } from '../../../../lib/api'

const STATUSES = ['PRESENT', 'LATE', 'ABSENT', 'PERMISSION']

interface SessionRecord {
  session: number
  attendanceId: string | null
  status: string | null
  checkInTime: string | null
  checkOutTime: string | null
}

interface StaffRow {
  userId: string
  staffName: string
  role: string
  sessions: SessionRecord[]
}

export default function EditStaffAttendance() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [rows, setRows] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')


  useEffect(() => {
    if (selectedDate) fetchRecords()
  }, [selectedDate])

  const fetchRecords = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch(`/api/attendance/staff/records?date=${selectedDate}`)
      if (res.ok) setRows(await res.json())
      else setError('Failed to load staff attendance records.')
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to connect to server.')
    } finally { setLoading(false) }
  }

  const handleStatusChange = async (staffRow: StaffRow, session: number, newStatus: string) => {
    const sessionRec = staffRow.sessions.find(s => s.session === session)
    if (!sessionRec) return

    setSaving(`${staffRow.userId}-${session}`)
    setError('')
    setSuccess('')

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
              }

      if (sessionRec.attendanceId) {
        // Update existing record
        const res = await apiFetch('/api/attendance/staff/update', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ staffAttendanceId: sessionRec.attendanceId, status: newStatus }),
        })
        if (!res.ok) throw new Error('Failed to update')
      } else {
        // Create new record
        const res = await apiFetch('/api/attendance/staff/create-record', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            userId: staffRow.userId,
            session,
            status: newStatus,
            date: selectedDate,
          }),
        })
        if (!res.ok) throw new Error('Failed to create')
      }

      setSuccess(`Updated ${staffRow.staffName} session ${session} to ${newStatus}`)
      setTimeout(() => setSuccess(''), 3000)
      await fetchRecords()
    } catch (err) {
      setError('Failed to save change. Please try again.')
    } finally { setSaving(null) }
  }

  const goDay = (offset: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + offset)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const dayLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const statusColor = (s: string | null) => {
    switch (s) {
      case 'PRESENT': return 'bg-emerald-100 text-emerald-800 border-emerald-300'
      case 'LATE': return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'ABSENT': return 'bg-red-100 text-red-800 border-red-300'
      case 'PERMISSION': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-slate-100 text-slate-500 border-slate-300'
    }
  }

  const sessionLabel = (n: number) => {
    switch (n) {
      case 1: return 'Morning 1'
      case 2: return 'Morning 2'
      case 3: return 'Afternoon 1'
      case 4: return 'Afternoon 2'
      default: return `Session ${n}`
    }
  }

  const roleBadge = (role: string) => {
    if (role === 'ADMIN') return 'bg-violet-100 text-violet-700'
    return 'bg-sky-100 text-sky-700'
  }

  return (
    <div className="page-shell">
      <Sidebar title="Admin Panel" subtitle="SchoolSync" navItems={adminNav} accentColor="indigo" />
      <div className="page-content">
        <div className="h-14 lg:hidden" />
        <div className="page-header">
          <h1 className="text-2xl font-bold text-slate-800">Edit Staff Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">Update staff attendance status for any date and session</p>
        </div>
        <div className="page-body space-y-6">
          {/* Controls */}
          <div className="card p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                <div className="flex items-center gap-1">
                  <button onClick={() => goDay(-1)} className="px-2 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm">◀</button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                  <button onClick={() => goDay(1)} className="px-2 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm">▶</button>
                </div>
              </div>
              <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="btn-ghost btn-sm">
                📅 Today
              </button>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-700">{dayLabel}</p>
          </div>

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2">
              <span>✅</span> {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">{error}</div>
          )}

          {loading ? (
            <div className="card p-12">
              <div className="empty-state">
                <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm text-slate-500 mt-3">Loading…</p>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="card p-12">
              <div className="empty-state">
                <p className="text-4xl mb-3">👔</p>
                <p className="font-semibold text-slate-600">No staff found</p>
                <p className="text-sm text-slate-400 mt-1">No teachers or admin staff in the system.</p>
              </div>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-3 py-3 font-semibold">Staff Name</th>
                      <th className="px-3 py-3 font-semibold">Role</th>
                      {[1, 2, 3, 4].map(s => (
                        <th key={s} className="px-3 py-3 font-semibold text-center">
                          <div>{sessionLabel(s)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.userId} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2.5 text-slate-800 font-medium">{row.staffName}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${roleBadge(row.role)}`}>
                            {row.role}
                          </span>
                        </td>
                        {row.sessions.map(sess => (
                          <td key={sess.session} className="px-3 py-2.5 text-center">
                            <select
                              value={sess.status || ''}
                              onChange={(e) => handleStatusChange(row, sess.session, e.target.value)}
                              disabled={saving === `${row.userId}-${sess.session}`}
                              className={`rounded-lg border px-2 py-1.5 text-xs font-semibold outline-none cursor-pointer transition-colors ${statusColor(sess.status)} ${
                                saving === `${row.userId}-${sess.session}` ? 'opacity-50' : ''
                              }`}
                            >
                              <option value="">— Not Set —</option>
                              {STATUSES.map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
