import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  message = "We could not load this view. Try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[200px] flex-col items-center justify-center px-6 text-center",
        className,
      )}
      role="alert"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--ops-danger)]/30 bg-[var(--ops-danger)]/10 text-[var(--ops-danger)]">
        <Icon name="alert" size={22} />
      </div>
      <p className="text-sm font-semibold text-[var(--ops-text)]">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-[var(--ops-text-secondary)]">
        {message}
      </p>
      {onRetry ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={onRetry}
        >
          <Icon name="refresh" size={14} />
          Retry
        </Button>
      ) : null}
    </div>
  );
}
