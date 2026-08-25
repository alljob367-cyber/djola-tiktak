'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  CalendarDays,
  TrendingUp,
  DollarSign,
  Activity,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Bell,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Shield,
  Scissors,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ── Types ────────────────────────────────────────────────────

interface AdminMetrics {
  totalProfiles: number;
  totalAppointments: number;
  totalServices: number;
  totalClients: number;
  activeProfiles: number;
  todayAppointments: number;
  weekAppointments: number;
  monthAppointments: number;
  weekNewProfiles: number;
  monthNewProfiles: number;
  statusBreakdown: Record<string, number>;
  monthlyRevenue: number;
  lastMonthRevenue: number;
  revenueGrowth: number;
  aptGrowth: number;
  reminderStats: { total: number; sent: number; pending: number; failed: number };
  topServices: { name: string; count: number; revenue: number }[];
  topProfiles: { profile_id: string; business_name: string; appointment_count: number }[];
  recentAppointments: RecentAppointment[];
  completionRate: number;
  profilesList: { id: string; business_name: string; is_active: boolean; created_at: string; timezone: string; currency: string }[];
}

interface RecentAppointment {
  id: string;
  status: string;
  starts_at: string;
  created_at: string;
  service: { name: string; price: number; duration_minutes: number }[] | null;
  client: { name: string; phone: string }[] | null;
  profile: { business_name: string }[] | null;
}

// ── Helpers ──────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(amount);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:    { label: 'En attente',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
    confirmed:  { label: 'Confirmé',   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
    completed:  { label: 'Terminé',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
    cancelled:  { label: 'Annulé',     cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
    no_show:    { label: 'Absent',     cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
  };
  const cfg = map[status] || { label: status, cls: 'bg-gray-100 text-gray-700' };
  return <Badge variant="secondary" className={cfg.cls}>{cfg.label}</Badge>;
}

function GrowthIndicator({ value, label }: { value: number; label: string }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">{label}</span>;
  const isUp = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      {Math.abs(value)}% {label}
    </span>
  );
}

// ── Component ────────────────────────────────────────────────

export default function AdminPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'providers'>('overview');

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/metrics');
      if (res.status === 401) { setError('Non connecté. Connectez-vous d\'abord.'); return; }
      if (res.status === 403) { setError('Accès refusé. Vous n\'êtes pas administrateur.'); return; }
      if (!res.ok) throw new Error('Erreur serveur');
      const json = await res.json();
      setMetrics(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  // ── Loading ─────────────────────────────────────────────
  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-lime-400" />
          <p className="text-gray-400 text-sm">Chargement des métriques…</p>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────
  if (error && !metrics) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Card className="max-w-md bg-gray-900 border-gray-800">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-red-400" />
            <p className="text-gray-300 font-medium">{error}</p>
            <Button onClick={fetchMetrics} variant="outline" className="border-gray-700 text-gray-300">
              <RefreshCw size={14} className="mr-2" /> Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics) return null;

  const m = metrics;

  // ── Status bar data ──────────────────────────────────────
  const statusEntries = [
    { key: 'pending', label: 'En attente', color: 'bg-amber-500', value: m.statusBreakdown.pending ?? 0 },
    { key: 'confirmed', label: 'Confirmés', color: 'bg-emerald-500', value: m.statusBreakdown.confirmed ?? 0 },
    { key: 'completed', label: 'Terminés', color: 'bg-blue-500', value: m.statusBreakdown.completed ?? 0 },
    { key: 'cancelled', label: 'Annulés', color: 'bg-red-500', value: m.statusBreakdown.cancelled ?? 0 },
    { key: 'no_show', label: 'Absents', color: 'bg-orange-500', value: m.statusBreakdown.no_show ?? 0 },
  ];
  const totalStatus = statusEntries.reduce((s, e) => s + e.value, 0);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* ── Header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-400/10">
                <Shield className="h-5 w-5 text-lime-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Admin Djola TikTak</h1>
                <p className="text-xs text-gray-500">Panneau de contrôle global</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                En ligne
              </span>
              <Button
                onClick={fetchMetrics}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                disabled={loading}
              >
                <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Rafraîchir
              </Button>
              <Button
                onClick={() => window.location.href = '/dashboard'}
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── KPI Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Users}
            label="Prestataires"
            value={m.totalProfiles}
            sub={`${m.activeProfiles} actifs`}
            iconBg="bg-violet-500/10"
            iconColor="text-violet-400"
            trend={m.monthNewProfiles > 0 ? `+${m.monthNewProfiles} ce mois` : undefined}
          />
          <KpiCard
            icon={CalendarDays}
            label="Rendez-vous"
            value={m.totalAppointments}
            sub={`${m.todayAppointments} aujourd\'hui`}
            iconBg="bg-blue-500/10"
            iconColor="text-blue-400"
            trend={<GrowthIndicator value={m.aptGrowth} label="vs mois dernier" />}
          />
          <KpiCard
            icon={DollarSign}
            label="Revenu du mois"
            value={formatCurrency(m.monthlyRevenue)}
            sub={formatCurrency(m.lastMonthRevenue) + ' mois dernier'}
            iconBg="bg-lime-500/10"
            iconColor="text-lime-400"
            trend={<GrowthIndicator value={m.revenueGrowth} label="vs mois dernier" />}
          />
          <KpiCard
            icon={Activity}
            label="Taux de complétion"
            value={`${m.completionRate}%`}
            sub={`${m.statusBreakdown.completed ?? 0} terminés ce mois`}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-400"
          />
        </div>

        {/* ── Secondary stats ────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MiniStat icon={Scissors} label="Services" value={m.totalServices} />
          <MiniStat icon={Users} label="Clients enregistrés" value={m.totalClients} />
          <MiniStat icon={Clock} label="RDV cette semaine" value={m.weekAppointments} />
          <MiniStat icon={UserCheck} label="Nouveaux (sem.)" value={m.weekNewProfiles} />
        </div>

        {/* ── Tabs ──────────────────────────────────────── */}
        <div className="flex gap-1 rounded-lg bg-gray-900 p-1 w-fit">
          {(['overview', 'appointments', 'providers'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-lime-400 text-gray-950 shadow-md shadow-lime-400/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {tab === 'overview' ? 'Vue d\'ensemble' : tab === 'appointments' ? 'Rendez-vous' : 'Prestataires'}
            </button>
          ))}
        </div>

        {/* ── Tab: Overview ─────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Status breakdown */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 size={16} className="text-lime-400" />
                  Répartition des RDV (ce mois)
                </CardTitle>
                <CardDescription className="text-gray-500">{m.monthAppointments} rendez-vous ce mois</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bar chart */}
                <div className="space-y-2.5">
                  {statusEntries.map((entry) => {
                    const pct = totalStatus > 0 ? Math.round((entry.value / totalStatus) * 100) : 0;
                    return (
                      <div key={entry.key} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">{entry.label}</span>
                          <span className="font-medium text-gray-200">{entry.value} <span className="text-gray-500 text-xs">({pct}%)</span></span>
                        </div>
                        <div className="h-2.5 rounded-full bg-gray-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${entry.color} transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Status badges row */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {statusEntries.map((entry) => (
                    <Badge key={entry.key} variant="outline" className="border-gray-700 text-gray-400 gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${entry.color}`} />
                      {entry.value}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Right column */}
            <div className="space-y-6">
              {/* Reminders */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Bell size={16} className="text-amber-400" />
                    Rappels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1.5">
                        <CheckCircle2 size={18} className="text-emerald-400" />
                      </div>
                      <p className="text-2xl font-bold">{m.reminderStats.sent}</p>
                      <p className="text-xs text-gray-500">Envoyés</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1.5">
                        <Clock size={18} className="text-amber-400" />
                      </div>
                      <p className="text-2xl font-bold">{m.reminderStats.pending}</p>
                      <p className="text-xs text-gray-500">En attente</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1.5">
                        <XCircle size={18} className="text-red-400" />
                      </div>
                      <p className="text-2xl font-bold">{m.reminderStats.failed}</p>
                      <p className="text-xs text-gray-500">Échoués</p>
                    </div>
                  </div>
                  {m.reminderStats.total > 0 && (
                    <div className="mt-4 h-2 rounded-full bg-gray-800 overflow-hidden">
                      <div className="flex h-full">
                        {m.reminderStats.sent > 0 && (
                          <div className="bg-emerald-500" style={{ width: `${(m.reminderStats.sent / m.reminderStats.total) * 100}%` }} />
                        )}
                        {m.reminderStats.failed > 0 && (
                          <div className="bg-red-500" style={{ width: `${(m.reminderStats.failed / m.reminderStats.total) * 100}%` }} />
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Providers */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp size={16} className="text-violet-400" />
                    Top prestataires (mois)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {m.topProfiles.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Aucune donnée</p>
                  ) : (
                    <div className="space-y-2.5">
                      {m.topProfiles.map((p, i) => (
                        <div key={p.profile_id} className="flex items-center gap-3">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            i === 0 ? 'bg-lime-400/20 text-lime-400' : i === 1 ? 'bg-gray-700 text-gray-300' : 'bg-gray-800 text-gray-500'
                          }`}>
                            {i + 1}
                          </span>
                          <span className="flex-1 truncate text-sm text-gray-300">{p.business_name}</span>
                          <span className="text-sm font-semibold text-gray-200">{p.appointment_count} RDV</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── Tab: Appointments ─────────────────────────── */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            {/* Top Services */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Scissors size={16} className="text-blue-400" />
                  Services les plus populaires
                </CardTitle>
              </CardHeader>
              <CardContent>
                {m.topServices.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">Aucun service réservé</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-500">
                          <th className="text-left py-2 font-medium">#</th>
                          <th className="text-left py-2 font-medium">Service</th>
                          <th className="text-right py-2 font-medium">Réservations</th>
                          <th className="text-right py-2 font-medium">Revenu total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.topServices.map((svc, i) => (
                          <tr key={svc.name} className="border-b border-gray-800/50">
                            <td className="py-2.5 text-gray-500">{i + 1}</td>
                            <td className="py-2.5 text-gray-200 font-medium">{svc.name}</td>
                            <td className="py-2.5 text-right text-gray-300">{svc.count}</td>
                            <td className="py-2.5 text-right text-lime-400 font-medium">{formatCurrency(svc.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Appointments */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock size={16} className="text-emerald-400" />
                  Derniers rendez-vous
                </CardTitle>
              </CardHeader>
              <CardContent>
                {m.recentAppointments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">Aucun rendez-vous</p>
                ) : (
                  <div className="space-y-2">
                    {m.recentAppointments.map((apt) => (
                      <div key={apt.id} className="flex items-center gap-3 rounded-lg bg-gray-800/50 p-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-200 truncate">
                              {apt.client?.[0]?.name ?? 'Client'}
                            </span>
                            <span className="text-gray-600">·</span>
                            <span className="text-xs text-gray-500">{apt.service?.[0]?.name ?? 'Service'}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">{apt.profile?.[0]?.business_name ?? ''}</span>
                            <span className="text-gray-700">·</span>
                            <span className="text-xs text-gray-500">{formatDate(apt.starts_at)}</span>
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {statusBadge(apt.status)}
                          {apt.service?.[0]?.price && (
                            <span className="text-xs text-lime-400 font-medium">{formatCurrency(apt.service[0].price)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Tab: Providers ────────────────────────────── */}
        {activeTab === 'providers' && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users size={16} className="text-violet-400" />
                Tous les prestataires ({m.profilesList.length})
              </CardTitle>
              <CardDescription className="text-gray-500">
                {m.activeProfiles} actifs sur {m.totalProfiles} inscrits
              </CardDescription>
            </CardHeader>
            <CardContent>
              {m.profilesList.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Aucun prestataire inscrit</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-500">
                        <th className="text-left py-2 font-medium">Entreprise</th>
                        <th className="text-left py-2 font-medium">Statut</th>
                        <th className="text-left py-2 font-medium">Devise</th>
                        <th className="text-left py-2 font-medium">Fuseau</th>
                        <th className="text-right py-2 font-medium">Inscrit le</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.profilesList.map((p) => (
                        <tr key={p.id} className="border-b border-gray-800/50">
                          <td className="py-2.5 text-gray-200 font-medium">{p.business_name || '—'}</td>
                          <td className="py-2.5">
                            {p.is_active ? (
                              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Actif</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-800 text-gray-500">Inactif</Badge>
                            )}
                          </td>
                          <td className="py-2.5 text-gray-400">{p.currency}</td>
                          <td className="py-2.5 text-gray-400">{p.timezone}</td>
                          <td className="py-2.5 text-right text-gray-400">{formatDate(p.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Footer ────────────────────────────────────── */}
        <div className="text-center py-4 border-t border-gray-800/50">
          <p className="text-xs text-gray-600">
            Djola TikTak Admin · Dernière mise à jour : {new Date().toLocaleTimeString('fr-FR')}
          </p>
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  iconBg,
  iconColor,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  iconBg: string;
  iconColor: string;
  trend?: React.ReactNode;
}) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-4 lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold tracking-tight text-gray-100">{value}</p>
            {sub && <p className="text-xs text-gray-500 truncate">{sub}</p>}
            {trend}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-900 border border-gray-800 p-3.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-800">
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <div>
        <p className="text-lg font-bold text-gray-200">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
