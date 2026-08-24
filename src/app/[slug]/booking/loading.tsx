import { Skeleton } from '@/components/ui/skeleton';

export default function BookingLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-6 sm:px-6">
        {/* Header row */}
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="h-6 w-48" />
        </div>

        {/* Stepper skeleton */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center">
              <Skeleton className="size-10 rounded-full sm:size-11" />
              {i < 4 && <Skeleton className="mx-1.5 h-0.5 w-6 sm:mx-2 sm:w-10" />}
            </div>
          ))}
        </div>

        {/* Service summary bar skeleton */}
        <Skeleton className="mb-4 h-16 w-full rounded-xl" />

        {/* Content area — mimics service selection cards */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border p-4"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="size-6 rounded-full" />
            </div>
          ))}
        </div>

        {/* Bottom navigation skeleton */}
        <div className="mt-8 flex items-center gap-3">
          <Skeleton className="size-12 rounded-md" />
          <Skeleton className="h-12 flex-1 rounded-md" />
        </div>
      </div>
    </div>
  );
}
