'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Check,
  X,
  Gift,
  ArrowRight,
  Zap,
  Users,
  Calendar,
  BarChart3,
  Headphones,
  Shield,
  Crown,
  Phone,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface PlanFeature {
  text: string;
  icon?: LucideIcon;
}

interface Plan {
  name: string;
  price: string;
  planKey: string;
  badge?: string;
  elevated?: boolean;
  features: PlanFeature[];
  buttonStyle: 'primary' | 'amber' | 'outline';
}

interface ComparisonRow {
  feature: string;
  starter: string;
  pro: string;
  business: string;
}

const plans: Plan[] = [
  {
    name: 'Starter',
    price: '3 000 FCFA / mois',
    planKey: 'starter',
    features: [
      { text: '1 professionnel', icon: Users },
      { text: '1 agenda', icon: Calendar },
      { text: 'Page publique de réservation' },
      { text: 'Lien de réservation WhatsApp' },
      { text: 'Gestion des services et clients' },
      { text: 'Calendrier intelligent', icon: Calendar },
      { text: 'Rappels automatiques (email)' },
      { text: '50 rappels vocaux IA / mois' },
      { text: 'Statistiques basiques', icon: BarChart3 },
      { text: 'Support standard', icon: Headphones },
    ],
    buttonStyle: 'primary',
  },
  {
    name: 'Pro',
    price: '10 000 FCFA / mois',
    planKey: 'pro',
    badge: '⭐ LE PLUS POPULAIRE',
    elevated: true,
    features: [
      { text: 'Tout le plan Starter' },
      { text: '3 professionnels', icon: Users },
      { text: '3 agendas', icon: Calendar },
      { text: '200 rappels vocaux IA / mois' },
      { text: 'Rappels WhatsApp' },
      { text: 'Statistiques avancées', icon: BarChart3 },
      { text: 'Automatisations', icon: Zap },
      { text: 'Personnalisation avancée', icon: Shield },
      { text: 'Fonctionnalités IA' },
      { text: 'Support prioritaire', icon: Headphones },
    ],
    buttonStyle: 'amber',
  },
  {
    name: 'Business',
    price: '25 000 FCFA / mois',
    planKey: 'business',
    features: [
      { text: 'Tout le plan Pro' },
      { text: '10 professionnels', icon: Users },
      { text: 'Agendas illimités', icon: Calendar },
      { text: '500 rappels vocaux IA / mois' },
      { text: 'Statistiques avancées', icon: BarChart3 },
      { text: 'Automatisations avancées', icon: Zap },
      { text: 'Gestion d\'équipe' },
      { text: 'Marque blanche', icon: Crown },
      { text: 'Support premium dédié', icon: Headphones },
    ],
    buttonStyle: 'outline',
  },
];

const comparisonRows: ComparisonRow[] = [
  { feature: 'Page de réservation', starter: '✅', pro: '✅', business: '✅' },
  { feature: 'Lien WhatsApp', starter: '✅', pro: '✅', business: '✅' },
  { feature: 'Calendrier intelligent', starter: '✅', pro: '✅', business: '✅' },
  { feature: 'Gestion services', starter: '✅', pro: '✅', business: '✅' },
  { feature: 'Gestion clients', starter: '✅', pro: '✅', business: '✅' },
  { feature: 'Rappels email', starter: '✅', pro: '✅', business: '✅' },
  { feature: 'Rappels vocaux IA', starter: '50', pro: '200', business: '500' },
  { feature: 'Rappels WhatsApp', starter: '❌', pro: '✅', business: '✅' },
  { feature: 'Statistiques', starter: 'Basiques', pro: 'Avancées', business: 'Avancées' },
  { feature: 'Automatisations', starter: 'Basiques', pro: '✅', business: 'Avancées' },
  { feature: 'Équipe multi-pro', starter: '❌', pro: '3 pers.', business: '10 pers.' },
  { feature: 'Multi-agenda', starter: '❌', pro: '3', business: 'Illimité' },
  { feature: 'Marque blanche', starter: '❌', pro: '❌', business: '✅' },
  { feature: 'Support', starter: 'Standard', pro: 'Prioritaire', business: 'Premium' },
];

function getButtonClass(style: 'primary' | 'amber' | 'outline'): string {
  switch (style) {
    case 'primary':
      return 'bg-emerald-600 hover:bg-emerald-700 text-white w-full';
    case 'amber':
      return 'bg-amber-500 hover:bg-amber-600 text-white w-full';
    case 'outline':
      return 'w-full';
  }
}

function ComparisonCell({ value }: { value: string }) {
  if (value === '✅') {
    return <Check className="mx-auto size-5 text-emerald-600" />;
  }
  if (value === '❌') {
    return <X className="mx-auto size-5 text-muted-foreground/40" />;
  }
  return <span className="font-medium">{value}</span>;
}

export default function PricingPage() {
  const handlePlanSelect = useCallback((planKey: string) => {
    window.location.href = `/auth/signup?plan=${planKey}`;
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        {/* Header Section */}
        <section className="mx-auto max-w-2xl text-center">
          <Badge
            className="mb-6 gap-1.5 rounded-full border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700"
          >
            <Gift className="size-4" />
            7 JOURS GRATUITS
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            Choisissez votre plan
          </h1>
          <p className="mt-4 text-lg text-gray-500 sm:text-xl">
            7 jours d&#39;essai gratuit sur tous les plans. Aucune carte bancaire
            requise.
          </p>
        </section>

        {/* Plan Cards */}
        <section className="mt-14 grid grid-cols-1 gap-6 md:mt-16 md:grid-cols-3 md:gap-8">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={
                plan.elevated
                  ? 'relative ring-2 ring-amber-500 shadow-xl md:scale-105 md:z-10'
                  : 'border-gray-200 shadow-lg'
              }
            >
              {/* Badge at top center for Pro */}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                  <span className="inline-flex items-center rounded-full bg-amber-500 px-4 py-1.5 text-sm font-bold text-white shadow-md">
                    {plan.badge}
                  </span>
                </div>
              )}

              <CardContent className="flex flex-1 flex-col p-6 pt-8 md:p-8 md:pt-10">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-gray-900">
                      {plan.price}
                    </span>
                  </div>
                </div>

                <ul className="flex flex-1 flex-col gap-3">
                  {plan.features.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <li key={feature.text} className="flex items-start gap-3">
                        <Check className="mt-0.5 size-5 shrink-0 text-emerald-500" />
                        <span className="text-sm text-gray-600">
                          {feature.text}
                        </span>
                        {Icon && (
                          <Icon className="mt-0.5 ml-auto size-4 shrink-0 text-gray-400" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>

              <CardFooter className="p-6 pt-0 md:p-8 md:pt-0">
                <Button
                  size="lg"
                  variant={plan.buttonStyle === 'outline' ? 'outline' : 'default'}
                  className={getButtonClass(plan.buttonStyle)}
                  onClick={() => handlePlanSelect(plan.planKey)}
                >
                  Commencer l&#39;essai gratuit
                  <ArrowRight className="ml-1 size-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>

        {/* Comparison Table */}
        <section className="mt-20">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            Comparaison détaillée
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="w-1/3 font-semibold text-gray-900">
                    Fonctionnalité
                  </TableHead>
                  <TableHead className="text-center font-semibold text-gray-900">
                    Starter
                  </TableHead>
                  <TableHead className="text-center font-semibold text-amber-600">
                    Pro
                  </TableHead>
                  <TableHead className="text-center font-semibold text-gray-900">
                    Business
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map((row, index) => (
                  <TableRow
                    key={row.feature}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                  >
                    <TableCell className="font-medium text-gray-700">
                      {row.feature}
                    </TableCell>
                    <TableCell className="text-center">
                      <ComparisonCell value={row.starter} />
                    </TableCell>
                    <TableCell className="text-center">
                      <ComparisonCell value={row.pro} />
                    </TableCell>
                    <TableCell className="text-center">
                      <ComparisonCell value={row.business} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-20 text-center">
          <div className="mx-auto max-w-2xl rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 p-8 sm:p-12">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Prêt à transformer votre prise de rendez-vous ?
            </h2>
            <p className="mt-3 text-gray-500">
              Essai gratuit de 7 jours. Annulez à tout moment.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                className="bg-emerald-600 px-8 text-base hover:bg-emerald-700"
                onClick={() => handlePlanSelect('pro')}
              >
              Commencer maintenant
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 text-base"
              onClick={() => window.location.href = '/auth/signup?plan=pro&payment=mobile_money'}
            >
              <Phone className="mr-2 size-4" />
              Payer par Mobile Money
            </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
