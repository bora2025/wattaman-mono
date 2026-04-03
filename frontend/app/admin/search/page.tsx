'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../../../components/Sidebar'
import { adminNav } from '../../../lib/admin-nav'
import { apiFetch } from '../../../lib/api'

interface StudentProfile {
  id: string
  studentNumber: string | null
  sex: string | null
  photo: string | null
  dateOfBirth: string | null
  address: string | null
  class: { id: string; name: string } | null
}

interface SearchResult {
  id: string
  email: string
  name: string
  phone: string | null
  photo: string | null
  role: string
  createdAt: string
  studentProfile: StudentProfile | null
}

interface AttendanceSession {
  session: number
  status: string | null
  checkInTime: string | null
  checkOutTime: string | null
}

interface DailyAttendance {
  type: 'student' | 'staff'
  className: string | null
  sessions: AttendanceSession[]
}

const roleBadge: Record<string, string> = {
  ADMIN: 'badge-blue',
  TEACHER: 'badge-green',
  STUDENT: 'badge-yellow',
  PARENT: 'badge-gray',
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  TEACHER: 'គ្រូ-Teacher',
  STUDENT: 'Student',
  PARENT: 'Parent',
}

const statusColors: Record<string, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-700',
  LATE: 'bg-amber-100 text-amber-700',
  ABSENT: 'bg-red-100 text-red-700',
  PERMISSION: 'bg-blue-100 text-blue-700',
  DAY_OFF: 'bg-slate-100 text-slate-500',
}

const statusLabels: Record<string, string> = {
  PRESENT: '✓ Present',
  LATE: '⏰ Late',
  ABSENT: '✗ Absent',
  PERMISSION: '📋 Permission',
  DAY_OFF: '🚫 Day Off',
}

const sessionLabels = ['Session 1', 'Session 2', 'Session 3', 'Session 4']

/** Convert Google Drive sharing URLs to direct image URLs */
function normalizePhotoUrl(url: string): string {
  if (!url) return url
  const m1 = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
  if (m1) return `https://lh3.googleusercontent.com/d/${m1[1]}`
  const m2 = url.match(/drive\.google\.com\/open\?id=([^&]+)/)
  if (m2) return `https://lh3.googleusercontent.com/d/${m2[1]}`
  const m3 = url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/)
  if (m3) return `https://lh3.googleusercontent.com/d/${m3[1]}`
  return url
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [attendance, setAttendance] = useState<DailyAttendance | null>(null)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10))

  const doSearch = useCallback(async (q: string, role: string) => {
    setLoading(true)
    setHasSearched(true)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (role !== 'ALL') params.set('role', role)
      const res = await apiFetch(`/api/auth/users/search?${params}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search on query/filter change
  useEffect(() => {
    const timeout = setTimeout(() => {
      doSearch(query, roleFilter)
    }, 300)
    return () => clearTimeout(timeout)
  }, [query, roleFilter, doSearch])

  const fetchAttendance = useCallback(async (userId: string, date: string) => {
    setAttendanceLoading(true)
    try {
      const res = await apiFetch(`/api/attendance/user-daily?userId=${userId}&date=${date}`)
      if (res.ok) {
        setAttendance(await res.json())
      }
    } catch {
      setAttendance(null)
    } finally {
      setAttendanceLoading(false)
    }
  }, [])

  const handleSelectUser = (user: SearchResult) => {
    setSelected(user)
    setAttendance(null)
    setAttendanceDate(new Date().toISOString().slice(0, 10))
    fetchAttendance(user.id, new Date().toISOString().slice(0, 10))
  }

  const handleDateChange = (date: string) => {
    setAttendanceDate(date)
    if (selected) fetchAttendance(selected.id, date)
  }

  const roleFilters = ['ALL', 'STUDENT', 'TEACHER', 'ADMIN', 'PARENT'] as const

  return (
    <div className="page-shell">
      <Sidebar title="Admin Panel" subtitle="Wattanman" navItems={adminNav} accentColor="indigo" />
      <div className="page-content">
        <div className="h-14 lg:hidden" />
        <div className="page-header">
          <h1 className="text-2xl font-bold text-slate-800">Search Students & Staff</h1>
          <p className="text-sm text-slate-500 mt-1">Find students, teachers, admins and parents quickly.</p>
        </div>

        <div className="page-body space-y-5">
          {/* Search Bar */}
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 text-lg flex-shrink-0">🔍</span>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="flex-1 py-2.5 bg-transparent border-0 outline-none focus:ring-0 text-sm text-slate-800 placeholder:text-slate-400"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-slate-400 hover:text-slate-600 text-sm flex-shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Role Filter Tabs */}
          <div className="flex gap-1 flex-wrap">
            {roleFilters.map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  roleFilter === r
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {r === 'ALL' ? `All (${results.length})` : `${roleLabels[r] || r} (${results.filter(u => u.role === r).length})`}
              </button>
            ))}
          </div>

          {/* Results */}
          {loading ? (
            <div className="text-center py-12 text-slate-400">
              <div className="inline-block w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mb-2" />
              <p className="text-sm">Searching...</p>
            </div>
          ) : hasSearched && results.length === 0 ? (
            <div className="empty-state">
              <p className="text-lg">No results found</p>
              <p className="text-sm text-slate-400 mt-1">Try a different search term or filter.</p>
            </div>
          ) : results.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Class</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(user => (
                    <tr key={user.id} className="cursor-pointer hover:bg-indigo-50/50" onClick={() => handleSelectUser(user)}>
                      <td>
                        <div className="flex items-center gap-3">
                          {user.photo || user.studentProfile?.photo ? (
                            <img
                              src={normalizePhotoUrl(user.photo || user.studentProfile?.photo || '')}
                              alt={user.name}
                              className="w-9 h-9 rounded-full object-cover border-2 border-slate-200"
                            />
                          ) : (
                            <div className="avatar avatar-sm">{user.name.charAt(0).toUpperCase()}</div>
                          )}
                          <div>
                            <span className="font-medium text-slate-800">{user.name}</span>
                            {user.studentProfile?.studentNumber && (
                              <p className="text-xs text-slate-400">#{user.studentProfile.studentNumber}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-slate-500 text-sm">{user.email}</td>
                      <td className="text-slate-500 text-sm">{user.phone || '—'}</td>
                      <td><span className={roleBadge[user.role] || 'badge-gray'}>{roleLabels[user.role] || user.role}</span></td>
                      <td className="text-slate-500 text-sm">{user.studentProfile?.class?.name || '—'}</td>
                      <td>
                        <button
                          onClick={e => { e.stopPropagation(); handleSelectUser(user) }}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
                Showing {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            {/* Header with photo */}
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-800">Profile Details</h2>
                <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex items-center gap-4 mb-5">
                {selected.photo || selected.studentProfile?.photo ? (
                  <img
                    src={normalizePhotoUrl(selected.photo || selected.studentProfile?.photo || '')}
                    alt={selected.name}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-slate-200 shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-3xl font-bold">
                    {selected.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-slate-800 text-xl">{selected.name}</h3>
                  <span className={`${roleBadge[selected.role] || 'badge-gray'} text-xs mt-1 inline-block`}>{roleLabels[selected.role] || selected.role}</span>
                  {selected.studentProfile?.class && (
                    <p className="text-sm text-slate-500 mt-1">📖 {selected.studentProfile.class.name}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-400 mb-1">Email</p>
                  <p className="text-sm font-medium text-slate-700 break-all">{selected.email}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-400 mb-1">Phone</p>
                  <p className="text-sm font-medium text-slate-700">{selected.phone || '—'}</p>
                </div>
                {selected.studentProfile && (
                  <>
                    <div className="p-3 rounded-xl bg-slate-50">
                      <p className="text-xs text-slate-400 mb-1">Student ID</p>
                      <p className="text-sm font-medium text-slate-700">#{selected.studentProfile.studentNumber || '—'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50">
                      <p className="text-xs text-slate-400 mb-1">Sex</p>
                      <p className="text-sm font-medium text-slate-700">
                        {selected.studentProfile.sex === 'MALE' ? '♂ ប្រុស' : selected.studentProfile.sex === 'FEMALE' ? '♀ ស្រី' : '—'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50">
                      <p className="text-xs text-slate-400 mb-1">Date of Birth</p>
                      <p className="text-sm font-medium text-slate-700">
                        {selected.studentProfile.dateOfBirth ? new Date(selected.studentProfile.dateOfBirth).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50">
                      <p className="text-xs text-slate-400 mb-1">Class</p>
                      <p className="text-sm font-medium text-slate-700">{selected.studentProfile.class?.name || 'Unassigned'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 col-span-2">
                      <p className="text-xs text-slate-400 mb-1">Address</p>
                      <p className="text-sm font-medium text-slate-700">{selected.studentProfile.address || '—'}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Daily Attendance */}
            <div className="px-6 pb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700">Daily Attendance</h4>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={e => handleDateChange(e.target.value)}
                  className="!w-auto text-xs px-2 py-1 rounded-lg border border-slate-200"
                />
              </div>

              {attendanceLoading ? (
                <div className="text-center py-4">
                  <div className="inline-block w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                </div>
              ) : attendance ? (
                <div className="grid grid-cols-4 gap-2">
                  {attendance.sessions.map((s, i) => (
                    <div key={s.session} className="text-center">
                      <p className="text-[10px] text-slate-400 font-medium mb-1">{sessionLabels[i]}</p>
                      <div className={`px-2 py-2 rounded-lg text-xs font-semibold ${s.status ? statusColors[s.status] || 'bg-slate-100 text-slate-500' : 'bg-slate-50 text-slate-300'}`}>
                        {s.status ? statusLabels[s.status] || s.status : '—'}
                      </div>
                      {s.checkInTime && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(s.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-3">No attendance data</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
