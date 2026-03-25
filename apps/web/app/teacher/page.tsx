"use client"

import React from 'react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import AuthGuard from '../../components/AuthGuard'
import Sidebar from '../../components/Sidebar'
import { teacherNav } from '../../lib/teacher-nav'
import { apiFetch, getCurrentUser } from '../../lib/api'

interface Class {
  id: string
  name: string
  subject: string
  schedule: string | null
  teacher: {
    name: string
  }
}

export default function TeacherDashboard() {
  const [classes, setClasses] = useState<Class[]>([])
  const [teacherId, setTeacherId] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) setTeacherId(user.userId)
    })
  }, [])

  useEffect(() => {
    if (teacherId) fetchClasses()
  }, [teacherId])

  const fetchClasses = async () => {
    try {
      const res = await apiFetch(`/api/classes?teacherId=${teacherId}`)
      const data = await res.json()
      setClasses(data)
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  return (
    <AuthGuard requiredRole="TEACHER">
      <div className="page-shell">
        <Sidebar title="Teacher Portal" subtitle="SchoolSync" navItems={teacherNav} accentColor="emerald" />
        <div className="page-content">
          <div className="h-14 lg:hidden" />
          <div className="page-header">
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Welcome back! Manage your classes and attendance.</p>
          </div>

          <div className="page-body space-y-4 sm:space-y-6">
            {/* Quick Action — Staff Attendance (prominent on mobile) */}
            <Link href="/teacher/staff-attendance" className="block">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 sm:p-5 shadow-lg shadow-emerald-200/50 active:scale-[0.98] transition-transform">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl shrink-0">
                    👔
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg">Staff Attendance</h3>
                    <p className="text-white/80 text-sm mt-0.5">Scan QR to mark your attendance</p>
                  </div>
                  <div className="text-white/60 text-2xl shrink-0">→</div>
                </div>
              </div>
            </Link>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="stat-card">
                <p className="stat-label">My Classes</p>
                <p className="stat-value">{classes.length}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Today</p>
                <p className="stat-value text-base sm:text-lg">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
              </div>
            </div>

            {/* My Classes */}
            <div>
              <h2 className="text-lg font-semibold text-slate-700 mb-3 sm:mb-4">My Classes</h2>
              {classes.length === 0 ? (
                <div className="card p-8 sm:p-12">
                  <div className="empty-state">
                    <p className="text-5xl mb-3">📚</p>
                    <p className="font-semibold text-slate-600">No classes assigned</p>
                    <p className="text-sm text-slate-400 mt-1">Ask your admin to assign classes to you.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {classes.map(cls => (
                    <div key={cls.id} className="card-hover p-4 sm:p-5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-lg shadow-sm mb-3">
                        📖
                      </div>
                      <h3 className="font-semibold text-slate-800 text-base sm:text-lg">{cls.name}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{cls.subject}</p>
                      {cls.schedule && (
                        <p className="text-xs text-slate-400 mt-2">🕐 {cls.schedule}</p>
                      )}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <Link href={`/teacher/attendance?classId=${cls.id}`}>
                          <button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-3 sm:py-2.5 px-4 rounded-xl shadow-md shadow-emerald-200 active:scale-[0.98] transition-all text-sm">
                            📷 Take Attendance
                          </button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}