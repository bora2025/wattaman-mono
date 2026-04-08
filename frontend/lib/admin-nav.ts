export const adminNav = [
  // Overview
  { label: 'nav.dashboard', href: '/admin', icon: 'dashboard' },
  { label: 'nav.search', href: '/admin/search', icon: 'search' },

  // People Management
  { label: 'nav.manageUsers', href: '/admin/users', icon: 'users' },
  { label: 'nav.manageOfficer', href: '/admin/employees', icon: 'briefcase' },
  { label: 'nav.manageClasses', href: '/admin/classes', icon: 'book' },

  // Attendance
  { label: 'nav.takeAttendance', href: '/admin/attendance', icon: 'camera' },
  { label: 'nav.officerAttendance', href: '/admin/staff-attendance', icon: 'clipboard' },
  { label: 'nav.editAttendance', href: '/admin/attendance/edit', icon: 'edit' },
  { label: 'nav.editOfficerAttendance', href: '/admin/staff-attendance/edit', icon: 'edit' },

  // Reports
  { label: 'nav.studentReport', href: '/admin/reports', icon: 'chart' },
  { label: 'nav.officerReport', href: '/admin/staff-reports', icon: 'bar-chart' },

  // ID Cards
  { label: 'nav.cardDesigner', href: '/admin/card-designer', icon: 'design' },
  { label: 'nav.idCard', href: '/admin/qr-codes', icon: 'id-card' },

  // Settings
  { label: 'nav.sessionSettings', href: '/admin/session-settings', icon: 'clock' },
  { label: 'nav.holidays', href: '/admin/holidays', icon: 'holiday' },
  { label: 'nav.settings', href: '/admin/settings', icon: 'settings' },
]
