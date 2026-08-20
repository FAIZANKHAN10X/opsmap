import { CONTACT_TYPES } from "@/types/domain";

/** Display label for a contact type value (fallback: title-cased value). */
export function contactTypeLabel(type: string): string {
  const found = CONTACT_TYPES.find((t) => t.value === type);
  return found?.label ?? (type.charAt(0).toUpperCase() + type.slice(1));
}

/** Display label for a property-contact role value (fallback: title-cased). */
export function roleLabel(role: string): string {
  const found = roleLabelMap[role];
  return found ?? (role.charAt(0).toUpperCase() + role.slice(1));
}

const roleLabelMap: Record<string, string> = {
  owner: "Owner",
  assignee: "Assignee",
  agent: "Agent",
  client: "Client",
  vendor: "Vendor",
  other: "Other",
};