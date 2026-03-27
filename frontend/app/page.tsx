import Link from 'next/link'

const portals = [
  {
    title: 'Admin Portal',
    description: 'Manage users, classes, QR codes, and view analytics.',
    href: '/admin',
    icon: '🛡️',
    color: 'from-indigo-500 to-indigo-700',
    hoverBorder: 'hover:border-indigo-300',
  },
  {
    title: 'Teacher Portal',
    description: 'Take attendance, manage your classes, and view reports.',
    href: '/teacher',
    icon: '📚',
    color: 'from-emerald-500 to-emerald-700',
    hoverBorder: 'hover:border-emerald-300',
  },
  {
    title: 'Student Portal',
    description: 'View your attendance history and download reports.',
    href: '/student',
    icon: '🎓',
    color: 'from-sky-500 to-sky-700',
    hoverBorder: 'hover:border-sky-300',
  },
  {
    title: 'Employee Portal',
    description: 'Scan QR code to check in, view attendance and reports.',
    href: '/employee',
    icon: '👔',
    color: 'from-amber-500 to-amber-700',
    hoverBorder: 'hover:border-amber-300',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              S
            </div>
            <span className="font-bold text-slate-800 text-lg">SchoolSync</span>
          </div>
          <Link href="/login" className="btn-primary btn-sm">
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6">
        <section className="py-20 lg:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse-dot"></span>
            School Attendance System
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Simple attendance,<br />
            <span className="bg-gradient-to-r from-indigo-600 to-emerald-500 bg-clip-text text-transparent">
              better outcomes
            </span>
          </h1>
          <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Scan QR codes, track attendance in real-time, and generate reports instantly.
            A modern system for schools that care.
          </p>
        </section>

        {/* Portal Cards */}
        <section className="pb-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {portals.map((portal) => (
            <Link key={portal.href} href={portal.href}>
              <div className={`card-hover p-6 h-full cursor-pointer ${portal.hoverBorder}`}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${portal.color} flex items-center justify-center text-2xl shadow-sm mb-4`}>
                  {portal.icon}
                </div>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">{portal.title}</h2>
                <p className="text-sm text-slate-500 leading-relaxed">{portal.description}</p>
                <div className="mt-4 text-indigo-600 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  Open portal &rarr;
                </div>
              </div>
            </Link>
          ))}
        </section>

        {/* Stats bar */}
        <section className="pb-16">
          <div className="card p-6 flex flex-wrap justify-center gap-8 lg:gap-16 text-center">
            <div>
              <p className="text-3xl font-bold text-slate-800">QR Scan</p>
              <p className="text-sm text-slate-500 mt-1">Instant check-in</p>
            </div>
            <div className="hidden sm:block w-px bg-slate-200"></div>
            <div>
              <p className="text-3xl font-bold text-slate-800">Real-time</p>
              <p className="text-sm text-slate-500 mt-1">Live tracking</p>
            </div>
            <div className="hidden sm:block w-px bg-slate-200"></div>
            <div>
              <p className="text-3xl font-bold text-slate-800">Reports</p>
              <p className="text-sm text-slate-500 mt-1">CSV & analytics</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-sm text-slate-400">
          &copy; 2026 SchoolSync &middot; Attendance Management System
        </div>
      </footer>
    </div>
  )
}