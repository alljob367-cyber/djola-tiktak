import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { findValidPromo } from '@/lib/promo';

export const dynamic = 'force-dynamic';

// Rate limiting léger : 15 validations / 5 min / IP (anti force brute)
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const ipCache = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipCache.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    ipCache.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

const validateSchema = z.object({
  slug: z.string().min(1).max(60),
  code: z.string().min(1, 'Code requis').max(40),
});

// POST — valider un code promo depuis la page de réservation (public)
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ valid: false, message: 'Trop de tentatives. Réessayez dans quelques minutes.' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ valid: false, message: 'Requête invalide' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Profil public visé (par slug)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('slug', parsed.data.slug)
      .eq('is_active', true)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ valid: false, message: 'Professionnel introuvable' }, { status: 404 });
    }

    const promo = await findValidPromo(supabase, profile.id, parsed.data.code);
    if (!promo) {
      return NextResponse.json({ valid: false, message: 'Code invalide, expiré ou épuisé' }, { status: 200 });
    }

    return NextResponse.json({
      valid: true,
      promo: {
        code: promo.code,
        type: promo.type,
        discount_type: promo.discount_type,
        value: promo.value,
      },
    });
  } catch (err) {
    console.error('Erreur promo/validate POST:', err);
    return NextResponse.json({ valid: false, message: 'Erreur serveur' }, { status: 500 });
  }
}
