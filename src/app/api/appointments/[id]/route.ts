import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  appointmentUpdateStatusSchema,
  appointmentPrepaymentSchema,
} from '@/lib/validation/schemas';
import { stripMissingColumns } from '@/lib/supabase/columns';
import { fireAndForget, pushAppointmentToGoogle, removeAppointmentFromGoogle } from '@/lib/google/sync';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH — mettre à jour le statut d'un rendez-vous
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que le rendez-vous appartient à l'utilisateur
    const { data: existing, error: findError } = await supabase
      .from('appointments')
      .select('id, status, google_event_id')
      .eq('id', id)
      .eq('profile_id', user.id)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: 'Rendez-vous non trouvé' }, { status: 404 });
    }

    const body = await request.json();

    // Deux modes de mise à jour : statut du RDV ou paiement d'acompte.
    const isPrepaymentUpdate =
      body && typeof body === 'object' && 'prepayment_status' in body;

    // Embed employé tolérant : si la table employees n'existe pas encore
    // (migration en attente), on retente sans l'embed.
    const selectWithEmployee = async (base: Record<string, unknown>) => {
      const primary = await supabase
        .from('appointments')
        .update(base)
        .eq('id', id)
        .eq('profile_id', user.id)
        .select(`
          *,
          service:services(*),
          client:clients(*),
          employee:employees(id, name, position, color)
        `)
        .single();
      if (primary.error) {
        const msg = `${primary.error.message ?? ''} ${primary.error.details ?? ''}`.toLowerCase();
        if (primary.error.code === 'PGRST200' || msg.includes('employees')) {
          const fallback = await supabase
            .from('appointments')
            .update(base)
            .eq('id', id)
            .eq('profile_id', user.id)
            .select(`
              *,
              service:services(*),
              client:clients(*)
            `)
            .single();
          return fallback;
        }
      }
      return primary;
    };

    if (isPrepaymentUpdate) {
      const parsedPrepay = appointmentPrepaymentSchema.safeParse(body);
      if (!parsedPrepay.success) {
        return NextResponse.json({ error: parsedPrepay.error.issues[0].message }, { status: 400 });
      }

      // « Acompte reçu » : on enregistre le montant versé.
      // Par défaut, amount_paid = deposit_amount du rendez-vous.
      const updatePayload: Record<string, unknown> = {
        prepayment_status: parsedPrepay.data.prepayment_status,
        updated_at: new Date().toISOString(),
      };
      if (parsedPrepay.data.amount_paid != null) {
        updatePayload.amount_paid = parsedPrepay.data.amount_paid;
      } else if (parsedPrepay.data.prepayment_status === 'paid') {
        const { data: current } = await supabase
          .from('appointments')
          .select('deposit_amount')
          .eq('id', id)
          .single();
        updatePayload.amount_paid = current?.deposit_amount ?? 0;
      }

      const safePayload = stripMissingColumns('appointments', updatePayload);
      const { data, error } = await selectWithEmployee(safePayload);

      if (error) {
        console.error('Erreur appointment PATCH (acompte):', error);
        return NextResponse.json({ error: 'Erreur lors de la mise à jour de l\u2019acompte' }, { status: 500 });
      }

      return NextResponse.json({ data });
    }

    const parsed = appointmentUpdateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { data, error } = await selectWithEmployee({
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Erreur appointment PATCH:', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour du rendez-vous' }, { status: 500 });
    }

    // ── Sync Google Calendar (fire-and-forget) ──
    // Annulation → retirer l'événement Google (s'il existait).
    // Réactivation (annulé → confirmé/pending) → recréer l'événement.
    const wasCancelled = (existing as { status?: string } | null)?.status === 'cancelled';
    if (parsed.data.status === 'cancelled') {
      fireAndForget(
        removeAppointmentFromGoogle(user.id, (existing as { google_event_id?: string } | null)?.google_event_id, id),
      );
    } else if (wasCancelled) {
      fireAndForget(pushAppointmentToGoogle(id));
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Erreur inattendue appointment PATCH:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

// DELETE — supprimer un rendez-vous
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que le rendez-vous appartient à l'utilisateur
    // (google_event_id chargé pour retirer l'événement Google)
    const { data: existing, error: findError } = await supabase
      .from('appointments')
      .select('id, google_event_id')
      .eq('id', id)
      .eq('profile_id', user.id)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: 'Rendez-vous non trouvé' }, { status: 404 });
    }

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id);

    if (error) {
      console.error('Erreur appointment DELETE:', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression du rendez-vous' }, { status: 500 });
    }

    // Retirer l'événement Google associé (fire-and-forget)
    fireAndForget(
      removeAppointmentFromGoogle(user.id, (existing as { google_event_id?: string } | null)?.google_event_id, id),
    );

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error('Erreur inattendue appointment DELETE:', err);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
