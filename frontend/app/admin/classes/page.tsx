'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '../../../components/Sidebar';
import { adminNav } from '../../../lib/admin-nav';
import { apiFetch } from '../../../lib/api';

interface Class {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  teacher?: { name: string };
  schedule?: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface Student {
  id: string;
  studentNumber: string;
  name: string;
  email: string;
  phone: string;
  photo: string | null;
  sex: string | null;
}

interface SessionConfigItem {
  session: number;
  type: string;
  startTime: string;
  endTime: string;
}

const ATTENDANCE_PRESETS = [
  {
    id: 'global-default',
    name: 'Global Default',
    icon: '🌐',
    description: 'Inherits from Session Settings',
    color: 'slate',
    configs: [] as SessionConfigItem[],
  },
  {
    id: 'full-day',
    name: 'Full Day',
    icon: '☀️',
    description: '7:00 AM – 5:00 PM',
    color: 'indigo',
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
    description: '6:00 PM – 6:00 AM',
    color: 'slate',
    configs: [
      { session: 1, type: 'CHECK_IN', startTime: '18:00', endTime: '18:15' },
      { session: 2, type: 'CHECK_OUT', startTime: '23:45', endTime: '23:59' },
      { session: 3, type: 'CHECK_IN', startTime: '00:00', endTime: '00:15' },
      { session: 4, type: 'CHECK_OUT', startTime: '05:45', endTime: '06:00' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: '🔧',
    description: 'Set your own times',
    color: 'amber',
    configs: [
      { session: 1, type: 'CHECK_IN', startTime: '07:00', endTime: '07:15' },
      { session: 2, type: 'CHECK_OUT', startTime: '12:00', endTime: '12:15' },
      { session: 3, type: 'CHECK_IN', startTime: '13:00', endTime: '13:15' },
      { session: 4, type: 'CHECK_OUT', startTime: '17:00', endTime: '17:15' },
    ],
  },
];

const SESSION_LABELS: Record<number, string> = {
  1: 'Session 1 (Check-In)',
  2: 'Session 2 (Check-Out)',
  3: 'Session 3 (Check-In)',
  4: 'Session 4 (Check-Out)',
};

const DAYS_OF_WEEK = [
  { key: 'MON', label: 'Mon', full: 'Monday' },
  { key: 'TUE', label: 'Tue', full: 'Tuesday' },
  { key: 'WED', label: 'Wed', full: 'Wednesday' },
  { key: 'THU', label: 'Thu', full: 'Thursday' },
  { key: 'FRI', label: 'Fri', full: 'Friday' },
  { key: 'SAT', label: 'Sat', full: 'Saturday' },
  { key: 'SUN', label: 'Sun', full: 'Sunday' },
];

const DEFAULT_SCHEDULE: Record<string, string> = {
  MON: 'same', TUE: 'same', WED: 'same', THU: 'same', FRI: 'same', SAT: 'day-off', SUN: 'day-off',
};

const DAY_PRESETS = [
  { value: 'same', label: 'Same', icon: '📋', color: 'slate' },
  { value: 'day-off', label: 'Day Off', icon: '🚫', color: 'red' },
  { value: 'full-day', label: 'Full Day', icon: '☀️', color: 'indigo' },
  { value: 'morning-only', label: 'Morning', icon: '🌅', color: 'amber' },
  { value: 'afternoon-only', label: 'Afternoon', icon: '🌤️', color: 'orange' },
  { value: 'evening', label: 'Evening', icon: '🌆', color: 'purple' },
  { value: 'night-shift', label: 'Night', icon: '🌙', color: 'slate' },
];

const DAY_COLORS: Record<string, string> = {
  same: 'bg-slate-100 text-slate-600 border-slate-200',
  'day-off': 'bg-red-50 text-red-600 border-red-200',
  'full-day': 'bg-indigo-50 text-indigo-600 border-indigo-200',
  'morning-only': 'bg-amber-50 text-amber-600 border-amber-200',
  'afternoon-only': 'bg-orange-50 text-orange-600 border-orange-200',
  evening: 'bg-purple-50 text-purple-600 border-purple-200',
  'night-shift': 'bg-slate-100 text-slate-600 border-slate-300',
};

export default function ManageClasses() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({ name: '', subject: '', teacherId: '' });
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [newStudentForm, setNewStudentForm] = useState({ name: '', email: '', password: '', sex: '', photo: '' });
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<string | null>(null);
  const [editStudentData, setEditStudentData] = useState({ name: '', sex: '', phone: '', photo: '' });
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ total: number; success: number; errors: number; skipped: number; details: { row: number; id: string; name: string; email: string; status: string; error?: string }[] } | null>(null);
  const [selectedPreset, setSelectedPreset] = useState('global-default');
  const [classFormats, setClassFormats] = useState<Record<string, { preset: string; name: string; icon: string }>>({}); 
  const [customConfigs, setCustomConfigs] = useState<SessionConfigItem[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, string>>({ ...DEFAULT_SCHEDULE });
  const [showWeekly, setShowWeekly] = useState(false);
  useEffect(() => { fetchClasses(); fetchTeachers(); }, []);

  useEffect(() => {
    if (!formData || typeof formData.name === 'undefined') {
      setFormData({ name: '', subject: '', teacherId: '' });
    }
  }, [formData]);

  const detectPreset = (configs: any[]): string => {
    for (const preset of ATTENDANCE_PRESETS) {
      if (preset.id === 'global-default' || preset.id === 'custom' || preset.configs.length === 0) continue;
      const match = preset.configs.every((pc) => {
        const c = configs.find((x: any) => x.session === pc.session);
        return c && c.type === pc.type && c.startTime === pc.startTime && c.endTime === pc.endTime;
      });
      if (match) return preset.id;
    }
    return 'custom';
  };

  const updateCustomConfig = (session: number, field: 'type' | 'startTime' | 'endTime', value: string) => {
    setCustomConfigs(prev => prev.map(c => c.session === session ? { ...c, [field]: value } : c));
    setSelectedPreset('custom');
  };

  const fetchClassFormats = async (classList: Class[]) => {
    const formats: Record<string, { preset: string; name: string; icon: string }> = {};
    await Promise.all(classList.map(async (cls) => {
      try {
        const res = await apiFetch(`/api/session-config?classId=${encodeURIComponent(cls.id)}`);
        if (res.ok) {
          const configs = await res.json();
          if (configs.length > 0 && configs[0].classId === cls.id) {
            const detected = detectPreset(configs);
            const preset = ATTENDANCE_PRESETS.find(p => p.id === detected);
            formats[cls.id] = {
              preset: detected,
              name: preset?.name || 'Custom',
              icon: preset?.icon || '🔧',
            };
          }
        }
      } catch (err) { /* ignore */ }
    }));
    setClassFormats(formats);
  };

  const fetchClasses = async () => {
    try {
      const res = await apiFetch('/api/classes');
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
        fetchClassFormats(data);
      }
    } catch (err) { console.error('Failed to fetch classes'); }
  };

  const fetchTeachers = async () => {
    try {
      const res = await apiFetch('/api/auth/users?role=teacher');
      if (res.ok) setTeachers(await res.json());
    } catch (err) { console.error('Failed to fetch teachers'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingClass ? 'PUT' : 'POST';
      const url = editingClass ? `/api/classes/${editingClass.id}` : '/api/classes';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const savedClass = await res.json();
        // Save weekly schedule
        const scheduleJson = showWeekly ? JSON.stringify(weeklySchedule) : null;
        if (scheduleJson || editingClass) {
          await apiFetch(editingClass ? `/api/classes/${savedClass.id}` : `/api/classes/${savedClass.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schedule: scheduleJson }),
          });
        }
        const preset = ATTENDANCE_PRESETS.find(p => p.id === selectedPreset);
        if (selectedPreset === 'global-default') {
          if (editingClass) {
            await apiFetch(`/api/session-config?classId=${encodeURIComponent(savedClass.id)}`, {
              method: 'DELETE',
            });
          }
        } else if (customConfigs.length > 0) {
          await apiFetch('/api/session-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              classId: savedClass.id,
              scope: 'CLASS',
              configs: customConfigs,
            }),
          });
        }
        fetchClasses();
        setShowForm(false);
        setEditingClass(null);
        setFormData({ name: '', subject: '', teacherId: '' });
        setSelectedPreset('global-default');
        setCustomConfigs([]);
        setWeeklySchedule({ ...DEFAULT_SCHEDULE });
        setShowWeekly(false);
      }
    } catch (err) { console.error('Failed to save class'); }
  };

  const handleEdit = async (cls: Class) => {
    setEditingClass(cls);
    setFormData({ name: cls.name || '', subject: cls.subject || '', teacherId: cls.teacherId || '' });
    setShowForm(true);
    // Load weekly schedule
    if (cls.schedule) {
      try {
        const parsed = JSON.parse(cls.schedule);
        setWeeklySchedule(parsed);
        setShowWeekly(Object.values(parsed).some((v: any) => v !== 'same'));
      } catch {
        setWeeklySchedule({ ...DEFAULT_SCHEDULE });
        setShowWeekly(false);
      }
    } else {
      setWeeklySchedule({ ...DEFAULT_SCHEDULE });
      setShowWeekly(false);
    }
    try {
      const res = await apiFetch(`/api/session-config?classId=${encodeURIComponent(cls.id)}`);
      if (res.ok) {
        const configs = await res.json();
        if (configs.length > 0 && configs[0].classId === cls.id) {
          const loaded = configs.map((c: any) => ({ session: c.session, type: c.type, startTime: c.startTime, endTime: c.endTime }));
          const detected = detectPreset(configs);
          setSelectedPreset(detected);
          setCustomConfigs(loaded);
        } else {
          setSelectedPreset('global-default');
          setCustomConfigs([]);
        }
      }
    } catch (err) {
      setSelectedPreset('global-default');
      setCustomConfigs([]);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this class?')) {
      try {
        const res = await apiFetch(`/api/classes/${id}`, { method: 'DELETE' });
        if (res.ok) fetchClasses();
      } catch (err) { console.error('Failed to delete class'); }
    }
  };

  const handleManageStudents = async (cls: Class) => {
    setSelectedClass(cls);
    setNewStudentForm({ name: '', email: '', password: '', sex: '', photo: '' });
    setShowAddStudentForm(false);
    await fetchClassStudents(cls.id);
    await fetchAvailableStudents(cls.id);
    setShowStudentModal(true);
  };

  const fetchClassStudents = async (classId: string) => {
    try {
      const res = await apiFetch(`/api/classes/${classId}/students`);
      if (res.ok) setClassStudents(await res.json());
    } catch (err) { console.error('Failed to fetch class students'); }
  };

  const fetchAvailableStudents = async (classId: string) => {
    try {
      const res = await apiFetch(`/api/classes/${classId}/available-students`);
      if (res.ok) setAvailableStudents(await res.json());
    } catch (err) { console.error('Failed to fetch available students'); }
  };

  const handleAddStudent = async (studentId: string) => {
    if (!selectedClass) return;
    try {
      const res = await apiFetch(`/api/classes/${selectedClass.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      if (res.ok) {
        await fetchClassStudents(selectedClass.id);
        await fetchAvailableStudents(selectedClass.id);
      }
    } catch (err) { console.error('Failed to add student'); }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedClass) return;
    try {
      const res = await apiFetch(`/api/classes/${selectedClass.id}/students/${studentId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchClassStudents(selectedClass.id);
        await fetchAvailableStudents(selectedClass.id);
      }
    } catch (err) { console.error('Failed to remove student'); }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student.id);
    setEditStudentData({ name: student.name || '', sex: student.sex || '', phone: student.phone || '', photo: student.photo || '' });
  };

  const handleSaveStudent = async (studentId: string) => {
    if (!selectedClass) return;
    try {
      const res = await apiFetch(`/api/classes/${selectedClass.id}/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editStudentData),
      });
      if (res.ok) {
        setEditingStudent(null);
        await fetchClassStudents(selectedClass.id);
      }
    } catch (err) { console.error('Failed to update student'); }
  };

  const handleAddNewStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    try {
      const registerRes = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
                  },
        body: JSON.stringify({ ...newStudentForm, role: 'STUDENT' }),
      });
      if (registerRes.ok) {
        const newStudent = await registerRes.json();
        const addRes = await apiFetch(`/api/classes/${selectedClass.id}/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: newStudent.user.id }),
        });
        if (addRes.ok) {
          const addedStudent = await addRes.json();
          if (newStudentForm.sex || newStudentForm.photo) {
            const studentId = addedStudent.id || addedStudent.student?.id;
            if (studentId) {
              await apiFetch(`/api/classes/${selectedClass.id}/students/${studentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...(newStudentForm.sex ? { sex: newStudentForm.sex } : {}),
                  ...(newStudentForm.photo ? { photo: newStudentForm.photo } : {}),
                }),
              });
            }
          }
          setNewStudentForm({ name: '', email: '', password: '', sex: '', photo: '' });
          setShowAddStudentForm(false);
          await fetchClassStudents(selectedClass.id);
          await fetchAvailableStudents(selectedClass.id);
        } else {
          const errorData = await addRes.json();
          alert(`Failed to add student to class: ${errorData.message || 'Unknown error'}`);
        }
      } else {
        const errorData = await registerRes.json();
        alert(`Failed to register student: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert('Failed to add new student. Please try again.');
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClass) return;

    setCsvUploading(true);
    setCsvResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiFetch(`/api/classes/${selectedClass.id}/students/bulk-csv`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        setCsvResult(result);
        await fetchClassStudents(selectedClass.id);
        await fetchAvailableStudents(selectedClass.id);
      } else {
        const errorData = await res.json();
        alert(`CSV upload failed: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert('CSV upload failed. Please try again.');
    } finally {
      setCsvUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="page-shell">
      <Sidebar title="Admin Panel" subtitle="SchoolSync" navItems={adminNav} accentColor="indigo" />
      <div className="page-content">
        <div className="h-14 lg:hidden" />
        <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Manage Classes</h1>
            <p className="text-sm text-slate-500 mt-1">{classes.length} class{classes.length !== 1 ? 'es' : ''} total</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditingClass(null); setFormData({ name: '', subject: '', teacherId: '' }); setSelectedPreset('global-default'); setCustomConfigs([]); setWeeklySchedule({ ...DEFAULT_SCHEDULE }); setShowWeekly(false); }} className="btn-primary">
            + Add Class
          </button>
        </div>

        <div className="page-body space-y-6">
          {/* Class Form */}
          {showForm && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {editingClass ? 'Edit Class' : 'New Class'}
              </h3>
              <form onSubmit={handleSubmit} className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Subject</label>
                  <input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Teacher</label>
                  <select value={formData.teacherId} onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })} required>
                    <option value="">Select teacher...</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                {/* Attendance Format */}
                <div className="sm:col-span-3">
                  <label className="form-label">Attendance Format</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-1">
                    {ATTENDANCE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedPreset(preset.id);
                          if (preset.id === 'custom') {
                            // Start with full-day defaults for custom editing
                            const fullDay = ATTENDANCE_PRESETS.find(p => p.id === 'full-day')!;
                            setCustomConfigs(fullDay.configs.map(c => ({ ...c })));
                          } else if (preset.id !== 'global-default' && preset.configs.length > 0) {
                            setCustomConfigs(preset.configs.map(c => ({ ...c })));
                          } else {
                            setCustomConfigs([]);
                          }
                        }}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          selectedPreset === preset.id
                            ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xl mb-1">{preset.icon}</div>
                        <div className="text-xs font-semibold text-slate-700">{preset.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{preset.description}</div>
                      </button>
                    ))}
                  </div>
                  {/* Editable session times — shown for any non-global selection */}
                  {selectedPreset !== 'global-default' && customConfigs.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {selectedPreset === 'custom' && (
                        <p className="text-xs text-amber-600 font-medium">🔧 Custom — times have been modified from preset</p>
                      )}
                      {customConfigs.map(cfg => {
                        const enabled = cfg.startTime !== cfg.endTime;
                        return (
                          <div key={cfg.session} className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border ${
                            !enabled ? 'bg-slate-50 border-slate-200 opacity-50' : 'bg-white border-slate-200'
                          }`}>
                            <div className="flex items-center gap-2 min-w-[180px]">
                              <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => {
                                  if (!e.target.checked) {
                                    updateCustomConfig(cfg.session, 'endTime', cfg.startTime);
                                  } else {
                                    const defaults = ATTENDANCE_PRESETS.find(p => p.id === 'full-day')!.configs;
                                    const d = defaults.find(x => x.session === cfg.session)!;
                                    setCustomConfigs(prev => prev.map(c => c.session === cfg.session ? { ...c, startTime: d.startTime, endTime: d.endTime } : c));
                                    setSelectedPreset('custom');
                                  }
                                }}
                                className="rounded border-slate-300"
                              />
                              <span className="text-sm font-medium text-slate-700">{SESSION_LABELS[cfg.session]}</span>
                            </div>
                            <select
                              value={cfg.type}
                              onChange={(e) => updateCustomConfig(cfg.session, 'type', e.target.value)}
                              disabled={!enabled}
                              className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white"
                            >
                              <option value="CHECK_IN">CHECK_IN</option>
                              <option value="CHECK_OUT">CHECK_OUT</option>
                            </select>
                            <div className="flex items-center gap-1">
                              <label className="text-xs text-slate-500">Start</label>
                              <input
                                type="time"
                                value={cfg.startTime}
                                onChange={(e) => updateCustomConfig(cfg.session, 'startTime', e.target.value)}
                                disabled={!enabled}
                                className="text-xs px-2 py-1.5 rounded-lg border border-slate-200"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <label className="text-xs text-slate-500">End</label>
                              <input
                                type="time"
                                value={cfg.endTime}
                                onChange={(e) => updateCustomConfig(cfg.session, 'endTime', e.target.value)}
                                disabled={!enabled}
                                className="text-xs px-2 py-1.5 rounded-lg border border-slate-200"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Weekly Schedule Calendar */}
                <div className="sm:col-span-3">
                  <div className="flex items-center gap-3 mb-2">
                    <label className="form-label mb-0">Weekly Schedule</label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showWeekly}
                        onChange={(e) => {
                          setShowWeekly(e.target.checked);
                          if (!e.target.checked) setWeeklySchedule({ ...DEFAULT_SCHEDULE });
                        }}
                        className="rounded border-slate-300"
                      />
                      <span className="text-xs text-slate-500">Different format per day</span>
                    </label>
                  </div>
                  {!showWeekly ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400">Same attendance format every day. Enable checkbox above or pick a quick preset:</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-slate-400 self-center mr-1">Quick:</span>
                        <button type="button" onClick={() => { setShowWeekly(true); setWeeklySchedule({ MON: 'same', TUE: 'same', WED: 'same', THU: 'same', FRI: 'same', SAT: 'day-off', SUN: 'day-off' }); }}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                          Mon–Fri / Sat–Sun Off
                        </button>
                        <button type="button" onClick={() => { setShowWeekly(true); setWeeklySchedule({ MON: 'same', TUE: 'same', WED: 'same', THU: 'same', FRI: 'same', SAT: 'same', SUN: 'day-off' }); }}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                          Mon–Sat / Sun Off
                        </button>
                        <button type="button" onClick={() => { setShowWeekly(true); setWeeklySchedule({ MON: 'same', TUE: 'same', WED: 'same', THU: 'same', FRI: 'same', SAT: 'morning-only', SUN: 'day-off' }); }}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                          Mon–Fri Full / Sat Morning
                        </button>
                        <button type="button" onClick={() => { setShowWeekly(true); setWeeklySchedule({ MON: 'day-off', TUE: 'day-off', WED: 'day-off', THU: 'day-off', FRI: 'day-off', SAT: 'same', SUN: 'same' }); }}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors">
                          Weekend Only (Sat–Sun)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-7 gap-1.5">
                        {DAYS_OF_WEEK.map(day => {
                          const val = weeklySchedule[day.key] || 'same';
                          const opt = DAY_PRESETS.find(p => p.value === val);
                          return (
                            <div key={day.key} className="text-center">
                              <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">{day.label}</div>
                              <button
                                type="button"
                                onClick={() => {
                                  const options = DAY_PRESETS.map(p => p.value);
                                  const idx = options.indexOf(val);
                                  const next = options[(idx + 1) % options.length];
                                  setWeeklySchedule(prev => ({ ...prev, [day.key]: next }));
                                }}
                                className={`w-full p-2 rounded-xl border-2 transition-all hover:scale-105 ${DAY_COLORS[val] || 'bg-slate-100 text-slate-600 border-slate-200'}`}
                              >
                                <div className="text-lg">{opt?.icon || '📋'}</div>
                                <div className="text-[9px] font-semibold mt-0.5 leading-tight">{opt?.label || 'Same'}</div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      {/* Quick actions */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-slate-400 self-center mr-1">Quick:</span>
                        <button type="button" onClick={() => setWeeklySchedule({ MON: 'same', TUE: 'same', WED: 'same', THU: 'same', FRI: 'same', SAT: 'day-off', SUN: 'day-off' })}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                          Mon–Fri / Sat–Sun Off
                        </button>
                        <button type="button" onClick={() => setWeeklySchedule({ MON: 'same', TUE: 'same', WED: 'same', THU: 'same', FRI: 'same', SAT: 'same', SUN: 'day-off' })}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                          Mon–Sat / Sun Off
                        </button>
                        <button type="button" onClick={() => setWeeklySchedule({ MON: 'same', TUE: 'same', WED: 'same', THU: 'same', FRI: 'same', SAT: 'morning-only', SUN: 'day-off' })}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                          Mon–Fri Full / Sat Morning
                        </button>
                        <button type="button" onClick={() => setWeeklySchedule({ MON: 'day-off', TUE: 'day-off', WED: 'day-off', THU: 'day-off', FRI: 'day-off', SAT: 'same', SUN: 'same' })}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors">
                          Weekend Only (Sat–Sun)
                        </button>
                        <button type="button" onClick={() => {
                            const all: Record<string, string> = {};
                            DAYS_OF_WEEK.forEach(d => all[d.key] = 'same');
                            setWeeklySchedule(all);
                          }}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                          All Same
                        </button>
                      </div>
                      {/* Legend */}
                      <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                        {DAY_PRESETS.map(p => (
                          <span key={p.value} className="inline-flex items-center gap-0.5">{p.icon} {p.label}</span>
                        ))}
                        <span className="text-slate-300 ml-1">Click day to cycle</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="sm:col-span-3 flex gap-2">
                  <button type="submit" className="btn-primary">{editingClass ? 'Update Class' : 'Create Class'}</button>
                  <button type="button" onClick={() => { setShowForm(false); setEditingClass(null); setSelectedPreset('global-default'); setCustomConfigs([]); setWeeklySchedule({ ...DEFAULT_SCHEDULE }); setShowWeekly(false); }} className="btn-ghost">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Student Modal */}
          {showStudentModal && selectedClass && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto">
              <div className="card w-full max-w-6xl shadow-xl">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Manage Students</h3>
                    <p className="text-sm text-slate-500">{selectedClass.name} &middot; {classStudents.length} student{classStudents.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button onClick={() => { setShowStudentModal(false); setShowAddStudentForm(false); setEditingStudent(null); setCsvResult(null); }} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Add New Student */}
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setShowAddStudentForm(!showAddStudentForm)} className={showAddStudentForm ? 'btn-ghost' : 'btn-success btn-sm'}>
                        {showAddStudentForm ? 'Cancel' : '+ Register New Student'}
                      </button>
                      <label className={`btn-primary btn-sm cursor-pointer inline-flex items-center gap-1 ${csvUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        📄 {csvUploading ? 'Uploading...' : 'Bulk Upload CSV'}
                        <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" disabled={csvUploading} />
                      </label>
                    </div>

                    {/* CSV Result */}
                    {csvResult && (
                      <div className="mt-3 card p-4 border-blue-200 bg-blue-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-semibold text-slate-700">CSV Upload Results</h5>
                          <button onClick={() => setCsvResult(null)} className="text-slate-400 hover:text-slate-600 text-xs">Dismiss</button>
                        </div>
                        <div className="flex gap-3 text-sm">
                          <span className="text-emerald-600 font-medium">✓ {csvResult.success} added</span>
                          {csvResult.errors > 0 && <span className="text-red-600 font-medium">✗ {csvResult.errors} errors</span>}
                          {csvResult.skipped > 0 && <span className="text-amber-600 font-medium">⚠ {csvResult.skipped} skipped</span>}
                        </div>
                        {csvResult.details.some(d => d.status !== 'success') && (
                          <div className="mt-2 max-h-32 overflow-y-auto text-xs space-y-1">
                            {csvResult.details.filter(d => d.status !== 'success').map((d, i) => (
                              <div key={i} className={`px-2 py-1 rounded ${d.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                Row {d.row} (#{d.id}): {d.name || 'unknown'} — {d.error}
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-slate-500">CSV format: ID, Name, Sex, Class, Mail Or Phone, Photo</p>
                      </div>
                    )}
                    {showAddStudentForm && (
                      <form onSubmit={handleAddNewStudent} className="mt-4 card p-4 border-emerald-200 bg-emerald-50/50 space-y-3">
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="form-label">Name</label>
                            <input type="text" value={newStudentForm.name} onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })} required />
                          </div>
                          <div>
                            <label className="form-label">Email</label>
                            <input type="email" value={newStudentForm.email} onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })} required />
                          </div>
                          <div>
                            <label className="form-label">Password</label>
                            <input type="password" value={newStudentForm.password} onChange={(e) => setNewStudentForm({ ...newStudentForm, password: e.target.value })} required />
                          </div>
                          <div>
                            <label className="form-label">Sex</label>
                            <select value={newStudentForm.sex} onChange={(e) => setNewStudentForm({ ...newStudentForm, sex: e.target.value })}>
                              <option value="">Select...</option>
                              <option value="MALE">Male</option>
                              <option value="FEMALE">Female</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="form-label">Photo URL</label>
                          <input type="text" value={newStudentForm.photo} onChange={(e) => setNewStudentForm({ ...newStudentForm, photo: e.target.value })} placeholder="https://example.com/photo.jpg" />
                        </div>
                        <button type="submit" className="btn-success">Add Student</button>
                      </form>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Available Students */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Available Students</h4>
                      <div className="card max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {availableStudents.length === 0 ? (
                          <div className="empty-state py-8"><p className="text-sm">No available students</p></div>
                        ) : (
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3">
                            {availableStudents.map((s) => (
                              <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-r border-slate-100">
                                <div className="avatar avatar-sm">
                                  {s.photo ? <img src={s.photo} alt={s.name} className="w-full h-full object-cover" /> : s.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                                  <p className="text-xs text-slate-500 truncate">{s.email}</p>
                                </div>
                                <button onClick={() => handleAddStudent(s.id)} className="btn-primary btn-sm">Add</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Class Students Table */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">
                        Class Students ({classStudents.length})
                      </h4>
                      <div className="card overflow-hidden">
                        <div className="max-h-[28rem] overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">ID</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Photo</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Sex</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Mail Or Phone</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {classStudents.length === 0 ? (
                                <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">No students yet</td></tr>
                              ) : (
                                classStudents.map((s, idx) => (
                                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-3 py-2 text-slate-500 font-mono text-xs">{s.studentNumber || String(idx + 1).padStart(4, '0')}</td>
                                    <td className="px-3 py-2">
                                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                                        {s.photo ? <img src={s.photo} alt={s.name} className="w-full h-full object-cover" /> : s.name.charAt(0).toUpperCase()}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 font-medium text-slate-800">{s.name}</td>
                                    <td className="px-3 py-2">
                                      {s.sex ? (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.sex === 'MALE' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                          {s.sex === 'MALE' ? '♂ ប្រុស' : '♀ ស្រី'}
                                        </span>
                                      ) : <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="px-3 py-2 text-slate-500 text-xs truncate max-w-[160px]">{s.phone || s.email}</td>
                                    <td className="px-3 py-2 text-right">
                                      <div className="flex justify-end gap-1">
                                        <button onClick={() => handleEditStudent(s)} className="btn-warning btn-sm">Edit</button>
                                        <button onClick={() => handleRemoveStudent(s.id)} className="btn-danger btn-sm">Remove</button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Edit Student Inline Panel */}
                  {editingStudent && (
                    <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-semibold text-amber-800">Edit Student</h5>
                        <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600 text-xs">Cancel</button>
                      </div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="form-label text-xs">Name</label>
                          <input type="text" value={editStudentData.name} onChange={(e) => setEditStudentData({ ...editStudentData, name: e.target.value })} placeholder="Student name" />
                        </div>
                        <div>
                          <label className="form-label text-xs">Sex</label>
                          <select value={editStudentData.sex} onChange={(e) => setEditStudentData({ ...editStudentData, sex: e.target.value })}>
                            <option value="">Select...</option>
                            <option value="MALE">ប្រុស (Male)</option>
                            <option value="FEMALE">ស្រី (Female)</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label text-xs">Mail Or Phone</label>
                          <input type="text" value={editStudentData.phone} onChange={(e) => setEditStudentData({ ...editStudentData, phone: e.target.value })} placeholder="Phone or email" />
                        </div>
                        <div>
                          <label className="form-label text-xs">Photo URL</label>
                          <input type="text" value={editStudentData.photo} onChange={(e) => setEditStudentData({ ...editStudentData, photo: e.target.value })} placeholder="https://..." />
                        </div>
                      </div>
                      {editStudentData.photo && (
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">Preview:</span>
                          <img src={editStudentData.photo} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveStudent(editingStudent)} className="btn-success btn-sm">Save Changes</button>
                        <button onClick={() => setEditingStudent(null)} className="btn-ghost btn-sm">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Classes Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <div key={cls.id} className="card-hover p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-lg shadow-sm">
                    📖
                  </div>
                </div>
                <h3 className="font-semibold text-slate-800 text-lg">{cls.name}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{cls.subject}</p>
                {cls.teacher && (
                  <p className="text-xs text-slate-400 mt-2">👤 {cls.teacher.name}</p>
                )}
                {classFormats[cls.id] ? (
                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                    {classFormats[cls.id].icon} {classFormats[cls.id].name}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                    🌐 Global Default
                  </span>
                )}
                {cls.schedule && (() => {
                  try {
                    const sched = JSON.parse(cls.schedule);
                    const hasDiff = Object.values(sched).some((v: any) => v !== 'same');
                    if (!hasDiff) return null;
                    return (
                      <div className="flex gap-0.5 mt-1.5">
                        {DAYS_OF_WEEK.map(day => {
                          const val = sched[day.key] || 'same';
                          const opt = DAY_PRESETS.find(p => p.value === val);
                          return (
                            <span key={day.key} title={`${day.full}: ${opt?.label || 'Same'}`}
                              className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] border ${DAY_COLORS[val] || 'bg-slate-100 border-slate-200'}`}>
                              {opt?.icon || '📋'}
                            </span>
                          );
                        })}
                      </div>
                    );
                  } catch { return null; }
                })()}
                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                  <Link href={`/admin/attendance?classId=${cls.id}`} className="btn-primary btn-sm flex-1 text-center">Attendance</Link>
                  <button onClick={() => handleEdit(cls)} className="btn-outline btn-sm flex-1">Edit</button>
                  <button onClick={() => handleManageStudents(cls)} className="btn-success btn-sm flex-1">Students</button>
                  <button onClick={() => handleDelete(cls.id)} className="btn-danger btn-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          {classes.length === 0 && (
            <div className="empty-state">
              <p className="text-lg mb-1">📖</p>
              <p className="font-medium">No classes yet</p>
              <p className="text-sm mt-1">Click &quot;Add Class&quot; to create your first class.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
