// ============================================================
// RDV Local — TypeScript types matching the PostgreSQL schema
// ============================================================

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type ReminderChannel = 'email' | 'whatsapp' | 'sms' | 'voice';
export type ReminderStatus = 'pending' | 'sent' | 'failed';

export interface Profile {
  id: string;
  business_name: string;
  slug: string | null;
  description: string;
  phone: string;
  email: string;
  avatar_url: string;
  currency: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  profile_id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  profile_id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  profile_id: string;
  service_id: string;
  client_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Availability {
  id: string;
  profile_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlockedSlot {
  id: string;
  profile_id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  appointment_id: string;
  channel: string;
  status: string;
  sent_at: string | null;
  error_message: string;
  created_at: string;
}

// Joined types for API responses
export interface AppointmentWithDetails extends Appointment {
  service: Service;
  client: Client;
}

export interface ProfileWithServices extends Profile {
  services: Service[];
}

// Available slot computed type
export interface AvailableSlot {
  starts_at: Date;
  ends_at: Date;
}

// Booking form input
export interface BookingInput {
  service_id: string;
  starts_at: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  notes?: string;
}
