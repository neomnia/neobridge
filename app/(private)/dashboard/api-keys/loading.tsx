import { Skeleton } from '@/components/ui/skeleton'

export default function ApiKeysLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-7 rounded" />
          <div className="space-y-1">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Service categories */}
      {Array.from({ length: 3 }).map((_, catIdx) => (
        <div key={catIdx} className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: catIdx === 0 ? 2 : 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 flex items-start gap-3">
                <Skeleton className="h-5 w-5 rounded-full mt-0.5 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
