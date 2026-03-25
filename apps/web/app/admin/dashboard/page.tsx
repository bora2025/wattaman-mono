"use client"

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'
import Sidebar from '../../../components/Sidebar'
import AuthGuard from '../../../components/AuthGuard'
import { adminNav } from '../../../lib/admin-nav'
import { apiFetch } from '../../../lib/api'

interface Summary {
  total: number
  present: number
  absent: number
  late: number
  attendanceRate: number
}

interface ClassAttendance {
  className: string
  present: number
  absent: number
  total: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export default function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [classData, setClassData] = useState<ClassAttendance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const [summaryRes, classRes] = await Promise.all([
        apiFetch('/api/reports/attendance-summary'),
        apiFetch('/api/reports/class-attendance')
      ])

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json()
        setSummary(summaryData)
      }

      if (classRes.ok) {
        const classData = await classRes.json()
        setClassData(classData)
      }
    } catch (err) {
      console.error('Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8">Loading analytics...</div>

  const pieData = summary ? [
    { name: 'Present', value: summary.present, color: '#00C49F' },
    { name: 'Absent', value: summary.absent, color: '#FF8042' },
    { name: 'Late', value: summary.late, color: '#FFBB28' }
  ] : []

  return (
    <AuthGuard requiredRole="ADMIN">
      <div className="page-shell">
        <Sidebar title="Admin Panel" subtitle="SchoolSync" navItems={adminNav} accentColor="indigo" />
        <div className="page-content">
          <div className="h-14 lg:hidden" />
          <div className="page-header">
            <h1 className="text-2xl font-bold text-slate-800">Analytics Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Attendance overview and statistics</p>
          </div>
          <div className="page-body">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">T</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Students
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {summary.total}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">P</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Present Today
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {summary.present}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">A</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Absent Today
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {summary.absent}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-medium">%</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Attendance Rate
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {summary.attendanceRate.toFixed(1)}%
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pie Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Attendance</h3>
              <PieChart width={400} height={300}>
                <Pie
                  data={pieData}
                  cx={200}
                  cy={150}
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent ? (percent * 100).toFixed(0) : '0')}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </div>

            {/* Bar Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Class-wise Attendance</h3>
              <BarChart width={400} height={300} data={classData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="className" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill="#00C49F" name="Present" />
                <Bar dataKey="absent" fill="#FF8042" name="Absent" />
              </BarChart>
            </div>
          </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}