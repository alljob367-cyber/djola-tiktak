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
// IMPORTANT — Timezone handling:
//   All wall-clock times (availability rules "09:00", slot dates)
//   are interpreted in the PROFESSIONAL's timezone, then converted
//   to exact UTC instants. This is independent of the server's
//   own timezone (Vercel runs in UTC).
//

import type { AvailableSlot } from '@/types/database';

interface TimeRange {
  start: number; // minutes from midnight
  end: number;
}

/**
 * Returns the offset (in ms) of `timeZone` at the given instant,
 * such that: utcInstant = localWallClock - offset
 */
function getTimezoneOffsetMs(timeZone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = dtf.formatToParts(at);
  const get = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');

  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );

  return asUTC - at.getTime();
}

/**
 * Converts a wall-clock time (dateStr "YYYY-MM-DD" + minutes from
 * midnight) in `timeZone` to the exact UTC instant.
 */
export function zonedTimeToUtc(dateStr: string, minutes: number, timeZone: string): Date {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const naive = new Date(
    `${dateStr}T${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00Z`
  );

  // Offset of the timezone at (approximately) that instant
  let offset = getTimezoneOffsetMs(timeZone, naive);
  // Refine once to handle DST boundaries precisely
  offset = getTimezoneOffsetMs(timeZone, new Date(naive.getTime() - offset));

  return new Date(naive.getTime() - offset);
}

/**
 * Formats a Date as "YYYY-MM-DD" in the given timezone.
 */
export function formatDateISO(date: Date, timezone?: string): string {
  if (timezone) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

  // The calendar day being requested, as "YYYY-MM-DD" in the pro's timezone
  const dateStr = formatDateISO(date, timezone);

  // Day of week (0=Sunday, 6=Saturday) for that local calendar date.
  // IMPORTANT : calculé depuis la date du calendrier elle-même (midi UTC),
  // PAS depuis l'instant UTC de minuit local (qui peut tomber la veille
  // en UTC pour les fuseaux positifs, ex: Africa/Malabo UTC+1).
  const jsDay = new Date(`${dateStr}T12:00:00Z`).getUTCDay();

  // Filter availability for this day
  const dayAvailability = availability
    .filter((a) => a.day_of_week === jsDay && a.is_active)
    .map((a) => ({
      start: timeToMinutes(a.start_time),
      end: timeToMinutes(a.end_time),
    }))
    .sort((a, b) => a.start - b.start);

  if (dayAvailability.length === 0) return [];

  // Day boundaries in the professional's timezone, as UTC instants
  const dayStart = zonedTimeToUtc(dateStr, 0, timezone);
  const dayEnd = zonedTimeToUtc(dateStr, 24 * 60, timezone);

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
      const slotStart = zonedTimeToUtc(dateStr, currentMinutes, timezone);
      const slotEnd = zonedTimeToUtc(dateStr, currentMinutes + durationMinutes, timezone);

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

/** Get the next N days (starting from tomorrow) as Date objects */
export function getNextDays(count: number, timezone: string = 'Africa/Malabo'): Date[] {
  const days: Date[] = [];
  const now = new Date();
  // Today's date (YYYY-MM-DD) in the target timezone
  const todayStr = formatDateISO(now, timezone);
  const today = zonedTimeToUtc(todayStr, 12 * 60, timezone); // noon to be safe

  for (let i = 1; i <= count; i++) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() + i);
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
