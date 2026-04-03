export const adminNav = [
  // Overview
  { label: 'nav.dashboard', href: '/admin', icon: '📊' },
  { label: 'nav.search', href: '/admin/search', icon: '🔍' },

  // People Management
  { label: 'nav.manageUsers', href: '/admin/users', icon: '👥' },
  { label: 'nav.manageOfficer', href: '/admin/employees', icon: '👔' },
  { label: 'nav.manageClasses', href: '/admin/classes', icon: '📖' },

  // Attendance
  { label: 'nav.takeAttendance', href: '/admin/attendance', icon: '📷' },
  { label: 'nav.officerAttendance', href: '/admin/staff-attendance', icon: '👔' },
  { label: 'nav.editAttendance', href: '/admin/attendance/edit', icon: '✏️' },
  { label: 'nav.editOfficerAttendance', href: '/admin/staff-attendance/edit', icon: '✏️' },

  // Reports
  { label: 'nav.studentReport', href: '/admin/reports', icon: '📈' },
  { label: 'nav.officerReport', href: '/admin/staff-reports', icon: '📊' },

  // ID Cards
  { label: 'nav.cardDesigner', href: '/admin/card-designer', icon: '🪪' },
  { label: 'nav.idCard', href: '/admin/qr-codes', icon: '🎫' },

  // Settings
  { label: 'nav.sessionSettings', href: '/admin/session-settings', icon: '⏰' },
  { label: 'nav.holidays', href: '/admin/holidays', icon: '📅' },
  { label: 'nav.settings', href: '/admin/settings', icon: '⚙️' },
]
