'use client';

// ============================================================
// Barre de navigation du panneau de contrôle général.
// Persistante sur toutes les pages /admin (layout guarded).
// ============================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, BarChart3, CreditCard, Users, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/admin', label: 'Vue d\'ensemble', icon: BarChart3, exact: true },
  { href: '/admin/payments', label: 'Paiements', icon: CreditCard, exact: false },
  { href: '/admin/users', label: 'Utilisateurs & Plans', icon: Users, exact: false },
];

export function AdminTopNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation administration"
      className="sticky top-0 z-[60] border-b border-lime-400/20 bg-gray-950"
    >
      <div className="mx-auto flex h-10 max-w-7xl items-center gap-1 px-3 sm:px-6 lg:px-8">
        <Link
          href="/admin"
          className="mr-2 flex items-center gap-1.5 text-xs font-bold text-lime-400"
          aria-label="Administration Djola TikTak"
        >
          <Shield size={14} />
          <span className="hidden sm:inline">ADMIN</span>
        </Link>

        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
                active
                  ? 'bg-lime-400/15 text-lime-300'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200',
              )}
            >
              <Icon size={13} />
              <span className={cn(label.length > 12 && 'hidden md:inline')}>{label}</span>
            </Link>
          );
        })}

        <div className="ml-auto flex items-center">
          <Link
            href="/dashboard"
            className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
          >
            <LayoutDashboard size={13} />
            <span className="hidden sm:inline">Mon tableau de bord</span>
            <span className="sm:hidden">Tableau</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
