"use client"

import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import AuthGuard from '../../../components/AuthGuard'
import { employeeNav } from '../../../lib/employee-nav'
import { apiFetch } from '../../../lib/api'

interface GridRow {
  userId: string
  staffName: string
  role: string
  checkInMorning: string | null
  checkOutMorning: string | null
  checkInAfternoon: string | null
  checkOutAfternoon: string | null
  session1Status: string | null
  session2Status: string | null
  session3Status: string | null
  session4Status: string | null
  isHoliday?: boolean
  scanLatitude: number | null
  scanLongitude: number | null
  scanLocation: string | null
}

interface TotalsRow {
  userId: string
  staffName: string
  role: string
  week: { present: number; late: number; absent: number; dayOff: number }
  month: { present: number; late: number; absent: number; dayOff: number }
  year: { present: number; late: number; absent: number; dayOff: number }
}

export default function EmployeeReports() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [grid, setGrid] = useState<GridRow[]>([])
  const [totals, setTotals] = useState<TotalsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily')

  // Export form state
  const [showExportForm, setShowExportForm] = useState(false)
  const [exportPeriod, setExportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily')
  const [exportDate, setExportDate] = useState(() => new Date().toISOString().split('T')[0])
  const [exporting, setExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState('')

  useEffect(() => {
    apiFetch('/api/auth/me').then(async (res) => {
      if (res.ok) {
        const user = await res.json()
        setUserName(user.name)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => { fetchData() }, [selectedDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [gridRes, totalsRes] = await Promise.all([
        apiFetch(`/api/reports/employee/my-daily-grid?date=${selectedDate}`),
        apiFetch(`/api/reports/employee/my-totals?date=${selectedDate}`),
      ])
      if (gridRes.ok) setGrid(await gridRes.json())
      if (totalsRes.ok) setTotals(await totalsRes.json())
    } catch { /* ignore */ }
    setLoading(false)
  }

  const handleExportReport = async () => {
    setExporting(true)
    setExportMessage('')
    try {
      const res = await apiFetch(`/api/reports/employee/my-export-xlsx?date=${exportDate}&period=${exportPeriod}`)
      if (!res.ok) { setExportMessage('❌ Export failed'); setExporting(false); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my_attendance_${exportPeriod}_${exportDate}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      setExportMessage('✅ Downloaded successfully!')
    } catch { setExportMessage('❌ Export failed') }
    setExporting(false)
  }

  const goDay = (delta: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + delta)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const dayLabel = (() => {
    const d = new Date(selectedDate + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  })()

  // Daily stats from grid
  const row = grid[0]
  const statuses = row ? [row.session1Status, row.session2Status, row.session3Status, row.session4Status] : []
  const dailyPresent = statuses.filter(s => s === 'PRESENT').length
  const dailyLate = statuses.filter(s => s === 'LATE').length
  const dailyAbsent = statuses.filter(s => s === 'ABSENT').length
  const dailyPermission = statuses.filter(s => s === 'DAY_OFF').length
  const isHoliday = row?.isHoliday

  const tabs = [
    { key: 'daily', label: '📋 Daily' },
    { key: 'weekly', label: '📅 Weekly' },
    { key: 'monthly', label: '📆 Monthly' },
    { key: 'yearly', label: '📊 Yearly' },
  ] as const

  return (
    <AuthGuard allowedRoles={['EMPLOYEE']}>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar title="Employee" subtitle={userName || 'Portal'} navItems={employeeNav} accentColor="emerald" />

        <main className="flex-1 lg:ml-0">
          <div className="lg:hidden h-14" />
          <div className="page-shell">
            <div className="page-content">
              {/* Header */}
              <div className="page-header">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">📈 My Reports</h1>
                  <p className="text-sm text-slate-500 mt-1">View your attendance history and statistics</p>
                </div>
              </div>

              <div className="page-body space-y-6">

                {/* Controls Card */}
                <div className="card p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => goDay(-1)} className="btn-outline px-2 py-1.5 text-sm">◀</button>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                      <button onClick={() => goDay(1)} className="btn-outline px-2 py-1.5 text-sm">▶</button>
                    </div>
                    <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="btn-outline px-3 py-1.5 text-sm">
                      Today
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => { setShowExportForm(true); setExportDate(selectedDate); setExportMessage('') }} className="btn-primary px-4 py-1.5 text-sm flex items-center gap-1.5">
                      📥 Export Report
                    </button>
                  </div>
                </div>

                {/* Holiday Banner */}
                {isHoliday && (
                  <div className="card p-4 bg-amber-50 border-amber-200 text-center">
                    <p className="text-amber-800 font-semibold">🎉 Holiday — {dayLabel}</p>
                  </div>
                )}

                {loading ? (
                  <div className="card p-12 text-center">
                    <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : (
                  <>
                    {/* Tabs */}
                    <div className="flex gap-2 flex-wrap">
                      {tabs.map(t => (
                        <button
                          key={t.key}
                          onClick={() => setActiveTab(t.key)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            activeTab === t.key
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {activeTab === 'daily' ? (
                      <>
                        {/* Daily Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                          <div className="stat-card">
                            <p className="stat-value text-slate-800">4</p>
                            <p className="stat-label">Sessions</p>
                          </div>
                          <div className="stat-card">
                            <p className="stat-value text-emerald-600">{dailyPresent}</p>
                            <p className="stat-label">Present</p>
                          </div>
                          <div className="stat-card">
                            <p className="stat-value text-amber-600">{dailyLate}</p>
                            <p className="stat-label">Late</p>
                          </div>
                          <div className="stat-card">
                            <p className="stat-value text-red-600">{dailyAbsent}</p>
                            <p className="stat-label">Absent</p>
                          </div>
                          <div className="stat-card col-span-2 sm:col-span-1">
                            <p className="stat-value text-purple-600">{dailyPermission}</p>
                            <p className="stat-label">Permission</p>
                          </div>
                        </div>

                        {/* Daily Grid */}
                        <div className="card overflow-hidden">
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                            <h3 className="text-sm font-semibold text-slate-700">📋 {dayLabel}</h3>
                          </div>
                          {grid.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                              <p className="text-3xl mb-2">📭</p>
                              <p className="text-sm">No records for this day</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50">
                                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                                    <th className="px-3 py-3 font-semibold">Day</th>
                                    <th className="px-3 py-3 font-semibold text-center">Morning In</th>
                                    <th className="px-3 py-3 font-semibold text-center">Morning Out</th>
                                    <th className="px-3 py-3 font-semibold text-center">Afternoon In</th>
                                    <th className="px-3 py-3 font-semibold text-center">Afternoon Out</th>
                                    <th className="px-3 py-3 font-semibold">Location</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {grid.map(r => (
                                    <tr key={r.userId} className={`border-t border-slate-100 ${r.isHoliday ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}>
                                      <td className="px-3 py-2.5 text-slate-800 font-medium">{dayLabel.split(',')[0]}</td>
                                      <SessionCell time={r.checkInMorning} status={r.session1Status} />
                                      <SessionCell time={r.checkOutMorning} status={r.session2Status} />
                                      <SessionCell time={r.checkInAfternoon} status={r.session3Status} />
                                      <SessionCell time={r.checkOutAfternoon} status={r.session4Status} />
                                      <td className="px-3 py-2.5">
                                        {r.scanLatitude && r.scanLongitude ? (
                                          <a
                                            href={`https://www.google.com/maps?q=${r.scanLatitude},${r.scanLongitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                          >
                                            📍 {r.scanLatitude?.toFixed(4)}, {r.scanLongitude?.toFixed(4)}
                                          </a>
                                        ) : (
                                          <span className="text-xs text-slate-400">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      /* Period Totals Tab (Weekly / Monthly / Yearly) */
                      <>
                        {totals.length === 0 ? (
                          <div className="card p-12">
                            <div className="empty-state">
                              <p className="text-4xl mb-3">📊</p>
                              <p className="font-semibold text-slate-600">No data</p>
                              <p className="text-sm text-slate-400 mt-1">No attendance totals available.</p>
                            </div>
                          </div>
                        ) : (() => {
                          const periodKey = activeTab === 'weekly' ? 'week' : activeTab === 'monthly' ? 'month' : 'year'
                          const periodLabel = activeTab === 'weekly' ? 'Weekly' : activeTab === 'monthly' ? 'Monthly' : 'Yearly'
                          const t = totals[0]
                          return (
                            <div className="card overflow-hidden">
                              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                <h3 className="text-sm font-semibold text-slate-700">{periodLabel} Attendance Totals</h3>
                              </div>
                              {/* Summary cards for period */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4">
                                <div className="stat-card">
                                  <p className="stat-value text-emerald-600">{t[periodKey].present}</p>
                                  <p className="stat-label">Present</p>
                                </div>
                                <div className="stat-card">
                                  <p className="stat-value text-amber-600">{t[periodKey].late}</p>
                                  <p className="stat-label">Late</p>
                                </div>
                                <div className="stat-card">
                                  <p className="stat-value text-red-600">{t[periodKey].absent}</p>
                                  <p className="stat-label">Absent</p>
                                </div>
                                <div className="stat-card">
                                  <p className="stat-value text-purple-600">{t[periodKey].dayOff || 0}</p>
                                  <p className="stat-label">Permission</p>
                                </div>
                              </div>
                              {/* Detail table */}
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-slate-50">
                                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                                      <th className="px-3 py-3 font-semibold">Name</th>
                                      <th className="px-3 py-3 font-semibold text-center">Total Present</th>
                                      <th className="px-3 py-3 font-semibold text-center">Total Present (Late)</th>
                                      <th className="px-3 py-3 font-semibold text-center">Total Absent</th>
                                      <th className="px-3 py-3 font-semibold text-center">Total Permission</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="border-t border-slate-100 hover:bg-slate-50">
                                      <td className="px-3 py-2.5 text-slate-800 font-medium">{t.staffName}</td>
                                      <td className="px-3 py-2.5 text-center text-emerald-700 font-semibold">{t[periodKey].present}</td>
                                      <td className="px-3 py-2.5 text-center text-amber-600 font-semibold">{t[periodKey].late}</td>
                                      <td className="px-3 py-2.5 text-center text-red-600 font-semibold">{t[periodKey].absent}</td>
                                      <td className="px-3 py-2.5 text-center text-purple-600 font-semibold">{t[periodKey].dayOff || 0}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )
                        })()}
                      </>
                    )}
                  </>
                )}

              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Export Report Modal */}
      {showExportForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowExportForm(false); setExportMessage('') }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-white rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-slate-800">📊 Export My Report</h2>
                <p className="text-xs text-slate-500 mt-0.5">Choose period and date to export XLSX</p>
              </div>
              <button onClick={() => { setShowExportForm(false); setExportMessage('') }} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-sm">✕</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Period Selector */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">📅 Period</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setExportPeriod(p)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                        exportPeriod === p
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {p === 'daily' ? '📋 Daily' : p === 'weekly' ? '📅 Week' : p === 'monthly' ? '📆 Month' : '📊 Year'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Picker */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">📆 Date</label>
                <input
                  type="date"
                  value={exportDate}
                  onChange={e => setExportDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Preview */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400">Export Preview</h4>
                <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                  <span className="text-slate-500">Type:</span>
                  <span className="font-medium text-slate-800">My Attendance</span>
                  <span className="text-slate-500">Period:</span>
                  <span className="font-medium text-slate-800">{exportPeriod.charAt(0).toUpperCase() + exportPeriod.slice(1)}</span>
                  <span className="text-slate-500">Date:</span>
                  <span className="font-medium text-slate-800">{exportDate}</span>
                </div>
              </div>

              {/* Export Message */}
              {exportMessage && (
                <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
                  exportMessage.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {exportMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowExportForm(false); setExportMessage('') }} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleExportReport}
                  disabled={exporting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
                >
                  {exporting ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Exporting…</>
                  ) : (
                    <>📥 Download XLSX</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  )
}

function SessionCell({ time, status }: { time: string | null; status: string | null }) {
  if (!status) {
    return <td className="px-3 py-2.5 text-center"></td>
  }
  if (status === 'ABSENT') {
    return <td className="px-3 py-2.5 text-center"><span className="text-xs text-red-400">✗</span></td>
  }
  return (
    <td className="px-3 py-2.5 text-center">
      <span className={`text-xs font-mono font-medium ${
        status === 'LATE' ? 'text-amber-600' : 'text-emerald-700'
      }`}>
        {time || '✓'}
      </span>
      {status === 'LATE' && (
        <div className="text-[10px] text-amber-500 font-medium">Late</div>
      )}
    </td>
  )
}
