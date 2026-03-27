"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiFetch } from '../../../lib/api'

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  photo: string | null
}

interface StaffAttendanceRecord {
  id: string
  userId: string
  status: string
  checkInTime: string | null
  checkOutTime: string | null
  session: number
}

interface SessionConfigItem {
  session: number
  type: string
  startTime: string
  endTime: string
}

const SESSION_NAMES: Record<number, string> = {
  1: 'Morning 1',
  2: 'Morning 2',
  3: 'Afternoon 1',
  4: 'Afternoon 2',
}

export default function AdminStaffAttendancePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p>Loading...</p></div>}>
      <AdminStaffAttendance />
    </Suspense>
  )
}

function AdminStaffAttendance() {
  const router = useRouter()
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [todayRecords, setTodayRecords] = useState<StaffAttendanceRecord[]>([])
  const [scanning, setScanning] = useState(false)
  const [message, setMessage] = useState('')
  const [session, setSession] = useState<number>(1)
  const [scanMode, setScanMode] = useState<'check-in' | 'check-out'>('check-in')
  const [showStaffInfo, setShowStaffInfo] = useState(false)
  const [currentStaff, setCurrentStaff] = useState<StaffMember | null>(null)
  const [staffSessionConfigs, setStaffSessionConfigs] = useState<SessionConfigItem[]>([])
  const [dataReady, setDataReady] = useState(false)
  const autoStartedRef = useRef(false)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const sessionRef = useRef<number>(1)
  const scanModeRef = useRef<'check-in' | 'check-out'>('check-in')
  const staffScanLockRef = useRef(false)
  const locationRef = useRef<{ latitude: number; longitude: number; locationName?: string } | null>(null)
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied' | 'unavailable'>('pending')

  useEffect(() => { sessionRef.current = session }, [session])
  useEffect(() => { scanModeRef.current = scanMode }, [scanMode])

  // Request and continuously update GPS location
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('unavailable')
      return
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        locationRef.current = { latitude: lat, longitude: lng, locationName: locationRef.current?.locationName }
        setLocationStatus('granted')
        // Reverse geocode to get place name (fire-and-forget)
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16&addressdetails=0`)
          .then(r => r.json())
          .then(data => {
            if (data?.display_name && locationRef.current) {
              // Keep only first 2 parts for brevity (e.g. "Street, City")
              const short = data.display_name.split(',').slice(0, 2).map((s: string) => s.trim()).join(', ')
              locationRef.current = { ...locationRef.current, locationName: short }
            }
          })
          .catch(() => { /* ignore geocode errors */ })
      },
      (err) => {
        console.warn('Geolocation error:', err.code, err.message)
        locationRef.current = null
        setLocationStatus(err.code === 1 ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) return
    setLocationStatus('pending')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        locationRef.current = { latitude: lat, longitude: lng }
        setLocationStatus('granted')
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16&addressdetails=0`)
          .then(r => r.json())
          .then(data => {
            if (data?.display_name && locationRef.current) {
              const short = data.display_name.split(',').slice(0, 2).map((s: string) => s.trim()).join(', ')
              locationRef.current = { ...locationRef.current, locationName: short }
            }
          })
          .catch(() => {})
      },
      (err) => {
        locationRef.current = null
        setLocationStatus(err.code === 1 ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }, [])

  const playSound = useCallback((type: 'success' | 'error') => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      if (type === 'success') {
        oscillator.frequency.setValueAtTime(880, ctx.currentTime)
        oscillator.frequency.setValueAtTime(1108, ctx.currentTime + 0.1)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.3)
      } else {
        oscillator.frequency.setValueAtTime(330, ctx.currentTime)
        oscillator.frequency.setValueAtTime(220, ctx.currentTime + 0.15)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.4)
      }
    } catch { /* Audio not supported */ }
  }, [])

  const fetchStaffSessionConfigs = async () => {
    try {
      const res = await apiFetch('/api/session-config/staff')
      if (res.ok) {
        const data = await res.json()
        setStaffSessionConfigs(data.map((d: any) => ({
          session: d.session, type: d.type, startTime: d.startTime, endTime: d.endTime,
        })))
        autoDetectSession(data)
        setDataReady(true)
      }
    } catch (e) {
      console.error('Error fetching staff session configs:', e)
      setDataReady(true)
    }
  }

  const autoDetectSession = (configs: SessionConfigItem[]) => {
    const now = new Date()
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    // Find the current or next session based on time
    let matched: SessionConfigItem | null = null
    for (const cfg of configs) {
      if (hhmm >= cfg.startTime && hhmm <= cfg.endTime) {
        matched = cfg
        break
      }
    }
    if (!matched) {
      // Pick the most recently ended session (not next upcoming)
      const past = configs.filter(c => c.endTime < hhmm).sort((a, b) => b.endTime.localeCompare(a.endTime))
      if (past.length > 0) {
        matched = past[0]
      } else {
        // Before any session today → pick first upcoming
        const upcoming = configs.filter(c => c.startTime > hhmm).sort((a, b) => a.startTime.localeCompare(b.startTime))
        matched = upcoming[0] || configs[configs.length - 1] || null
      }
    }
    if (matched) {
      setSession(matched.session)
      setScanMode(matched.type === 'CHECK_OUT' ? 'check-out' : 'check-in')
    }
  }

  useEffect(() => {
    fetchStaff()
    fetchTodayRecords()
    fetchStaffSessionConfigs()
    return () => { stopScanning() }
  }, [])

  // Auto-start camera when data is ready
  useEffect(() => {
    if (dataReady && !autoStartedRef.current) {
      autoStartedRef.current = true
      if (typeof navigator.mediaDevices?.getUserMedia === 'function') {
        setScanning(true)
        setMessage('Initializing camera...')
      }
    }
  }, [dataReady])

  useEffect(() => {
    fetchTodayRecords()
  }, [session])


  const fetchStaff = async () => {
    try {
      const res = await apiFetch('/api/auth/users?roles=TEACHER,ADMIN')
      if (res.ok) {
        const data = await res.json()
        setStaffList(data)
      }
    } catch (e) { console.error('Error fetching staff:', e) }
  }

  const fetchTodayRecords = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await apiFetch(`/api/reports/staff-attendance-grid?date=${today}`)
      if (res.ok) setTodayRecords(await res.json())
    } catch (e) { console.error('Error fetching today records:', e) }
  }

  const stopScanning = useCallback(() => {
    if (codeReaderRef.current) { codeReaderRef.current.reset(); codeReaderRef.current = null }
    setScanning(false)
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    setMessage('')
  }, [])

  const handleQrScanned = useCallback((qrData: string) => {
    let staffId: string | null = null
    try {
      const parsed = JSON.parse(qrData)
      if (parsed.staffId) staffId = parsed.staffId
    } catch { /* Not JSON — ignore non-staff QRs */ }

    if (!staffId) {
      playSound('error')
      setMessage('Not a staff QR code')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    if (staffScanLockRef.current) return
    staffScanLockRef.current = true

    const loc = locationRef.current
    apiFetch('/api/attendance/staff/auto-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: staffId, ...(loc ? { latitude: loc.latitude, longitude: loc.longitude, location: loc.locationName || undefined } : {}) }),
    })
      .then(async res => {
        if (res.ok) {
          playSound('success')
          const result = await res.json()
          const staff = staffList.find(s => s.id === staffId)
          if (staff) {
            setCurrentStaff(staff)
            setShowStaffInfo(true)
          }
          const action = result.action === 'CHECK_OUT' ? 'Check-out' : 'Check-in'
          setMessage(`${action} marked ✓`)
          if ('vibrate' in navigator) navigator.vibrate(200)
          // Auto-close camera and redirect to dashboard after 2 seconds
          setTimeout(() => {
            setShowStaffInfo(false)
            setCurrentStaff(null)
            stopScanning()
            router.push('/admin')
          }, 2000)
        } else {
          playSound('error')
          const err = await res.json().catch(() => ({}))
          setMessage(err.message || 'Attendance failed')
          setTimeout(() => { setMessage(''); staffScanLockRef.current = false }, 3000)
        }
      })
      .catch(() => {
        setMessage('Staff attendance error')
        setTimeout(() => { setMessage(''); staffScanLockRef.current = false }, 3000)
      })
  }, [staffList, playSound, stopScanning, router])

  useEffect(() => {
    if (!scanning || !videoRef.current) return
    let cancelled = false
    const videoEl = videoRef.current
    const initCamera = async () => {
      try {
        if (codeReaderRef.current) { codeReaderRef.current.reset(); codeReaderRef.current = null }
        videoEl.pause()
        if (videoEl.srcObject) {
          (videoEl.srcObject as MediaStream).getTracks().forEach(t => t.stop())
          videoEl.srcObject = null
        }
        await new Promise(r => setTimeout(r, 100))
        if (cancelled) return
        const reader = new BrowserMultiFormatReader()
        codeReaderRef.current = reader
        await reader.decodeFromVideoDevice(null, videoEl, (result) => {
          if (cancelled) return
          if (result) handleQrScanned(result.getText())
        })
        if (!cancelled) setMessage('Camera ready — point at staff QR code')
      } catch (error: any) {
        if (cancelled) return
        if (error.name === 'NotAllowedError') setMessage('Camera access denied.')
        else if (error.name === 'NotFoundError') setMessage('No camera found.')
        else setMessage('Failed to start camera.')
        setScanning(false)
      }
    }
    initCamera()
    return () => {
      cancelled = true
      if (codeReaderRef.current) { codeReaderRef.current.reset(); codeReaderRef.current = null }
      videoEl.pause()
      if (videoEl.srcObject) {
        (videoEl.srcObject as MediaStream).getTracks().forEach(t => t.stop())
        videoEl.srcObject = null
      }
    }
  }, [scanning, handleQrScanned])

  const startScanning = () => {
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function') { setMessage('Camera not supported'); return }
    setScanning(true)
    setMessage('Initializing camera...')
  }

  const checkedInCount = todayRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length
  const totalStaff = staffList.length
  const progressPct = totalStaff > 0 ? (checkedInCount / totalStaff) * 100 : 0

  const getStaffRecord = (userId: string) => todayRecords.find(r => r.userId === userId && r.session === session)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="h-14 lg:hidden" />

      {/* ===== FULLSCREEN CAMERA MODE ===== */}
      {scanning && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted />

          {/* Scanning overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 sm:w-72 sm:h-72 relative">
                <div className="absolute inset-0 bg-black/0 rounded-2xl" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-xl" />
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" style={{ top: '50%' }} />
              </div>
            </div>
          </div>

          {/* Top bar */}
          <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                scanMode === 'check-in' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'
              }`}>
                {scanMode === 'check-in' ? '📥 Check-In' : '📤 Check-Out'}
              </div>
              <div className="flex flex-col">
                <span className="text-white/90 text-xs font-medium">{SESSION_NAMES[session]} · Session {session}</span>
                {(() => { const cfg = staffSessionConfigs.find(c => c.session === session); return cfg ? <span className="text-white/60 text-[11px]">⏰ {cfg.startTime} – {cfg.endTime}</span> : null })()}
              </div>
            </div>
            <button onClick={() => { stopScanning(); router.push('/admin') }} className="w-10 h-10 rounded-full bg-red-500/90 backdrop-blur-sm flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform">
              ✕
            </button>
          </div>

          {/* Session schedule cards (info-only) */}
          {staffSessionConfigs.length > 0 && (
            <div className="relative z-10 px-4 mt-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {staffSessionConfigs.map(cfg => {
                  const isActive = cfg.session === session
                  const now = new Date()
                  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                  const isCurrent = hhmm >= cfg.startTime && hhmm <= cfg.endTime
                  return (
                    <div
                      key={cfg.session}
                      className={`relative flex-shrink-0 px-3 py-2 rounded-xl text-left border backdrop-blur-sm ${
                        isActive
                          ? 'border-purple-400 bg-purple-500/30 ring-1 ring-purple-400'
                          : 'border-white/20 bg-white/10'
                      }`}
                    >
                      {isCurrent && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                      <div className="text-[10px] text-white/70">{SESSION_NAMES[cfg.session]}</div>
                      <div className={`text-[11px] font-bold ${cfg.type === 'CHECK_IN' ? 'text-emerald-300' : 'text-blue-300'}`}>
                        {cfg.type === 'CHECK_IN' ? '📥 In' : '📤 Out'}
                      </div>
                      <div className="text-[10px] text-white/50">{cfg.startTime}–{cfg.endTime}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Bottom info bar */}
          <div className="relative z-10 mt-auto bg-gradient-to-t from-black/80 to-transparent px-4 pb-6 pt-8">
            {message && (
              <div className={`mb-3 px-4 py-2.5 rounded-xl text-sm font-medium text-center ${
                message.includes('checked') || message.includes('Camera ready')
                  ? 'bg-emerald-500/90 text-white'
                  : message.includes('Not a staff')
                    ? 'bg-amber-500/90 text-white'
                    : 'bg-white/20 text-white backdrop-blur-sm'
              }`}>
                {message}
              </div>
            )}
            <div className="flex items-center justify-between text-white/90">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-xs font-medium">Scanning for staff QR codes...</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="px-2 py-1 rounded-full bg-emerald-500/30">{checkedInCount} ✓</span>
                <span className="px-2 py-1 rounded-full bg-white/20">{totalStaff} total</span>
              </div>
            </div>
            <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-1 bg-purple-400 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {/* Staff info overlay */}
          {showStaffInfo && currentStaff && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-[slideUp_0.35s_ease-out]">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-3xl font-bold mx-auto mb-3 overflow-hidden">
                    {currentStaff.photo ? (
                      <img src={currentStaff.photo} alt={currentStaff.name} className="w-full h-full object-cover" />
                    ) : (
                      currentStaff.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">{currentStaff.name}</h3>
                  <p className="text-sm text-slate-500">{currentStaff.role} · {currentStaff.email}</p>
                  <div className="mt-3 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✅ Attendance Marked
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Redirecting to dashboard...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!scanning && <video ref={videoRef} className="hidden" autoPlay playsInline muted />}

      {/* ===== TOP BAR ===== */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">👔 Staff Attendance</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">{checkedInCount} checked in</span>
              <span className="text-slate-300 text-xs">·</span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">{totalStaff} total staff</span>
              <span className="text-slate-300 text-xs hidden sm:inline">·</span>
              <span className="text-xs text-slate-400 hidden sm:inline">Session {session} · {scanMode === 'check-in' ? '📥 Check-In' : '📤 Check-Out'}{(() => { const cfg = staffSessionConfigs.find(c => c.session === session); return cfg ? ` · ${cfg.startTime}–${cfg.endTime}` : '' })()}</span>
            </div>
          </div>
          <Link href="/admin" className="shrink-0 text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
            ← Back
          </Link>
        </div>
        <div className="h-1 bg-slate-100">
          <div className="h-1 bg-purple-500 transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Message banner */}
        {message && !scanning && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium shadow-sm ${
            message.includes('checked') || message.includes('submitted')
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
            {message}
          </div>
        )}

        {/* ===== STAFF SESSION TIME WINDOWS ===== */}
        {staffSessionConfigs.length > 0 && (
          <div className="card p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-slate-700">⏰ Staff Session Schedule</span>
              <Link href="/admin/session-settings" className="text-xs text-indigo-500 hover:text-indigo-700">Edit →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {staffSessionConfigs.map(cfg => {
                const isActive = cfg.session === session
                const now = new Date()
                const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                const isCurrent = hhmm >= cfg.startTime && hhmm <= cfg.endTime
                return (
                  <div
                    key={cfg.session}
                    className={`relative p-2.5 rounded-xl text-left border ${
                      isActive
                        ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-300'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    )}
                    <div className="text-[11px] font-medium text-slate-500">{SESSION_NAMES[cfg.session]}</div>
                    <div className={`text-xs font-bold mt-0.5 ${
                      cfg.type === 'CHECK_IN' ? 'text-emerald-600' : 'text-blue-600'
                    }`}>
                      {cfg.type === 'CHECK_IN' ? '📥 Check-In' : '📤 Check-Out'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{cfg.startTime} – {cfg.endTime}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ===== SESSION STATUS ===== */}
        <div className="card p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                scanMode === 'check-in' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {scanMode === 'check-in' ? '📥 Check-In' : '📤 Check-Out'} · Session {session}
              </div>
              {(() => {
                const cfg = staffSessionConfigs.find(c => c.session === session)
                return cfg ? <span className="text-xs text-slate-400">{cfg.startTime} – {cfg.endTime}</span> : null
              })()}
            </div>
            <div className="text-xs font-medium px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              {checkedInCount}/{totalStaff} checked in
            </div>
          </div>
        </div>

        {/* ===== LOCATION STATUS ===== */}
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
          locationStatus === 'granted'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : locationStatus === 'denied'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : locationStatus === 'unavailable'
                ? 'bg-slate-50 text-slate-500 border border-slate-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          <span>{locationStatus === 'granted' ? '📍' : locationStatus === 'denied' ? '🚫' : locationStatus === 'unavailable' ? '📍' : '⏳'}</span>
          <span className="flex-1">
            {locationStatus === 'granted'
              ? `Location active (${locationRef.current?.latitude.toFixed(4)}, ${locationRef.current?.longitude.toFixed(4)})`
              : locationStatus === 'denied'
                ? 'Location blocked — enable in browser settings'
                : locationStatus === 'unavailable'
                  ? 'Location unavailable on this device'
                  : 'Requesting location...'}
          </span>
          {(locationStatus === 'denied' || locationStatus === 'unavailable') && (
            <button onClick={requestLocation} className="px-2.5 py-1 bg-white rounded-lg border border-current/20 text-xs font-bold hover:bg-slate-50 transition-colors">
              Retry
            </button>
          )}
        </div>

        {/* ===== ACTION BUTTON ===== */}
        <div className="flex gap-3">
          <button
            onClick={startScanning}
            className="flex-1 sm:flex-none bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3.5 sm:py-3 px-6 rounded-xl shadow-lg shadow-purple-200 active:scale-[0.98] transition-all text-sm sm:text-base"
          >
            📷 Scan Staff QR
          </button>
          <Link
            href="/admin/staff-reports"
            className="flex-1 sm:flex-none flex items-center justify-center bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-3.5 sm:py-3 px-6 rounded-xl shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all text-sm sm:text-base"
          >
            📈 Staff Reports
          </Link>
        </div>

        {/* ===== STAFF ROSTER ===== */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-700">Staff Roster</h2>
            <span className="text-xs text-slate-400">{checkedInCount}/{totalStaff} checked in</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {staffList.map(staff => {
              const record = getStaffRecord(staff.id)
              const status = record?.status || 'NOT_RECORDED'

              return (
                <div
                  key={staff.id}
                  className={`card p-3 sm:p-4 transition-all duration-300 ${
                    status === 'PRESENT' ? 'border-emerald-300 bg-emerald-50/50' :
                    status === 'LATE' ? 'border-amber-300 bg-amber-50/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center overflow-hidden text-sm font-bold shrink-0 ${
                      status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300' :
                      status === 'LATE' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {staff.photo ? (
                        <img src={staff.photo} alt={staff.name} className="w-full h-full object-cover" />
                      ) : (
                        staff.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-800 truncate text-sm">{staff.name}</h3>
                      <p className="text-xs text-slate-400 truncate">
                        {staff.role === 'ADMIN' ? '🛡️' : '👨‍🏫'} {staff.role} · {staff.email}
                      </p>
                    </div>
                    {status === 'PRESENT' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-emerald-100 text-emerald-800">Present</span>}
                    {status === 'LATE' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-amber-100 text-amber-800">Late</span>}
                    {status === 'NOT_RECORDED' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-slate-100 text-slate-600">—</span>}
                  </div>
                  {record && (
                    <div className="mt-2 flex gap-2 text-[11px] text-slate-500">
                      {record.checkInTime && <span>📥 {new Date(record.checkInTime).toLocaleTimeString()}</span>}
                      {record.checkOutTime && <span>📤 {new Date(record.checkOutTime).toLocaleTimeString()}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {staffList.length === 0 && (
            <div className="card p-12">
              <div className="text-center text-slate-400">
                <p className="text-5xl mb-3">👔</p>
                <p className="font-semibold text-slate-600">No staff found</p>
                <p className="text-sm text-slate-400 mt-1">Teachers and admins will appear here.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
