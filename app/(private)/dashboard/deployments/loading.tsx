import { Skeleton } from '@/components/ui/skeleton'

export default function DeploymentsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-7 rounded" />
          <div className="space-y-1">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border bg-card">
        <div className="p-5">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="border-t">
          {/* Header row */}
          <div className="flex gap-4 p-3 border-b">
            {['w-24', 'w-16', 'w-16', 'w-20', 'w-32', 'w-20'].map((w, i) => (
              <Skeleton key={i} className={`h-4 ${w}`} />
            ))}
          </div>
          {/* Body rows */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 border-b last:border-b-0">
              <div className="flex items-center gap-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-16 hidden md:block" />
              <Skeleton className="h-4 w-36 hidden lg:block" />
              <Skeleton className="h-3 w-24 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
