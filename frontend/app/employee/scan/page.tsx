"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import Sidebar from '../../../components/Sidebar'
import AuthGuard from '../../../components/AuthGuard'
import { employeeNav } from '../../../lib/employee-nav'
import { apiFetch } from '../../../lib/api'

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error'

interface ScanResult {
  action: string
  status: string
  sessionName: string
  checkInTime?: string
  checkOutTime?: string
  userName?: string
  userPhoto?: string | null
  userRole?: string
  userDepartment?: { id: string; name: string; nameKh?: string } | null
}

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

export default function EmployeeScanPage() {
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [userPhoto, setUserPhoto] = useState<string | null>(null)
  const [userDepartment, setUserDepartment] = useState<string>('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const scanningRef = useRef(false)

  // Load user info
  useEffect(() => {
    apiFetch('/api/auth/me').then(async (res) => {
      if (res.ok) {
        const user = await res.json()
        setUserName(user.name)
        setUserRole(user.role)
        setUserPhoto(user.photo || null)
        setUserDepartment(user.department?.name || '')
      }
    }).catch(() => {})
  }, [])

  // Get GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true }
      )
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset()
      readerRef.current = null
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
    scanningRef.current = false
  }, [])

  const handleSelfScan = useCallback(async () => {
    if (scanningRef.current) return
    scanningRef.current = true
    setScanStatus('scanning')
    setError('')

    try {
      const res = await apiFetch('/api/attendance/employee/self-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: gpsLocation?.lat,
          longitude: gpsLocation?.lng,
          location: gpsLocation ? `${gpsLocation.lat.toFixed(6)}, ${gpsLocation.lng.toFixed(6)}` : undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setResult(data)
        setScanStatus('success')
        stopCamera()
        // Auto-reset after 5 seconds
        setTimeout(() => {
          setScanStatus('idle')
          setResult(null)
        }, 5000)
      } else {
        const err = await res.json().catch(() => ({}))
        setError(err.message || 'Failed to record attendance')
        setScanStatus('error')
      }
    } catch {
      setError('Network error. Please try again.')
      setScanStatus('error')
    } finally {
      scanningRef.current = false
    }
  }, [gpsLocation, stopCamera])

  const startCamera = useCallback(async () => {
    setError('')
    setScanStatus('idle')
    setResult(null)
    setCameraActive(true)
  }, [])

  // Start scanning when camera becomes active and video element is ready
  useEffect(() => {
    if (!cameraActive || !videoRef.current) return
    let cancelled = false
    const videoEl = videoRef.current

    const initCamera = async () => {
      try {
        if (readerRef.current) {
          readerRef.current.reset()
          readerRef.current = null
        }
        videoEl.pause()
        if (videoEl.srcObject) {
          (videoEl.srcObject as MediaStream).getTracks().forEach(t => t.stop())
          videoEl.srcObject = null
        }
        await new Promise(r => setTimeout(r, 100))
        if (cancelled) return

        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader

        await reader.decodeFromVideoDevice(null, videoEl, (result) => {
          if (cancelled) return
          if (result && !scanningRef.current) {
            handleSelfScan()
          }
        })
      } catch {
        if (cancelled) return
        setError('Cannot access camera. Please allow camera permission.')
        setScanStatus('error')
        setCameraActive(false)
      }
    }

    initCamera()
    return () => {
      cancelled = true
      if (readerRef.current) {
        readerRef.current.reset()
        readerRef.current = null
      }
      videoEl.pause()
      if (videoEl.srcObject) {
        (videoEl.srcObject as MediaStream).getTracks().forEach(t => t.stop())
        videoEl.srcObject = null
      }
    }
  }, [cameraActive, handleSelfScan])

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  const formatTime = (iso?: string) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' })
  }

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
                  <h1 className="text-2xl font-bold text-slate-900">📷 Scan Attendance</h1>
                  <p className="text-sm text-slate-500 mt-1">Scan QR code to mark your attendance</p>
                </div>
              </div>

              <div className="page-body">
                <div className="max-w-lg mx-auto space-y-6">

                  {/* User Info Card */}
                  <div className="card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl overflow-hidden ring-2 ring-emerald-200">
                        {userPhoto ? (
                          <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
                        ) : (
                          (userName || '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 truncate">{userName || 'Loading...'}</p>
                        <p className="text-xs text-slate-500">💼 {positionLabels[userRole] || userRole}</p>
                        {userDepartment && <p className="text-xs text-slate-400">🏢 {userDepartment}</p>}
                      </div>
                      <div className="ml-auto flex items-center gap-1.5 shrink-0">
                        <span className={`w-2 h-2 rounded-full ${gpsLocation ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-xs text-slate-400">{gpsLocation ? 'GPS Active' : 'No GPS'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Success Overlay */}
                  {scanStatus === 'success' && result && (
                    <div className="card p-6 border-2 border-emerald-400 bg-emerald-50 text-center animate-in fade-in">
                      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-3xl font-bold mx-auto mb-3 overflow-hidden ring-4 ring-emerald-200">
                        {(result.userPhoto || userPhoto) ? (
                          <img src={result.userPhoto || userPhoto!} alt={result.userName || userName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-emerald-600">{(result.userName || userName || '?').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-800">{result.userName || userName}</h3>
                      <div className="mt-1 space-y-0.5">
                        {(result.userDepartment || userDepartment) && (
                          <p className="text-sm text-slate-600">🏢 {result.userDepartment?.name || userDepartment}</p>
                        )}
                        <p className="text-sm text-slate-500">💼 {positionLabels[result.userRole || userRole] || result.userRole || userRole}</p>
                      </div>
                      <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        ✅ {result.action === 'CHECK_IN' ? 'Check In' : 'Check Out'} — {result.sessionName}
                      </div>
                      <p className="text-sm text-emerald-600 mt-2">
                        Status: <span className="font-semibold">{result.status}</span>
                      </p>
                      {result.checkInTime && (
                        <p className="text-sm text-emerald-600 mt-1">Time: {formatTime(result.checkInTime)}</p>
                      )}
                      {result.checkOutTime && (
                        <p className="text-sm text-emerald-600 mt-1">Check Out: {formatTime(result.checkOutTime)}</p>
                      )}
                      <p className="text-xs text-emerald-500 mt-3">Auto-closing in 5 seconds...</p>
                    </div>
                  )}

                  {/* Error Message */}
                  {scanStatus === 'error' && error && (
                    <div className="card p-4 border-2 border-red-300 bg-red-50 text-center">
                      <div className="text-3xl mb-2">❌</div>
                      <p className="text-red-700 font-medium">{error}</p>
                      <button onClick={() => { setScanStatus('idle'); setError('') }} className="btn-outline btn-sm mt-3">
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* Camera Area */}
                  {scanStatus !== 'success' && (
                    <div className="card overflow-hidden">
                      {cameraActive ? (
                        <div className="relative">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full aspect-[4/3] bg-black object-cover"
                          />
                          {/* Scan crosshair overlay */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-52 h-52 border-2 border-white/60 rounded-2xl relative">
                              <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                              <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                              <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                              <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                            </div>
                          </div>
                          {/* Scanning indicator */}
                          {scanStatus === 'scanning' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="bg-white rounded-xl p-4 shadow-lg text-center">
                                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                <p className="text-sm font-medium text-slate-700 mt-2">Recording...</p>
                              </div>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                            <p className="text-white text-center text-sm font-medium">
                              Point camera at QR code
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-4xl mx-auto mb-4">
                            📷
                          </div>
                          <h3 className="text-lg font-semibold text-slate-800 mb-2">Ready to Scan</h3>
                          <p className="text-sm text-slate-500 mb-6">
                            Open your camera and scan the attendance QR code
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="p-4 border-t border-slate-100 flex gap-3">
                        {!cameraActive ? (
                          <button onClick={startCamera} className="btn-primary flex-1 py-3 text-base font-semibold">
                            📷 Open Camera
                          </button>
                        ) : (
                          <>
                            <button onClick={stopCamera} className="btn-outline flex-1">
                              ✕ Close Camera
                            </button>
                            <button onClick={handleSelfScan} disabled={scanStatus === 'scanning'} className="btn-primary flex-1">
                              {scanStatus === 'scanning' ? 'Recording...' : '⚡ Quick Scan'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="card p-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">📋 How to scan</h3>
                    <ol className="text-sm text-slate-500 space-y-1.5 list-decimal list-inside">
                      <li>Tap <strong>"Open Camera"</strong> to start</li>
                      <li>Point your camera at the attendance QR code</li>
                      <li>Attendance is recorded automatically</li>
                      <li>Wait for the <strong>green confirmation</strong></li>
                    </ol>
                    <p className="text-xs text-slate-400 mt-3">
                      💡 You can also tap <strong>"Quick Scan"</strong> to record without scanning a QR code
                    </p>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
