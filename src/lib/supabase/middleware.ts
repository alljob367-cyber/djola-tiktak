import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const DASHBOARD_PATHS = ['/dashboard'];
const ADMIN_PATHS = ['/admin'];
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/verify-email'];

export async function updateSession(request: NextRequest) {
  // Always create the base response immediately
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If no Supabase config, just pass through
  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;
  const isDashboard = DASHBOARD_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  const isAdmin = ADMIN_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  const isAuth = AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

  // For non-protected routes, skip Supabase call entirely
  if (!isDashboard && !isAuth && !isAdmin) {
    return supabaseResponse;
  }

  try {
    // Race the session check against a 4-second timeout
    // Vercel Edge has a 10s limit; we abort early to stay safe
    const sessionPromise = (async () => {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      });

      // For admin routes, use getUser() for server-side validation
      // For dashboard/auth, use getSession() for speed
      if (isAdmin) {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
      }
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user ?? null;
    })();

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 4000)
    );

    const user = await Promise.race([sessionPromise, timeoutPromise]);

    // If user is null due to timeout, let the request through
    // Page-level auth will handle it
    if (!user && (isDashboard || isAdmin)) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    if (user && isAuth) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  } catch (error) {
    // On any error (network, Supabase, etc.), just pass through
    // Page-level auth checks will handle security
    console.error('[middleware] Session check failed, passing through:', error);
  }

  return supabaseResponse;
}
