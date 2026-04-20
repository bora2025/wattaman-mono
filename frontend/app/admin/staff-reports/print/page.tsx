'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiFetch } from '../../../../lib/api'
import { useLanguage } from '../../../../lib/i18n'

const positionLabels: Record<string, string> = {
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  PRIMARY_SCHOOL_PRINCIPAL: 'នាយកសាលាបឋម',
  SECONDARY_SCHOOL_PRINCIPAL: 'នាយកសាលាអនុវិទ្យាល័យ',
  HIGH_SCHOOL_PRINCIPAL: 'នាយកសាលាវិទ្យាល័យ',
  OFFICER: 'មន្ត្រី',
  STAFF: 'បុគ្គិល',
  OFFICE_HEAD: 'ប្រធានការិយាល័យ',
  DEPARTMENT_HEAD: 'ប្រធាននាយកដ្ឋាន',
  SECURITY_GUARD: 'សន្តិសុខ',
  HR_MANAGER: 'ប្រធានធនធានមនុស្ស',
}

interface StaffPrintRow {
  userId: string
  staffNumber: string
  staffName: string
  role: string
  present: number
  late: number
  absent: number
  dayOff: number
}

interface StaffPrintData {
  startDate: string
  endDate: string
  staff: StaffPrintRow[]
}

const PAPER_SIZES: Record<string, { width: string; minHeight: string }> = {
  A4: { width: '210mm', minHeight: '297mm' },
  Letter: { width: '215.9mm', minHeight: '279.4mm' },
  Legal: { width: '215.9mm', minHeight: '355.6mm' },
}

export default function StaffPrintReportPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <StaffPrintReportContent />
    </Suspense>
  )
}

function StaffPrintReportContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''
  const period = searchParams.get('period') || 'daily'
  const paperSize = searchParams.get('paper') || 'A4'
  const orgName = searchParams.get('orgName') || 'Wattaman School'
  const logoUrl = searchParams.get('logoUrl') || ''
  const logoTextLines: string[] = (() => {
    try { return JSON.parse(searchParams.get('logoTextLines') || '[]') }
    catch { return [] }
  })()
  const logoGap = parseInt(searchParams.get('logoGap') || '4')
  const logoTextGap = parseInt(searchParams.get('logoTextGap') || '4')
  const headerGap = parseInt(searchParams.get('headerGap') || '6')
  const logoText = searchParams.get('logoText') || ''
  const deptName = searchParams.get('dept') || ''
  const headerLines: string[] = (() => {
    try { return JSON.parse(searchParams.get('headerLines') || '[]') }
    catch { return [] }
  })()
  const signers: string[] = (() => {
    try { return JSON.parse(searchParams.get('signers') || '[]') }
    catch { return ['Admin', 'Director'] }
  })()

  const [data, setData] = useState<StaffPrintData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const hasPrinted = useRef(false)

  useEffect(() => {
    if (!startDate || !endDate) {
      setError('Missing required parameters')
      setLoading(false)
      return
    }
    fetchData()
  }, [startDate, endDate])

  const fetchData = async () => {
    try {
      const res = await apiFetch(
        `/api/reports/staff-print-report-data?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      )
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        setError('Failed to load report data')
      }
    } catch {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (data && !hasPrinted.current) {
      hasPrinted.current = true
      setTimeout(() => window.print(), 500)
    }
  }, [data])

  const paper = PAPER_SIZES[paperSize] || PAPER_SIZES.A4

  const getPeriodLabel = () => {
    switch (period) {
      case 'daily': return t('reports.daily')
      case 'weekly': return t('reports.weekly')
      case 'monthly': return t('reports.monthly')
      case 'yearly': return t('reports.yearly')
      default: return t('reports.customRange')
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-500 mt-3">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error || t('reports.noDataForRange')}</p>
          <button onClick={() => window.close()} className="mt-4 px-4 py-2 bg-slate-200 rounded-lg text-sm">{t('common.close')}</button>
        </div>
      </div>
    )
  }

  const totals = data.staff.reduce(
    (acc, s) => ({
      present: acc.present + s.present,
      late: acc.late + s.late,
      absent: acc.absent + s.absent,
      dayOff: acc.dayOff + s.dayOff,
    }),
    { present: 0, late: 0, absent: 0, dayOff: 0 }
  )

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: ${paperSize === 'Letter' ? 'letter' : paperSize === 'Legal' ? 'legal' : 'A4'} portrait;
            margin: 15mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
        @media screen {
          body {
            background: #f1f5f9;
          }
        }
      `}</style>

      {/* Screen-only toolbar */}
      <div className="no-print fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-50 shadow-sm">
        <button onClick={() => window.close()} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
          ← {t('common.close')}
        </button>
        <div className="text-sm text-slate-500">
          {t('reports.staffAttendance')} — {getPeriodLabel()} — {paperSize}
        </div>
        <button onClick={() => window.print()} className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 shadow-sm">
          🖨️ {t('reports.printReport')}
        </button>
      </div>

      {/* Print content */}
      <div
        className="mx-auto bg-white"
        style={{
          width: paper.width,
          minHeight: paper.minHeight,
          padding: '15mm',
          marginTop: '60px',
        }}
      >
        {/* Header Section — Khmer letter-head style */}
        <div className="mb-6 border-b-2 border-slate-800 pb-4">
          <div className="flex items-start gap-4">
            {logoUrl && (
              <div className="flex-shrink-0 pt-1 text-center">
                <img src={logoUrl} alt="Logo" className="h-20 w-20 object-contain" style={{ marginBottom: `${logoGap}px` }} />
                {(logoTextLines.length > 0 || logoText) && (
                  <div style={{ marginBottom: `${logoTextGap}px` }}>
                    {logoTextLines.length > 0 ? logoTextLines.map((line, idx) => (
                      <p key={idx} className="text-[9px] text-slate-600 leading-tight whitespace-nowrap">{line}</p>
                    )) : logoText && <p className="text-[9px] text-slate-600 leading-tight whitespace-nowrap">{logoText}</p>}
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 text-center" style={{ marginBottom: `${headerGap}px` }}>
              {headerLines.map((line, idx) => (
                <p key={idx} className={`${idx === 0 ? 'text-base font-bold text-slate-900' : 'text-sm font-semibold text-slate-700'}`}>
                  {line}
                </p>
              ))}
              {orgName && (
                <p className="text-lg font-bold text-slate-900 uppercase tracking-wide mt-1">
                  {orgName}
                </p>
              )}
            </div>
            {/* Spacer to balance logo */}
            {logoUrl && <div className="w-20 flex-shrink-0" />}
          </div>
          <div className="text-center mt-3">
            <h2 className="text-lg font-semibold text-slate-700">
              {t('reports.attendanceReport')} — {t('reports.staffAttendance')}
            </h2>
            <div className="mt-2 flex flex-wrap justify-center gap-x-8 gap-y-1 text-sm text-slate-600">
              <span>
                <strong>{t('reports.reportPeriod')}:</strong> {getPeriodLabel()}
              </span>
              <span>
                <strong>{t('reports.dateRange')}:</strong>{' '}
                {startDate === endDate ? formatDate(startDate) : `${formatDate(startDate)} — ${formatDate(endDate)}`}
              </span>
            </div>
            {deptName && (
              <div className="mt-2 text-sm text-slate-600">
                <strong>{t('common.department')}:</strong> {deptName}
              </div>
            )}
          </div>
        </div>

        {/* Body Section — Report Table */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 px-2 py-2 text-center font-semibold text-slate-700 w-12">
                {t('common.id')}
              </th>
              <th className="border border-slate-400 px-3 py-2 text-left font-semibold text-slate-700">
                {t('common.name')}
              </th>
              <th className="border border-slate-400 px-2 py-2 text-center font-semibold text-slate-700 w-20">
                {t('common.role')}
              </th>
              <th className="border border-slate-400 px-2 py-2 text-center font-semibold text-emerald-700 w-20">
                {t('reports.totalPresent')}
              </th>
              <th className="border border-slate-400 px-2 py-2 text-center font-semibold text-amber-700 w-20">
                {t('reports.totalLate')}
              </th>
              <th className="border border-slate-400 px-2 py-2 text-center font-semibold text-red-700 w-20">
                {t('reports.totalAbsent')}
              </th>
              <th className="border border-slate-400 px-2 py-2 text-center font-semibold text-purple-700 w-24">
                {t('reports.totalPermission')}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.staff.map((row, idx) => (
              <tr key={row.userId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-300 px-2 py-1.5 text-center text-xs font-mono">
                  {row.staffNumber}
                </td>
                <td className="border border-slate-300 px-3 py-1.5 text-slate-800">
                  {row.staffName}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-center text-xs text-slate-600">
                  {positionLabels[row.role] || row.role}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-emerald-700">
                  {row.present}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-amber-600">
                  {row.late}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-red-600">
                  {row.absent}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-purple-600">
                  {row.dayOff}
                </td>
              </tr>
            ))}
            {/* Totals Row */}
            <tr className="bg-slate-200 font-bold">
              <td className="border border-slate-400 px-2 py-2 text-center" colSpan={3}>
                {t('common.total')} ({data.staff.length} staff)
              </td>
              <td className="border border-slate-400 px-2 py-2 text-center text-emerald-700">
                {totals.present}
              </td>
              <td className="border border-slate-400 px-2 py-2 text-center text-amber-600">
                {totals.late}
              </td>
              <td className="border border-slate-400 px-2 py-2 text-center text-red-600">
                {totals.absent}
              </td>
              <td className="border border-slate-400 px-2 py-2 text-center text-purple-600">
                {totals.dayOff}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div className="mt-8 flex justify-between items-end text-xs text-slate-400">
          <div>
            {t('reports.printDate')}: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div>
            {orgName} — {t('reports.staffAttendance')}
          </div>
        </div>

        {/* Signature area */}
        {signers.length > 0 && (
          <div className={`mt-12 flex ${signers.length <= 3 ? 'justify-between' : 'justify-around flex-wrap gap-y-8'} px-4`}>
            {signers.map((signer, idx) => (
              <div key={idx} className="text-center">
                <div className="border-b border-slate-400 w-40 mb-1"></div>
                <p className="text-xs text-slate-500">{signer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
