import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// Only run middleware on dashboard routes (auth-required) and auth routes
// This prevents 504 MIDDLEWARE_INVOCATION_TIMEOUT on public pages
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/auth/:path*',
  ],
};
