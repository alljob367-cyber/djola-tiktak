'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  Users,
  Clock,
  UserCircle,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/i18n/provider';
import { LanguageSwitcher } from '@/i18n/language-switcher';
import type { Profile } from '@/types/database';

// ── Types ──────────────────────────────────────────────────────
interface DashboardShellProps {
  profile: Profile;
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  mobileOnly?: boolean;
}

// ── Navigation config (icônes ; labels via i18n) ──────────────
const SIDEBAR_ICONS: Array<{ href: string; icon: React.ElementType; key: string }> = [
  { href: '/dashboard', icon: LayoutDashboard, key: 'navHome' },
  { href: '/dashboard/services', icon: CalendarCheck, key: 'navServices' },
  { href: '/dashboard/appointments', icon: CalendarDays, key: 'navAppointments' },
  { href: '/dashboard/clients', icon: Users, key: 'navClients' },
  { href: '/dashboard/availability', icon: Clock, key: 'navAvailability' },
  { href: '/dashboard/billing', icon: CreditCard, key: 'navBilling' },
  { href: '/dashboard/profile', icon: UserCircle, key: 'navProfile' },
  { href: '/dashboard/settings', icon: Settings, key: 'navSettings' },
];

const MOBILE_ICONS: Array<{ href: string; icon: React.ElementType; key: string }> = [
  { href: '/dashboard', icon: LayoutDashboard, key: 'mobileHome' },
  { href: '/dashboard/services', icon: CalendarCheck, key: 'mobileServices' },
  { href: '/dashboard/appointments', icon: CalendarDays, key: 'mobileAppointments' },
  { href: '/dashboard/clients', icon: Users, key: 'mobileClients' },
  { href: '/dashboard/availability', icon: Clock, key: 'mobileAvailability' },
  { href: '/dashboard/settings', icon: Menu, key: 'mobileMore' },
];

// ── Helpers ────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join(' ')
    .toUpperCase();
}

function isActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(href);
}

// ── Sidebar Link ───────────────────────────────────────────────
function SidebarLink({
  item,
  label,
  pathname,
  collapsed,
}: {
  item: { href: string; icon: React.ElementType };
  label: string;
  pathname: string;
  collapsed: boolean;
}) {
  const active = isActive(item.href, pathname);
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-emerald-50 text-emerald-700 dark:bg-[#c8ff00]/10 dark:text-[#c8ff00]'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {/* Barre indicatrice active */}
      {active && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-emerald-500 dark:bg-[#c8ff00]"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
      <Icon
        className={cn(
          'shrink-0 transition-colors',
          active
            ? 'text-emerald-600 dark:text-[#c8ff00]'
            : 'text-muted-foreground group-hover:text-foreground'
        )}
        size={20}
      />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="truncate whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

// ── Mobile Nav Link ────────────────────────────────────────────
function MobileNavLink({ item, label, pathname }: { item: { href: string; icon: React.ElementType }; label: string; pathname: string }) {
  const active = isActive(item.href, pathname);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px] font-medium transition-colors min-w-0 flex-1',
        active
          ? 'text-emerald-600 dark:text-[#c8ff00]'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <div className="relative">
        <Icon size={20} />
        {active && (
          <motion.div
            layoutId="mobile-nav-active"
            className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-emerald-500 dark:bg-[#c8ff00]"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
      </div>
      <span className="truncate max-w-full">{label}</span>
    </Link>
  );
}

// ── Main Shell ─────────────────────────────────────────────────
export function DashboardShell({ profile, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const shell = t.dashboard.shell;
  const sidebarLinks = SIDEBAR_ICONS.map(({ key, ...rest }) => ({ ...rest, label: shell[key] as string }));
  const mobileLinks = MOBILE_ICONS.map(({ key, ...rest }) => ({ ...rest, label: shell[key] as string }));
  const [collapsed, setCollapsed] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/admin/check')
      .then((r) => r.json())
      .then((d) => setShowAdmin(d.isAdmin === true))
      .catch(() => {});
  }, []);

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-border bg-card shadow-sm transition-all duration-300 ease-in-out',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo / Brand */}
        <div
          className={cn(
            'flex h-16 items-center border-b border-border px-4',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 overflow-hidden"
              >
                <Image src="/logo.png" alt="Djola TikTak" width={32} height={32} className="shrink-0 rounded-lg" />
                <span className="text-base font-bold tracking-tight text-foreground truncate">
                  Djola TikTak
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          {collapsed && (
            <Image src="/logo.png" alt="Djola TikTak" width={28} height={28} className="rounded-lg" />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {sidebarLinks.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              label={item.label}
              pathname={pathname}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            className="w-full h-9 text-muted-foreground hover:text-foreground"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6 shadow-sm">
          {/* Mobile menu button (placeholder for sheet/sidebar on mobile) */}
          <div className="lg:hidden">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Djola TikTak" width={24} height={24} className="rounded-md" />
              <span className="text-sm font-bold tracking-tight text-foreground">
                Djola TikTak
              </span>
            </div>
          </div>

          {/* Breadcrumb area on desktop (empty for now, just spacer) */}
          <div className="hidden lg:block" />

          {/* User info + actions */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8ff00]/50">
                  <Avatar className="h-8 w-8">
                    {profile.avatar_url ? (
                      <AvatarImage
                        src={profile.avatar_url}
                        alt={profile.business_name}
                      />
                    ) : null}
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold dark:bg-[#c8ff00]/15 dark:text-[#c8ff00]">
                      {getInitials(profile.business_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium text-foreground truncate max-w-[140px]">
                    {profile.business_name}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium leading-none">
                      {profile.business_name}
                    </p>
                    <p className="text-xs text-muted-foreground leading-none">
                      {profile.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="cursor-pointer">
                    <UserCircle size={16} />
                    {shell.myProfile}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="cursor-pointer">
                    <Settings size={16} />
                    {shell.navSettings}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/billing" className="cursor-pointer">
                    <CreditCard size={16} />
                    {shell.navBilling}
                  </Link>
                </DropdownMenuItem>
                {showAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer text-amber-600 dark:text-amber-400 focus:text-amber-600">
                        <Shield size={16} />
                        {shell.administration}
                  </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  variant="destructive"
                  className="cursor-pointer"
                >
                  <LogOut size={16} />
                  {shell.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ── Subscription expired/cancelled banner ── */}
        {profile.subscription_status &&
          ['expired', 'cancelled', 'past_due'].includes(profile.subscription_status) && (
            <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40">
              <div className="mx-auto flex max-w-7xl items-center gap-3">
                <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="flex-1 text-sm font-medium text-amber-800 dark:text-amber-300">
                  {profile.subscription_status === 'expired'
                    ? shell.bannerExpired
                    : profile.subscription_status === 'cancelled'
                      ? shell.bannerCancelled
                      : shell.bannerPastDue}
                </p>
                <Link href="/dashboard/billing" className="shrink-0">
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                    {shell.bannerChoosePlan}
                    <ArrowRight size={14} className="ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

        {/* ── No subscription banner ── */}
        {!profile.subscription_status && (
          <div className="border-b border-blue-300 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/40">
            <div className="mx-auto flex max-w-7xl items-center gap-3">
              <CreditCard size={18} className="shrink-0 text-blue-600 dark:text-blue-400" />
              <p className="flex-1 text-sm font-medium text-blue-800 dark:text-blue-300">
                {shell.bannerWelcome}
              </p>
              <Link href="/dashboard/billing" className="shrink-0">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {shell.bannerSeePlans}
                  <ArrowRight size={14} className="ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ── Page content ──────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          <div className="mx-auto w-full max-w-7xl p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* ── Mobile bottom nav ──────────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center border-t border-border bg-card/95 backdrop-blur-sm shadow-[0_-2px_10px_rgba(0,0,0,0.06)] lg:hidden">
        <div className="flex w-full items-center justify-around px-1">
          {mobileLinks.map((item) => (
            <MobileNavLink
              key={item.href}
              item={item}
              label={item.label}
              pathname={pathname}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}