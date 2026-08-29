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
import { useI18n } from '@/i18n/provider';
import { LanguageSwitcher } from '@/i18n/language-switcher';
import { SiteFooter } from '@/components/landing/site-footer';

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
  const { t } = useI18n();
  const P = t.pricingPage;
  const FEATURE_ICONS_PLAN: Array<Array<LucideIcon | undefined>> = [
    [Users, Calendar, undefined, undefined, undefined, Calendar, undefined, undefined, BarChart3, Headphones],
    [undefined, Users, Calendar, undefined, undefined, BarChart3, Zap, Shield, undefined, Headphones],
    [undefined, Users, Calendar, undefined, BarChart3, Zap, undefined, Crown, Headphones],
  ];
  const PLAN_KEYS = ['starter', 'pro', 'business'];
  const handlePlanSelect = useCallback((planKey: string) => {
    window.location.href = `/register?plan=${planKey}`;
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <div className="fixed right-4 top-4 z-50"><LanguageSwitcher compact /></div>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        {/* Header Section */}
        <section className="mx-auto max-w-2xl text-center">
          <Badge
            className="mb-6 gap-1.5 rounded-full border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700"
          >
            <Gift className="size-4" />
            {P.trialBadge}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            {P.title}
          </h1>
          <p className="mt-4 text-lg text-gray-500 sm:text-xl">
            {P.subtitle}
          </p>
        </section>

        {/* Plan Cards */}
        <section className="mt-14 grid grid-cols-1 gap-6 md:mt-16 md:grid-cols-3 md:gap-8">
          {P.plans.map((plan, i) => (
            <Card
              key={plan.name}
              className={
                i === 1
                  ? 'relative ring-2 ring-amber-500 shadow-xl md:scale-105 md:z-10'
                  : 'border-gray-200 shadow-lg'
              }
            >
              {/* Badge at top center for Pro */}
              {i === 1 && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                  <span className="inline-flex items-center rounded-full bg-amber-500 px-4 py-1.5 text-sm font-bold text-white shadow-md">
                    ⭐ {t.landing.pricing.popular.toUpperCase()}
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
                  {plan.features.map((feature, fi) => {
                    const Icon = FEATURE_ICONS_PLAN[i]?.[fi];
                    return (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="mt-0.5 size-5 shrink-0 text-emerald-500" />
                        <span className="text-sm text-gray-600">
                          {feature}
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
                  variant={i === 2 ? 'outline' : 'default'}
                  className={getButtonClass(i === 0 ? 'primary' : i === 1 ? 'amber' : 'outline')}
                  onClick={() => handlePlanSelect(PLAN_KEYS[i])}
                >
                  {P.startTrial}
                  <ArrowRight className="ml-1 size-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>

        {/* Comparison Table */}
        <section className="mt-20">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            {P.comparisonTitle}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="w-1/3 font-semibold text-gray-900">
                    {P.tableFeature}
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
                {P.comparison.map((row, index) => (
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
              {P.ctaTitle}
            </h2>
            <p className="mt-3 text-gray-500">
              {P.ctaSubtitle}
            </p>
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                className="bg-emerald-600 px-8 text-base hover:bg-emerald-700"
                onClick={() => handlePlanSelect('pro')}
              >
              {P.ctaStart}
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 text-base"
              onClick={() => window.location.href = '/register?plan=pro&payment=mobile_money'}
            >
              <Phone className="mr-2 size-4" />
              {P.ctaMobileMoney}
            </Button>
            </div>
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
