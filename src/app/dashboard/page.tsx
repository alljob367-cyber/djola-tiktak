import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/availability/engine';
import { getServerI18n, localizedDayNames, localizedMonthNames } from '@/i18n/server';
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
  ShieldAlert,
} from 'lucide-react';
import type { AppointmentWithDetails, AppointmentStatus } from '@/types/database';
import type { Dictionary, Lang } from '@/i18n/index';

// ── Helpers ────────────────────────────────────────────────────

function formatTime(iso: string, intl: string): string {
  return new Intl.DateTimeFormat(intl, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatDateLong(iso: string, lang: Lang): string {
  const d = new Date(iso);
  const day = localizedDayNames(lang)[d.getDay()];
  const date = d.getDate();
  const month = localizedMonthNames(lang)[d.getMonth()];
  return `${day} ${date} ${month}`;
}

function getGreeting(O: { greetingMorning: string; greetingAfternoon: string; greetingEvening: string }): string {
  const hour = new Date().getHours();
  if (hour < 12) return O.greetingMorning;
  if (hour < 18) return O.greetingAfternoon;
  return O.greetingEvening;
}

function statusConfig(status: AppointmentStatus, labels: Record<AppointmentStatus, string>): {
  label: string;
  className: string;
} {
  const map: Record<
    AppointmentStatus,
    { label: string; className: string }
  > = {
    pending: {
      label: labels['pending'],
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    },
    confirmed: {
      label: labels['confirmed'],
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    },
    completed: {
      label: labels['completed'],
      className: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    },
    cancelled: {
      label: labels['cancelled'],
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    },
    no_show: {
      label: labels['no_show'],
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

function AppointmentRow({ apt, t, intl }: { apt: AppointmentWithDetails; t: Dictionary; intl: string }) {
  const status = statusConfig(apt.status, t.dashboard.status as unknown as Record<AppointmentStatus, string>);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50">
      {/* Time block */}
      <div className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
          {formatTime(apt.starts_at, intl)}
        </span>
        <span className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 leading-tight">
          {formatTime(apt.ends_at, intl)}
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

function NextAppointmentHighlight({ apt, t, intl, lang }: { apt: AppointmentWithDetails; t: Dictionary; intl: string; lang: Lang }) {
  const status = statusConfig(apt.status, t.dashboard.status as unknown as Record<AppointmentStatus, string>);
  return (
    <Card className="border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/50 to-card dark:from-emerald-950/20 dark:to-card">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <CardTitle className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            {t.dashboard.overview.nextAppointment}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
              {formatTime(apt.starts_at, intl)}
            </span>
            <span className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 leading-tight">
              {formatTime(apt.ends_at, intl)}
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
                {formatDateLong(apt.starts_at, lang)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ admin_access?: string }>;
}) {
  const { t, lang, intl } = await getServerI18n();
  const params = (await searchParams) ?? {};
  const adminDenied = params.admin_access === 'denied';
  const O = t.dashboard.overview;
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
  const businessName = profile?.business_name ?? t.dashboard.overview.welcomeTitle;
  const timezone = profile?.timezone ?? 'Africa/Malabo';

  // Get today's date boundaries in the profile's timezone
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tomorrowDate);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // ── Parallel data fetch ──────────────────────────────────────
  const [
    todayResult,
    upcomingResult,
    clientsResult,
    monthlyResult,
    servicesResult,
  ] = await Promise.all([
    // Today's appointments
    supabase
      .from('appointments')
      .select(`*, service:services(name, duration_minutes, price), client:clients(name, phone)`)
      .eq('profile_id', user.id)
      .gte('starts_at', `${todayStr}T00:00:00`)
      .lt('starts_at', `${tomorrowStr}T00:00:00`)
      .neq('status', 'cancelled')
      .order('starts_at', { ascending: true }),
    // Next upcoming appointment
    supabase
      .from('appointments')
      .select(`*, service:services(name, duration_minutes, price), client:clients(name, phone)`)
      .eq('profile_id', user.id)
      .gte('starts_at', now.toISOString())
      .neq('status', 'cancelled')
      .order('starts_at', { ascending: true })
      .limit(1),
    // Total clients
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id),
    // Monthly revenue
    supabase
      .from('appointments')
      .select(`service:services(price)`)
      .eq('profile_id', user.id)
      .eq('status', 'completed')
      .gte('starts_at', monthStart.toISOString())
      .lt('starts_at', now.toISOString()),
    // Total services
    supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', user.id),
  ]);

  const typedAppointments = (todayResult.data ?? []) as unknown as AppointmentWithDetails[];
  const typedUpcoming = (upcomingResult.data ?? []) as unknown as AppointmentWithDetails[];
  const nextAppointment = typedUpcoming[0] ?? null;
  const totalClients = clientsResult.count ?? 0;
  const totalServices = servicesResult.count ?? 0;

  const monthlyRevenue =
    (monthlyResult.data ?? []).reduce(
      (sum, a) => {
        const svc = a.service as unknown as { price: number }[] | null;
        return sum + (svc?.[0]?.price ?? 0);
      },
      0
    );

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Accès admin refusé (redirigé depuis /admin) */}
      {adminDenied && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <p>{t.dashboard.shell.adminDenied}</p>
        </div>
      )}
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
          {getGreeting(O)}, <span className="text-emerald-600 dark:text-emerald-400">{businessName}</span> 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {O.subtitle}
        </p>
      </div>

      {/* Next upcoming appointment (highlighted) */}
      {nextAppointment && <NextAppointmentHighlight apt={nextAppointment} t={t} intl={intl} lang={lang} />}

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Users}
          label={O.statClients}
          value={totalClients ?? 0}
          sub={O.statClientsSub}
          iconBg="bg-teal-600"
        />
        <StatCard
          icon={CalendarDays}
          label={O.statToday}
          value={typedAppointments.length}
          sub={formatDateLong(now.toISOString(), lang)}
          iconBg="bg-emerald-600"
        />
        <StatCard
          icon={TrendingUp}
          label={O.statRevenue}
          value={formatCurrency(monthlyRevenue, currency)}
          sub={(localizedMonthNames(lang)[now.getMonth()] ?? '').charAt(0).toUpperCase() + (localizedMonthNames(lang)[now.getMonth()] ?? '').slice(1)}
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
                {O.todayTitle}
              </CardTitle>
              <CardDescription className="mt-1">
                {typedAppointments.length > 0
                  ? O.todayCount(typedAppointments.length)
                  : O.todayNone}
              </CardDescription>
            </div>
            {typedAppointments.length > 0 && (
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/appointments">
                  {O.seeAll}
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
                <AppointmentRow key={apt.id} apt={apt} t={t} intl={intl} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title={O.emptyNoApt}
              description={
                totalServices && totalServices > 0
                  ? O.emptyShareLink
                  : O.emptyCreateServices
              }
              actionHref={
                totalServices && totalServices > 0
                  ? '/dashboard/appointments'
                  : '/dashboard/services'
              }
              actionLabel={
                totalServices && totalServices > 0
                  ? O.actionSeeCalendar
                  : O.actionCreateService
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
                      {O.quickServicesTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {O.quickServicesDesc}
                    </p>
                    <Button asChild size="sm" className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700">
                      <Link href="/dashboard/services">
                        <Plus size={14} />
                        {O.actionCreateService}
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
                      {O.quickClientsTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {O.quickClientsDesc}
                    </p>
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      <Link href="/dashboard/clients">
                        <Plus size={14} />
                        {O.addClient}
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
                  {O.welcomeTitle} 🎉
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {O.welcomeDesc}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}