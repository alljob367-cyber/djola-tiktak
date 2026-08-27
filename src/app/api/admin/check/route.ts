import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isAdmin: false, reason: 'not_authenticated' });
    }

    if (ADMIN_EMAILS.length === 0) {
      return NextResponse.json({ isAdmin: false, reason: 'not_configured' });
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '');
    return NextResponse.json({ isAdmin, email: user.email });
  } catch {
    return NextResponse.json({ isAdmin: false, reason: 'error' });
  }
}
