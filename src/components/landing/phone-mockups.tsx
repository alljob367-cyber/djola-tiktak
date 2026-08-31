'use client';

/* ============================================================
 * Mockups téléphone de l'app mobile Djola TikTak
 * Cadre iPhone en CSS pur + écrans animés framer-motion
 * ============================================================ */

import { motion } from 'framer-motion';
import {
  Bell,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Home,
  MessageCircle,
  Scissors,
  Search,
  Settings,
  Sparkles,
  User,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';

/* ---------- Cadre iPhone ---------- */
function PhoneFrame({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative w-[270px] shrink-0 rounded-[44px] border border-white/15 bg-[#0c0f0e] p-[10px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] ${className}`}
    >
      {/* Boutons latéraux */}
      <div className="absolute -left-[2px] top-24 h-16 w-[3px] rounded-full bg-white/20" />
      <div className="absolute -left-[2px] top-44 h-10 w-[3px] rounded-full bg-white/20" />
      <div className="absolute -right-[2px] top-32 h-20 w-[3px] rounded-full bg-white/20" />

      {/* Écran */}
      <div className="relative overflow-hidden rounded-[36px] bg-[#0a0f0d]">
        {/* Encoche dynamique */}
        <div className="absolute left-1/2 top-2 z-20 h-7 w-28 -translate-x-1/2 rounded-full bg-black" />
        {/* Barre d'état */}
        <div className="relative z-10 flex items-center justify-between px-7 pt-3 text-[10px] font-semibold text-white">
          <span>09:41</span>
          <span className="flex items-center gap-1">
            {/* Réseau */}
            <svg viewBox="0 0 18 12" className="h-2.5 w-3.5 fill-white">
              <rect x="0" y="8" width="3" height="4" rx="0.5" />
              <rect x="5" y="6" width="3" height="6" rx="0.5" />
              <rect x="10" y="3" width="3" height="9" rx="0.5" />
              <rect x="15" y="0" width="3" height="12" rx="0.5" />
            </svg>
            {/* Batterie */}
            <svg viewBox="0 0 26 12" className="h-2.5 w-5">
              <rect x="0.5" y="0.5" width="21" height="11" rx="3" fill="none" stroke="white" strokeOpacity="0.5" />
              <rect x="2" y="2" width="16" height="8" rx="1.5" className="fill-lime" />
              <rect x="23" y="4" width="2.5" height="4" rx="1" fill="white" fillOpacity="0.5" />
            </svg>
          </span>
        </div>
        {children}
        {/* Home indicator */}
        <div className="absolute bottom-1.5 left-1/2 z-20 h-1 w-24 -translate-x-1/2 rounded-full bg-white/30" />
      </div>
    </div>
  );
}

/* ---------- Écran 1 : Accueil ---------- */
function HomeScreen() {
  const { t } = useI18n();
  const m = t.landing.appScreens;
  return (
    <div className="flex h-[520px] flex-col px-5 pb-6 pt-12">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-lime/30 to-emerald-800 text-sm font-bold text-lime ring-2 ring-lime/40">
            AS
          </div>
          <div>
            <p className="text-[10px] text-gray-500">{m.hello}</p>
            <p className="text-sm font-bold text-white">Awa S.</p>
          </div>
        </div>
        <div className="relative">
          <Bell className="h-5 w-5 text-gray-400" />
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-lime text-[8px] font-bold text-black">
            3
          </span>
        </div>
      </div>

      {/* Prochain RDV */}
      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="mt-5 rounded-2xl bg-gradient-to-br from-lime/20 to-transparent p-4 ring-1 ring-lime/30"
      >
        <p className="text-[9px] font-semibold uppercase tracking-widest text-lime">{m.nextAppointment}</p>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">{m.appointmentName}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-400">
              <Clock className="h-3 w-3" /> {m.appointmentTime}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime">
            <Scissors className="h-5 w-5 text-black" />
          </div>
        </div>
      </motion.div>

      {/* Services populaires */}
      <p className="mt-5 text-[10px] font-semibold uppercase tracking-widest text-gray-500">{m.popularServices}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {m.services.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.15 }}
            className={`rounded-xl p-3 ring-1 ${i === 0 ? 'bg-lime/10 ring-lime/40' : 'bg-white/[0.04] ring-white/10'}`}
          >
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${i === 0 ? 'bg-lime/20' : 'bg-white/10'}`}>
              <Sparkles className={`h-3.5 w-3.5 ${i === 0 ? 'text-lime' : 'text-gray-400'}`} />
            </div>
            <p className="mt-2 text-[11px] font-semibold text-white">{s.name}</p>
            <p className="text-[9px] text-gray-500">{s.price}</p>
          </motion.div>
        ))}
      </div>

      {/* Stats du jour */}
      <div className="mt-4 flex gap-2">
        <div className="flex-1 rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10">
          <p className="text-lg font-extrabold text-lime">12</p>
          <p className="text-[9px] text-gray-500">{m.todayCount}</p>
        </div>
        <div className="flex-1 rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10">
          <p className="text-lg font-extrabold text-white">68k</p>
          <p className="text-[9px] text-gray-500">{m.todayRevenue}</p>
        </div>
      </div>

      {/* Barre de navigation */}
      <div className="mt-auto flex items-center justify-around rounded-2xl bg-white/[0.05] py-3 ring-1 ring-white/10 backdrop-blur">
        <Home className="h-5 w-5 text-lime" />
        <CalendarCheck className="h-5 w-5 text-gray-600" />
        <MessageCircle className="h-5 w-5 text-gray-600" />
        <User className="h-5 w-5 text-gray-600" />
      </div>
    </div>
  );
}

/* ---------- Écran 2 : Réservation ---------- */
function BookingScreen() {
  const { t } = useI18n();
  const m = t.landing.appScreens;
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  return (
    <div className="flex h-[520px] flex-col px-5 pb-6 pt-12">
      {/* Barre de recherche */}
      <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2.5 ring-1 ring-white/10">
        <Search className="h-4 w-4 text-gray-500" />
        <span className="text-[11px] text-gray-500">{m.searchPlaceholder}</span>
      </div>

      {/* Sélecteur de date */}
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-gray-500">{m.pickDate}</p>
      <div className="mt-2 flex items-center justify-between">
        {days.map((d, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.08 }}
            className={`flex h-11 w-11 flex-col items-center justify-center rounded-2xl text-center ${
              i === 2 ? 'bg-lime text-black' : 'bg-white/[0.04] text-gray-400'
            }`}
          >
            <span className="text-[8px] font-medium uppercase">{d}</span>
            <span className="text-sm font-bold">{[28, 29, 30, 31, 1, 2, 3][i]}</span>
          </motion.div>
        ))}
      </div>

      {/* Créneaux */}
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-gray-500">{m.pickTime}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((slot, i) => (
          <motion.div
            key={slot}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 + i * 0.1 }}
            className={`rounded-xl py-2.5 text-center text-[11px] font-semibold ${
              i === 3
                ? 'bg-lime text-black ring-2 ring-lime'
                : i === 1
                  ? 'bg-lime/10 text-lime ring-1 ring-lime/40'
                  : 'bg-white/[0.04] text-gray-400 ring-1 ring-white/10'
            }`}
          >
            {slot}
          </motion.div>
        ))}
      </div>

      {/* Confirmation */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
        className="mt-5 rounded-2xl bg-gradient-to-br from-lime/15 to-transparent p-4 ring-1 ring-lime/30"
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-lime" />
          <div>
            <p className="text-xs font-bold text-white">{m.confirmTitle}</p>
            <p className="text-[10px] text-gray-400">{m.confirmSubtitle}</p>
          </div>
        </div>
      </motion.div>

      {/* Bouton */}
      <motion.button
        animate={{ boxShadow: ['0 0 0px rgba(200,255,0,0)', '0 0 24px rgba(200,255,0,0.35)', '0 0 0px rgba(200,255,0,0)'] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        className="mt-auto flex items-center justify-center gap-2 rounded-2xl bg-lime py-3.5 text-sm font-bold text-black"
      >
        {m.bookButton}
        <ChevronRight className="h-4 w-4" />
      </motion.button>
    </div>
  );
}

/* ---------- Écran 3 : Rappels ---------- */
function ReminderScreen() {
  const { t } = useI18n();
  const m = t.landing.appScreens;
  return (
    <div className="flex h-[520px] flex-col px-5 pb-6 pt-12">
      <p className="text-sm font-bold text-white">{m.remindersTitle}</p>
      <p className="mt-1 text-[10px] text-gray-500">{m.remindersSubtitle}</p>

      <div className="mt-4 flex flex-col gap-3">
        {/* Rappel WhatsApp */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          className="rounded-2xl bg-[#075E54]/30 p-3.5 ring-1 ring-[#25D366]/30"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#25D366]/20">
              <MessageCircle className="h-4 w-4 text-[#25D366]" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold text-white">WhatsApp</p>
              <p className="text-[9px] text-gray-400">{m.reminderWhatsApp}</p>
            </div>
            <span className="rounded-full bg-[#25D366]/20 px-2 py-0.5 text-[8px] font-bold text-[#25D366]">✓ {m.sent}</span>
          </div>
        </motion.div>

        {/* Rappel vocal IA */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.9, type: 'spring', stiffness: 200 }}
          className="rounded-2xl bg-violet-500/10 p-3.5 ring-1 ring-violet-400/30"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20">
              {/* Ondes vocales */}
              <div className="flex items-end gap-0.5">
                <span className="h-2 w-0.5 rounded-full bg-violet-400" />
                <span className="h-3.5 w-0.5 rounded-full bg-violet-400" />
                <span className="h-2.5 w-0.5 rounded-full bg-violet-400" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold text-white">{m.reminderVoice}</p>
              <p className="text-[9px] text-gray-400">{m.reminderVoiceDesc}</p>
            </div>
            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[8px] font-bold text-violet-300">✓ {m.sent}</span>
          </div>
        </motion.div>

        {/* Email */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.3, type: 'spring', stiffness: 200 }}
          className="rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/10"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
              {/* Icône enveloppe */}
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-gray-300" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="3" />
                <path d="m3 6 9 7 9-7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold text-white">{m.reminderEmail}</p>
              <p className="text-[9px] text-gray-400">{m.reminderEmailDesc}</p>
            </div>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[8px] font-bold text-gray-300">✓ {m.sent}</span>
          </div>
        </motion.div>
      </div>

      {/* Taux de réussite */}
      <motion.div
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="mt-5 rounded-2xl bg-gradient-to-br from-lime/15 to-transparent p-4 ring-1 ring-lime/30"
      >
        <p className="text-[9px] font-semibold uppercase tracking-widest text-lime">{m.successRate}</p>
        <div className="mt-2 flex items-end gap-2">
          <p className="text-3xl font-extrabold text-white">-78%</p>
          <p className="pb-1 text-[10px] text-gray-400">{m.noShowReduction}</p>
        </div>
        {/* Barre de progression */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '78%' }}
            transition={{ delay: 1.6, duration: 1.2, ease: 'easeOut' }}
            className="h-full rounded-full bg-lime"
          />
        </div>
      </motion.div>

      <div className="mt-auto flex items-center justify-around rounded-2xl bg-white/[0.05] py-3 ring-1 ring-white/10 backdrop-blur">
        <Home className="h-5 w-5 text-gray-600" />
        <CalendarCheck className="h-5 w-5 text-gray-600" />
        <MessageCircle className="h-5 w-5 text-lime" />
        <Settings className="h-5 w-5 text-gray-600" />
      </div>
    </div>
  );
}

/* ---------- Section complète : 3 téléphones ---------- */
export function AppMockups() {
  const { t } = useI18n();
  const m = t.landing.appScreens;

  return (
    <div className="relative mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-6 px-6 py-16 lg:px-12">
      {/* Halo derrière */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime/[0.05] blur-[130px]" />

      {/* Téléphone 1 — Accueil */}
      <motion.div
        initial={{ opacity: 0, y: 60, rotate: -8 }}
        whileInView={{ opacity: 1, y: 0, rotate: -6 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ type: 'spring', stiffness: 60, damping: 14 }}
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <PhoneFrame>
            <HomeScreen />
          </PhoneFrame>
          <p className="mt-4 text-center text-xs font-semibold text-gray-500">{m.screenHomeLabel}</p>
        </motion.div>
      </motion.div>

      {/* Téléphone 2 — Réservation (central, plus grand) */}
      <motion.div
        initial={{ opacity: 0, y: 80, scale: 0.9 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ type: 'spring', stiffness: 60, damping: 14, delay: 0.15 }}
        className="z-10"
      >
        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        >
          <PhoneFrame className="ring-1 ring-lime/25">
            <BookingScreen />
          </PhoneFrame>
          <p className="mt-4 text-center text-xs font-semibold text-gray-400">{m.screenBookingLabel}</p>
        </motion.div>
      </motion.div>

      {/* Téléphone 3 — Rappels */}
      <motion.div
        initial={{ opacity: 0, y: 60, rotate: 8 }}
        whileInView={{ opacity: 1, y: 0, rotate: 6 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ type: 'spring', stiffness: 60, damping: 14, delay: 0.3 }}
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        >
          <PhoneFrame>
            <ReminderScreen />
          </PhoneFrame>
          <p className="mt-4 text-center text-xs font-semibold text-gray-500">{m.screenRemindersLabel}</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
