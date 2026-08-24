// ============================================================
// Availability Engine — computes available slots for booking
// ============================================================
//
// Algorithm:
//   1. Get the professional's weekly availability for the given day
//   2. Subtract blocked_slots that overlap with the date range
//   3. Subtract existing appointments (non-cancelled)
//   4. Generate slots of `duration_minutes` length
//   5. Only return slots that start in the future
//

import type { AvailableSlot } from '@/types/database';

interface TimeRange {
  start: number; // minutes from midnight
  end: number;
}

export function generateAvailableSlots(params: {
  availability: { day_of_week: number; start_time: string; end_time: string; is_active: boolean }[];
  blockedSlots: { starts_at: string; ends_at: string }[];
  appointments: { starts_at: string; ends_at: string; status: string }[];
  date: Date;
  durationMinutes: number;
  slotInterval?: number;
  timezone: string;
}): AvailableSlot[] {
  const {
    availability,
    blockedSlots,
    appointments,
    date,
    durationMinutes,
    slotInterval = 15,
    timezone,
  } = params;

  const slots: AvailableSlot[] = [];

  // Get day of week (0=Sunday, 6=Saturday)
  const jsDay = date.getDay();

  // Filter availability for this day
  const dayAvailability = availability
    .filter((a) => a.day_of_week === jsDay && a.is_active)
    .map((a) => ({
      start: timeToMinutes(a.start_time),
      end: timeToMinutes(a.end_time),
    }))
    .sort((a, b) => a.start - b.start);

  if (dayAvailability.length === 0) return [];

  // Build date boundaries in the professional's timezone
  const dateStr = formatDateISO(date);
  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59`);

  // Now (don't show past slots)
  const now = new Date();

  // Collect occupied ranges (blocked + active appointments)
  const occupied: { start: Date; end: Date }[] = [];

  for (const slot of blockedSlots) {
    const start = new Date(slot.starts_at);
    const end = new Date(slot.ends_at);
    if (start < dayEnd && end > dayStart) {
      occupied.push({ start, end });
    }
  }

  for (const apt of appointments) {
    if (apt.status === 'cancelled') continue;
    const start = new Date(apt.starts_at);
    const end = new Date(apt.ends_at);
    if (start < dayEnd && end > dayStart) {
      occupied.push({ start, end });
    }
  }

  // For each availability window, generate slots
  for (const window of dayAvailability) {
    let currentMinutes = window.start;
    const windowEnd = window.end;

    while (currentMinutes + durationMinutes <= windowEnd) {
      const slotStart = minutesToDate(date, currentMinutes);
      const slotEnd = minutesToDate(date, currentMinutes + durationMinutes);

      // Don't show past slots
      if (slotEnd <= now) {
        currentMinutes += slotInterval;
        continue;
      }

      // Check if slot overlaps with any occupied range
      const overlaps = occupied.some(
        (occ) => slotStart < occ.end && slotEnd > occ.start
      );

      if (!overlaps) {
        slots.push({
          starts_at: slotStart,
          ends_at: slotEnd,
        });
      }

      currentMinutes += slotInterval;
    }
  }

  return slots;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToDate(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get the next N days (starting from tomorrow) as Date objects */
export function getNextDays(count: number, timezone: string = 'Africa/Malabo'): Date[] {
  const days: Date[] = [];
  const now = new Date();
  // Get current date in target timezone approximation
  const today = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= count; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    days.push(day);
  }
  return days;
}

export const DAY_NAMES_FR = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi',
];

export const DAY_NAMES_SHORT_FR = [
  'Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam',
];

export const MONTH_NAMES_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export function formatCurrency(amount: number, currency: string = 'XAF'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency === 'XAF' ? 'XAF' : currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
