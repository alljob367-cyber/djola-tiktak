import Link from 'next/link';
import { 
  CalendarCheck, 
  ArrowRight, 
  Scissors, 
  Camera, 
  Wrench, 
  UtensilsCrossed,
  Sparkles,
  Clock,
  Shield,
  Smartphone,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const professions = [
  { icon: Scissors, label: 'Coiffeurs & Barbiers' },
  { icon: Sparkles, label: 'Esthéticiennes' },
  { icon: Camera, label: 'Photographes' },
  { icon: Wrench, label: 'Réparateurs & Garages' },
  { icon: UtensilsCrossed, label: 'Restaurants' },
  { icon: CalendarCheck, label: 'Consultants & Coaches' },
];

const features = [
  {
    icon: Clock,
    title: 'Page de réservation automatique',
    description: 'Créez votre profil, ajoutez vos prestations et obtenez immédiatement une page de réservation personnalisée que vous pouvez partager.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-first',
    description: 'Vos clients réservent facilement depuis leur téléphone. Interface conçue pour une utilisation rapide et intuitive.',
  },
  {
    icon: Shield,
    title: 'Anti double réservation',
    description: 'Protection avancée contre les chevauchements de rendez-vous. Un créneau réservé ne peut plus être pris par quelqu\'un d\'autre.',
  },
  {
    icon: Globe,
    title: 'Rappels automatiques',
    description: 'Système de rappels par email, SMS, WhatsApp et appel vocal pour réduire les absences et les oublis.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Djola TikTak</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Connexion
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-emerald-600 hover:bg-emerald-700" size="sm">
                Commencer gratuitement
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/50" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Simple, rapide et gratuit pour démarrer
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
                Vos rendez-vous,{' '}
                <span className="text-emerald-600">simplifiés</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Créez votre page de réservation en quelques minutes.
                Vos clients réservent en ligne, vous gérez tout depuis votre tableau de bord.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-base px-8 h-12">
                    Créer ma page de réservation
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg" className="text-base px-8 h-12">
                    J'ai déjà un compte
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Professions */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Pour tous les prestataires locaux
              </h2>
              <p className="mt-3 text-gray-500 max-w-xl mx-auto">
                Que vous soyez coiffeur, barbier, photographe ou consultant, Djola TikTak s'adapte à votre activité.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {professions.map((p) => (
                <Card key={p.label} className="border-dashed hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors">
                  <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <p.icon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{p.label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 sm:py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Tout ce dont vous avez besoin
              </h2>
              <p className="mt-3 text-gray-500 max-w-xl mx-auto">
                Un système complet de gestion de rendez-vous, pensé pour les petites entreprises.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {features.map((f) => (
                <Card key={f.title} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6 sm:p-8">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                      <f.icon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{f.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Comment ça marche
              </h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { step: '1', title: 'Créez votre profil', desc: 'Inscrivez-vous, ajoutez vos prestations, prix et durées.' },
                { step: '2', title: 'Partagez votre lien', desc: 'Obtenez votre page /votre-nom et partagez-la avec vos clients.' },
                { step: '3', title: 'Recevez des RDV', desc: 'Vos clients réservent en ligne. Gérez tout depuis votre tableau de bord.' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-600 text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-20 bg-emerald-600">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Prêt à simplifier vos rendez-vous ?
            </h2>
            <p className="text-emerald-100 text-lg mb-8 max-w-xl mx-auto">
              Créez votre compte gratuit et commencez à recevoir des réservations en ligne dès aujourd'hui.
            </p>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-base px-8 h-12">
                Commencer maintenant
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold">Djola TikTak</span>
          </div>
          <p className="text-sm text-gray-500">
            Prise de rendez-vous par Djola
          </p>
        </div>
      </footer>
    </div>
  );
}
