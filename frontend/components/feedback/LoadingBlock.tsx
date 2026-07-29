import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

type LoadingBlockProps = {
  className?: string;
  rows?: number;
};

export function LoadingBlock({ className, rows = 4 }: LoadingBlockProps) {
  return (
    <div className={cn("space-y-3 p-4", className)} aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i % 2 === 0 ? "w-3/4" : "w-1/2")}
        />
      ))}
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-[var(--ops-radius)] border border-[var(--ops-border)] bg-[var(--ops-surface)] p-4">
      <Skeleton className="mb-3 h-3 w-20" />
      <Skeleton className="h-7 w-16" />
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div
      className="flex h-full w-full flex-col gap-3 p-6"
      aria-busy="true"
      aria-label="Loading map"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="min-h-[280px] flex-1 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}
