/**
 * Client-safe role option list for the Settings users/roles surface.
 *
 * Must stay in sync with `USER_ROLES` in `lib/server/authorize.ts` (the
 * server-side canonical list that validates mutations) — both contain exactly
 * admin / manager / operator / viewer. Display order is Admin → Viewer.
 */

import type { UserRole } from "@/types/domain";

export const USER_ROLE_OPTIONS: ReadonlyArray<{ value: UserRole; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "operator", label: "Operator" },
  { value: "viewer", label: "Viewer" },
];