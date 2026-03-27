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

const roleBadge: Record<string, string> = {
  ADMIN: 'badge-blue',
  TEACHER: 'badge-green',
  STUDENT: 'badge-yellow',
  PARENT: 'badge-gray',
}

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

  const roleFilters = ['ALL', 'STUDENT', 'TEACHER', 'ADMIN', 'PARENT'] as const

  const roleCounts = roleFilters.reduce((acc, r) => {
    acc[r] = r === 'ALL' ? results.length : results.filter(u => u.role === r).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="page-shell">
      <Sidebar title="Admin Panel" subtitle="SchoolSync" navItems={adminNav} accentColor="indigo" />
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
                {r === 'ALL' ? 'All' : r.charAt(0) + r.slice(1).toLowerCase()}
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
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(user => (
                    <tr key={user.id} className="cursor-pointer hover:bg-indigo-50/50" onClick={() => setSelected(user)}>
                      <td>
                        <div className="flex items-center gap-3">
                          {user.photo || user.studentProfile?.photo ? (
                            <img
                              src={normalizePhotoUrl(user.photo || user.studentProfile?.photo || '')}
                              alt={user.name}
                              className="w-8 h-8 rounded-full object-cover"
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
                      <td><span className={roleBadge[user.role] || 'badge-gray'}>{user.role}</span></td>
                      <td className="text-slate-500 text-sm">{user.studentProfile?.class?.name || '—'}</td>
                      <td className="text-slate-500 text-sm">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={e => { e.stopPropagation(); setSelected(user) }}
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">User Details</h2>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>

            <div className="flex items-center gap-4 mb-5">
              {selected.photo || selected.studentProfile?.photo ? (
                <img
                  src={normalizePhotoUrl(selected.photo || selected.studentProfile?.photo || '')}
                  alt={selected.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl font-bold">
                  {selected.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-slate-800 text-lg">{selected.name}</h3>
                <span className={`${roleBadge[selected.role] || 'badge-gray'} text-xs`}>{selected.role}</span>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-800 font-medium">{selected.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Phone</span>
                <span className="text-slate-800 font-medium">{selected.phone || '—'}</span>
              </div>
              {selected.studentProfile && (
                <>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Student #</span>
                    <span className="text-slate-800 font-medium">{selected.studentProfile.studentNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Sex</span>
                    <span className="text-slate-800 font-medium">{selected.studentProfile.sex || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Class</span>
                    <span className="text-slate-800 font-medium">{selected.studentProfile.class?.name || 'Unassigned'}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Joined</span>
                <span className="text-slate-800 font-medium">{new Date(selected.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
