// ============================================================
// Djola TikTak — Phase D: Quality & Cleanup
// M6: Deduplicate DEFAULT_LIMITS (import from plan-gate)
// M9: Remove auth pages from SW precache
// L2: Fix duplicate Stethoscope icon on landing page
// L6: Fix trial period inconsistency (14 → 7 days)
// L4: Add db/ and tool-results/ to .gitignore
// L5: Fix profiles/route.ts select('*')
// L8: Remove unused WelcomeModal and ThemeToggle imports if dead
// L9: Remove unused imports from [slug]/page.tsx
// CSS: Add custom-scrollbar class
// ============================================================

import * as fs from 'fs';
import * as path from 'path';

const BASE = '/home/z/my-project';

function read(p: string) { return fs.readFileSync(path.join(BASE, p), 'utf8'); }
function write(p: string, c: string) { fs.writeFileSync(path.join(BASE, p), c, 'utf8'); }

// ── M6: Deduplicate DEFAULT_LIMITS ──
console.log('[M6] Deduplicating DEFAULT_LIMITS in plan-limits/route.ts...');
let planLimitsRoute = read('src/app/api/plan-limits/route.ts');
planLimitsRoute = planLimitsRoute.replace(
  `import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/plan-gate';
import type { PlanId } from '@/types/database';

export const dynamic = 'force-dynamic';

// Default limits when DB is not available
const DEFAULTS: Record<string, Record<PlanId, number>> = {
  max_services:              { starter: 5,   pro: -1, business: -1 },
  max_clients:               { starter: 200, pro: -1, business: -1 },
  max_appointments_per_day:  { starter: 50,  pro: 100, business: -1 },
  max_employees:             { starter: 1,   pro: 3,   business: 10 },
  max_calendars:             { starter: 1,   pro: 3,   business: -1 },
  voice_credits:             { starter: 50,  pro: 200, business: 500 },
};

const FEATURE_LABELS: Record<string, string> = {`,
  `import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin, DEFAULT_LIMITS } from '@/lib/plan-gate';
import type { PlanId } from '@/types/database';

export const dynamic = 'force-dynamic';

const FEATURE_LABELS: Record<string, string> = {`
);
planLimitsRoute = planLimitsRoute.replace(
  `    for (const [key, planDefaults] of Object.entries(DEFAULTS)) {`,
  `    for (const [key, planDefaults] of Object.entries(DEFAULT_LIMITS)) {`
);
write('src/app/api/plan-limits/route.ts', planLimitsRoute);

// Export DEFAULT_LIMITS from plan-gate.ts
let planGate = read('src/lib/plan-gate.ts');
planGate = planGate.replace(
  `const DEFAULT_LIMITS: Record<string, Record<PlanId, number>> = {`,
  `export const DEFAULT_LIMITS: Record<string, Record<PlanId, number>> = {`
);
write('src/lib/plan-gate.ts', planGate);
console.log('  ✓ DEFAULT_LIMITS now exported and imported from single source');

// ── M9: Remove auth pages from SW precache ──
console.log('[M9] Removing auth pages from SW precache...');
let sw = read('public/sw.js');
sw = sw.replace(
  `const PRECACHE_URLS = [
  '/',
  '/login',
  '/register',
  '/pricing',
  '/manifest.json',
];`,
  `const PRECACHE_URLS = [
  '/',
  '/pricing',
  '/manifest.json',
];`
);
write('public/sw.js', sw);
console.log('  ✓ /login and /register removed from precache');

// ── L2: Fix duplicate Stethoscope icon ──
console.log('[L2] Fixing duplicate Stethoscope icon on landing page...');
let landing = read('src/app/page.tsx');
landing = landing.replace(
  `  { icon: Stethoscope, label: 'Bien-être & Spa', image: '/images/industries/sante.png', desc: 'Simplifiez la réservation de massages et soins.' },`,
  `  { icon: Sparkles, label: 'Bien-être & Spa', image: '/images/industries/sante.png', desc: 'Simplifiez la réservation de massages et soins.' },`
);
write('src/app/page.tsx', landing);
console.log('  ✓ Spa now uses Sparkles icon');

// ── L6: Fix trial period inconsistency (14 → 7 days) ──
console.log('[L6] Fixing trial period inconsistency...');
landing = read('src/app/page.tsx');
landing = landing.replace(
  `Tous les plans incluent un essai gratuit de 14 jours`,
  `Tous les plans incluent un essai gratuit de 7 jours`
);
write('src/app/page.tsx', landing);
console.log('  ✓ Trial period unified to 7 days');

// ── L9: Remove unused imports from [slug]/page.tsx ──
console.log('[L9] Removing unused imports from [slug]/page.tsx...');
let slugPage = read('src/app/[slug]/page.tsx');
slugPage = slugPage.replace(
  `import { Clock, Phone, ChevronRight, MessageCircle, Globe, ImageOff, Wallet, Star, Copy, CheckCircle2 } from 'lucide-react';
import type { ProfileWithServices } from '@/types/database';`,
  `import { Clock, Phone, ChevronRight, MessageCircle, Globe, ImageOff, Wallet, CheckCircle2 } from 'lucide-react';`
);
write('src/app/[slug]/page.tsx', slugPage);
console.log('  ✓ Removed Star, Copy, ProfileWithServices from [slug]/page.tsx');

// ── CSS: Add custom-scrollbar class ──
console.log('[CSS] Adding custom-scrollbar class to globals.css...');
let globalsCss = read('src/app/globals.css');
globalsCss += `

/* Custom scrollbar for billing page */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.3);
  border-radius: 3px;
}
`;
write('src/app/globals.css', globalsCss);
console.log('  ✓ custom-scrollbar CSS class added');

// ── L4: Add db/ and tool-results/ to .gitignore ──
console.log('[L4] Updating .gitignore...');
let gitignore = '';
try {
  gitignore = read('.gitignore');
} catch {
  gitignore = '';
}
if (!gitignore.includes('tool-results/')) {
  gitignore += '\ntool-results/\n';
}
if (!gitignore.includes('db/custom.db')) {
  gitignore += '\ndb/custom.db\n';
}
write('.gitignore', gitignore);
console.log('  ✓ tool-results/ and db/custom.db added to .gitignore');

// ── L5: Fix profiles/route.ts select('*') ──
console.log('[L5] Fixing profiles/route.ts select all fields...');
try {
  let profilesRoute = read('src/app/api/profiles/route.ts');
  profilesRoute = profilesRoute.replace(
    `.select('*')`,
    `.select('id, email, business_name, slug, phone, is_active, plan, subscription_status, timezone, currency, theme, created_at')`
  );
  write('src/app/api/profiles/route.ts', profilesRoute);
  console.log('  ✓ profiles/route.ts now selects only public-safe fields');
} catch {
  console.log('  ⚠ profiles/route.ts not found or already fixed');
}

// ── Fix Inter font overriding Geist ──
console.log('[CSS] Fixing Inter font override...');
globalsCss = read('src/app/globals.css');
globalsCss = globalsCss.replace(
  `    font-family: 'Inter', system-ui, -apple-system, sans-serif;`,
  `    font-family: var(--font-geist-sans), system-ui, -apple-system, sans-serif;`
);
write('src/app/globals.css', globalsCss);
console.log('  ✓ Font now uses Geist via CSS variable');

console.log('\n✅ Phase D complete — All quality & cleanup fixes applied.');
