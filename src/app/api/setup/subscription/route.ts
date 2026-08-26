import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    message: 'Cette route est desactivee. La migration est geree via supabase/subscription-migration.sql dans le SQL Editor de Supabase.',
  });
}

export async function GET() {
  return NextResponse.json({
    message: 'Cette route est desactivee. La migration est geree via supabase/subscription-migration.sql dans le SQL Editor de Supabase.',
  });
}
