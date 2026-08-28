import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ALLOWED_BUCKETS = ['avatars', 'service-images'] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    // 2. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || 'avatars';

    if (!file) {
      return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 });
    }

    // 3. Validate bucket
    if (!ALLOWED_BUCKETS.includes(bucket as (typeof ALLOWED_BUCKETS)[number])) {
      return NextResponse.json(
        { error: `Bucket non autorisé. Utilisez : ${ALLOWED_BUCKETS.join(', ')}` },
        { status: 400 },
      );
    }

    // 4. Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format non supporté. Utilisez JPG, PNG ou WebP.' },
        { status: 400 },
      );
    }

    // 5. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 5 Mo).' },
        { status: 400 },
      );
    }

    // 6. Upload to Supabase Storage using service role (bypasses RLS for upload)
    const serviceRole = await createServiceRoleClient();

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { data: uploadData, error: uploadError } = await serviceRole.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError || !uploadData) {
      console.error('Erreur upload Supabase Storage:', uploadError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload du fichier.' },
        { status: 500 },
      );
    }

    // 7. Get public URL
    const { data: urlData } = serviceRole.storage.from(bucket).getPublicUrl(uploadData.path);
    const publicUrl = urlData.publicUrl;

    return NextResponse.json({
      url: publicUrl,
      path: uploadData.path,
    });
  } catch (err) {
    console.error('Erreur upload:', err);
    return NextResponse.json({ error: 'Erreur serveur interne.' }, { status: 500 });
  }
}
