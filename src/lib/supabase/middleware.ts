import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const DASHBOARD_PATHS = ['/dashboard'];
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/verify-email'];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;
  const isDashboard = DASHBOARD_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  const isAuth = AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

  // For non-protected routes, skip Supabase call entirely
  if (!isDashboard && !isAuth) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getSession (cached) instead of getUser (network call) for speed
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  if (!user && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isAuth) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
