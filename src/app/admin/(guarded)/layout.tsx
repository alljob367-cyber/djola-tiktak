// ============================================================
// Layout serveur du panneau de contrôle général (route group
// « guarded »). RECTIFICATION ACCÈS : seuls les administrateurs
// (profiles.role = 'admin' OU e-mail dans ADMIN_EMAILS) peuvent
// accéder à /admin et à ses sous-pages. Les autres utilisateurs
// sont redirigés vers leur tableau de bord.
// ============================================================

import { redirect } from 'next/navigation';
import { getAdminStatus } from '@/lib/admin-guard';
import { AdminTopNav } from '@/components/admin/admin-top-nav';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Administration — Djola TikTak',
  description: 'Panneau de contrôle général de l\'application Djola TikTak.',
};

export default async function GuardedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── Garde serveur : la page ne s'exécute JAMAIS pour un non-admin ──
  const status = await getAdminStatus();

  if (!status.authenticated) {
    redirect('/login?redirect_to=/admin');
  }

  if (!status.isAdmin) {
    // Les utilisateurs standards n'ont pas accès au panneau de contrôle général
    redirect('/dashboard?admin_access=denied');
  }

  return (
    <>
      <AdminTopNav />
      {children}
    </>
  );
}
