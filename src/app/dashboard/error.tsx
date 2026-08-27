'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erreur dashboard:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold">
        Erreur de chargement
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "Impossible de charger cette page. Réessayez."}
      </p>
      <Button onClick={reset} variant="outline">
        Réessayer
      </Button>
    </div>
  );
}
