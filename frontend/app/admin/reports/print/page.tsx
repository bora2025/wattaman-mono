'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiFetch } from '../../../../lib/api'
import { useLanguage } from '../../../../lib/i18n'

interface PrintStudent {
  studentId: string
  studentNumber: string
  studentName: string
  present: number
  late: number
  absent: number
  dayOff: number
}

interface PrintData {
  className: string
  subject: string | null
  teacherName: string
  startDate: string
  endDate: string
  students: PrintStudent[]
}

const PAPER_SIZES: Record<string, { width: string; minHeight: string }> = {
  A4: { width: '210mm', minHeight: '297mm' },
  Letter: { width: '215.9mm', minHeight: '279.4mm' },
  Legal: { width: '215.9mm', minHeight: '355.6mm' },
}

export default function PrintReportPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <PrintReportContent />
    </Suspense>
  )
}

function PrintReportContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const classId = searchParams.get('classId') || ''
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''
  const period = searchParams.get('period') || 'daily'
  const paperSize = searchParams.get('paper') || 'A4'
  const orgName = searchParams.get('orgName') || 'Wattaman School'
  const logoUrl = searchParams.get('logoUrl') || ''
  const headerLines: string[] = (() => {
    try { return JSON.parse(searchParams.get('headerLines') || '[]') }
    catch { return [] }
  })()
  const signers: string[] = (() => {
    try { return JSON.parse(searchParams.get('signers') || '[]') }
    catch { return ['Teacher', 'Admin'] }
  })()

  const [data, setData] = useState<PrintData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const hasPrinted = useRef(false)

  useEffect(() => {
    if (!classId || !startDate || !endDate) {
      setError('Missing required parameters')
      setLoading(false)
      return
    }
    fetchData()
  }, [classId, startDate, endDate])

  const fetchData = async () => {
    try {
      const res = await apiFetch(
        `/api/reports/print-report-data?classId=${encodeURIComponent(classId)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      )
      if (res.ok) {
        const json = await res.json()
        if (!json) {
          setError('Class not found')
        } else {
          setData(json)
        }
      } else {
        setError('Failed to load report data')
      }
    } catch {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  // Auto-print once data is loaded
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

  const totals = data.students.reduce(
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
      {/* Print-specific styles */}
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
          {data.className} — {getPeriodLabel()} — {paperSize}
        </div>
        <button onClick={() => window.print()} className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm">
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
              <div className="flex-shrink-0 pt-1">
                <img src={logoUrl} alt="Logo" className="h-20 w-20 object-contain" />
              </div>
            )}
            <div className="flex-1 text-center">
              {headerLines.map((line, idx) => (
                <p key={idx} className={`${idx === 0 ? 'text-base font-bold text-slate-900' : 'text-sm font-semibold text-slate-700'} leading-relaxed`}>
                  {line}
                </p>
              ))}
              {orgName && (
                <p className="text-lg font-bold text-slate-900 mt-1 uppercase tracking-wide">
                  {orgName}
                </p>
              )}
            </div>
            {/* Spacer to balance logo */}
            {logoUrl && <div className="w-20 flex-shrink-0" />}
          </div>
          <div className="text-center mt-3">
            <h2 className="text-lg font-semibold text-slate-700">
              {t('reports.attendanceReport')}
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
            <div className="mt-2 flex flex-wrap justify-center gap-x-8 gap-y-1 text-sm text-slate-600">
              <span>
                <strong>{t('common.class')}:</strong> {data.className}
                {data.subject ? ` — ${data.subject}` : ''}
              </span>
              <span>
                <strong>{t('reports.preparedBy')}:</strong> {data.teacherName}
              </span>
            </div>
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
            {data.students.map((student, idx) => (
              <tr key={student.studentId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-300 px-2 py-1.5 text-center text-xs font-mono">
                  {student.studentNumber}
                </td>
                <td className="border border-slate-300 px-3 py-1.5 text-slate-800">
                  {student.studentName}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-emerald-700">
                  {student.present}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-amber-600">
                  {student.late}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-red-600">
                  {student.absent}
                </td>
                <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-purple-600">
                  {student.dayOff}
                </td>
              </tr>
            ))}
            {/* Totals Row */}
            <tr className="bg-slate-200 font-bold">
              <td className="border border-slate-400 px-2 py-2 text-center" colSpan={2}>
                {t('common.total')} ({data.students.length} {t('common.students')})
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
            {orgName} — {t('reports.attendanceReport')}
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
