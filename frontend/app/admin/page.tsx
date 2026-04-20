"use client"

import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import Sidebar from '../../components/Sidebar'
import AuthGuard from '../../components/AuthGuard'
import { adminNav } from '../../lib/admin-nav'
import { apiFetch } from '../../lib/api'
import { useLanguage } from '../../lib/i18n'

interface GroupSummary {
  total: number
  present: number
  absent: number
  late: number
  permission: number
}

interface DetailRow {
  id: string
  name: string
  role: string
  group: string
  present: number
  absent: number
  late: number
  permission: number
}

interface DashboardData {
  students: GroupSummary
  staff: GroupSummary
  details: DetailRow[]
  filters: {
    classes: { id: string; name: string }[]
    departments: { id: string; name: string }[]
  }
}

type StatusFilter = 'all' | 'present' | 'absent' | 'late' | 'permission'

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  PRIMARY_SCHOOL_PRINCIPAL: 'Primary School Principal',
  SECONDARY_SCHOOL_PRINCIPAL: 'Secondary School Principal',
  HIGH_SCHOOL_PRINCIPAL: 'High School Principal',
  UNIVERSITY_RECTOR: 'University Rector',
  OFFICER: 'Officer',
  STAFF: 'Staff',
  OFFICE_HEAD: 'Office Head',
  DEPUTY_OFFICE_HEAD: 'Deputy Office Head',
  DEPARTMENT_HEAD: 'Department Head',
  DEPUTY_DEPARTMENT_HEAD: 'Deputy Department Head',
  GENERAL_DEPARTMENT_DIRECTOR: 'General Dept. Director',
  DEPUTY_GENERAL_DEPARTMENT_DIRECTOR: 'Deputy General Dept. Director',
  COMPANY_CEO: 'CEO',
  CREDIT_OFFICER: 'Credit Officer',
  SECURITY_GUARD: 'Security Guard',
  JANITOR: 'Janitor',
  PROJECT_MANAGER: 'Project Manager',
  BRANCH_MANAGER: 'Branch Manager',
  EXECUTIVE_DIRECTOR: 'Executive Director',
  HR_MANAGER: 'HR Manager',
  ATHLETE_MALE: 'Athlete (M)',
  ATHLETE_FEMALE: 'Athlete (F)',
  TRAINER: 'Trainer',
  BARISTA: 'Barista',
  CASHIER: 'Cashier',
  RECEPTIONIST: 'Receptionist',
  GENERAL_MANAGER: 'General Manager',
}

function getRoleLabel(role: string): string {
  if (role === 'Student') return 'Student'
  return roleLabels[role] || role
}

function DashboardContent() {
  const { t } = useLanguage()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [mounted, setMounted] = useState(false)

  // Table filters
  const [roleFilter, setRoleFilter] = useState<'all' | 'Student' | 'Staff'>('all')
  const [groupFilter, setGroupFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Drill-down from cards
  const [drillRole, setDrillRole] = useState<'Student' | 'Staff' | null>(null)
  const [drillStatus, setDrillStatus] = useState<StatusFilter | null>(null)

  // Set date on client only to avoid hydration mismatch
  useEffect(() => {
    setSelectedDate(new Date().toISOString().split('T')[0])
    setMounted(true)
  }, [])

  useEffect(() => {
    if (selectedDate) fetchDashboard()
  }, [selectedDate])

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/reports/dashboard-summary?date=${selectedDate}`)
      if (res.ok) {
        setData(await res.json())
      } else {
        console.error('Dashboard API error:', res.status, await res.text().catch(() => ''))
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle card drill-down clicks
  const handleCardClick = (role: 'Student' | 'Staff', status: StatusFilter) => {
    setDrillRole(role)
    setDrillStatus(status)
    setRoleFilter(role === 'Student' ? 'Student' : 'Staff')
    setStatusFilter(status)
    setGroupFilter('')
    setSearchQuery('')
    // Scroll to table
    document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' })
  }

  const clearDrill = () => {
    setDrillRole(null)
    setDrillStatus(null)
    setRoleFilter('all')
    setStatusFilter('all')
    setGroupFilter('')
    setSearchQuery('')
  }

  // Filtered detail rows
  const filteredDetails = useMemo(() => {
    if (!data) return []
    return data.details.filter(row => {
      if (roleFilter === 'Student' && row.role !== 'Student') return false
      if (roleFilter === 'Staff' && row.role === 'Student') return false
      if (groupFilter && row.group !== groupFilter) return false
      if (statusFilter === 'present' && row.present === 0) return false
      if (statusFilter === 'absent' && row.absent === 0) return false
      if (statusFilter === 'late' && row.late === 0) return false
      if (statusFilter === 'permission' && row.permission === 0) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!row.name.toLowerCase().includes(q) && !row.id.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [data, roleFilter, groupFilter, statusFilter, searchQuery])

  // Chart data
  const pieData = useMemo(() => {
    if (!data) return []
    const s = data.students
    const st = data.staff
    return [
      { name: t('common.present'), value: s.present + st.present, color: '#22C55E' },
      { name: t('common.absent'), value: s.absent + st.absent, color: '#EF4444' },
      { name: t('common.late'), value: s.late + st.late, color: '#F97316' },
      { name: t('common.permission'), value: s.permission + st.permission, color: '#3B82F6' },
    ].filter(d => d.value > 0)
  }, [data, t])

  const barData = useMemo(() => {
    if (!data) return []
    return [
      { category: t('common.present'), [t('common.students')]: data.students.present, [t('dashboard.staff')]: data.staff.present },
      { category: t('common.absent'), [t('common.students')]: data.students.absent, [t('dashboard.staff')]: data.staff.absent },
      { category: t('common.late'), [t('common.students')]: data.students.late, [t('dashboard.staff')]: data.staff.late },
      { category: t('common.permission'), [t('common.students')]: data.students.permission, [t('dashboard.staff')]: data.staff.permission },
    ]
  }, [data, t])

  // CSV export
  const exportCSV = () => {
    if (!filteredDetails.length) return
    const headers = [t('common.id'), t('common.name'), t('common.role'), t('dashboard.classOrDept'), t('common.present'), t('common.absent'), t('common.late'), t('common.permission')]
    const rows = filteredDetails.map(r => [r.id, r.name, r.role, r.group, r.present, r.absent, r.late, r.permission])
    const bom = '\uFEFF'
    const csv = bom + [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_dashboard_${selectedDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // SVG icons for summary cards
  const cardIcons: Record<string, React.ReactNode> = {
    green: <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    red: <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    orange: <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    blue: <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  }

  // Summary card component
  const SummaryCard = ({ label, value, total, color, onClick }: {
    label: string; value: number; total: number; color: string; onClick?: () => void
  }) => {
    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
    const colorMap: Record<string, string> = {
      green: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
      red: 'bg-red-50 border-red-200 hover:border-red-400',
      orange: 'bg-orange-50 border-orange-200 hover:border-orange-400',
      blue: 'bg-blue-50 border-blue-200 hover:border-blue-400',
    }
    const textMap: Record<string, string> = {
      green: 'text-emerald-700',
      red: 'text-red-700',
      orange: 'text-orange-700',
      blue: 'text-blue-700',
    }
    const numMap: Record<string, string> = {
      green: 'text-emerald-600',
      red: 'text-red-600',
      orange: 'text-orange-600',
      blue: 'text-blue-600',
    }
    return (
      <button
        onClick={onClick}
        className={`${colorMap[color]} border rounded-xl p-3 sm:p-4 text-left transition-all duration-200 cursor-pointer hover:shadow-md active:scale-[0.98]`}
      >
        <div className="flex items-center gap-2 mb-1">
          {cardIcons[color]}
          <span className={`text-xs sm:text-sm font-medium ${textMap[color]}`}>{label}</span>
        </div>
        <div className={`text-xl sm:text-2xl font-bold ${numMap[color]}`}>{value}</div>
        <div className="text-xs text-gray-400 mt-0.5">{pct}%</div>
      </button>
    )
  }

  if (!mounted || loading) return (
    <div className="page-shell">
      <Sidebar title="Admin Panel" subtitle="Wattanman" navItems={adminNav} accentColor="indigo" />
      <div className="page-content">
        <div className="h-14 lg:hidden" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="page-shell">
        <Sidebar title="Admin Panel" subtitle="Wattanman" navItems={adminNav} accentColor="indigo" />
        <div className="page-content">
          <div className="h-14 lg:hidden" />
          <div className="page-header">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{t('dashboard.title')}</h1>
                <p className="text-sm text-slate-500 mt-1">{t('dashboard.subtitle')}</p>
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="page-body space-y-6">

          {/* ========== SUMMARY CARDS ========== */}
          {data && (
            <>
              {/* Students Section */}
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {t('dashboard.studentSummary')}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <SummaryCard
                    label={t('common.present')} value={data.students.present}
                    total={data.students.present + data.students.absent + data.students.late + data.students.permission}
                    color="green"
                    onClick={() => handleCardClick('Student', 'present')}
                  />
                  <SummaryCard
                    label={t('common.absent')} value={data.students.absent}
                    total={data.students.present + data.students.absent + data.students.late + data.students.permission}
                    color="red"
                    onClick={() => handleCardClick('Student', 'absent')}
                  />
                  <SummaryCard
                    label={t('common.late')} value={data.students.late}
                    total={data.students.present + data.students.absent + data.students.late + data.students.permission}
                    color="orange"
                    onClick={() => handleCardClick('Student', 'late')}
                  />
                  <SummaryCard
                    label={t('common.permission')} value={data.students.permission}
                    total={data.students.present + data.students.absent + data.students.late + data.students.permission}
                    color="blue"
                    onClick={() => handleCardClick('Student', 'permission')}
                  />
                </div>
              </div>

              {/* Staff Section */}
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {t('dashboard.staffSummary')}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <SummaryCard
                    label={t('common.present')} value={data.staff.present}
                    total={data.staff.present + data.staff.absent + data.staff.late + data.staff.permission}
                    color="green"
                    onClick={() => handleCardClick('Staff', 'present')}
                  />
                  <SummaryCard
                    label={t('common.absent')} value={data.staff.absent}
                    total={data.staff.present + data.staff.absent + data.staff.late + data.staff.permission}
                    color="red"
                    onClick={() => handleCardClick('Staff', 'absent')}
                  />
                  <SummaryCard
                    label={t('common.late')} value={data.staff.late}
                    total={data.staff.present + data.staff.absent + data.staff.late + data.staff.permission}
                    color="orange"
                    onClick={() => handleCardClick('Staff', 'late')}
                  />
                  <SummaryCard
                    label={t('common.permission')} value={data.staff.permission}
                    total={data.staff.present + data.staff.absent + data.staff.late + data.staff.permission}
                    color="blue"
                    onClick={() => handleCardClick('Staff', 'permission')}
                  />
                </div>
              </div>
            </>
          )}

          {/* ========== CHARTS ========== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Pie Chart */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">{t('dashboard.attendanceDistribution')}</h3>
              <div className="w-full" style={{ height: '280px' }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent ? (percent * 100).toFixed(0) : '0')}%`}
                        outerRadius={90}
                        innerRadius={45}
                        fill="#8884d8"
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => {
                          const v = Number(value) || 0
                          const total = pieData.reduce((s, d) => s + d.value, 0)
                          return [`${v} (${total > 0 ? ((v / total) * 100).toFixed(1) : 0}%)`, name]
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">{t('common.noData')}</div>
                )}
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">{t('dashboard.staffVsStudents')}</h3>
              <div className="w-full" style={{ height: '280px' }}>
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey={t('common.students')} fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={t('dashboard.staff')} fill="#06B6D4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">{t('common.noData')}</div>
                )}
              </div>
            </div>
          </div>

          {/* ========== DETAIL TABLE ========== */}
          <div id="detail-table" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800">{t('dashboard.detailedTable')}</h3>
                  {drillRole && (
                    <button onClick={clearDrill} className="text-xs text-indigo-600 hover:underline mt-1">
                      {t('dashboard.clearFilter')}
                    </button>
                  )}
                </div>
                <button
                  onClick={exportCSV}
                  disabled={filteredDetails.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  {t('common.exportCSV')}
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 mt-3">
                <input
                  type="text"
                  placeholder={t('common.search') + '...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full sm:w-48 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <select
                  value={roleFilter}
                  onChange={e => { setRoleFilter(e.target.value as any); setDrillRole(null); setDrillStatus(null); }}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">{t('common.all')} {t('common.role')}</option>
                  <option value="Student">{t('common.students')}</option>
                  <option value="Staff">{t('dashboard.staff')}</option>
                </select>
                <select
                  value={groupFilter}
                  onChange={e => setGroupFilter(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t('dashboard.allClassesDepts')}</option>
                  {data?.filters.classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  {data?.filters.departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value as StatusFilter); setDrillStatus(null); }}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">{t('common.all')} {t('common.status')}</option>
                  <option value="present">{t('common.present')}</option>
                  <option value="absent">{t('common.absent')}</option>
                  <option value="late">{t('common.late')}</option>
                  <option value="permission">{t('common.permission')}</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">{t('common.id')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('common.name')}</th>
                    <th className="text-left px-4 py-3 font-medium">{t('common.role')}</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">{t('dashboard.classOrDept')}</th>
                    <th className="text-center px-4 py-3 font-medium">{t('common.present')}</th>
                    <th className="text-center px-4 py-3 font-medium">{t('common.absent')}</th>
                    <th className="text-center px-4 py-3 font-medium">{t('common.late')}</th>
                    <th className="text-center px-4 py-3 font-medium">{t('common.permission')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDetails.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-400">{t('common.noData')}</td>
                    </tr>
                  ) : (
                    filteredDetails.map((row, i) => (
                      <tr key={`${row.id}-${i}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.id.slice(0, 8)}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            row.role === 'Student' ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700'
                          }`}>
                            {row.role === 'Student' ? t('common.students') : getRoleLabel(row.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{row.group || '-'}</td>
                        <td className="text-center px-4 py-3">
                          {row.present > 0 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">{row.present}</span>}
                        </td>
                        <td className="text-center px-4 py-3">
                          {row.absent > 0 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold">{row.absent}</span>}
                        </td>
                        <td className="text-center px-4 py-3">
                          {row.late > 0 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">{row.late}</span>}
                        </td>
                        <td className="text-center px-4 py-3">
                          {row.permission > 0 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{row.permission}</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredDetails.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
                {t('common.showing')} {filteredDetails.length} {filteredDetails.length === 1 ? t('common.result') : t('common.results')}
              </div>
            )}
          </div>

          </div>
        </div>
      </div>
  )
}

export default function AdminDashboard() {
  return (
    <AuthGuard requiredRole="ADMIN">
      <DashboardContent />
    </AuthGuard>
  )
}
