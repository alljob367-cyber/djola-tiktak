'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CalendarCheck, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

const features = [
  {
    icon: CalendarCheck,
    title: 'Gérez vos rendez-vous',
    description: 'Créez vos services, définissez vos disponibilités et recevez des réservations automatiquement.',
  },
  {
    icon: Users,
    title: 'Fidélisez vos clients',
    description: 'Chaque client a son profil. Suivez l\'historique et envoyez des rappels automatiques.',
  },
  {
    icon: Zap,
    title: 'Gagnez du temps',
    description: 'Plus besoin de gérer vos rendez-vous par téléphone. Tout se fait en ligne, 24h/24.',
  },
];

export function WelcomeModal({ businessName }: { businessName: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('djola-welcome-dismissed');
    if (!dismissed) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('djola-welcome-dismissed', 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0 border-0 shadow-2xl">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-lime-500 px-6 pt-8 pb-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Image src="/logo.png" alt="Djola TikTak" width={48} height={48} className="rounded-xl shadow-lg" />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold">Bienvenue !</h2>
                <p className="text-emerald-100 text-sm mt-0.5">{businessName}</p>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4"
          >
            <p className="text-emerald-50 text-sm leading-relaxed">
              Merci d\'avoir choisi <span className="font-bold">Djola TikTak</span> !
              Vous êtes à quelques étapes de recevoir vos premières réservations en ligne.
            </p>
          </motion.div>

          {/* Decorative elements */}
          <div className="absolute top-3 right-3">
            <Sparkles className="h-6 w-6 text-white/30" />
          </div>
        </div>

        {/* Features */}
        <div className="px-6 py-5 space-y-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex gap-3.5"
              >
                <div className="shrink-0 h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mt-0.5">
                  <Icon className="h-[18px] w-[18px] text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{feature.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <Button
            onClick={handleDismiss}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all duration-200 shadow-md shadow-emerald-200 dark:shadow-emerald-900/30"
          >
            Commencer maintenant
          </Button>
          <button
            onClick={handleDismiss}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-3 transition-colors"
          >
            Plus tard
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
