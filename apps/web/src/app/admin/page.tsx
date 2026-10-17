import type { Metadata } from 'next';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { mn } from '@/i18n/mn';

export const metadata: Metadata = {
  title: mn.admin.title,
  robots: { index: false, follow: false },
};

/** /admin (§8): anonymous usage numbers, behind the server's ADMIN_SECRET. */
export default function AdminPage() {
  return <AdminDashboard />;
}
