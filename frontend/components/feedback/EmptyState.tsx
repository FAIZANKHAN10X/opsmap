import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  title?: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
};

export function EmptyState({
  title = "NO OPS DATA",
  description = "No operational data is available for this project yet.",
  className,
  action,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[240px] flex-col items-center justify-center px-6 text-center",
        className,
      )}
      role="status"
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--ops-border)] bg-[var(--ops-surface)] text-[var(--ops-text-muted)]">
        <Icon name="layers" size={24} />
      </div>
      <p className="font-mono text-sm font-semibold tracking-[0.2em] text-[var(--ops-text)]">
        {title}
      </p>
      <p className="mt-2 max-w-sm text-sm text-[var(--ops-text-secondary)]">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
