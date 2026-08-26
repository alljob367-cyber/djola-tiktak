import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Use Supabase REST Admin API directly to find user by email
    const listRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(normalizedEmail)}`,
      {
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
        },
      }
    );

    if (!listRes.ok) {
      const errText = await listRes.text();
      console.error('List users error:', listRes.status, errText);
      return NextResponse.json({ error: 'Erreur recherche utilisateur' }, { status: 500 });
    }

    const listData = await listRes.json();
    const users = listData.users || [];

    if (users.length === 0) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const userId = users[0].id;
    const alreadyConfirmed = !!users[0].email_confirmed_at;

    // If already confirmed, return success immediately
    if (alreadyConfirmed) {
      return NextResponse.json({ success: true, userId, alreadyConfirmed: true });
    }

    // Confirm the user's email via Admin API
    const updateRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${userId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email_confirm: true }),
      }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error('Update user error:', updateRes.status, errText);
      return NextResponse.json({ error: 'Erreur confirmation' }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId });
  } catch (err) {
    console.error('Auto-confirm unexpected error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
