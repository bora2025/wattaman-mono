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
  const [flashSuccess, setFlashSuccess] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [scanCount, setScanCount] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const allCamerasRef = useRef<MediaDeviceInfo[]>([])
  const currentCamIdxRef = useRef(0)
  const lockRef = useRef(false)
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const torchTrackRef = useRef<MediaStreamTrack | null>(null)

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

  // Auto-start camera on mount
  useEffect(() => {
    setScanning(true)
    setMessage('Initializing camera...')
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
        setTimeout(() => { setMessage(''); lockRef.current = false }, 2000)
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
        if (result.action !== 'DAY_OFF') {
          setFlashSuccess(true)
          setScanCount(c => c + 1)
          setTimeout(() => setFlashSuccess(false), 400)
        }
        setLastResult(result)
        setScanHistory(prev => [result, ...prev].slice(0, 20))
        if ('vibrate' in navigator) navigator.vibrate(200)
        setTimeout(() => {
          setLastResult(null)
          setMessage('')
          lockRef.current = false
        }, 2500)
      } else {
        playSound('error')
        const err = await res.json().catch(() => ({}))
        setMessage(err.message || 'Student not found')
        if ('vibrate' in navigator) navigator.vibrate([100, 100, 100])
        setTimeout(() => { setMessage(''); lockRef.current = false }, 2000)
      }
    } catch {
      playSound('error')
      setMessage('Network error — check connection')
      setTimeout(() => { setMessage(''); lockRef.current = false }, 2000)
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

        reader.timeBetweenDecodingAttempts = 50
        await reader.decodeFromVideoDevice(deviceId || null, videoEl, (result) => {
          if (cancelled || !result) return
          handleQrScanned(result.getText())
        })

        // Detect torch support
        if (!cancelled && videoEl.srcObject) {
          const track = (videoEl.srcObject as MediaStream).getVideoTracks()[0]
          if (track) {
            const cap = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean }
            if (cap.torch) { setHasTorch(true); torchTrackRef.current = track }
          }
        }

        if (!cancelled) setMessage('')
      } catch (err: unknown) {
        if (cancelled) return
        const e = err as { name?: string }
        if (e?.name === 'NotAllowedError') setMessage('Camera access denied. Please allow camera permissions.')
        else if (e?.name === 'NotFoundError') setMessage('No camera found on this device.')
        else setMessage('Failed to start camera. Please try again.')
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
    setHasTorch(false)
    setTorchOn(false)
    torchTrackRef.current = null
  }

  const switchCamera = useCallback(() => {
    const cameras = allCamerasRef.current
    if (cameras.length <= 1) return
    const next = (currentCamIdx + 1) % cameras.length
    currentCamIdxRef.current = next
    setCurrentCamIdx(next)
  }, [currentCamIdx])

  const toggleTorch = useCallback(async () => {
    if (!torchTrackRef.current) return
    try {
      await torchTrackRef.current.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] })
      setTorchOn(v => !v)
    } catch { /* torch not supported */ }
  }, [torchOn])

  const statusColor = (status: string) => {
    if (status === 'PRESENT') return 'bg-emerald-500'
    if (status === 'LATE') return 'bg-amber-500'
    if (status === 'DAY_OFF') return 'bg-slate-400'
    return 'bg-red-500'
  }

  return (
    <div className="page-shell">
      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 0%; }
          50% { top: 100%; }
        }
        @keyframes flashSuccess {
          0% { opacity: 0.5; }
          100% { opacity: 0; }
        }
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <Sidebar title="Wattaman" subtitle="QR Attendance" navItems={wattamanNav} accentColor="emerald" bottomTabs={['/wattaman', '/wattaman/scan']} />
      <div className="page-content">
        <div className="h-14 lg:hidden" />

        {/* Fullscreen camera */}
        {scanning && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted />

            {/* Success flash */}
            {flashSuccess && (
              <div className="absolute inset-0 z-20 bg-emerald-400/40 pointer-events-none" style={{ animation: 'flashSuccess 0.4s ease-out forwards' }} />
            )}

            {/* Scanning overlay */}
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 sm:w-72 sm:h-72 relative">
                  <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-teal-400 rounded-tl-2xl" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-teal-400 rounded-tr-2xl" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-teal-400 rounded-bl-2xl" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-teal-400 rounded-br-2xl" />
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent drop-shadow-[0_0_6px_rgba(0,201,167,0.8)]" style={{ animation: 'scanLine 2s linear infinite' }} />
                </div>
              </div>
            </div>

            {/* Top bar */}
            <div className="relative z-20 flex items-center justify-between px-4 pt-4 pb-2 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white text-sm font-semibold">Wattaman Scan</span>
                {scanCount > 0 && (
                  <div className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-bold">{scanCount} scanned</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasTorch && (
                  <button onClick={toggleTorch} className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all active:scale-90 ${torchOn ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white'}`}>🔦</button>
                )}
                {allCameras.length > 1 && (
                  <button onClick={switchCamera} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-lg active:scale-90 transition-all">🔄</button>
                )}
                <button onClick={stopScanning} className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold active:scale-90 transition-all">✕</button>
              </div>
            </div>

            {/* Result card */}
            {lastResult && (
              <div className="relative z-20 mx-4 mt-2" style={{ animation: 'slideDown 0.25s ease-out' }}>
                <div className={`rounded-2xl p-4 shadow-xl flex items-center gap-3 backdrop-blur ${lastResult.status === 'LATE' ? 'bg-amber-50/95' : lastResult.status === 'DAY_OFF' ? 'bg-slate-100/95' : 'bg-emerald-50/95'}`}>
                  {lastResult.studentPhoto ? (
                    <img src={lastResult.studentPhoto} alt={lastResult.studentName} className="w-16 h-16 rounded-xl object-cover flex-shrink-0 ring-2 ring-white shadow-md" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center text-3xl flex-shrink-0 shadow-md">👤</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-base truncate">{lastResult.studentName}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{lastResult.className}</p>
                    {lastResult.session > 0 && <p className="text-xs text-slate-400">Session {lastResult.session}</p>}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${statusColor(lastResult.status)}`}>
                        {lastResult.status === 'LATE' ? '⚠️ LATE' : lastResult.status === 'DAY_OFF' ? '🌙 DAY OFF' : lastResult.action === 'ALREADY_RECORDED' ? '↩ ALREADY IN' : '✓ PRESENT'}
                      </span>
                      {lastResult.checkInTime && (
                        <span className="text-xs text-slate-400">{new Date(lastResult.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom info */}
            <div className="relative z-20 mt-auto bg-gradient-to-t from-black/85 to-transparent px-4 pb-8 pt-12">
              {message && !lastResult && (
                <div className={`mb-3 px-4 py-3 rounded-xl text-sm font-medium text-center ${
                  message.startsWith('⚠️ Staff') || message.includes('not found') || message.includes('error') || message.includes('denied') || message.includes('fail')
                    ? 'bg-red-500/90 text-white'
                    : message.includes('late') ? 'bg-amber-500/90 text-white'
                    : message.includes('present') ? 'bg-emerald-500/90 text-white'
                    : 'bg-black/50 text-white/90 backdrop-blur-sm'
                }`}>{message}</div>
              )}
              <p className="text-center text-white/60 text-xs">Aim at student ID card QR code</p>
            </div>
          </div>
        )}

        {/* Normal page */}
        <div className="page-header">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Scan Student Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">Scan any student ID card QR code — no class selection needed</p>
        </div>

        <div className="page-body space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
            <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center text-4xl mx-auto mb-4">📷</div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Open QR Scanner</h2>
            <p className="text-sm text-slate-500 mb-4">Camera opens automatically. Simply point at any student ID card.</p>
            <button
              onClick={() => { setScanning(true); setMessage('Initializing camera...') }}
              className="px-8 py-3 rounded-xl text-white font-semibold text-sm shadow-md active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg,#00C9A7,#00a88a)' }}
            >{scanning ? 'Scanner Active…' : 'Restart Scanner'}</button>
          </div>

          {scanHistory.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-700 text-sm">Recent Scans ({scanHistory.length})</h3>
                <button onClick={() => { setScanHistory([]); setScanCount(0) }} className="text-xs text-slate-400 hover:text-red-400 transition-colors">Clear</button>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {scanHistory.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    {r.studentPhoto ? (
                      <img src={r.studentPhoto} alt={r.studentName} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-lg flex-shrink-0">👤</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.studentName}</p>
                      <p className="text-xs text-slate-400 truncate">{r.className}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white flex-shrink-0 ${statusColor(r.status)}`}>
                      {r.status === 'LATE' ? '⚠️' : r.action === 'ALREADY_RECORDED' ? '↩' : '✓'} {r.status}
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
