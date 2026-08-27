import Link from 'next/link';
import { ArrowLeft, CalendarX } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-stone-50 via-white to-emerald-50/40">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-emerald-100 p-6">
            <CalendarX className="size-12 text-emerald-600" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900">404</h1>
        <p className="text-lg text-gray-500">
          Page introuvable. Cette page n'existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
