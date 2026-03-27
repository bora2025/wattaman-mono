'use client'

import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import { adminNav } from '../../../lib/admin-nav'
import { apiFetch } from '../../../lib/api'

interface GridRow {
  studentId: string
  studentNumber: string
  studentName: string
  checkInMorning: string | null
  checkOutMorning: string | null
  checkInAfternoon: string | null
  checkOutAfternoon: string | null
  dayOff: boolean
  isHoliday?: boolean
  session1Status: string | null
  session2Status: string | null
  session3Status: string | null
  session4Status: string | null
}

interface TotalsRow {
  studentId: string
  studentNumber: string
  studentName: string
  week: { present: number; late: number; absent: number; dayOff: number }
  month: { present: number; late: number; absent: number; dayOff: number }
  year: { present: number; late: number; absent: number; dayOff: number }
}

interface ClassItem {
  id: string
  name: string
  subject: string | null
  schedule?: string | null
}

interface SessionConfigItem {
  session: number
  type: string
  startTime: string
  endTime: string
}

const ATTENDANCE_PRESETS = [
  { id: 'global-default', name: 'Global Default', icon: '🌐', color: 'bg-slate-100 text-slate-600', configs: [] as SessionConfigItem[] },
  { id: 'full-day', name: 'Full Day', icon: '☀️', color: 'bg-indigo-100 text-indigo-700', configs: [
    { session: 1, type: 'CHECK_IN', startTime: '07:00', endTime: '07:15' },
    { session: 2, type: 'CHECK_OUT', startTime: '12:00', endTime: '12:15' },
    { session: 3, type: 'CHECK_IN', startTime: '13:00', endTime: '13:15' },
    { session: 4, type: 'CHECK_OUT', startTime: '17:00', endTime: '17:15' },
  ]},
  { id: 'morning-only', name: 'Morning Only', icon: '🌅', color: 'bg-amber-100 text-amber-700', configs: [
    { session: 1, type: 'CHECK_IN', startTime: '07:00', endTime: '07:15' },
    { session: 2, type: 'CHECK_OUT', startTime: '11:45', endTime: '12:00' },
    { session: 3, type: 'CHECK_IN', startTime: '12:00', endTime: '12:00' },
    { session: 4, type: 'CHECK_OUT', startTime: '12:00', endTime: '12:00' },
  ]},
  { id: 'afternoon-only', name: 'Afternoon Only', icon: '🌤️', color: 'bg-orange-100 text-orange-700', configs: [
    { session: 1, type: 'CHECK_IN', startTime: '13:00', endTime: '13:00' },
    { session: 2, type: 'CHECK_OUT', startTime: '13:00', endTime: '13:00' },
    { session: 3, type: 'CHECK_IN', startTime: '13:00', endTime: '13:15' },
    { session: 4, type: 'CHECK_OUT', startTime: '17:15', endTime: '17:30' },
  ]},
  { id: 'evening', name: 'Evening', icon: '🌆', color: 'bg-purple-100 text-purple-700', configs: [
    { session: 1, type: 'CHECK_IN', startTime: '18:00', endTime: '18:15' },
    { session: 2, type: 'CHECK_OUT', startTime: '20:45', endTime: '21:00' },
    { session: 3, type: 'CHECK_IN', startTime: '21:00', endTime: '21:00' },
    { session: 4, type: 'CHECK_OUT', startTime: '21:00', endTime: '21:00' },
  ]},
  { id: 'night-shift', name: 'Night Shift', icon: '🌙', color: 'bg-slate-200 text-slate-700', configs: [
    { session: 1, type: 'CHECK_IN', startTime: '18:00', endTime: '18:15' },
    { session: 2, type: 'CHECK_OUT', startTime: '23:45', endTime: '23:59' },
    { session: 3, type: 'CHECK_IN', startTime: '00:00', endTime: '00:15' },
    { session: 4, type: 'CHECK_OUT', startTime: '05:45', endTime: '06:00' },
  ]},
];

const DAYS_OF_WEEK = [
  { key: 'MON', label: 'M', full: 'Monday' },
  { key: 'TUE', label: 'T', full: 'Tuesday' },
  { key: 'WED', label: 'W', full: 'Wednesday' },
  { key: 'THU', label: 'T', full: 'Thursday' },
  { key: 'FRI', label: 'F', full: 'Friday' },
  { key: 'SAT', label: 'S', full: 'Saturday' },
  { key: 'SUN', label: 'S', full: 'Sunday' },
];

const DAY_FORMAT_STYLES: Record<string, { bg: string; icon: string; label: string }> = {
  same: { bg: 'bg-slate-100 text-slate-500', icon: '📋', label: 'Same as class' },
  'day-off': { bg: 'bg-red-100 text-red-600', icon: '🚫', label: 'Day Off' },
  'full-day': { bg: 'bg-indigo-100 text-indigo-600', icon: '☀️', label: 'Full Day' },
  'morning-only': { bg: 'bg-amber-100 text-amber-600', icon: '🌅', label: 'Morning Only' },
  'afternoon-only': { bg: 'bg-orange-100 text-orange-600', icon: '🌤️', label: 'Afternoon Only' },
  evening: { bg: 'bg-purple-100 text-purple-600', icon: '🌆', label: 'Evening' },
  'night-shift': { bg: 'bg-slate-200 text-slate-600', icon: '🌙', label: 'Night Shift' },
};

export default function AdminReports() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [grid, setGrid] = useState<GridRow[]>([])
  const [totals, setTotals] = useState<TotalsRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily')
  const [sessionConfigs, setSessionConfigs] = useState<Array<{session: number; type: string; startTime: string; endTime: string}>>([])
  const [classPreset, setClassPreset] = useState<{ id: string; name: string; icon: string; color: string }>({ id: 'global-default', name: 'Global Default', icon: '🌐', color: 'bg-slate-100 text-slate-600' })
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, string> | null>(null)

  // Export form state
  const [showExportForm, setShowExportForm] = useState(false)
  const [exportClassId, setExportClassId] = useState('')
  const [exportPeriod, setExportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily')
  const [exportDate, setExportDate] = useState(() => new Date().toISOString().split('T')[0])
  const [exportDateEnd, setExportDateEnd] = useState(() => new Date().toISOString().split('T')[0])
  const [exportUseCustomRange, setExportUseCustomRange] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState('')


  useEffect(() => {
    fetchClasses()
  }, [])

  useEffect(() => {
    if (selectedClassId) {
      fetchSessionConfigs()
    }
  }, [selectedClassId])

  useEffect(() => {
    if (selectedClassId && selectedDate) {
      fetchData()
    }
  }, [selectedClassId, selectedDate])

  const detectPreset = (configs: any[]): { id: string; name: string; icon: string; color: string } => {
    for (const preset of ATTENDANCE_PRESETS) {
      if (preset.id === 'global-default' || preset.configs.length === 0) continue
      const match = preset.configs.every(pc => {
        const c = configs.find((x: any) => x.session === pc.session)
        return c && c.type === pc.type && c.startTime === pc.startTime && c.endTime === pc.endTime
      })
      if (match) return { id: preset.id, name: preset.name, icon: preset.icon, color: preset.color }
    }
    return { id: 'custom', name: 'Custom', icon: '🔧', color: 'bg-amber-100 text-amber-700' }
  }

  const fetchClasses = async () => {
    try {
      const res = await apiFetch('/api/classes')
      if (res.ok) {
        const data = await res.json()
        setClasses(data)
        if (data.length > 0) setSelectedClassId(data[0].id)
      }
    } catch (e) {
      console.error('Error fetching classes:', e)
    }
  }

  const fetchSessionConfigs = async () => {
    try {
      const url = selectedClassId ? `/api/session-config?classId=${selectedClassId}` : '/api/session-config/global'
      const res = await apiFetch(url)
      if (res.ok) {
        const configs = await res.json()
        setSessionConfigs(configs)
        // Detect preset
        if (configs.length > 0 && configs[0].classId) {
          setClassPreset(detectPreset(configs))
        } else {
          setClassPreset({ id: 'global-default', name: 'Global Default', icon: '🌐', color: 'bg-slate-100 text-slate-600' })
        }
      }
    } catch (e) { console.error('Error fetching session configs:', e) }
  }

  // Load weekly schedule from class data when class changes
  useEffect(() => {
    const cls = classes.find(c => c.id === selectedClassId)
    if (cls?.schedule) {
      try { setWeeklySchedule(JSON.parse(cls.schedule)) } catch { setWeeklySchedule(null) }
    } else {
      setWeeklySchedule(null)
    }
  }, [selectedClassId, classes])

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [gridRes, totalsRes] = await Promise.all([
        apiFetch(`/api/reports/attendance-grid?classId=${selectedClassId}&date=${selectedDate}`),
        apiFetch(`/api/reports/attendance-totals?classId=${selectedClassId}&date=${selectedDate}`),
      ])
      if (gridRes.ok) setGrid(await gridRes.json())
      else setError('Failed to load attendance data.')
      if (totalsRes.ok) setTotals(await totalsRes.json())
    } catch (err) {
      console.error('Error fetching report data:', err)
      setError('Failed to connect to server.')
    } finally {
      setLoading(false)
    }
  }

  const handleExportGrid = () => {
    if (!selectedClassId) return
    apiFetch(`/api/reports/export-xlsx?classId=${selectedClassId}&date=${selectedDate}`)
      .then(res => res.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `attendance_${selectedDate}.xlsx`
        a.click()
        URL.revokeObjectURL(a.href)
      })
      .catch(() => setError('Export failed'))
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
      const classIds = exportClassId ? [exportClassId] : classes.map(c => c.id)
      for (const cid of classIds) {
        const className = classes.find(c => c.id === cid)?.name || 'class'
        const safeName = className.replace(/[^a-zA-Z0-9_-]/g, '_')

        // Export with selected period filter
        const res = await apiFetch(`/api/reports/export-xlsx?classId=${cid}&date=${exportDate}&period=${exportPeriod}`)
        if (!res.ok) throw new Error(`Failed to export for ${className}`)
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `attendance_${safeName}_${exportPeriod}_${exportDate}.xlsx`
        a.click()
        URL.revokeObjectURL(a.href)

        // Small delay between multiple downloads
        if (classIds.length > 1) await new Promise(r => setTimeout(r, 300))
      }
      setExportMessage(`✅ Export complete — ${classIds.length} file(s) downloaded`)
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

  const selectedClass = classes.find(c => c.id === selectedClassId)
  const selectedClassName = selectedClass?.name || ''

  // Get the day-of-week key for the selected date
  const dateObj = new Date(selectedDate + 'T00:00:00')
  const dayKeys = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const selectedDayKey = dayKeys[dateObj.getDay()]
  const todayDayFormat = weeklySchedule ? weeklySchedule[selectedDayKey] || 'same' : null
  const isScheduleDayOff = todayDayFormat === 'day-off'

  // Determine active sessions from configs
  const sessionDefs = [
    { session: 1, field: 'checkInMorning' as const, statusField: 'session1Status' as const },
    { session: 2, field: 'checkOutMorning' as const, statusField: 'session2Status' as const },
    { session: 3, field: 'checkInAfternoon' as const, statusField: 'session3Status' as const },
    { session: 4, field: 'checkOutAfternoon' as const, statusField: 'session4Status' as const },
  ]
  const activeSessions = sessionConfigs.length > 0
    ? sessionDefs.filter(sd => {
        const cfg = sessionConfigs.find(c => c.session === sd.session)
        return cfg && cfg.startTime !== cfg.endTime
      })
    : sessionDefs // show all 4 if no configs loaded

  const getSessionLabel = (sessionNum: number) => {
    const cfg = sessionConfigs.find(c => c.session === sessionNum)
    if (!cfg) return sessionNum <= 2 ? 'Morning' : 'Afternoon'
    const h = parseInt(cfg.startTime.split(':')[0])
    return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night'
  }

  const isHolidayDate = grid.length > 0 && grid[0].isHoliday === true
  const totalStudents = grid.length
  const hasAttendance = (r: GridRow) => {
    const ss = [r.session1Status, r.session2Status, r.session3Status, r.session4Status]
    const hasPresent = ss.some(s => s === 'PRESENT')
    const hasLate = ss.some(s => s === 'LATE')
    const absentCount = ss.filter(s => s === 'ABSENT').length
    // LATE + 3 ABSENT = absent: only count as attended if has PRESENT, or LATE with < 3 absent
    return hasPresent || (hasLate && absentCount < 3)
  }
  const isLateStudent = (r: GridRow) => [r.session1Status, r.session2Status, r.session3Status, r.session4Status].some(s => s === 'LATE')
  const dailyLate = grid.filter(r => hasAttendance(r) && isLateStudent(r)).length
  const dailyPresent = grid.filter(r => hasAttendance(r) && !isLateStudent(r)).length
  const dailyPermission = grid.filter(r => !hasAttendance(r) && [r.session1Status, r.session2Status, r.session3Status, r.session4Status].some(s => s === 'DAY_OFF')).length
  const dailyAbsent = isHolidayDate ? 0 : totalStudents - dailyPresent - dailyLate - dailyPermission

  return (
    <div className="page-shell">
      <Sidebar title="Admin Panel" subtitle="SchoolSync" navItems={adminNav} accentColor="indigo" />
      <div className="page-content">
        <div className="h-14 lg:hidden" />
        <div className="page-header">
          <h1 className="text-2xl font-bold text-slate-800">Attendance Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Cambodia Time (GMT+7)</p>
        </div>
        <div className="page-body space-y-6">
          {/* Controls */}
          <div className="card p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name} — {cls.subject || 'N/A'}</option>
                  ))}
                </select>
              </div>
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
              <button onClick={() => { setExportClassId(selectedClassId); setExportDate(selectedDate); setShowExportForm(true) }} className="btn-primary btn-sm ml-auto border border-indigo-200">
                📊 Export Report
              </button>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-700">{dayLabel} — {selectedClassName}</p>
          </div>

          {/* Class Config Info Card */}
          {selectedClassId && sessionConfigs.length > 0 && (
            <div className="card p-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Attendance Format Badge */}
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Attendance Format</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${classPreset.color}`}>
                    <span>{classPreset.icon}</span> {classPreset.name}
                  </span>
                </div>

                {/* Session Time Ranges */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Session Times</p>
                  <div className="flex flex-wrap gap-2">
                    {activeSessions.map(sd => {
                      const cfg = sessionConfigs.find(c => c.session === sd.session)
                      if (!cfg) return null
                      return (
                        <span key={sd.session} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-600">
                          <span className="font-medium">{cfg.type === 'CHECK_OUT' ? '🔴' : '🟢'}</span>
                          <span className="font-semibold">{cfg.type === 'CHECK_OUT' ? 'Out' : 'In'}</span>
                          <span className="text-slate-400">{cfg.startTime}–{cfg.endTime}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* Weekly Schedule Strip */}
                {weeklySchedule && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Weekly Schedule</p>
                    <div className="flex gap-1">
                      {DAYS_OF_WEEK.map(day => {
                        const fmt = weeklySchedule[day.key] || 'same'
                        const style = DAY_FORMAT_STYLES[fmt] || DAY_FORMAT_STYLES.same
                        const isToday = day.key === selectedDayKey
                        return (
                          <div
                            key={day.key}
                            className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold ${style.bg} ${isToday ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                            title={`${day.full}: ${style.label}`}
                          >
                            {style.icon}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Today's Format Indicator */}
                {todayDayFormat && todayDayFormat !== 'same' && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Today's Format</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${DAY_FORMAT_STYLES[todayDayFormat]?.bg || 'bg-slate-100 text-slate-600'}`}>
                      {DAY_FORMAT_STYLES[todayDayFormat]?.icon} {DAY_FORMAT_STYLES[todayDayFormat]?.label || todayDayFormat}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {isHolidayDate && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2">
              <span className="text-lg">📅</span>
              <span>This date is a <strong>holiday</strong> — absent counts are excluded.</span>
            </div>
          )}

          {isScheduleDayOff && !isHolidayDate && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2">
              <span className="text-lg">🚫</span>
              <span>This date is a <strong>scheduled day off</strong> for {selectedClassName} per the weekly schedule.</span>
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
                  activeTab === tab ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'daily' ? '📋 Daily' : tab === 'weekly' ? '📅 Weekly' : tab === 'monthly' ? '📆 Monthly' : '📊 Yearly'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="card p-12">
              <div className="empty-state">
                <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm text-slate-500 mt-3">Loading…</p>
              </div>
            </div>
          ) : activeTab === 'daily' ? (
            <>
              {/* Day stats */}
              <div className="grid grid-cols-5 gap-4">
                <div className="stat-card"><p className="stat-label">Total Students</p><p className="stat-value">{totalStudents}</p></div>
                <div className="stat-card"><p className="stat-label">Present</p><p className="stat-value text-emerald-600">{dailyPresent}</p></div>
                <div className="stat-card"><p className="stat-label">Present (Late)</p><p className="stat-value text-amber-600">{dailyLate}</p></div>
                <div className="stat-card"><p className="stat-label">Absent</p><p className="stat-value text-red-600">{dailyAbsent}</p></div>
                <div className="stat-card"><p className="stat-label">Permission</p><p className="stat-value text-purple-600">{dailyPermission}</p></div>
              </div>

              {grid.length === 0 ? (
                <div className="card p-12">
                  <div className="empty-state">
                    <p className="text-4xl mb-3">📊</p>
                    <p className="font-semibold text-slate-600">No attendance data</p>
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
                          <th className="px-3 py-3 font-semibold">Student Name</th>
                          {activeSessions.map(sd => {
                            const cfg = sessionConfigs.find(c => c.session === sd.session)
                            return (
                              <th key={sd.session} className="px-3 py-3 font-semibold text-center">
                                <div>{cfg?.type === 'CHECK_OUT' ? 'CheckOut' : 'CheckIn'}</div>
                                <div className="text-[10px] normal-case font-normal text-slate-400">{getSessionLabel(sd.session)}</div>
                                {cfg && <div className="text-[9px] normal-case font-normal text-slate-300">{cfg.startTime}–{cfg.endTime}</div>}
                              </th>
                            )
                          })}
                          <th className="px-3 py-3 font-semibold text-center">Permission</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grid.map((row) => (
                          <tr key={row.studentId} className={`border-t border-slate-100 ${row.dayOff ? 'bg-red-50/40' : 'hover:bg-slate-50'}`}>
                            <td className="px-3 py-2.5 text-slate-500 text-xs">
                              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 font-mono text-xs">{row.studentNumber}</td>
                            <td className="px-3 py-2.5 text-slate-800 font-medium">{row.studentName}</td>
                            {activeSessions.map(sd => (
                              <SessionCell key={sd.session} time={(row as any)[sd.field]} status={(row as any)[sd.statusField]} />
                            ))}
                            <td className="px-3 py-2.5 text-center">
                              {row.dayOff ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">🚫 Yes</span>
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
                    <p className="text-sm text-slate-400 mt-1">Select a class to view totals.</p>
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
                            <th className="px-3 py-3 font-semibold text-center">Total Present</th>
                            <th className="px-3 py-3 font-semibold text-center">Total Late</th>
                            <th className="px-3 py-3 font-semibold text-center">Total Absent</th>
                            <th className="px-3 py-3 font-semibold text-center">Total Permission</th>
                          </tr>
                        </thead>
                        <tbody>
                          {totals.map(row => (
                            <tr key={row.studentId} className="border-t border-slate-100 hover:bg-slate-50">
                              <td className="px-3 py-2.5 text-slate-600 font-mono text-xs">{row.studentNumber}</td>
                              <td className="px-3 py-2.5 text-slate-800 font-medium">{row.studentName}</td>
                              <td className="px-3 py-2.5 text-center text-emerald-700 font-semibold">{row[periodKey].present}</td>
                              <td className="px-3 py-2.5 text-center text-amber-600 font-semibold">{row[periodKey].late || 0}</td>
                              <td className="px-3 py-2.5 text-center text-red-600 font-semibold">{row[periodKey].absent}</td>
                              <td className="px-3 py-2.5 text-center text-purple-600 font-semibold">{row[periodKey].dayOff || 0}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-700">
                            <td className="px-3 py-2.5" colSpan={2}>Total</td>
                            <td className="px-3 py-2.5 text-center text-emerald-700">{totals.reduce((s, r) => s + r[periodKey].present, 0)}</td>
                            <td className="px-3 py-2.5 text-center text-amber-600">{totals.reduce((s, r) => s + (r[periodKey].late || 0), 0)}</td>
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
      <ExportReportModal
        show={showExportForm}
        onClose={() => { setShowExportForm(false); setExportMessage('') }}
        classes={classes}
        exportClassId={exportClassId}
        setExportClassId={setExportClassId}
        exportPeriod={exportPeriod}
        setExportPeriod={setExportPeriod}
        exportDate={exportDate}
        setExportDate={setExportDate}
        exporting={exporting}
        exportMessage={exportMessage}
        handleExportReport={handleExportReport}
      />
    </div>
  )
}

/* ============ EXPORT REPORT MODAL ============ */
function ExportReportModal({
  show, onClose, classes, exportClassId, setExportClassId,
  exportPeriod, setExportPeriod,
  exportDate, setExportDate,
  exporting, exportMessage, handleExportReport,
}: {
  show: boolean; onClose: () => void
  classes: ClassItem[]; exportClassId: string; setExportClassId: (v: string) => void
  exportPeriod: string; setExportPeriod: (v: 'daily' | 'weekly' | 'monthly' | 'yearly') => void
  exportDate: string; setExportDate: (v: string) => void
  exporting: boolean; exportMessage: string
  handleExportReport: () => void
}) {
  if (!show) return null
  const selectedClassName = exportClassId ? classes.find(c => c.id === exportClassId)?.name || '' : 'All Classes'

  const periodOptions = [
    { value: 'daily', label: 'Daily', icon: '📅', desc: 'Session details for selected day' },
    { value: 'weekly', label: 'Weekly', icon: '📆', desc: 'Mon–Sun attendance totals' },
    { value: 'monthly', label: 'Monthly', icon: '🗓️', desc: 'Week-by-week totals for the month' },
    { value: 'yearly', label: 'Yearly', icon: '📊', desc: 'Month-by-month totals for the year' },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-800">📊 Export Attendance Report</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select period and download XLSX report</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-sm">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Class Selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">📖 Class</label>
            <select
              value={exportClassId}
              onChange={e => setExportClassId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            >
              <option value="">All Classes ({classes.length})</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name} — {cls.subject || 'N/A'}</option>
              ))}
            </select>
          </div>

          {/* Period Selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">📋 Report Period</label>
            <div className="grid grid-cols-2 gap-2">
              {periodOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setExportPeriod(opt.value)}
                  className={`flex items-start gap-2 p-3 rounded-xl border text-left transition-all ${
                    exportPeriod === opt.value
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <div>
                    <div className={`text-sm font-semibold ${exportPeriod === opt.value ? 'text-indigo-700' : 'text-slate-700'}`}>{opt.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
                  </div>
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
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Preview/Summary */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-slate-400">Export Preview</h4>
            <div className="grid grid-cols-2 gap-y-1.5 text-sm">
              <span className="text-slate-500">Class:</span>
              <span className="font-medium text-slate-800">{selectedClassName}</span>
              <span className="text-slate-500">Date:</span>
              <span className="font-medium text-slate-800">{exportDate}</span>
              <span className="text-slate-500">Period:</span>
              <span className="font-medium text-indigo-600 capitalize">{exportPeriod}</span>
              <span className="text-slate-500">Format:</span>
              <span className="font-medium text-indigo-600">XLSX</span>
              {!exportClassId && (
                <>
                  <span className="text-slate-500">Files:</span>
                  <span className="font-medium text-indigo-600">{classes.length} XLSX files</span>
                </>
              )}
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
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleExportReport}
              disabled={exporting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
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
  )
}

function SessionCell({ time, status }: { time: string | null; status: string | null }) {
  if (!status) {
    return <td className="px-3 py-2.5 text-center"></td>
  }
  if (status === 'ABSENT') {
    return <td className="px-3 py-2.5 text-center"><span className="text-xs text-red-400">✗</span></td>
  }
  if (status === 'DAY_OFF') {
    return <td className="px-3 py-2.5 text-center"><span className="text-xs text-purple-500 font-medium">🏖</span></td>
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