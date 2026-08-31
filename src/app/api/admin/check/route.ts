// ============================================================
// /api/admin/check — Statut administrateur de la session
// Utilisé par le tableau de bord pour afficher le menu
// « Administration ». Admin = profiles.role = 'admin'
// OU e-mail dans ADMIN_EMAILS (env).
// ============================================================

import { NextResponse } from 'next/server';
import { getAdminStatus } from '@/lib/admin-guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const status = await getAdminStatus();

    if (!status.authenticated) {
      return NextResponse.json({ isAdmin: false, reason: 'not_authenticated' });
    }

    return NextResponse.json({
      isAdmin: status.isAdmin,
      role: status.role,
      userId: status.userId,
      email: status.email,
      // Compatible avec l'ancien reason: 'not_configured'
      ...(status.role === null && !status.isAdmin ? { reason: 'role_column_missing' } : {}),
    });
  } catch {
    return NextResponse.json({ isAdmin: false, reason: 'error' });
  }
}
