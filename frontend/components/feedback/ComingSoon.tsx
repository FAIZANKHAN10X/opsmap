type ComingSoonProps = {
  title: string;
  description?: string;
};

/** Placeholder for sidebar routes not built yet. */
export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-lg font-semibold text-[var(--ops-text)]">{title}</h1>
      <p className="max-w-sm text-sm text-[var(--ops-text-secondary)]">
        {description ?? "This section is not implemented yet."}
      </p>
    </div>
  );
}
