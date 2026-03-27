'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '../../components/AuthGuard';
import { apiFetch, getCurrentUser } from '../../lib/api';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  class: {
    name: string;
    subject: string;
  };
}

export default function StudentPortal() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAttendance(); }, []);

  const fetchAttendance = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      const res = await apiFetch(`/api/reports/student-attendance?userId=${user.userId}`);
      if (res.ok) setAttendance(await res.json());
    } catch (err) { console.error('Failed to fetch attendance'); }
    finally { setLoading(false); }
  };

  const downloadReport = () => {
    const csv = 'Date,Class,Subject,Status\n' +
      attendance.map(r => `${r.date},${r.class.name},${r.class.subject},${r.status}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance-report.csv';
    a.click();
  };

  const presentCount = attendance.filter(r => r.status === 'PRESENT').length;
  const rate = attendance.length > 0 ? ((presentCount / attendance.length) * 100).toFixed(0) : '--';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-slate-500 mt-3">Loading...</p>
      </div>
    </div>
  );

  return (
    <AuthGuard requiredRole="STUDENT">
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-sky-800 text-white">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Student Portal</h1>
                <p className="text-sky-200 text-sm mt-1">Your attendance history</p>
              </div>
              <Link href="/" className="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20 transition-colors">
                ← Home
              </Link>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-xs text-sky-200 uppercase tracking-wider">Total Records</p>
                <p className="text-2xl font-bold mt-1">{attendance.length}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-xs text-sky-200 uppercase tracking-wider">Present</p>
                <p className="text-2xl font-bold mt-1">{presentCount}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-xs text-sky-200 uppercase tracking-wider">Rate</p>
                <p className="text-2xl font-bold mt-1">{rate}%</p>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-5xl mx-auto px-6 py-6 space-y-4">
          {/* Actions */}
          <div className="flex justify-end">
            <button onClick={downloadReport} className="btn-primary btn-sm">
              📥 Download Report
            </button>
          </div>

          {/* Attendance List */}
          <div className="card divide-y divide-slate-100">
            {attendance.map((record) => (
              <div key={record.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  record.status === 'PRESENT' ? 'bg-emerald-500' :
                  record.status === 'ABSENT' ? 'bg-red-500' : 'bg-amber-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {record.class.name} — {record.class.subject}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className={
                  record.status === 'PRESENT' ? 'badge-green' :
                  record.status === 'ABSENT' ? 'badge-red' : 'badge-yellow'
                }>
                  {record.status.toLowerCase()}
                </span>
              </div>
            ))}
            {attendance.length === 0 && (
              <div className="empty-state py-12">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-semibold text-slate-600">No attendance records</p>
                <p className="text-sm text-slate-400 mt-1">Your records will appear here once attendance is taken.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}