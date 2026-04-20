"use client"

import { useState, useEffect, useMemo } from 'react'
import { Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import Sidebar from '../../components/Sidebar'
import AuthGuard from '../../components/AuthGuard'
import { adminNav } from '../../lib/admin-nav'
import { apiFetch } from '../../lib/api'
import { useLanguage } from '../../lib/i18n'

interface GroupSummary { total: number; present: number; absent: number; late: number; permission: number }
interface DetailRow { id: string; name: string; role: string; group: string; present: number; absent: number; late: number; permission: number }
interface DashboardData {
  students: GroupSummary
  staff: GroupSummary
  details: DetailRow[]
  filters: { classes: { id: string; name: string }[]; departments: { id: string; name: string }[] }
}
type StatusFilter = 'all' | 'present' | 'absent' | 'late' | 'permission'

const roleLabels: Record<string, string> = {
  ADMIN:'Admin',TEACHER:'Teacher',PRIMARY_SCHOOL_PRINCIPAL:'Primary School Principal',
  SECONDARY_SCHOOL_PRINCIPAL:'Secondary School Principal',HIGH_SCHOOL_PRINCIPAL:'High School Principal',
  UNIVERSITY_RECTOR:'University Rector',OFFICER:'Officer',STAFF:'Staff',
  OFFICE_HEAD:'Office Head',DEPUTY_OFFICE_HEAD:'Deputy Office Head',
  DEPARTMENT_HEAD:'Department Head',DEPUTY_DEPARTMENT_HEAD:'Deputy Department Head',
  GENERAL_DEPARTMENT_DIRECTOR:'General Dept. Director',
  DEPUTY_GENERAL_DEPARTMENT_DIRECTOR:'Deputy General Dept. Director',
  COMPANY_CEO:'CEO',CREDIT_OFFICER:'Credit Officer',SECURITY_GUARD:'Security Guard',
  JANITOR:'Janitor',PROJECT_MANAGER:'Project Manager',BRANCH_MANAGER:'Branch Manager',
  EXECUTIVE_DIRECTOR:'Executive Director',HR_MANAGER:'HR Manager',
  ATHLETE_MALE:'Athlete (M)',ATHLETE_FEMALE:'Athlete (F)',TRAINER:'Trainer',
  BARISTA:'Barista',CASHIER:'Cashier',RECEPTIONIST:'Receptionist',GENERAL_MANAGER:'General Manager',
}
function getRoleLabel(role: string): string {
  if (role === 'Student') return 'Student'
  return roleLabels[role] || role
}

function StatRing({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  const r = 18, c = 2 * Math.PI * r, offset = c - (pct / 100) * c
  const sc: Record<string,string> = { green:'#10B981', red:'#EF4444', orange:'#F59E0B', blue:'#3B82F6' }
  return (
    <svg width="48" height="48" className="shrink-0">
      <circle cx="24" cy="24" r={r} fill="none" stroke="#F3F4F6" strokeWidth="4"/>
      <circle cx="24" cy="24" r={r} fill="none" stroke={sc[color]} strokeWidth="4"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
        transform="rotate(-90 24 24)" className="transition-all duration-700 ease-out"/>
      <text x="24" y="24" textAnchor="middle" dominantBaseline="central"
        className="text-[10px] font-bold fill-gray-600">{pct > 0 ? `${Math.round(pct)}%` : '0'}</text>
    </svg>
  )
}

function CardIcon({ color }: { color: string }) {
  const cls: Record<string,string> = { green:'text-emerald-500', red:'text-red-500', orange:'text-amber-500', blue:'text-blue-500' }
  const paths: Record<string,React.ReactNode> = {
    green:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>,
    red:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>,
    orange:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>,
    blue:<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>,
  }
  return (<svg className={`w-5 h-5 ${cls[color]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">{paths[color]}</svg>)
}

function DashboardContent() {
  const { t } = useLanguage()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [mounted, setMounted] = useState(false)
  const [roleFilter, setRoleFilter] = useState<'all'|'Student'|'Staff'>('all')
  const [groupFilter, setGroupFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [drillRole, setDrillRole] = useState<'Student'|'Staff'|null>(null)
  const [tableExpanded, setTableExpanded] = useState(false)

  // Monthly trend
  const [trendData, setTrendData] = useState<{ day: number; studentPresent: number; studentAbsent: number; staffPresent: number; staffAbsent: number }[]>([])
  const [trendYear, setTrendYear] = useState(new Date().getFullYear())
  const [trendMonth, setTrendMonth] = useState(new Date().getMonth() + 1)

  useEffect(() => { setSelectedDate(new Date().toISOString().split('T')[0]); setMounted(true) }, [])
  useEffect(() => { if (selectedDate) fetchDashboard() }, [selectedDate])
  useEffect(() => { fetchTrend() }, [trendYear, trendMonth])

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/reports/dashboard-summary?date=${selectedDate}`)
      if (res.ok) setData(await res.json())
      else console.error('Dashboard API error:', res.status)
    } catch (err) { console.error('Failed to fetch dashboard data', err) }
    finally { setLoading(false) }
  }

  const fetchTrend = async () => {
    try {
      const res = await apiFetch(`/api/reports/monthly-trend?year=${trendYear}&month=${trendMonth}`)
      if (res.ok) { const json = await res.json(); setTrendData(json.data || []) }
    } catch (err) { console.error('Failed to fetch trend', err) }
  }

  const handleCardClick = (role: 'Student'|'Staff', status: StatusFilter) => {
    setDrillRole(role); setRoleFilter(role === 'Student' ? 'Student' : 'Staff')
    setStatusFilter(status); setGroupFilter(''); setSearchQuery(''); setTableExpanded(true)
    document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' })
  }
  const clearDrill = () => { setDrillRole(null); setRoleFilter('all'); setStatusFilter('all'); setGroupFilter(''); setSearchQuery('') }

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
      if (searchQuery) { const q = searchQuery.toLowerCase(); if (!row.name.toLowerCase().includes(q) && !row.id.toLowerCase().includes(q)) return false }
      return true
    })
  }, [data, roleFilter, groupFilter, statusFilter, searchQuery])

  const studentPieData = useMemo(() => {
    if (!data) return []
    return [
      { name: t('common.present'), value: data.students.present, color: '#10B981' },
      { name: t('common.absent'), value: data.students.absent, color: '#EF4444' },
      { name: t('common.late'), value: data.students.late, color: '#F59E0B' },
      { name: t('common.permission'), value: data.students.permission, color: '#3B82F6' },
    ].filter(d => d.value > 0)
  }, [data, t])

  const staffPieData = useMemo(() => {
    if (!data) return []
    return [
      { name: t('common.present'), value: data.staff.present, color: '#10B981' },
      { name: t('common.absent'), value: data.staff.absent, color: '#EF4444' },
      { name: t('common.late'), value: data.staff.late, color: '#F59E0B' },
      { name: t('common.permission'), value: data.staff.permission, color: '#3B82F6' },
    ].filter(d => d.value > 0)
  }, [data, t])

  const exportCSV = () => {
    if (!filteredDetails.length) return
    const headers = [t('common.id'),t('common.name'),t('common.role'),t('dashboard.classOrDept'),t('common.present'),t('common.absent'),t('common.late'),t('common.permission')]
    const rows = filteredDetails.map(r => [r.id,r.name,getRoleLabel(r.role),r.group,r.present,r.absent,r.late,r.permission])
    const csv = '\uFEFF' + [headers,...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `attendance_${selectedDate}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const SummaryCard = ({ label, value, total, color, onClick }: { label:string; value:number; total:number; color:string; onClick?:()=>void }) => {
    const bg: Record<string,string> = {
      green:'from-emerald-50 to-emerald-100/50 border-emerald-200/60 hover:border-emerald-300 hover:shadow-emerald-100/40',
      red:'from-red-50 to-red-100/50 border-red-200/60 hover:border-red-300 hover:shadow-red-100/40',
      orange:'from-amber-50 to-amber-100/50 border-amber-200/60 hover:border-amber-300 hover:shadow-amber-100/40',
      blue:'from-blue-50 to-blue-100/50 border-blue-200/60 hover:border-blue-300 hover:shadow-blue-100/40',
    }
    const num: Record<string,string> = { green:'text-emerald-700', red:'text-red-700', orange:'text-amber-700', blue:'text-blue-700' }
    return (
      <button onClick={onClick} className={`bg-gradient-to-br ${bg[color]} relative border rounded-2xl p-4 text-left transition-all duration-200 cursor-pointer hover:shadow-lg active:scale-[0.97]`}>
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5"><CardIcon color={color}/><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span></div>
            <div className={`text-3xl font-extrabold tracking-tight ${num[color]}`}>{value}</div>
          </div>
          <StatRing value={value} total={total} color={color}/>
        </div>
        <div className="mt-1.5 text-[11px] text-gray-400 font-medium">of {total} total</div>
      </button>
    )
  }

  if (!mounted || loading) return (
    <div className="page-shell">
      <Sidebar title="Admin Panel" subtitle="Wattaman" navItems={adminNav} accentColor="indigo"/>
      <div className="page-content">
        <div className="h-14 lg:hidden"/>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="relative"><div className="w-10 h-10 rounded-full border-[3px] border-indigo-100"/><div className="absolute inset-0 w-10 h-10 rounded-full border-[3px] border-indigo-500 border-t-transparent animate-spin"/></div>
          <span className="text-sm text-gray-400">{t('common.loading') || 'Loading'}...</span>
        </div>
      </div>
    </div>
  )

  const stu = data?.students || { total:0,present:0,absent:0,late:0,permission:0 }
  const stf = data?.staff || { total:0,present:0,absent:0,late:0,permission:0 }
  const stuAtt = stu.present + stu.absent + stu.late + stu.permission
  const stfAtt = stf.present + stf.absent + stf.late + stf.permission

  return (
    <div className="page-shell">
      <Sidebar title="Admin Panel" subtitle="Wattaman" navItems={adminNav} accentColor="indigo"/>
      <div className="page-content">
        <div className="h-14 lg:hidden"/>
        <div className="page-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{t('dashboard.title')}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{t('dashboard.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer"/>
              <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">{t('common.today') || 'Today'}</button>
            </div>
          </div>
        </div>

        <div className="page-body space-y-6">
          {data && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: t('common.students'), value: stu.total, sub: `${stu.present} ${t('common.present').toLowerCase()}`, dot: 'bg-emerald-400' },
                { label: t('dashboard.staff'), value: stf.total, sub: `${stf.present} ${t('common.present').toLowerCase()}`, dot: 'bg-emerald-400' },
                { label: t('common.absent'), value: stu.absent + stf.absent, sub: `${stu.absent} stu \u00b7 ${stf.absent} staff`, dot: 'bg-red-400' },
                { label: t('common.late'), value: stu.late + stf.late, sub: `${stu.late} stu \u00b7 ${stf.late} staff`, dot: 'bg-amber-400' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{item.value}</div>
                  <div className="flex items-center gap-1.5 mt-1.5"><div className={`w-1.5 h-1.5 rounded-full ${item.dot}`}/><span className="text-[11px] text-gray-500">{item.sub}</span></div>
                </div>
              ))}
            </div>
          )}

          {data && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 rounded-full bg-purple-500"/><h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{t('dashboard.studentSummary')}</h2>
                  <span className="ml-1 text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">{stu.total}</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <SummaryCard label={t('common.present')} value={stu.present} total={stuAtt} color="green" onClick={() => handleCardClick('Student','present')}/>
                  <SummaryCard label={t('common.absent')} value={stu.absent} total={stuAtt} color="red" onClick={() => handleCardClick('Student','absent')}/>
                  <SummaryCard label={t('common.late')} value={stu.late} total={stuAtt} color="orange" onClick={() => handleCardClick('Student','late')}/>
                  <SummaryCard label={t('common.permission')} value={stu.permission} total={stuAtt} color="blue" onClick={() => handleCardClick('Student','permission')}/>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-5 rounded-full bg-cyan-500"/><h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{t('dashboard.staffSummary')}</h2>
                  <span className="ml-1 text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">{stf.total}</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <SummaryCard label={t('common.present')} value={stf.present} total={stfAtt} color="green" onClick={() => handleCardClick('Staff','present')}/>
                  <SummaryCard label={t('common.absent')} value={stf.absent} total={stfAtt} color="red" onClick={() => handleCardClick('Staff','absent')}/>
                  <SummaryCard label={t('common.late')} value={stf.late} total={stfAtt} color="orange" onClick={() => handleCardClick('Staff','late')}/>
                  <SummaryCard label={t('common.permission')} value={stf.permission} total={stfAtt} color="blue" onClick={() => handleCardClick('Staff','permission')}/>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Student Attendance Distribution */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 px-5 pt-5">
                <div className="w-1 h-5 rounded-full bg-purple-500"/>
                <h3 className="text-sm font-bold text-gray-700">{t('dashboard.studentSummary')} - {t('dashboard.attendanceDistribution')}</h3>
              </div>
              <div className="px-5 pb-5" style={{ height: '280px' }}>
                {studentPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={studentPieData} cx="50%" cy="50%" labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent ? (percent*100).toFixed(0) : '0')}%`}
                        outerRadius={85} innerRadius={50} dataKey="value" stroke="none" animationDuration={800}>
                        {studentPieData.map((entry,i) => <Cell key={i} fill={entry.color}/>)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius:'12px', border:'1px solid #E5E7EB', boxShadow:'0 4px 12px rgba(0,0,0,0.08)', fontSize:'13px' }}
                        formatter={(value,name) => { const v = Number(value)||0; const tot = studentPieData.reduce((s,d)=>s+d.value,0); return [`${v} (${tot>0?((v/tot)*100).toFixed(1):0}%)`,name] }}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:'12px', paddingTop:'8px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
                    <span className="text-sm">{t('common.noData')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Staff Attendance Distribution */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 px-5 pt-5">
                <div className="w-1 h-5 rounded-full bg-cyan-500"/>
                <h3 className="text-sm font-bold text-gray-700">{t('dashboard.staffSummary')} - {t('dashboard.attendanceDistribution')}</h3>
              </div>
              <div className="px-5 pb-5" style={{ height: '280px' }}>
                {staffPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={staffPieData} cx="50%" cy="50%" labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent ? (percent*100).toFixed(0) : '0')}%`}
                        outerRadius={85} innerRadius={50} dataKey="value" stroke="none" animationDuration={800}>
                        {staffPieData.map((entry,i) => <Cell key={i} fill={entry.color}/>)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius:'12px', border:'1px solid #E5E7EB', boxShadow:'0 4px 12px rgba(0,0,0,0.08)', fontSize:'13px' }}
                        formatter={(value,name) => { const v = Number(value)||0; const tot = staffPieData.reduce((s,d)=>s+d.value,0); return [`${v} (${tot>0?((v/tot)*100).toFixed(1):0}%)`,name] }}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:'12px', paddingTop:'8px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
                    <span className="text-sm">{t('common.noData')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Monthly Line Chart ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 pt-5 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full bg-indigo-500"/>
                <h3 className="text-sm font-bold text-gray-700">{t('dashboard.monthlyTrend') || 'Monthly Attendance Trend'}</h3>
              </div>
              <div className="flex items-center gap-2">
                <select value={trendMonth} onChange={e => setTrendMonth(Number(e.target.value))}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-600 cursor-pointer focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all">
                  {Array.from({length:12},(_,i)=>i+1).map(m => (
                    <option key={m} value={m}>{new Date(2000,m-1).toLocaleString('default',{month:'long'})}</option>
                  ))}
                </select>
                <select value={trendYear} onChange={e => setTrendYear(Number(e.target.value))}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-600 cursor-pointer focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all">
                  {Array.from({length:5},(_,i)=>new Date().getFullYear()-i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-5 pb-5 pt-2" style={{ height: '320px' }}>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
                    <XAxis dataKey="day" tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ borderRadius:'12px', border:'1px solid #E5E7EB', boxShadow:'0 4px 12px rgba(0,0,0,0.08)', fontSize:'13px' }}/>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:'12px', paddingTop:'8px' }}/>
                    <Line type="monotone" dataKey="studentPresent" name={`${t('common.students')} - ${t('common.present')}`} stroke="#8B5CF6" strokeWidth={2} dot={false} activeDot={{ r:4 }}/>
                    <Line type="monotone" dataKey="studentAbsent" name={`${t('common.students')} - ${t('common.absent')}`} stroke="#A78BFA" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r:4 }}/>
                    <Line type="monotone" dataKey="staffPresent" name={`${t('dashboard.staff')} - ${t('common.present')}`} stroke="#06B6D4" strokeWidth={2} dot={false} activeDot={{ r:4 }}/>
                    <Line type="monotone" dataKey="staffAbsent" name={`${t('dashboard.staff')} - ${t('common.absent')}`} stroke="#67E8F9" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r:4 }}/>
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
                  <span className="text-sm">{t('common.noData')}</span>
                </div>
              )}
            </div>
          </div>

          <div id="detail-table" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button onClick={() => setTableExpanded(prev => !prev)}
              className="w-full p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-gray-700">{t('dashboard.detailedTable')}</h3>
                <span className="text-[11px] bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">{filteredDetails.length}</span>
              </div>
              <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${tableExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </button>

            {tableExpanded && (<>
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3">
                <div className="flex items-center gap-3">
                  {drillRole && (
                    <button onClick={clearDrill} className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-colors">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                      {t('dashboard.clearFilter')}
                    </button>
                  )}
                  <span className="text-[11px] bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">{filteredDetails.length}</span>
                </div>
                <button onClick={exportCSV} disabled={filteredDetails.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  {t('common.exportCSV')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <div className="relative flex-1 min-w-[120px] sm:flex-none sm:w-52">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input type="text" placeholder={`${t('common.search')}...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all"/>
                </div>
                <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value as any); setDrillRole(null) }}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer transition-all">
                  <option value="all">{t('common.all')} {t('common.role')}</option>
                  <option value="Student">{t('common.students')}</option>
                  <option value="Staff">{t('dashboard.staff')}</option>
                </select>
                <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer transition-all">
                  <option value="">{t('dashboard.allClassesDepts')}</option>
                  {data?.filters.classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  {data?.filters.departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer transition-all">
                  <option value="all">{t('common.all')} {t('common.status')}</option>
                  <option value="present">{t('common.present')}</option>
                  <option value="absent">{t('common.absent')}</option>
                  <option value="late">{t('common.late')}</option>
                  <option value="permission">{t('common.permission')}</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t('common.name')}</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t('common.role')}</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">{t('dashboard.classOrDept')}</th>
                    <th className="text-center px-3 py-3 text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">{t('common.present')}</th>
                    <th className="text-center px-3 py-3 text-[11px] font-semibold text-red-600 uppercase tracking-wider">{t('common.absent')}</th>
                    <th className="text-center px-3 py-3 text-[11px] font-semibold text-amber-600 uppercase tracking-wider">{t('common.late')}</th>
                    <th className="text-center px-3 py-3 text-[11px] font-semibold text-blue-600 uppercase tracking-wider">{t('common.permission')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredDetails.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-300">
                      <svg className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
                      <span className="text-sm">{t('common.noData')}</span>
                    </td></tr>
                  ) : filteredDetails.map((row, i) => (
                    <tr key={`${row.id}-${i}`} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3"><div className="font-medium text-gray-900 text-sm">{row.name}</div><div className="text-[11px] text-gray-400 md:hidden">{row.group||''}</div></td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold ${row.role==='Student'?'bg-purple-50 text-purple-700 ring-1 ring-purple-200/60':'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200/60'}`}>
                          {row.role === 'Student' ? t('common.students') : getRoleLabel(row.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{row.group||'-'}</td>
                      <td className="text-center px-3 py-3">{row.present>0?<span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold ring-1 ring-emerald-200/50">{row.present}</span>:<span className="text-gray-200">-</span>}</td>
                      <td className="text-center px-3 py-3">{row.absent>0?<span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-lg bg-red-50 text-red-700 text-xs font-bold ring-1 ring-red-200/50">{row.absent}</span>:<span className="text-gray-200">-</span>}</td>
                      <td className="text-center px-3 py-3">{row.late>0?<span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold ring-1 ring-amber-200/50">{row.late}</span>:<span className="text-gray-200">-</span>}</td>
                      <td className="text-center px-3 py-3">{row.permission>0?<span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold ring-1 ring-blue-200/50">{row.permission}</span>:<span className="text-gray-200">-</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredDetails.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-medium">{t('common.showing')} {filteredDetails.length} {filteredDetails.length===1?t('common.result'):t('common.results')}</span>
              </div>
            )}
            </>)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <AuthGuard requiredRole="ADMIN">
      <DashboardContent/>
    </AuthGuard>
  )
}
