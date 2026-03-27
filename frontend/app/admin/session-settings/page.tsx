'use client'

import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import { adminNav } from '../../../lib/admin-nav'
import { apiFetch } from '../../../lib/api'

const SESSION_NAMES: Record<number, string> = {
  1: 'Morning 1',
  2: 'Morning 2',
  3: 'Afternoon 1',
  4: 'Afternoon 2',
}

interface SessionConfigItem {
  session: number
  type: string
  startTime: string
  endTime: string
}

const DEFAULT_CONFIGS: SessionConfigItem[] = [
  { session: 1, type: 'CHECK_IN', startTime: '07:00', endTime: '07:15' },
  { session: 2, type: 'CHECK_OUT', startTime: '12:00', endTime: '12:15' },
  { session: 3, type: 'CHECK_IN', startTime: '13:00', endTime: '13:15' },
  { session: 4, type: 'CHECK_OUT', startTime: '17:00', endTime: '17:15' },
]

const STAFF_DEFAULT_CONFIGS: SessionConfigItem[] = [
  { session: 1, type: 'CHECK_IN', startTime: '07:00', endTime: '07:30' },
  { session: 2, type: 'CHECK_OUT', startTime: '11:30', endTime: '12:00' },
  { session: 3, type: 'CHECK_IN', startTime: '13:00', endTime: '13:30' },
  { session: 4, type: 'CHECK_OUT', startTime: '17:00', endTime: '17:30' },
]

interface AttendancePreset {
  id: string
  name: string
  icon: string
  description: string
  color: string
  configs: SessionConfigItem[]
  visibleSessions: number[]
  sessionNames: Record<number, string>
}

const ATTENDANCE_PRESETS: AttendancePreset[] = [
  {
    id: 'full-day',
    name: 'Full Day',
    icon: '☀️',
    description: '7:00 AM – 5:00 PM (Morning + Afternoon)',
    color: 'indigo',
    visibleSessions: [1, 2, 3, 4],
    sessionNames: { 1: 'Morning Check-In', 2: 'Morning Check-Out', 3: 'Afternoon Check-In', 4: 'Afternoon Check-Out' },
    configs: [
      { session: 1, type: 'CHECK_IN', startTime: '07:00', endTime: '07:15' },
      { session: 2, type: 'CHECK_OUT', startTime: '12:00', endTime: '12:15' },
      { session: 3, type: 'CHECK_IN', startTime: '13:00', endTime: '13:15' },
      { session: 4, type: 'CHECK_OUT', startTime: '17:00', endTime: '17:15' },
    ],
  },
  {
    id: 'morning-only',
    name: 'Morning Only',
    icon: '🌅',
    description: '7:00 AM – 12:00 PM',
    color: 'amber',
    visibleSessions: [1, 2],
    sessionNames: { 1: 'Morning Check-In', 2: 'Morning Check-Out', 3: 'Session 3', 4: 'Session 4' },
    configs: [
      { session: 1, type: 'CHECK_IN', startTime: '07:00', endTime: '07:15' },
      { session: 2, type: 'CHECK_OUT', startTime: '11:45', endTime: '12:00' },
      { session: 3, type: 'CHECK_IN', startTime: '12:00', endTime: '12:00' },
      { session: 4, type: 'CHECK_OUT', startTime: '12:00', endTime: '12:00' },
    ],
  },
  {
    id: 'afternoon-only',
    name: 'Afternoon Only',
    icon: '🌤️',
    description: '1:00 PM – 5:30 PM',
    color: 'orange',
    visibleSessions: [3, 4],
    sessionNames: { 1: 'Session 1', 2: 'Session 2', 3: 'Afternoon Check-In', 4: 'Afternoon Check-Out' },
    configs: [
      { session: 1, type: 'CHECK_IN', startTime: '13:00', endTime: '13:00' },
      { session: 2, type: 'CHECK_OUT', startTime: '13:00', endTime: '13:00' },
      { session: 3, type: 'CHECK_IN', startTime: '13:00', endTime: '13:15' },
      { session: 4, type: 'CHECK_OUT', startTime: '17:15', endTime: '17:30' },
    ],
  },
  {
    id: 'evening',
    name: 'Evening',
    icon: '🌆',
    description: '6:00 PM – 9:00 PM',
    color: 'purple',
    visibleSessions: [1, 2],
    sessionNames: { 1: 'Evening Check-In', 2: 'Evening Check-Out', 3: 'Session 3', 4: 'Session 4' },
    configs: [
      { session: 1, type: 'CHECK_IN', startTime: '18:00', endTime: '18:15' },
      { session: 2, type: 'CHECK_OUT', startTime: '20:45', endTime: '21:00' },
      { session: 3, type: 'CHECK_IN', startTime: '21:00', endTime: '21:00' },
      { session: 4, type: 'CHECK_OUT', startTime: '21:00', endTime: '21:00' },
    ],
  },
  {
    id: 'night-shift',
    name: 'Night Shift',
    icon: '🌙',
    description: '6:00 PM – 6:00 AM (overnight)',
    color: 'slate',
    visibleSessions: [1, 2, 3, 4],
    sessionNames: { 1: 'Night Check-In', 2: 'Night Check-Out', 3: 'Early AM Check-In', 4: 'Early AM Check-Out' },
    configs: [
      { session: 1, type: 'CHECK_IN', startTime: '18:00', endTime: '18:15' },
      { session: 2, type: 'CHECK_OUT', startTime: '23:45', endTime: '23:59' },
      { session: 3, type: 'CHECK_IN', startTime: '00:00', endTime: '00:15' },
      { session: 4, type: 'CHECK_OUT', startTime: '05:45', endTime: '06:00' },
    ],
  },
]

const PRESET_COLORS: Record<string, string> = {
  indigo: 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100',
  amber: 'border-amber-300 bg-amber-50 hover:bg-amber-100',
  orange: 'border-orange-300 bg-orange-50 hover:bg-orange-100',
  purple: 'border-purple-300 bg-purple-50 hover:bg-purple-100',
  slate: 'border-slate-300 bg-slate-50 hover:bg-slate-100',
}

const PRESET_ICON_BG: Record<string, string> = {
  indigo: 'bg-indigo-100 text-indigo-700',
  amber: 'bg-amber-100 text-amber-700',
  orange: 'bg-orange-100 text-orange-700',
  purple: 'bg-purple-100 text-purple-700',
  slate: 'bg-slate-200 text-slate-700',
}

const PRESET_ACTIVE: Record<string, string> = {
  indigo: 'ring-2 ring-indigo-400 border-indigo-400',
  amber: 'ring-2 ring-amber-400 border-amber-400',
  orange: 'ring-2 ring-orange-400 border-orange-400',
  purple: 'ring-2 ring-purple-400 border-purple-400',
  slate: 'ring-2 ring-slate-400 border-slate-400',
}

export default function SessionSettingsPage() {
  const [activeTab, setActiveTab] = useState<'CLASS' | 'STAFF'>('CLASS')
  const [configs, setConfigs] = useState<SessionConfigItem[]>(DEFAULT_CONFIGS)
  const [staffConfigs, setStaffConfigs] = useState<SessionConfigItem[]>(STAFF_DEFAULT_CONFIGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<string>('custom')

  const detectPreset = (cfgs: SessionConfigItem[]): string => {
    for (const preset of ATTENDANCE_PRESETS) {
      const match = preset.configs.every(pc => {
        const c = cfgs.find(x => x.session === pc.session)
        return c && c.type === pc.type && c.startTime === pc.startTime && c.endTime === pc.endTime
      })
      if (match) return preset.id
    }
    return 'custom'
  }

  const applyPreset = (presetId: string) => {
    const preset = ATTENDANCE_PRESETS.find(p => p.id === presetId)
    if (!preset) return
    setConfigs(preset.configs.map(c => ({ ...c })))
    setSelectedPreset(presetId)
  }

  useEffect(() => {
    fetchAllConfigs()
  }, [])


  const fetchAllConfigs = async () => {
    try {
      const [classRes, staffRes] = await Promise.all([
        apiFetch('/api/session-config/global'),
        apiFetch('/api/session-config/staff'),
      ])
      if (classRes.ok) {
        const data = await classRes.json()
        if (data.length >= 4) {
          const loaded = data.slice(0, 4).map((d: any) => ({
            session: d.session, type: d.type, startTime: d.startTime, endTime: d.endTime,
          }))
          setConfigs(loaded)
          setSelectedPreset(detectPreset(loaded))
        }
      }
      if (staffRes.ok) {
        const data = await staffRes.json()
        if (data.length >= 4) {
          setStaffConfigs(data.slice(0, 4).map((d: any) => ({
            session: d.session, type: d.type, startTime: d.startTime, endTime: d.endTime,
          })))
        }
      }
    } catch (e) {
      console.error('Error fetching session configs:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const isStaff = activeTab === 'STAFF'
      const res = await apiFetch('/api/session-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
                  },
        body: JSON.stringify({
          classId: null,
          scope: isStaff ? 'STAFF' : 'CLASS',
          configs: isStaff ? staffConfigs : configs,
        }),
      })
      if (res.ok) {
        setMessage(`${isStaff ? 'Staff' : 'Class'} session time settings saved successfully!`)
      } else {
        setMessage('Failed to save settings.')
      }
    } catch {
      setMessage('Error saving settings.')
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 4000)
    }
  }

  const updateConfig = (session: number, field: keyof SessionConfigItem, value: string) => {
    if (activeTab === 'STAFF') {
      setStaffConfigs(prev =>
        prev.map(c => (c.session === session ? { ...c, [field]: value } : c)),
      )
    } else {
      setConfigs(prev => {
        const updated = prev.map(c => (c.session === session ? { ...c, [field]: value } : c))
        setSelectedPreset(detectPreset(updated))
        return updated
      })
    }
  }

  const currentConfigs = activeTab === 'STAFF' ? staffConfigs : configs
  const currentDefaults = activeTab === 'STAFF' ? STAFF_DEFAULT_CONFIGS : DEFAULT_CONFIGS

  // Determine which sessions to show based on active preset
  const activePreset = ATTENDANCE_PRESETS.find(p => p.id === selectedPreset)
  const visibleSessions = activeTab === 'CLASS' && activePreset ? activePreset.visibleSessions : [1, 2, 3, 4]
  const displayConfigs = currentConfigs.filter(cfg => visibleSessions.includes(cfg.session))
  const getSessionName = (session: number) => {
    if (activeTab === 'CLASS' && activePreset) return activePreset.sessionNames[session] || SESSION_NAMES[session]
    return SESSION_NAMES[session]
  }

  return (
    <div className="page-shell">
      <Sidebar title="Admin Panel" subtitle="SchoolSync" navItems={adminNav} accentColor="indigo" />
      <div className="page-content">
        <div className="h-14 lg:hidden" />
        <div className="page-header">
          <h1 className="text-2xl font-bold text-slate-800">Session Time Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure time windows for attendance sessions (Cambodia Time GMT+7).
          </p>
        </div>
        <div className="page-body space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('CLASS')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'CLASS'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              📖 Class Sessions
            </button>
            <button
              onClick={() => setActiveTab('STAFF')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'STAFF'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              👔 Staff Sessions
            </button>
          </div>

          {/* Description */}
          <div className="text-sm text-slate-500">
            {activeTab === 'CLASS'
              ? 'Configure global default time windows for student class attendance. Teachers can override these per-class.'
              : 'Configure time windows for staff check-in and check-out sessions.'}
          </div>

          {/* Attendance Format Presets — Class Sessions only */}
          {activeTab === 'CLASS' && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">📋 Quick Presets — Choose Attendance Format</h3>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                {ATTENDANCE_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className={`text-left rounded-xl border-2 p-3 transition-all ${PRESET_COLORS[preset.color]} ${
                      selectedPreset === preset.id ? PRESET_ACTIVE[preset.color] : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base mb-2 ${PRESET_ICON_BG[preset.color]}`}>
                      {preset.icon}
                    </div>
                    <div className="font-semibold text-sm text-slate-800">{preset.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{preset.description}</div>
                    {selectedPreset === preset.id && (
                      <div className="text-xs font-medium text-indigo-600 mt-1">✓ Active</div>
                    )}
                  </button>
                ))}
                {/* Custom option */}
                <button
                  onClick={() => setSelectedPreset('custom')}
                  className={`text-left rounded-xl border-2 p-3 transition-all border-slate-200 bg-white hover:bg-slate-50 ${
                    selectedPreset === 'custom' ? 'ring-2 ring-slate-400 border-slate-400' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base mb-2 bg-slate-100 text-slate-600">
                    🔧
                  </div>
                  <div className="font-semibold text-sm text-slate-800">Custom</div>
                  <div className="text-xs text-slate-500 mt-0.5">Set times manually</div>
                  {selectedPreset === 'custom' && (
                    <div className="text-xs font-medium text-indigo-600 mt-1">✓ Active</div>
                  )}
                </button>
              </div>
            </div>
          )}

          {message && (
            <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
              message.includes('success')
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {loading ? (
            <div className="card p-12">
              <div className="empty-state">
                <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm text-slate-500 mt-3">Loading settings…</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'CLASS' && visibleSessions.length < 4 && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-amber-50 text-amber-700 border border-amber-200">
                  <span>💡</span>
                  <span>Showing {visibleSessions.length} of 4 sessions. Hidden sessions are auto-configured by the preset.</span>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {displayConfigs.map(cfg => (
                  <div key={cfg.session} className="card p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shadow-sm ${
                        cfg.type === 'CHECK_IN'
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                          : 'bg-gradient-to-br from-blue-500 to-blue-600'
                      }`}>
                        {cfg.type === 'CHECK_IN' ? '📥' : '📤'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{getSessionName(cfg.session)}</h3>
                        <p className="text-xs text-slate-500">Session {cfg.session}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                        <select
                          value={cfg.type}
                          onChange={(e) => updateConfig(cfg.session, 'type', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        >
                          <option value="CHECK_IN">📥 Check-In</option>
                          <option value="CHECK_OUT">📤 Check-Out</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={cfg.startTime}
                            onChange={(e) => updateConfig(cfg.session, 'startTime', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">End Time</label>
                          <input
                            type="time"
                            value={cfg.endTime}
                            onChange={(e) => updateConfig(cfg.session, 'endTime', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary btn-lg"
                >
                  {saving ? 'Saving…' : `💾 Save ${activeTab === 'STAFF' ? 'Staff' : 'Class'} Settings`}
                </button>
                <button
                  onClick={() => {
                    if (activeTab === 'STAFF') {
                      setStaffConfigs(STAFF_DEFAULT_CONFIGS)
                    } else {
                      setConfigs(DEFAULT_CONFIGS)
                      setSelectedPreset(detectPreset(DEFAULT_CONFIGS))
                    }
                  }}
                  className="btn-ghost btn-lg"
                >
                  ↩ Reset to Default
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
