"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import AuthGuard from '../../../components/AuthGuard'
import Sidebar from '../../../components/Sidebar'
import { wattamanNav } from '../../../lib/wattaman-nav'
import { apiFetch } from '../../../lib/api'

interface ScanResult {
  action: string
  studentId: string
  studentName: string
  studentPhoto: string | null
  className: string
  status: string
  session: number
  checkInTime: string | null
  message?: string
}

function WattamanScanContent() {
  const [scanning, setScanning] = useState(false)
  const [message, setMessage] = useState('')
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [allCameras, setAllCameras] = useState<MediaDeviceInfo[]>([])
  const [currentCamIdx, setCurrentCamIdx] = useState(0)
  const [cameraLabel, setCameraLabel] = useState('')
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const allCamerasRef = useRef<MediaDeviceInfo[]>([])
  const currentCamIdxRef = useRef(0)
  const lockRef = useRef(false)
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // GPS
  useEffect(() => {
    if (!('geolocation' in navigator)) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => { locationRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude } },
      () => { locationRef.current = null },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  const playSound = useCallback((type: 'success' | 'error') => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        osc.frequency.setValueAtTime(1108, ctx.currentTime + 0.1)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.3)
      } else {
        osc.frequency.setValueAtTime(330, ctx.currentTime)
        osc.frequency.setValueAtTime(220, ctx.currentTime + 0.15)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
      }
    } catch { /* audio not supported */ }
  }, [])

  const handleQrScanned = useCallback(async (qrData: string) => {
    if (lockRef.current) return
    lockRef.current = true

    // Extract studentId/userId from JSON QR if needed
    let resolvedQr = qrData
    try {
      const parsed = JSON.parse(qrData)
      if (parsed.staffId) {
        // Staff/officer card — not supported in Wattaman student scan
        playSound('error')
        setMessage('⚠️ Staff card detected — please scan a student ID card')
        if ('vibrate' in navigator) navigator.vibrate([100, 100, 100])
        setTimeout(() => { setMessage(''); lockRef.current = false }, 3000)
        return
      }
      if (parsed.studentId) resolvedQr = parsed.studentId
      else if (parsed.userId) resolvedQr = parsed.userId
    } catch { /* raw string QR */ }

    const loc = locationRef.current
    try {
      const res = await apiFetch('/api/attendance/wattaman/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrData: resolvedQr,
          ...(loc ? { latitude: loc.latitude, longitude: loc.longitude, location: `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}` } : {}),
        }),
      })
      if (res.ok) {
        const result: ScanResult = await res.json()
        playSound(result.action === 'DAY_OFF' ? 'error' : 'success')
        setLastResult(result)
        setScanHistory(prev => [result, ...prev].slice(0, 20))
        if ('vibrate' in navigator) navigator.vibrate(200)
        const statusLabel = result.status === 'LATE' ? 'late ⚠️' : result.status === 'DAY_OFF' ? 'day off' : 'present ✓'
        setMessage(`${result.studentName} — ${statusLabel} (${result.className})`)
        setTimeout(() => {
          setLastResult(null)
          setMessage('')
          lockRef.current = false
        }, 4000)
      } else {
        playSound('error')
        const err = await res.json().catch(() => ({}))
        setMessage(err.message || 'Student not found')
        if ('vibrate' in navigator) navigator.vibrate([100, 100, 100])
        setTimeout(() => { setMessage(''); lockRef.current = false }, 3000)
      }
    } catch {
      playSound('error')
      setMessage('Network error — check connection')
      setTimeout(() => { setMessage(''); lockRef.current = false }, 3000)
    }
  }, [playSound])

  // Camera init
  useEffect(() => {
    if (!scanning || !videoRef.current) return
    let cancelled = false
    const videoEl = videoRef.current
    const init = async () => {
      try {
        if (codeReaderRef.current) { codeReaderRef.current.reset(); codeReaderRef.current = null }
        videoEl.pause()
        if (videoEl.srcObject) {
          (videoEl.srcObject as MediaStream).getTracks().forEach(t => t.stop())
          videoEl.srcObject = null
        }
        await new Promise(r => setTimeout(r, 400))
        if (cancelled) return

        const reader = new BrowserMultiFormatReader()
        codeReaderRef.current = reader

        let cameras = allCamerasRef.current
        if (cameras.length === 0) {
          cameras = await reader.listVideoInputDevices()
          cameras.sort((a, b) => (/back|rear|environment|後/i.test(a.label) ? 0 : 1) - (/back|rear|environment|後/i.test(b.label) ? 0 : 1))
          allCamerasRef.current = cameras
          if (!cancelled) setAllCameras([...cameras])
        }
        if (cancelled) return

        const idx = currentCamIdxRef.current
        const deviceId = cameras[idx]?.deviceId ?? undefined
        if (!cancelled) setCameraLabel(cameras[idx]?.label || `Camera ${idx + 1}`)

        reader.timeBetweenDecodingAttempts = 150
        await reader.decodeFromVideoDevice(deviceId || null, videoEl, (result) => {
          if (cancelled || !result) return
          handleQrScanned(result.getText())
        })

        if (!cancelled) setMessage('Camera ready — scan student ID card')
      } catch (err: any) {
        if (cancelled) return
        if (err.name === 'NotAllowedError') setMessage('Camera access denied. Please allow camera permissions.')
        else if (err.name === 'NotFoundError') setMessage('No camera found on this device.')
        else setMessage('Failed to start camera. Please try again.')
        setScanning(false)
      }
    }
    init()
    return () => {
      cancelled = true
      if (codeReaderRef.current) { codeReaderRef.current.reset(); codeReaderRef.current = null }
      if (videoEl.srcObject) {
        (videoEl.srcObject as MediaStream).getTracks().forEach(t => t.stop())
        videoEl.srcObject = null
      }
    }
  }, [scanning, handleQrScanned, currentCamIdx])

  const stopScanning = () => {
    if (codeReaderRef.current) { codeReaderRef.current.reset(); codeReaderRef.current = null }
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }
    setScanning(false)
    setLastResult(null)
    setMessage('')
    lockRef.current = false
  }

  const switchCamera = useCallback(() => {
    const cameras = allCamerasRef.current
    if (cameras.length <= 1) return
    const next = (currentCamIdx + 1) % cameras.length
    currentCamIdxRef.current = next
    setCurrentCamIdx(next)
  }, [currentCamIdx])

  const statusColor = (status: string) => {
    if (status === 'PRESENT') return 'bg-emerald-500'
    if (status === 'LATE') return 'bg-amber-500'
    if (status === 'DAY_OFF') return 'bg-slate-400'
    return 'bg-red-500'
  }

  return (
    <div className="page-shell">
      <Sidebar title="Wattaman" subtitle="QR Attendance" navItems={wattamanNav} accentColor="emerald" bottomTabs={['/wattaman', '/wattaman/scan']} />
      <div className="page-content">
        <div className="h-14 lg:hidden" />

        {/* Fullscreen camera */}
        {scanning && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted />

            {/* Scanning overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 sm:w-72 sm:h-72 relative">
                  <div className="absolute inset-0 bg-black/0 rounded-2xl" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-teal-400 rounded-tl-2xl" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-teal-400 rounded-tr-2xl" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-teal-400 rounded-bl-2xl" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-teal-400 rounded-br-2xl" />
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent" style={{ animation: 'scanLine 2.5s ease-in-out infinite' }} />
                </div>
              </div>
            </div>

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2 bg-gradient-to-b from-black/70 to-transparent">
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500 text-white">📷 Wattaman Scan</div>
              </div>
              <div className="flex items-center gap-2">
                {allCameras.length > 1 && (
                  <button onClick={switchCamera} className="h-10 px-3 rounded-full bg-white/20 backdrop-blur-sm flex items-center gap-1.5 text-white text-xs active:scale-95 transition-transform">
                    🔄 <span className="max-w-[80px] truncate">{cameraLabel}</span>
                  </button>
                )}
                <button onClick={stopScanning} className="w-10 h-10 rounded-full bg-red-500/90 flex items-center justify-center text-white active:scale-95 transition-transform">✕</button>
              </div>
            </div>

            {/* Result card overlay */}
            {lastResult && (
              <div className="relative z-10 mx-4 mt-2">
                <div className="bg-white/95 backdrop-blur rounded-2xl p-4 shadow-xl flex items-center gap-3">
                  {lastResult.studentPhoto ? (
                    <img src={lastResult.studentPhoto} alt={lastResult.studentName} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl flex-shrink-0">👤</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{lastResult.studentName}</p>
                    <p className="text-xs text-slate-500 truncate">{lastResult.className}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white ${statusColor(lastResult.status)}`}>
                        {lastResult.status === 'LATE' ? '⚠️ LATE' : lastResult.status === 'DAY_OFF' ? '🌙 DAY OFF' : lastResult.action === 'ALREADY_RECORDED' ? '✓ ALREADY IN' : '✓ PRESENT'}
                      </span>
                      {lastResult.checkInTime && (
                        <span className="text-xs text-slate-400">
                          {new Date(lastResult.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom info */}
            <div className="relative z-10 mt-auto bg-gradient-to-t from-black/80 to-transparent px-4 pb-6 pt-8">
              {message && !lastResult && (
                <div className={`mb-3 px-4 py-2.5 rounded-xl text-sm font-medium text-center ${
                  message.includes('present') || message.includes('Camera ready')
                    ? 'bg-emerald-500/90 text-white'
                    : message.includes('late')
                    ? 'bg-amber-500/90 text-white'
                    : message.includes('not found') || message.includes('error') || message.includes('denied')
                    ? 'bg-red-500/90 text-white'
                    : 'bg-white/20 text-white backdrop-blur-sm'
                }`}>{message}</div>
              )}
              <p className="text-center text-white/60 text-xs">
                Point camera at student ID card QR code
              </p>
              <div className="mt-2 text-center text-white/50 text-xs">
                {scanHistory.length > 0 && `${scanHistory.length} scanned today`}
              </div>
            </div>
          </div>
        )}

        {/* Normal page */}
        <div className="page-header">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Scan Student Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">Scan any student ID card QR code to record attendance automatically</p>
        </div>

        <div className="page-body space-y-4">
          {/* Start scan button */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-4xl mx-auto mb-4">📷</div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Open QR Scanner</h2>
            <p className="text-sm text-slate-500 mb-4">No class selection needed. Scan any student and attendance is recorded automatically to their class.</p>
            <button
              onClick={() => { setScanning(true); setMessage('Initializing camera...') }}
              className="px-8 py-3 rounded-xl text-white font-semibold text-sm shadow-md active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              Start Scanning
            </button>
          </div>

          {/* Scan history */}
          {scanHistory.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-700 text-sm">Recent Scans</h3>
                <button onClick={() => setScanHistory([])} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
              </div>
              <div className="divide-y divide-slate-100">
                {scanHistory.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    {r.studentPhoto ? (
                      <img src={r.studentPhoto} alt={r.studentName} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-base flex-shrink-0">👤</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.studentName}</p>
                      <p className="text-xs text-slate-400 truncate">{r.className}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white ${statusColor(r.status)}`}>
                      {r.status === 'LATE' ? '⚠️ LATE' : r.action === 'ALREADY_RECORDED' ? '↩ IN' : r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function WattamanScanPage() {
  return (
    <AuthGuard allowedRoles={['WATTAMAN', 'ADMIN']}>
      <WattamanScanContent />
    </AuthGuard>
  )
}
