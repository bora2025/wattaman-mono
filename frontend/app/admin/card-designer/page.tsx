import AuthGuard from '../../../components/AuthGuard';
import Sidebar from '../../../components/Sidebar';
import CardEditor from '../../../components/card-designer/CardEditor';
import { adminNav } from '../../../lib/admin-nav';

export default function CardDesignerPage() {
  return (
    <AuthGuard requiredRole="ADMIN">
      <div className="page-shell">
        <Sidebar
          title="Admin Panel"
          subtitle="SchoolSync"
          navItems={adminNav}
          accentColor="indigo"
        />
        <div className="page-content lg:ml-0">
          <div className="h-14 lg:hidden" />
          <div className="page-header">
            <h1 className="text-2xl font-bold text-slate-800">Card Designer</h1>
            <p className="text-sm text-slate-500 mt-1">
              Design and customize ID cards for students and staff. Switch between card types, add logos, edit text fields, set colors, and export as PNG.
            </p>
          </div>
          <div className="page-body">
            <CardEditor />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
