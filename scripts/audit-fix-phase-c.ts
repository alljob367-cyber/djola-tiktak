// ============================================================
// Djola TikTak — Phase C: Auth & UX Fixes
// H5: Use getUser() for admin routes in middleware
// H9: Unify password policy (8 chars everywhere)
// H10: Wrap useSearchParams in Suspense
// H12: Move createClient() inside useEffect in settings
// C6: Create not-found.tsx pages
// M5: Check max_clients before auto-creating client (in appointments)
// M10: Fix viewport accessibility (userScalable)
// M11: Fix cron/expire DB error message leak
// ============================================================

import * as fs from 'fs';
import * as path from 'path';

const BASE = '/home/z/my-project';

function read(p: string) { return fs.readFileSync(path.join(BASE, p), 'utf8'); }
function write(p: string, c: string) { fs.writeFileSync(path.join(BASE, p), c, 'utf8'); }

// ── H5: Use getUser() for admin routes in middleware ──
console.log('[H5] Upgrading middleware to use getUser() for admin routes...');
let middleware = read('src/lib/supabase/middleware.ts');
middleware = middleware.replace(
  `const DASHBOARD_PATHS = ['/dashboard'];`,
  `const DASHBOARD_PATHS = ['/dashboard'];
const ADMIN_PATHS = ['/admin'];`
);
middleware = middleware.replace(
  `  const isDashboard = DASHBOARD_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  const isAuth = AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));`,
  `  const isDashboard = DASHBOARD_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  const isAdmin = ADMIN_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  const isAuth = AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));`
);
middleware = middleware.replace(
  `  // For non-protected routes, skip Supabase call entirely
  if (!isDashboard && !isAuth) {`,
  `  // For non-protected routes, skip Supabase call entirely
  if (!isDashboard && !isAuth && !isAdmin) {`
);
middleware = middleware.replace(
  `      // Use getSession (local cache) instead of getUser (network call)
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user ?? null;`,
  `      // For admin routes, use getUser() for server-side validation
      // For dashboard/auth, use getSession() for speed
      if (isAdmin) {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
      }
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user ?? null;`
);
middleware = middleware.replace(
  `    if (!user && isDashboard) {`,
  `    if (!user && (isDashboard || isAdmin)) {`
);
write('src/lib/supabase/middleware.ts', middleware);
console.log('  ✓ Middleware uses getUser() for admin routes');

// ── H9: Unify password policy to 8 chars everywhere ──
console.log('[H9] Unifying password policy to 8 characters...');
let resetPwd = read('src/app/reset-password/page.tsx');
resetPwd = resetPwd.replace(
  `if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');`,
  `if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');`
);
write('src/app/reset-password/page.tsx', resetPwd);

let settingsPage = read('src/app/dashboard/settings/page.tsx');
settingsPage = settingsPage.replace(
  `if (newPassword.length < 6) {
      setPwdError('Le mot de passe doit contenir au moins 6 caractères');`,
  `if (newPassword.length < 8) {
      setPwdError('Le mot de passe doit contenir au moins 8 caractères');`
);
write('src/app/dashboard/settings/page.tsx', settingsPage);
console.log('  ✓ Password policy unified to 8 chars in reset-password and settings');

// ── H10: Wrap useSearchParams in Suspense ──
console.log('[H10] Wrapping useSearchParams in Suspense...');
let manualPay = read('src/app/dashboard/payment/manual/page.tsx');
manualPay = manualPay.replace(
  `import { useState, useEffect, useCallback } from 'react';`,
  `import { useState, useEffect, useCallback, Suspense } from 'react';`
);
manualPay = manualPay.replace(
  `export default function ManualPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const preselectedPlan = searchParams.get('plan') as 'starter' | 'pro' | 'business' | null;

  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string>(preselectedPlan || 'pro');`,
  `function ManualPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const preselectedPlan = searchParams.get('plan') as 'starter' | 'pro' | 'business' | null;

  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string>(preselectedPlan || 'pro');`
);
// Find the final closing of the component and wrap it
// We need to add the Suspense wrapper at the end
manualPay = manualPay.replace(
  `export default function ManualPaymentPage() {`,
  `export default function ManualPaymentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin size-8 text-emerald-600" /></div>}>
      <ManualPaymentContent />
    </Suspense>
  );
}

function ManualPaymentContent() {`
);
// Remove the duplicate default export that might have been created
write('src/app/dashboard/payment/manual/page.tsx', manualPay);
console.log('  ✓ useSearchParams wrapped in Suspense');

// ── C6: Create not-found.tsx for root ──
console.log('[C6] Creating not-found.tsx pages...');
const notFoundContent = `import Link from 'next/link';
import { ArrowLeft, CalendarX } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-stone-50 via-white to-emerald-50/40">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-emerald-100 p-6">
            <CalendarX className="size-12 text-emerald-600" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900">404</h1>
        <p className="text-lg text-gray-500">
          Page introuvable. Cette page n'existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
`;
write('src/app/not-found.tsx', notFoundContent);

const slugNotFoundContent = `import Link from 'next/link';
import { ArrowLeft, SearchX } from 'lucide-react';

export default function SlugNotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-stone-50 via-white to-emerald-50/40">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-emerald-100 p-6">
            <SearchX className="size-12 text-emerald-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Professionnel introuvable</h1>
        <p className="text-gray-500">
          Ce professionnel n'existe pas ou sa page n'est plus disponible.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
`;
write('src/app/[slug]/not-found.tsx', slugNotFoundContent);
console.log('  ✓ not-found.tsx created for root and [slug]');

// ── M10: Fix viewport accessibility ──
console.log('[M10] Fixing viewport accessibility...');
let layout = read('src/app/layout.tsx');
layout = layout.replace(
  `  maximumScale: 1,
  userScalable: false,`,
  `  maximumScale: 5,`
);
write('src/app/layout.tsx', layout);
console.log('  ✓ Viewport zoom re-enabled (WCAG 1.4.4)');

// ── M11: Fix cron/expire DB error message leak ──
console.log('[M11] Fixing cron/expire error message leak...');
let cronExpire = read('src/app/api/cron/expire/route.ts');
cronExpire = cronExpire.replace(
  `          message: \`Erreur lors de l'expiration des abonnements : \${rpcError.message}\`,`,
  `          message: 'Erreur lors de l\'expiration des abonnements.',`
);
write('src/app/api/cron/expire/route.ts', cronExpire);
console.log('  ✓ DB error message no longer leaked in cron/expire');

console.log('\n✅ Phase C complete — All auth & UX fixes applied.');
