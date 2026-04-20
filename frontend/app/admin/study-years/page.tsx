'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sidebar from '../../../components/Sidebar'
import AuthGuard from '../../../components/AuthGuard'
import { adminNav } from '../../../lib/admin-nav'
import { apiFetch } from '../../../lib/api'
import { useLanguage } from '../../../lib/i18n'

interface StudyYear {
  id: string
  year: number
  label: string | null
  startDate: string | null
  endDate: string | null
  isCurrent: boolean
  _count: { classes: number }
}

export default function StudyYearsPage() {
  const { t } = useLanguage()
  const [studyYears, setStudyYears] = useState<StudyYear[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ year: new Date().getFullYear(), label: '', startDate: '', endDate: '' })
  const [message, setMessage] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')

  useEffect(() => { fetchStudyYears() }, [])

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage(text)
    setMsgType(type)
    setTimeout(() => setMessage(''), 3000)
  }

  const fetchStudyYears = async () => {
    try {
      const res = await apiFetch('/api/study-years')
      if (res.ok) setStudyYears(await res.json())
    } catch {}
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const body = {
        year: Number(formData.year),
        label: formData.label || `${formData.year}-${Number(formData.year) + 1}`,
        ...(formData.startDate && { startDate: formData.startDate }),
        ...(formData.endDate && { endDate: formData.endDate }),
      }

      const res = editingId
        ? await apiFetch(`/api/study-years/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await apiFetch('/api/study-years', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

      if (res.ok) {
        showMsg(editingId ? 'Study year updated' : 'Study year created')
        setShowForm(false)
        setEditingId(null)
        setFormData({ year: new Date().getFullYear(), label: '', startDate: '', endDate: '' })
        fetchStudyYears()
      } else {
        const err = await res.json()
        showMsg(err.message || 'Failed', 'error')
      }
    } catch {
      showMsg('Failed to save', 'error')
    }
  }

  const handleEdit = (sy: StudyYear) => {
    setEditingId(sy.id)
    setFormData({
      year: sy.year,
      label: sy.label || '',
      startDate: sy.startDate ? sy.startDate.split('T')[0] : '',
      endDate: sy.endDate ? sy.endDate.split('T')[0] : '',
    })
    setShowForm(true)
  }

  const handleSetCurrent = async (id: string) => {
    try {
      const res = await apiFetch(`/api/study-years/${id}/set-current`, { method: 'POST' })
      if (res.ok) {
        showMsg('Current study year updated')
        fetchStudyYears()
      }
    } catch {
      showMsg('Failed to set current', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this study year?')) return
    try {
      const res = await apiFetch(`/api/study-years/${id}`, { method: 'DELETE' })
      if (res.ok) {
        showMsg('Study year deleted')
        fetchStudyYears()
      } else {
        const err = await res.json()
        showMsg(err.message || 'Failed to delete', 'error')
      }
    } catch {
      showMsg('Failed to delete', 'error')
    }
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ year: new Date().getFullYear(), label: '', startDate: '', endDate: '' })
  }

  return (
    <AuthGuard requiredRole="ADMIN">
      <div className="page-shell">
        <Sidebar title="Admin Panel" subtitle="Wattanman" navItems={adminNav} accentColor="indigo" />
        <div className="page-content">
          <div className="h-14 lg:hidden" />
          <div className="page-header flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Study Years</h1>
              <p className="text-sm text-slate-500 mt-1">Manage academic study years. Create a study year first, then create classes under it.</p>
            </div>
            <button onClick={() => { cancelForm(); setShowForm(true) }} className="btn-primary text-sm px-4 py-2">
              + New Study Year
            </button>
          </div>

          <div className="page-body space-y-4">
            {message && (
              <div className={`px-4 py-3 rounded-lg text-sm font-medium ${msgType === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {message}
              </div>
            )}

            {/* Create/Edit Form */}
            {showForm && (
              <div className="card p-5">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">{editingId ? 'Edit Study Year' : 'New Study Year'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Year *</label>
                      <input
                        type="number"
                        value={formData.year}
                        onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                        className="input w-full"
                        min={2020}
                        max={2100}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                      <input
                        type="text"
                        value={formData.label}
                        onChange={e => setFormData({ ...formData, label: e.target.value })}
                        placeholder={`${formData.year}-${Number(formData.year) + 1}`}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                        className="input w-full"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary text-sm px-4 py-2">
                      {editingId ? 'Update' : 'Create'}
                    </button>
                    <button type="button" onClick={cancelForm} className="btn-outline text-sm px-4 py-2">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Study Years List */}
            {loading ? (
              <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : studyYears.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-3">📅</div>
                <h3 className="text-lg font-semibold text-slate-700">No Study Years</h3>
                <p className="text-sm text-slate-500 mt-1">Create your first study year to start managing classes.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {studyYears.map(sy => (
                  <div key={sy.id} className={`card p-5 relative ${sy.isCurrent ? 'ring-2 ring-indigo-500 bg-indigo-50/30' : ''}`}>
                    {sy.isCurrent && (
                      <span className="absolute top-3 right-3 text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
                        {sy.year.toString().slice(-2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 text-lg">{sy.label || sy.year}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {sy._count.classes} class{sy._count.classes !== 1 ? 'es' : ''}
                        </p>
                        {(sy.startDate || sy.endDate) && (
                          <p className="text-xs text-slate-400 mt-1">
                            {sy.startDate && new Date(sy.startDate).toLocaleDateString()}
                            {sy.startDate && sy.endDate && ' – '}
                            {sy.endDate && new Date(sy.endDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                      {!sy.isCurrent && (
                        <button onClick={() => handleSetCurrent(sy.id)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 transition-colors">
                          Set Current
                        </button>
                      )}
                      <Link href={`/admin/classes?studyYearId=${sy.id}`} className="text-xs text-slate-600 hover:text-slate-800 font-medium px-2 py-1 rounded hover:bg-slate-50 transition-colors">
                        View Classes
                      </Link>
                      <button onClick={() => handleEdit(sy)} className="text-xs text-slate-600 hover:text-slate-800 font-medium px-2 py-1 rounded hover:bg-slate-50 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(sy.id)} className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
