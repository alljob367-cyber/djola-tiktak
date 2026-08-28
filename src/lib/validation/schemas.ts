import { z } from 'zod';

// ============================================================
// Zod validation schemas for all entities
// ============================================================

export const profileSchema = z.object({
  business_name: z.string().min(1, 'Le nom est requis').max(100),
  slug: z
    .string()
    .min(3, 'Le slug doit faire au moins 3 caractères')
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Format invalide. Utilisez des lettres minuscules et des tirets.'),
  description: z.string().max(500).default(''),
  phone: z.string().max(20).default(''),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  currency: z.string().default('XAF'),
  timezone: z.string().default('Africa/Malabo'),
  avatar_url: z.string().max(500).optional().or(z.literal('')),
  whatsapp_url: z.string().max(300).optional().or(z.literal('')),
  facebook_url: z.string().max(300).optional().or(z.literal('')),
  instagram_url: z.string().max(300).optional().or(z.literal('')),
  tiktok_url: z.string().max(300).optional().or(z.literal('')),
  website_url: z.string().max(300).optional().or(z.literal('')),
  // Local payment methods
  payment_methods_enabled: z.boolean().optional().default(false),
  orange_money_phone: z.string().max(30).optional().or(z.literal('')),
  orange_money_name: z.string().max(100).optional().or(z.literal('')),
  mtn_momo_phone: z.string().max(30).optional().or(z.literal('')),
  mtn_momo_name: z.string().max(100).optional().or(z.literal('')),
  payment_instructions: z.string().max(500).optional().or(z.literal('')),
});

export const serviceSchema = z.object({
  name: z.string().min(1, 'Le nom du service est requis').max(100),
  description: z.string().max(300).default(''),
  price: z.coerce.number().int().min(0, 'Le prix ne peut pas être négatif'),
  duration_minutes: z.coerce.number().int().min(5, 'La durée minimale est de 5 minutes').max(480, 'La durée maximale est de 8 heures'),
  is_active: z.boolean().default(true),
  image_url: z.string().max(500).nullable().optional(),
});

export const clientSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
  phone: z.string().min(1, 'Le téléphone est requis').max(20),
  email: z.string().email('Email invalide').optional().or(z.literal('')).default(''),
  notes: z.string().max(500).default(''),
});

export const appointmentStatusSchema = z.enum([
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
]);

export const appointmentCreateSchema = z.object({
  service_id: z.string().uuid('ID de service invalide'),
  client_name: z.string().min(1, 'Le nom est requis').max(100),
  client_phone: z.string().min(1, 'Le téléphone est requis').max(20),
  client_email: z.string().email('Email invalide').optional().or(z.literal('')).default(''),
  starts_at: z.string().min(1, 'La date est requise').refine(
    (v) => !isNaN(Date.parse(v)),
    { message: 'Format de date ISO invalide' },
  ),
  notes: z.string().max(300).optional().default(''),
});

export const appointmentUpdateStatusSchema = z.object({
  status: appointmentStatusSchema,
});

export const availabilitySchema = z.object({
  day_of_week: z.coerce.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:mm requis'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:mm requis'),
  is_active: z.boolean().default(true),
});

export const blockedSlotSchema = z.object({
  starts_at: z.string().min(1, 'La date de début est requise').refine(
    (v) => !isNaN(Date.parse(v)),
    { message: 'Format de date ISO invalide' },
  ),
  ends_at: z.string().min(1, 'La date de fin est requise').refine(
    (v) => !isNaN(Date.parse(v)),
    { message: 'Format de date ISO invalide' },
  ),
  reason: z.string().max(200).default(''),
});

export const publicBookingSchema = z.object({
  service_id: z.string().uuid('ID de service invalide'),
  client_name: z.string().min(1, 'Le nom est requis').max(100),
  client_phone: z.string().min(1, 'Le téléphone est requis').max(20),
  client_email: z.string().email('Email invalide').optional().or(z.literal('')).default(''),
  starts_at: z.string().min(1, 'La date est requise').refine(
    (v) => !isNaN(Date.parse(v)),
    { message: 'Format de date ISO invalide' },
  ),
  prepayment: z.enum(['pending', 'none', 'paid']).optional().default('none'),
  notes: z.string().max(300).optional().default(''),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type AppointmentCreateInput = z.infer<typeof appointmentCreateSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type BlockedSlotInput = z.infer<typeof blockedSlotSchema>;
export type PublicBookingInput = z.infer<typeof publicBookingSchema>;
