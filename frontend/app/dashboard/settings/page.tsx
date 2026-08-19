import { UsersRolesSection } from "@/features/settings/UsersRolesSection";
import { StatusEnginePage } from "@/features/status/StatusEnginePage";

export default function SettingsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-[var(--ops-bg)] p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ops-text)]">
          Settings
        </h1>
        <p className="text-[15px] text-[var(--ops-text-secondary)] mt-1.5">
          Configure business and operational defaults.
        </p>
      </div>

      <div className="flex flex-col gap-8 max-w-5xl">
        <UsersRolesSection />
        <StatusEnginePage />
      </div>
    </div>
  );
}
