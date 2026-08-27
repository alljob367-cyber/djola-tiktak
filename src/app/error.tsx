'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erreur globale:', error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="bg-background text-foreground antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">
            Une erreur inattendue s&rsquo;est produite
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {error.message || "Quelque chose s'est mal passé. Veuillez réessayer."}
          </p>
          <Button onClick={reset} variant="outline">
            Réessayer
          </Button>
        </div>
      </body>
    </html>
  );
}
