import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tableau de bord — Djola TikTak',
  description: 'Gérez vos rendez-vous, clients et services.',
};

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Authenticate the user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // If no profile exists, redirect to onboarding / profile creation
  if (!profile) {
    redirect('/dashboard/profile');
  }

  return (
    <div className="dark">
      <DashboardShell profile={profile}>{children}</DashboardShell>
    </div>
  );
}