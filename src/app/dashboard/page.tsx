import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, DAY_NAMES_FR, MONTH_NAMES_FR } from '@/lib/availability/engine';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  CalendarDays,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  CalendarClock,
  CalendarCheck,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import type { AppointmentWithDetails, AppointmentStatus } from '@/types/database';

// ── Helpers ────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatDateLong(iso: string): string {
  const d = new Date(iso);
  const day = DAY_NAMES_FR[d.getDay()];
  const date = d.getDate();
  const month = MONTH_NAMES_FR[d.getMonth()];
  return `${day} ${date} ${month}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function statusConfig(status: AppointmentStatus): {
  label: string;
  className: string;
} {
  const map: Record<
    AppointmentStatus,
    { label: string; className: string }
  > = {
    pending: {
      label: 'En attente',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    },
    confirmed: {
      label: 'Confirmé',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    },
    completed: {
      label: 'Terminé',
      className: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    },
    cancelled: {
      label: 'Annulé',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    },
    no_show: {
      label: 'Absent',
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    },
  };
  return map[status];
}

// ── Sub-components (server-rendered, no 'use client') ───────────

function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 mb-4">
        <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">{description}</p>
      <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700">
        <Link href={actionHref}>
          <Plus size={16} />
          {actionLabel}
        </Link>
      </Button>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconBg,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  iconBg: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {value}
            </p>
            {sub && (
              <p className="text-xs text-muted-foreground">{sub}</p>
            )}
          </div>
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AppointmentRow({ apt }: { apt: AppointmentWithDetails }) {
  const status = statusConfig(apt.status);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50">
      {/* Time block */}
      <div className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
          {formatTime(apt.starts_at)}
        </span>
        <span className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 leading-tight">
          {formatTime(apt.ends_at)}
        </span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {apt.client.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {apt.service.name} · {apt.service.duration_minutes} min
        </p>
      </div>

      {/* Status badge */}
      <Badge variant="outline" className={status.className}>
        {status.label}
      </Badge>
    </div>
  );
}

function NextAppointmentHighlight({ apt }: { apt: AppointmentWithDetails }) {
  const status = statusConfig(apt.status);
  return (
    <Card className="border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/50 to-card dark:from-emerald-950/20 dark:to-card">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <CardTitle className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Prochain rendez-vous
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
              {formatTime(apt.starts_at)}
            </span>
            <span className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 leading-tight">
              {formatTime(apt.ends_at)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-foreground truncate">
              {apt.client.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {apt.service.name}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="outline" className={status.className}>
                {status.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDateLong(apt.starts_at)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch profile for business name and currency
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name, currency, timezone')
    .eq('id', user.id)
    .single();

  const currency = profile?.currency ?? 'XAF';
  const businessName = profile?.business_name ?? 'Votre entreprise';
  const timezone = profile?.timezone ?? 'Africa/Malabo';

  // Get today's date boundaries in the profile's timezone
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const tomorrowStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now.getTime() + 86400000));

  // Fetch today's appointments with service and client details
  const { data: todayAppointments } = await supabase
    .from('appointments')
    .select(`
      *,
      service:services(name, duration_minutes, price),
      client:clients(name, phone)
    `)
    .eq('profile_id', user.id)
    .gte('starts_at', `${todayStr}T00:00:00`)
    .lt('starts_at', `${tomorrowStr}T00:00:00`)
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true });

  const typedAppointments = (todayAppointments ?? []) as unknown as AppointmentWithDetails[];

  // Fetch all upcoming appointments (from now) for next appointment highlight
  const { data: upcomingAppointments } = await supabase
    .from('appointments')
    .select(`
      *,
      service:services(name, duration_minutes, price),
      client:clients(name, phone)
    `)
    .eq('profile_id', user.id)
    .gte('starts_at', now.toISOString())
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true })
    .limit(1);

  const typedUpcoming = (upcomingAppointments ?? []) as unknown as AppointmentWithDetails[];
  const nextAppointment = typedUpcoming[0] ?? null;

  // Total clients count
  const { count: totalClients } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id);

  // Monthly revenue estimate: sum of service prices for completed appointments this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const { data: monthlyCompleted } = await supabase
    .from('appointments')
    .select(`
      service:services(price)
    `)
    .eq('profile_id', user.id)
    .eq('status', 'completed')
    .gte('starts_at', monthStart.toISOString())
    .lt('starts_at', now.toISOString());

  const monthlyRevenue =
    (monthlyCompleted ?? []).reduce(
      (sum, a) => {
        const svc = a.service as unknown as { price: number }[] | null;
        return sum + (svc?.[0]?.price ?? 0);
      },
      0
    );

  // Check if there are any services (for empty state logic)
  const { count: totalServices } = await supabase
    .from('services')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id);

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
          {getGreeting()}, <span className="text-emerald-600 dark:text-emerald-400">{businessName}</span> 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Voici un aperçu de votre activité du jour.
        </p>
      </div>

      {/* Next upcoming appointment (highlighted) */}
      {nextAppointment && <NextAppointmentHighlight apt={nextAppointment} />}

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Users}
          label="Total clients"
          value={totalClients ?? 0}
          sub="clients enregistrés"
          iconBg="bg-teal-600"
        />
        <StatCard
          icon={CalendarDays}
          label="RDV aujourd'hui"
          value={typedAppointments.length}
          sub={formatDateLong(now.toISOString())}
          iconBg="bg-emerald-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Revenu du mois"
          value={formatCurrency(monthlyRevenue, currency)}
          sub={MONTH_NAMES_FR[now.getMonth()].charAt(0).toUpperCase() + MONTH_NAMES_FR[now.getMonth()].slice(1)}
          iconBg="bg-teal-700"
        />
      </div>

      {/* Today's appointments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Rendez-vous du jour
              </CardTitle>
              <CardDescription className="mt-1">
                {typedAppointments.length > 0
                  ? `${typedAppointments.length} rendez-vous programmé${typedAppointments.length > 1 ? 's' : ''}`
                  : 'Aucun rendez-vous aujourd\'hui'}
              </CardDescription>
            </div>
            {typedAppointments.length > 0 && (
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/appointments">
                  Voir tout
                  <ArrowRight size={14} />
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {typedAppointments.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {typedAppointments.map((apt) => (
                <AppointmentRow key={apt.id} apt={apt} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="Aucun rendez-vous aujourd'hui"
              description={
                totalServices && totalServices > 0
                  ? "Votre journée est libre. Partagez votre lien de réservation pour recevoir des demandes."
                  : "Commencez par créer vos services pour pouvoir recevoir des réservations."
              }
              actionHref={
                totalServices && totalServices > 0
                  ? '/dashboard/appointments'
                  : '/dashboard/services'
              }
              actionLabel={
                totalServices && totalServices > 0
                  ? 'Voir le calendrier'
                  : 'Créer un service'
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Quick actions row (only when data is sparse) */}
      {(totalClients === 0 || (totalServices ?? 0) === 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(totalServices ?? 0) === 0 && (
            <Card>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                    <CalendarCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      Ajoutez vos premiers services
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Créez vos prestations avec prix et durée pour commencer à recevoir des réservations.
                    </p>
                    <Button asChild size="sm" className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700">
                      <Link href="/dashboard/services">
                        <Plus size={14} />
                        Créer un service
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {totalClients === 0 && (
            <Card>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/40">
                    <UserPlus className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      Votre carnet est vide
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ajoutez vos premiers clients manuellement ou attendez les réservations en ligne.
                    </p>
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      <Link href="/dashboard/clients">
                        <Plus size={14} />
                        Ajouter un client
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Getting started tip for new users */}
      {typedAppointments.length === 0 && (totalClients ?? 0) === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">
                  Bienvenue sur Djola TikTak ! 🎉
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Pour commencer, créez vos services, configurez vos disponibilités, puis partagez votre lien de réservation avec vos clients. Tout est prêt pour gérer votre agenda en toute simplicité.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}