'use client'

import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import { adminNav } from '../../../lib/admin-nav'
import { apiFetch } from '../../../lib/api'

const positionLabels: Record<string, string> = {
  ADMIN: '🛡️ Admin',
  TEACHER: '👨‍🏫 Teacher',
  PRIMARY_SCHOOL_PRINCIPAL: 'នាយកសាលាបឋម',
  SECONDARY_SCHOOL_PRINCIPAL: 'នាយកសាលាអនុវិទ្យាល័យ',
  HIGH_SCHOOL_PRINCIPAL: 'នាយកសាលាវិទ្យាល័យ',
  UNIVERSITY_RECTOR: 'នាយកសាលាសាកលវិទ្យាល័យ',
  OFFICER: 'មន្ត្រី',
  STAFF: 'បុគ្គិល',
  OFFICE_HEAD: 'ប្រធានការិយាល័យ',
  DEPUTY_OFFICE_HEAD: 'អនុប្រធានការិយាល័យ',
  DEPARTMENT_HEAD: 'ប្រធាននាយកដ្ឋាន',
  DEPUTY_DEPARTMENT_HEAD: 'អនុប្រធាននាយកដ្ឋាន',
  GENERAL_DEPARTMENT_DIRECTOR: 'អគ្គនាយកដ្ឋាន',
  DEPUTY_GENERAL_DEPARTMENT_DIRECTOR: 'អគ្គរងនាយកដ្ឋាន',
  COMPANY_CEO: 'អគ្គនាយកក្រុមហ៊ុន',
  CREDIT_OFFICER: 'មន្ត្រីឥណទាន',
  SECURITY_GUARD: 'សន្តិសុខ',
  JANITOR: 'បុគ្គិលអនាម័យ',
  PROJECT_MANAGER: 'ប្រធានគម្រោង',
  BRANCH_MANAGER: 'ប្រធានសាខា',
  EXECUTIVE_DIRECTOR: 'នាយកប្រតិបត្តិ',
  HR_MANAGER: 'ប្រធានធនធានមនុស្ស',
  ATHLETE_MALE: 'កីឡាករ',
  ATHLETE_FEMALE: 'កីឡាការិនី',
  TRAINER: 'គ្រូបង្វិក',
  BARISTA: 'Barista',
  CASHIER: 'អ្នកគិតលុយ',
  RECEPTIONIST: 'អ្នកទទួលភ្ញៀវ',
  GENERAL_MANAGER: 'អ្នកគ្រប់គ្រងទូទៅ',
}

interface StaffGridRow {
  userId: string
  staffNumber: string
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

interface StaffTotalsRow {
  userId: string
  staffNumber: string
  staffName: string
  role: string
  week: { present: number; late: number; absent: number; dayOff: number }
  month: { present: number; late: number; absent: number; dayOff: number }
  year: { present: number; late: number; absent: number; dayOff: number }
}

export default function AdminStaffReports() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [grid, setGrid] = useState<StaffGridRow[]>([])
  const [totals, setTotals] = useState<StaffTotalsRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily')

  // Export form state
  const [showExportForm, setShowExportForm] = useState(false)
  const [exportPeriod, setExportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily')
  const [exportDate, setExportDate] = useState(() => new Date().toISOString().split('T')[0])
  const [exportDateEnd, setExportDateEnd] = useState(() => new Date().toISOString().split('T')[0])
  const [exportUseCustomRange, setExportUseCustomRange] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState('')


  useEffect(() => {
    if (selectedDate) fetchData()
  }, [selectedDate])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [gridRes, totalsRes] = await Promise.all([
        apiFetch(`/api/reports/staff-attendance-daily-grid?date=${selectedDate}`),
        apiFetch(`/api/reports/staff-attendance-totals?date=${selectedDate}`),
      ])
      if (gridRes.ok) setGrid(await gridRes.json())
      else setError('Failed to load staff attendance data.')
      if (totalsRes.ok) setTotals(await totalsRes.json())
    } catch (err) {
      console.error('Error fetching staff report data:', err)
      setError('Failed to connect to server.')
    } finally {
      setLoading(false)
    }
  }

  // Compute the date range for the export preview
  const getExportDateRange = () => {
    if (exportUseCustomRange) {
      return { start: exportDate, end: exportDateEnd, label: `${exportDate} to ${exportDateEnd}` }
    }
    const base = new Date(exportDate + 'T00:00:00Z')
    const y = base.getUTCFullYear(), m = base.getUTCMonth(), d = base.getUTCDate()
    switch (exportPeriod) {
      case 'weekly': {
        const dayOfWeek = base.getUTCDay()
        const monday = new Date(Date.UTC(y, m, d - ((dayOfWeek + 6) % 7)))
        const sunday = new Date(Date.UTC(y, m, d - ((dayOfWeek + 6) % 7) + 6))
        return {
          start: monday.toISOString().split('T')[0],
          end: sunday.toISOString().split('T')[0],
          label: `${monday.toISOString().split('T')[0]} to ${sunday.toISOString().split('T')[0]} (Mon–Sun)`
        }
      }
      case 'monthly': {
        const first = new Date(Date.UTC(y, m, 1))
        const last = new Date(Date.UTC(y, m + 1, 0))
        return {
          start: first.toISOString().split('T')[0],
          end: last.toISOString().split('T')[0],
          label: `${first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
        }
      }
      case 'yearly':
        return { start: `${y}-01-01`, end: `${y}-12-31`, label: `Year ${y}` }
      default:
        return { start: exportDate, end: exportDate, label: exportDate }
    }
  }

  const handleExportReport = async () => {
    setExporting(true)
    setExportMessage('')
    try {
      const res = await apiFetch(`/api/reports/export-staff-xlsx?date=${exportDate}&period=${exportPeriod}`)
      if (!res.ok) throw new Error('Failed to export')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `staff_attendance_${exportPeriod}_${exportDate}.xlsx`
      a.click()
      URL.revokeObjectURL(a.href)
      setExportMessage('✅ Export complete — file downloaded')
    } catch (err: any) {
      setExportMessage(`❌ ${err.message || 'Export failed'}`)
    } finally {
      setExporting(false)
    }
  }

  const goDay = (offset: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + offset)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const dayLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const isHolidayDate = grid.length > 0 && grid[0].isHoliday === true
  const totalStaff = grid.length
  const hasAttendance = (r: StaffGridRow) => {
    const ss = [r.session1Status, r.session2Status, r.session3Status, r.session4Status]
    const hasPresent = ss.some(s => s === 'PRESENT')
    const hasLate = ss.some(s => s === 'LATE')
    const absentCount = ss.filter(s => s === 'ABSENT').length
    // LATE + 3 ABSENT = absent: only count as attended if has PRESENT, or LATE with < 3 absent
    return hasPresent || (hasLate && absentCount < 3)
  }
  const isLateStaff = (r: StaffGridRow) => [r.session1Status, r.session2Status, r.session3Status, r.session4Status].some(s => s === 'LATE')
  const dailyLate = grid.filter(r => hasAttendance(r) && isLateStaff(r)).length
  const dailyPresent = grid.filter(r => hasAttendance(r) && !isLateStaff(r)).length
  const dailyPermission = grid.filter(r => !hasAttendance(r) && [r.session1Status, r.session2Status, r.session3Status, r.session4Status].some(s => s === 'DAY_OFF')).length
  const dailyAbsent = isHolidayDate ? 0 : totalStaff - dailyPresent - dailyLate - dailyPermission

  return (
    <div className="page-shell">
      <Sidebar title="Admin Panel" subtitle="SchoolSync" navItems={adminNav} accentColor="indigo" />
      <div className="page-content">
        <div className="h-14 lg:hidden" />
        <div className="page-header">
          <h1 className="text-2xl font-bold text-slate-800">👔 Staff Attendance Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Cambodia Time (GMT+7) · Staff & Admin only</p>
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
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                  />
                  <button onClick={() => goDay(1)} className="px-2 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm">▶</button>
                </div>
              </div>
              <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="btn-ghost btn-sm">
                📅 Today
              </button>
              <button onClick={() => { setExportDate(selectedDate); setShowExportForm(true) }} className="btn-primary btn-sm ml-auto">
                📊 Export Report
              </button>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-700">{dayLabel}</p>
          </div>

          {isHolidayDate && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2">
              <span className="text-lg">📅</span>
              <span>This date is a <strong>holiday</strong> — absent counts are excluded.</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">{error}</div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab ? 'border-purple-500 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'daily' ? '📋 Daily' : tab === 'weekly' ? '📅 Weekly' : tab === 'monthly' ? '📆 Monthly' : '📊 Yearly'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="card p-12">
              <div className="empty-state">
                <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm text-slate-500 mt-3">Loading…</p>
              </div>
            </div>
          ) : activeTab === 'daily' ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-5 gap-4">
                <div className="stat-card"><p className="stat-label">Total Staff</p><p className="stat-value">{totalStaff}</p></div>
                <div className="stat-card"><p className="stat-label">Present</p><p className="stat-value text-emerald-600">{dailyPresent}</p></div>
                <div className="stat-card"><p className="stat-label">Present (Late)</p><p className="stat-value text-amber-600">{dailyLate}</p></div>
                <div className="stat-card"><p className="stat-label">Absent</p><p className="stat-value text-red-600">{dailyAbsent}</p></div>
                <div className="stat-card"><p className="stat-label">Permission</p><p className="stat-value text-purple-600">{dailyPermission}</p></div>
              </div>

              {grid.length === 0 ? (
                <div className="card p-12">
                  <div className="empty-state">
                    <p className="text-4xl mb-3">👔</p>
                    <p className="font-semibold text-slate-600">No staff attendance data</p>
                    <p className="text-sm text-slate-400 mt-1">No records for {selectedDate}.</p>
                  </div>
                </div>
              ) : (
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                          <th className="px-3 py-3 font-semibold">Day</th>
                          <th className="px-3 py-3 font-semibold">ID</th>
                          <th className="px-3 py-3 font-semibold">Staff Name</th>
                          <th className="px-3 py-3 font-semibold">Position</th>
                          <th className="px-3 py-3 font-semibold text-center">
                            <div>CheckIn</div><div className="text-[10px] normal-case font-normal text-slate-400">Morning</div>
                          </th>
                          <th className="px-3 py-3 font-semibold text-center">
                            <div>CheckOut</div><div className="text-[10px] normal-case font-normal text-slate-400">Morning</div>
                          </th>
                          <th className="px-3 py-3 font-semibold text-center">
                            <div>CheckIn</div><div className="text-[10px] normal-case font-normal text-slate-400">Afternoon</div>
                          </th>
                          <th className="px-3 py-3 font-semibold text-center">
                            <div>CheckOut</div><div className="text-[10px] normal-case font-normal text-slate-400">Afternoon</div>
                          </th>
                          <th className="px-3 py-3 font-semibold text-center">
                            <div>📍 Location</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {grid.map((row) => (
                          <tr key={row.userId} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-3 py-2.5 text-slate-500 text-xs">
                              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 font-mono text-xs">{row.staffNumber}</td>
                            <td className="px-3 py-2.5 text-slate-800 font-medium">{row.staffName}</td>
                            <td className="px-3 py-2.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                                {positionLabels[row.role] || row.role}
                              </span>
                            </td>
                            <SessionCell time={row.checkInMorning} status={row.session1Status} />
                            <SessionCell time={row.checkOutMorning} status={row.session2Status} />
                            <SessionCell time={row.checkInAfternoon} status={row.session3Status} />
                            <SessionCell time={row.checkOutAfternoon} status={row.session4Status} />
                            <td className="px-3 py-2.5 text-center">
                              {row.scanLocation ? (
                                <a
                                  href={`https://www.google.com/maps?q=${row.scanLatitude},${row.scanLongitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                  title={`${row.scanLatitude}, ${row.scanLongitude}`}
                                >
                                  📍 {row.scanLocation}
                                </a>
                              ) : row.scanLatitude ? (
                                <a
                                  href={`https://www.google.com/maps?q=${row.scanLatitude},${row.scanLongitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  📍 {row.scanLatitude?.toFixed(4)}, {row.scanLongitude?.toFixed(4)}
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
                </div>
              )}
            </>
          ) : (
            /* Period Totals Tab (Weekly / Monthly / Yearly) */
            <>
              {totals.length === 0 ? (
                <div className="card p-12">
                  <div className="empty-state">
                    <p className="text-4xl mb-3">📊</p>
                    <p className="font-semibold text-slate-600">No data</p>
                    <p className="text-sm text-slate-400 mt-1">No staff attendance totals available.</p>
                  </div>
                </div>
              ) : (() => {
                const periodKey = activeTab === 'weekly' ? 'week' : activeTab === 'monthly' ? 'month' : 'year';
                const periodLabel = activeTab === 'weekly' ? 'Weekly' : activeTab === 'monthly' ? 'Monthly' : 'Yearly';
                return (
                  <div className="card overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <h3 className="text-sm font-semibold text-slate-700">{periodLabel} Attendance Totals</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                            <th className="px-3 py-3 font-semibold">ID</th>
                            <th className="px-3 py-3 font-semibold">Name</th>
                            <th className="px-3 py-3 font-semibold">Position</th>
                            <th className="px-3 py-3 font-semibold text-center">Total Present</th>
                            <th className="px-3 py-3 font-semibold text-center">Total Present (Late)</th>
                            <th className="px-3 py-3 font-semibold text-center">Total Absent</th>
                            <th className="px-3 py-3 font-semibold text-center">Total Permission</th>
                          </tr>
                        </thead>
                        <tbody>
                          {totals.map(row => (
                            <tr key={row.userId} className="border-t border-slate-100 hover:bg-slate-50">
                              <td className="px-3 py-2.5 text-slate-600 font-mono text-xs">{row.staffNumber}</td>
                              <td className="px-3 py-2.5 text-slate-800 font-medium">{row.staffName}</td>
                              <td className="px-3 py-2.5"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">{positionLabels[row.role] || row.role}</span></td>
                              <td className="px-3 py-2.5 text-center text-emerald-700 font-semibold">{row[periodKey].present}</td>
                              <td className="px-3 py-2.5 text-center text-amber-600 font-semibold">{row[periodKey].late}</td>
                              <td className="px-3 py-2.5 text-center text-red-600 font-semibold">{row[periodKey].absent}</td>
                              <td className="px-3 py-2.5 text-center text-purple-600 font-semibold">{row[periodKey].dayOff || 0}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-700">
                            <td className="px-3 py-2.5" colSpan={3}>Total</td>
                            <td className="px-3 py-2.5 text-center text-emerald-700">{totals.reduce((s, r) => s + r[periodKey].present, 0)}</td>
                            <td className="px-3 py-2.5 text-center text-amber-600">{totals.reduce((s, r) => s + r[periodKey].late, 0)}</td>
                            <td className="px-3 py-2.5 text-center text-red-600">{totals.reduce((s, r) => s + r[periodKey].absent, 0)}</td>
                            <td className="px-3 py-2.5 text-center text-purple-600">{totals.reduce((s, r) => s + (r[periodKey].dayOff || 0), 0)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Export Report Modal */}
      {showExportForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowExportForm(false); setExportMessage('') }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-white rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-slate-800">📊 Export Staff Report</h2>
                <p className="text-xs text-slate-500 mt-0.5">Choose period and date to export CSV</p>
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
                      onClick={() => { setExportPeriod(p); setExportUseCustomRange(false) }}
                      disabled={exportUseCustomRange}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                        !exportUseCustomRange && exportPeriod === p
                          ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      } ${exportUseCustomRange ? 'opacity-50' : ''}`}
                    >
                      {p === 'daily' ? '📋 Daily' : p === 'weekly' ? '📅 Week' : p === 'monthly' ? '📆 Month' : '📊 Year'}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportUseCustomRange}
                    onChange={e => setExportUseCustomRange(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-slate-600">Custom date range</span>
                </label>
              </div>

              {/* Date Picker(s) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {exportUseCustomRange ? '📆 Start Date' : '📆 Date'}
                </label>
                <input
                  type="date"
                  value={exportDate}
                  onChange={e => setExportDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
                {exportUseCustomRange && (
                  <div className="mt-3">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">📆 End Date</label>
                    <input
                      type="date"
                      value={exportDateEnd}
                      onChange={e => setExportDateEnd(e.target.value)}
                      min={exportDate}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Preview/Summary */}
              {(() => {
                const range = getExportDateRange()
                return (
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400">Export Preview</h4>
                    <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                      <span className="text-slate-500">Type:</span>
                      <span className="font-medium text-slate-800">Staff Attendance</span>
                      <span className="text-slate-500">Period:</span>
                      <span className="font-medium text-slate-800">{exportUseCustomRange ? 'Custom Range' : exportPeriod.charAt(0).toUpperCase() + exportPeriod.slice(1)}</span>
                      <span className="text-slate-500">Date Range:</span>
                      <span className="font-medium text-slate-800">{range.label}</span>
                    </div>
                  </div>
                )
              })()}

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
                  className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
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
    </div>
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
