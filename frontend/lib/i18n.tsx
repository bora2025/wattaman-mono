'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

/* ───────── English translations ───────── */
const en: Record<string, string> = {
  // Navigation
  'nav.dashboard': 'Dashboard',
  'nav.search': 'Search',
  'nav.manageUsers': 'Manage Users',
  'nav.manageOfficer': 'Manage Officer',
  'nav.manageClasses': 'Manage Classes',
  'nav.takeAttendance': 'Take Attendance',
  'nav.officerAttendance': 'Officer Attendance',
  'nav.editAttendance': 'Edit Attendance',
  'nav.editOfficerAttendance': 'Edit Officer Attendance',
  'nav.studentReport': 'Student Report',
  'nav.officerReport': 'Officer Report',
  'nav.cardDesigner': 'Card Designer',
  'nav.idCard': 'ID Card',
  'nav.sessionSettings': 'Session Settings',
  'nav.holidays': 'Holidays',
  'nav.settings': 'Settings',
  'nav.myClasses': 'My Classes',
  'nav.staffAttendance': 'Staff Attendance',
  'nav.reports': 'Reports',
  'nav.staffReports': 'Staff Reports',
  'nav.scanAttendance': 'Scan Attendance',
  'nav.myReports': 'My Reports',
  'nav.myCard': 'My Card',

  // Common
  'common.backToHome': 'Back to Home',
  'common.logout': 'Logout',
  'common.loading': 'Loading...',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.add': 'Add',
  'common.close': 'Close',
  'common.search': 'Search',
  'common.noResults': 'No results found',
  'common.view': 'View',
  'common.download': 'Download',
  'common.all': 'All',
  'common.users': 'Users',
  'common.students': 'Students',
  'common.classes': 'Classes',
  'common.present': 'Present',
  'common.absent': 'Absent',
  'common.late': 'Late',
  'common.permission': 'Permission',
  'common.dayOff': 'Day Off',
  'common.email': 'Email',
  'common.phone': 'Phone',
  'common.password': 'Password',
  'common.name': 'Name',
  'common.role': 'Role',
  'common.class': 'Class',
  'common.address': 'Address',
  'common.dateOfBirth': 'Date of Birth',
  'common.sex': 'Sex',
  'common.male': 'Male',
  'common.female': 'Female',
  'common.department': 'Department',
  'common.position': 'Position',
  'common.joined': 'Joined',
  'common.showing': 'Showing',
  'common.result': 'result',
  'common.results': 'results',
  'common.signIn': 'Sign In',
  'common.openPortal': 'Open portal',

  // Roles
  'role.admin': 'Admin',
  'role.teacher': 'គ្រូ-Teacher',
  'role.student': 'Student',
  'role.parent': 'Parent',

  // Login
  'login.welcome': 'Welcome back',
  'login.subtitle': 'Sign in to your account',
  'login.signingIn': 'Signing in…',
  'login.invalidCredentials': 'Invalid email or password',
  'login.error': 'Something went wrong. Please try again.',
  'login.backToHome': '← Back to home',

  // Home
  'home.title': 'School Attendance System',
  'home.heroLine1': 'Simple attendance,',
  'home.heroLine2': 'better outcomes',
  'home.heroDesc': 'Scan QR codes, track attendance in real-time, and generate reports instantly. A modern system for schools that care.',
  'home.adminPortal': 'Admin Portal',
  'home.adminDesc': 'Manage users, classes, QR codes, and view analytics.',
  'home.teacherPortal': 'Teacher Portal',
  'home.teacherDesc': 'Take attendance, manage your classes, and view reports.',
  'home.studentPortal': 'Student Portal',
  'home.studentDesc': 'View your attendance history and download reports.',
  'home.employeePortal': 'Employee Portal',
  'home.employeeDesc': 'Scan QR code to check in, view attendance and reports.',
  'home.qrScan': 'QR Scan',
  'home.instantCheckIn': 'Instant check-in',
  'home.realTime': 'Real-time',
  'home.liveTracking': 'Live tracking',
  'home.reports': 'Reports',
  'home.csvAnalytics': 'CSV & analytics',
  'home.footer': '© 2026 Wattaman · Attendance Management System',

  // Admin Dashboard
  'admin.title': 'Dashboard',
  'admin.subtitle': "Welcome back! Here's your admin overview.",
  'admin.quickActions': 'Quick Actions',
  'admin.systemOnline': 'System Online',
  'admin.lastUpdated': 'Last updated',
  'admin.search': 'Search',
  'admin.searchDesc': 'Find students, teachers, and staff quickly.',
  'admin.manageUsers': 'Manage Users',
  'admin.manageUsersDesc': 'Add, edit, import/export users via CSV.',
  'admin.manageClasses': 'Manage Classes',
  'admin.manageClassesDesc': 'Create classes and assign students.',
  'admin.viewReports': 'View Reports',
  'admin.viewReportsDesc': 'Analytics and attendance summaries.',
  'admin.idCard': 'ID Card',
  'admin.idCardDesc': 'Create and download student ID cards.',
  'admin.editAttendance': 'Edit Attendance',
  'admin.editAttendanceDesc': 'Edit student attendance: present, absent, permission.',
  'admin.editStaffAttendance': 'Edit Staff Attendance',
  'admin.editStaffAttendanceDesc': 'Edit staff attendance: present, absent, permission.',
  'admin.auditLogs': 'Audit Logs',
  'admin.auditLogsDesc': 'Track who marked attendance and when.',
  'admin.notifications': 'Notifications',
  'admin.notificationsDesc': 'Configure email/SMS alerts for absences.',
  'admin.cardDesigner': 'Card Designer',
  'admin.cardDesignerDesc': 'Customize cards with logos, text, colors, and sizes.',

  // Search
  'search.title': 'Search Students & Staff',
  'search.subtitle': 'Find students, teachers, admins and parents quickly.',
  'search.placeholder': 'Search by name, email, or phone...',
  'search.searching': 'Searching...',
  'search.noResults': 'No results found',
  'search.noResultsHint': 'Try a different search term or filter.',
  'search.user': 'User',
  'search.classDept': 'Class / Dept',
  'search.profileDetails': 'Profile Details',
  'search.studentId': 'Student ID',
  'search.unassigned': 'Unassigned',
  'search.dailyAttendance': 'Daily Attendance',
  'search.noAttendanceData': 'No attendance data',

  // Teacher Dashboard
  'teacher.title': 'Dashboard',
  'teacher.subtitle': 'Welcome back! Manage your classes and attendance.',
  'teacher.staffAttendance': 'Staff Attendance',
  'teacher.staffAttendanceDesc': 'Scan QR to mark your attendance',
  'teacher.myClasses': 'My Classes',
  'teacher.today': 'Today',
  'teacher.noClasses': 'No classes assigned',
  'teacher.noClassesHint': 'Ask your admin to assign classes to you.',
  'teacher.takeAttendance': 'Take Attendance',

  // Student Portal
  'student.title': 'Student Portal',
  'student.subtitle': 'Your attendance history',
  'student.totalRecords': 'Total Records',
  'student.rate': 'Rate',
  'student.downloadReport': 'Download Report',
  'student.noRecords': 'No attendance records',

  // Employee Portal
  'employee.title': 'Dashboard',
  'employee.welcome': 'Welcome',
  'employee.scanNow': 'Scan Now',
  'employee.todayAttendance': "Today's Attendance",
  'employee.session1': 'Morning Check-In',
  'employee.session2': 'Morning Check-Out',
  'employee.session3': 'Afternoon Check-In',
  'employee.session4': 'Afternoon Check-Out',
  'employee.totalRecords': 'Total Records',
  'employee.myIdCard': 'My ID Card',
  'employee.attendanceHistory': 'Attendance History',
  'employee.noRecords': 'No records for this month',

  // Attendance status
  'status.present': '✓ Present',
  'status.late': '⏰ Late',
  'status.absent': '✗ Absent',
  'status.permission': '📋 Permission',
  'status.dayOff': '🚫 Day Off',

  // Sessions
  'session.1': 'Session 1',
  'session.2': 'Session 2',
  'session.3': 'Session 3',
  'session.4': 'Session 4',
}

/* ───────── Khmer translations ───────── */
const kh: Record<string, string> = {
  // Navigation
  'nav.dashboard': 'ផ្ទាំងគ្រប់គ្រង',
  'nav.search': 'ស្វែងរក',
  'nav.manageUsers': 'គ្រប់គ្រងអ្នកប្រើប្រាស់',
  'nav.manageOfficer': 'គ្រប់គ្រងមន្រ្តី',
  'nav.manageClasses': 'គ្រប់គ្រងថ្នាក់',
  'nav.takeAttendance': 'ចុះវត្តមាន',
  'nav.officerAttendance': 'វត្តមានមន្រ្តី',
  'nav.editAttendance': 'កែវត្តមាន',
  'nav.editOfficerAttendance': 'កែវត្តមានមន្រ្តី',
  'nav.studentReport': 'របាយការណ៍សិស្ស',
  'nav.officerReport': 'របាយការណ៍មន្រ្តី',
  'nav.cardDesigner': 'រចនាកាត',
  'nav.idCard': 'កាតសម្គាល់ខ្លួន',
  'nav.sessionSettings': 'កំណត់វគ្គ',
  'nav.holidays': 'ថ្ងៃឈប់សម្រាក',
  'nav.settings': 'ការកំណត់',
  'nav.myClasses': 'ថ្នាក់របស់ខ្ញុំ',
  'nav.staffAttendance': 'វត្តមានបុគ្គលិក',
  'nav.reports': 'របាយការណ៍',
  'nav.staffReports': 'របាយការណ៍បុគ្គលិក',
  'nav.scanAttendance': 'ស្កេនវត្តមាន',
  'nav.myReports': 'របាយការណ៍របស់ខ្ញុំ',
  'nav.myCard': 'កាតរបស់ខ្ញុំ',

  // Common
  'common.backToHome': 'ត្រឡប់ទៅទំព័រដើម',
  'common.logout': 'ចាកចេញ',
  'common.loading': 'កំពុងផ្ទុក...',
  'common.save': 'រក្សាទុក',
  'common.cancel': 'បោះបង់',
  'common.edit': 'កែសម្រួល',
  'common.delete': 'លុប',
  'common.add': 'បន្ថែម',
  'common.close': 'បិទ',
  'common.search': 'ស្វែងរក',
  'common.noResults': 'រកមិនឃើញលទ្ធផល',
  'common.view': 'មើល',
  'common.download': 'ទាញយក',
  'common.all': 'ទាំងអស់',
  'common.users': 'អ្នកប្រើប្រាស់',
  'common.students': 'សិស្ស',
  'common.classes': 'ថ្នាក់',
  'common.present': 'វត្តមាន',
  'common.absent': 'អវត្តមាន',
  'common.late': 'យឺត',
  'common.permission': 'សុំច្បាប់',
  'common.dayOff': 'ថ្ងៃឈប់',
  'common.email': 'អ៊ីមែល',
  'common.phone': 'ទូរស័ព្ទ',
  'common.password': 'ពាក្យសម្ងាត់',
  'common.name': 'ឈ្មោះ',
  'common.role': 'តួនាទី',
  'common.class': 'ថ្នាក់',
  'common.address': 'អាសយដ្ឋាន',
  'common.dateOfBirth': 'ថ្ងៃកំណើត',
  'common.sex': 'ភេទ',
  'common.male': 'ប្រុស',
  'common.female': 'ស្រី',
  'common.department': 'នាយកដ្ឋាន',
  'common.position': 'តួនាទី',
  'common.joined': 'ថ្ងៃចូលបម្រើការ',
  'common.showing': 'បង្ហាញ',
  'common.result': 'លទ្ធផល',
  'common.results': 'លទ្ធផល',
  'common.signIn': 'ចូល',
  'common.openPortal': 'បើកផ្ទាំង',

  // Roles
  'role.admin': 'អ្នកគ្រប់គ្រង',
  'role.teacher': 'គ្រូ',
  'role.student': 'សិស្ស',
  'role.parent': 'អាណាព្យាបាល',

  // Login
  'login.welcome': 'សូមស្វាគមន៍',
  'login.subtitle': 'ចូលគណនីរបស់អ្នក',
  'login.signingIn': 'កំពុងចូល...',
  'login.invalidCredentials': 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ',
  'login.error': 'មានបញ្ហាកើតឡើង សូមព្យាយាមម្តងទៀត។',
  'login.backToHome': '← ត្រឡប់ទៅទំព័រដើម',

  // Home
  'home.title': 'ប្រព័ន្ធវត្តមានសាលា',
  'home.heroLine1': 'វត្តមានងាយស្រួល',
  'home.heroLine2': 'លទ្ធផលប្រសើរ',
  'home.heroDesc': 'ស្កេនកូដ QR តាមដានវត្តមានក្នុងពេលជាក់ស្តែង និងបង្កើតរបាយការណ៍ភ្លាមៗ។ ប្រព័ន្ធទំនើបសម្រាប់សាលា។',
  'home.adminPortal': 'ផ្ទាំងអ្នកគ្រប់គ្រង',
  'home.adminDesc': 'គ្រប់គ្រងអ្នកប្រើប្រាស់ ថ្នាក់ កូដ QR និងមើលការវិភាគ។',
  'home.teacherPortal': 'ផ្ទាំងគ្រូ',
  'home.teacherDesc': 'ចុះវត្តមាន គ្រប់គ្រងថ្នាក់ និងមើលរបាយការណ៍។',
  'home.studentPortal': 'ផ្ទាំងសិស្ស',
  'home.studentDesc': 'មើលប្រវត្តិវត្តមាន និងទាញយករបាយការណ៍។',
  'home.employeePortal': 'ផ្ទាំងបុគ្គលិក',
  'home.employeeDesc': 'ស្កេនកូដ QR ដើម្បីចុះវត្តមាន មើលវត្តមាន និងរបាយការណ៍។',
  'home.qrScan': 'ស្កេន QR',
  'home.instantCheckIn': 'ចុះវត្តមានភ្លាមៗ',
  'home.realTime': 'ពេលជាក់ស្តែង',
  'home.liveTracking': 'តាមដានផ្ទាល់',
  'home.reports': 'របាយការណ៍',
  'home.csvAnalytics': 'CSV និងការវិភាគ',
  'home.footer': '© ២០២៦ វត្តមាន · ប្រព័ន្ធគ្រប់គ្រងវត្តមាន',

  // Admin Dashboard
  'admin.title': 'ផ្ទាំងគ្រប់គ្រង',
  'admin.subtitle': 'សូមស្វាគមន៍! នេះជាទិដ្ឋភាពទូទៅរបស់អ្នកគ្រប់គ្រង។',
  'admin.quickActions': 'សកម្មភាពរហ័ស',
  'admin.systemOnline': 'ប្រព័ន្ធដំណើរការ',
  'admin.lastUpdated': 'ធ្វើបច្ចុប្បន្នភាពចុងក្រោយ',
  'admin.search': 'ស្វែងរក',
  'admin.searchDesc': 'ស្វែងរកសិស្ស គ្រូ និងបុគ្គលិកយ៉ាងរហ័ស។',
  'admin.manageUsers': 'គ្រប់គ្រងអ្នកប្រើប្រាស់',
  'admin.manageUsersDesc': 'បន្ថែម កែ នាំចូល/នាំចេញអ្នកប្រើប្រាស់តាម CSV។',
  'admin.manageClasses': 'គ្រប់គ្រងថ្នាក់',
  'admin.manageClassesDesc': 'បង្កើតថ្នាក់ និងកំណត់សិស្ស។',
  'admin.viewReports': 'មើលរបាយការណ៍',
  'admin.viewReportsDesc': 'វិភាគ និងសង្ខេបវត្តមាន។',
  'admin.idCard': 'កាតសម្គាល់ខ្លួន',
  'admin.idCardDesc': 'បង្កើត និងទាញយកកាតសម្គាល់ខ្លួនសិស្ស។',
  'admin.editAttendance': 'កែវត្តមាន',
  'admin.editAttendanceDesc': 'កែវត្តមានសិស្ស៖ វត្តមាន អវត្តមាន សុំច្បាប់។',
  'admin.editStaffAttendance': 'កែវត្តមានបុគ្គលិក',
  'admin.editStaffAttendanceDesc': 'កែវត្តមានបុគ្គលិក៖ វត្តមាន អវត្តមាន សុំច្បាប់។',
  'admin.auditLogs': 'កំណត់ត្រាសវនកម្ម',
  'admin.auditLogsDesc': 'តាមដានអ្នកចុះវត្តមាន និងពេលវេលា។',
  'admin.notifications': 'ការជូនដំណឹង',
  'admin.notificationsDesc': 'កំណត់ការជូនដំណឹងតាមអ៊ីមែល/SMS សម្រាប់អវត្តមាន។',
  'admin.cardDesigner': 'រចនាកាត',
  'admin.cardDesignerDesc': 'ប្ដូរកាតតាមបំណង ជាមួយឡូហ្គោ អក្សរ ពណ៌ និងទំហំ។',

  // Search
  'search.title': 'ស្វែងរកសិស្ស និងបុគ្គលិក',
  'search.subtitle': 'ស្វែងរកសិស្ស គ្រូ អ្នកគ្រប់គ្រង និងអាណាព្យាបាលយ៉ាងរហ័ស។',
  'search.placeholder': 'ស្វែងរកតាមឈ្មោះ អ៊ីមែល ឬទូរស័ព្ទ...',
  'search.searching': 'កំពុងស្វែងរក...',
  'search.noResults': 'រកមិនឃើញលទ្ធផល',
  'search.noResultsHint': 'សូមព្យាយាមពាក្យស្វែងរក ឬតម្រងផ្សេង។',
  'search.user': 'អ្នកប្រើប្រាស់',
  'search.classDept': 'ថ្នាក់ / នាយកដ្ឋាន',
  'search.profileDetails': 'ព័ត៌មានលម្អិត',
  'search.studentId': 'អត្តលេខសិស្ស',
  'search.unassigned': 'មិនបានកំណត់',
  'search.dailyAttendance': 'វត្តមានប្រចាំថ្ងៃ',
  'search.noAttendanceData': 'គ្មានទិន្នន័យវត្តមាន',

  // Teacher Dashboard
  'teacher.title': 'ផ្ទាំងគ្រប់គ្រង',
  'teacher.subtitle': 'សូមស្វាគមន៍! គ្រប់គ្រងថ្នាក់ និងវត្តមានរបស់អ្នក។',
  'teacher.staffAttendance': 'វត្តមានបុគ្គលិក',
  'teacher.staffAttendanceDesc': 'ស្កេន QR ដើម្បីចុះវត្តមានរបស់អ្នក',
  'teacher.myClasses': 'ថ្នាក់របស់ខ្ញុំ',
  'teacher.today': 'ថ្ងៃនេះ',
  'teacher.noClasses': 'មិនទាន់មានថ្នាក់',
  'teacher.noClassesHint': 'សូមស្នើសុំអ្នកគ្រប់គ្រងកំណត់ថ្នាក់ឱ្យអ្នក។',
  'teacher.takeAttendance': 'ចុះវត្តមាន',

  // Student Portal
  'student.title': 'ផ្ទាំងសិស្ស',
  'student.subtitle': 'ប្រវត្តិវត្តមានរបស់អ្នក',
  'student.totalRecords': 'កំណត់ត្រាសរុប',
  'student.rate': 'អត្រា',
  'student.downloadReport': 'ទាញយករបាយការណ៍',
  'student.noRecords': 'គ្មានកំណត់ត្រាវត្តមាន',

  // Employee Portal
  'employee.title': 'ផ្ទាំងគ្រប់គ្រង',
  'employee.welcome': 'សូមស្វាគមន៍',
  'employee.scanNow': 'ស្កេនឥឡូវ',
  'employee.todayAttendance': 'វត្តមានថ្ងៃនេះ',
  'employee.session1': 'ចូលពេលព្រឹក',
  'employee.session2': 'ចេញពេលព្រឹក',
  'employee.session3': 'ចូលពេលរសៀល',
  'employee.session4': 'ចេញពេលរសៀល',
  'employee.totalRecords': 'កំណត់ត្រាសរុប',
  'employee.myIdCard': 'កាតសម្គាល់ខ្លួន',
  'employee.attendanceHistory': 'ប្រវត្តិវត្តមាន',
  'employee.noRecords': 'គ្មានកំណត់ត្រាសម្រាប់ខែនេះ',

  // Attendance status
  'status.present': '✓ វត្តមាន',
  'status.late': '⏰ យឺត',
  'status.absent': '✗ អវត្តមាន',
  'status.permission': '📋 សុំច្បាប់',
  'status.dayOff': '🚫 ថ្ងៃឈប់',

  // Sessions
  'session.1': 'វគ្គ ១',
  'session.2': 'វគ្គ ២',
  'session.3': 'វគ្គ ៣',
  'session.4': 'វគ្គ ៤',
}

/* ───────── All translations ───────── */
const translations: Record<string, Record<string, string>> = { en, kh }

/* ───────── Context ───────── */
type Lang = 'en' | 'kh'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null
    if (saved && (saved === 'en' || saved === 'kh')) {
      setLangState(saved)
    }
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }

  const t = (key: string): string => {
    return translations[lang]?.[key] || translations.en[key] || key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
