import { UsersRolesSection } from "@/features/settings/UsersRolesSection";
import { StatusEnginePage } from "@/features/status/StatusEnginePage";

export default function SettingsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-auto p-3 lg:p-4">
      <UsersRolesSection />
      <StatusEnginePage />
    </div>
  );
}