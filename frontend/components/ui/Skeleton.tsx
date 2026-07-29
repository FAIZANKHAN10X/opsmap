import { cn } from "@/lib/cn";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--ops-radius)] bg-[var(--ops-surface-active)]",
        className,
      )}
      aria-hidden
    />
  );
}
