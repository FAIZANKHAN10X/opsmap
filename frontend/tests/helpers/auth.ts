/**
 * Shared signed-in-admin test identity. Action tests that perform mutations
 * authenticate as an admin so role gates (requireRole) pass and created_by /
 * updated_by are populated. Role-specific denial is tested explicitly in
 * tests/actions/roles.test.ts.
 */

export const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

export const adminAuthUser = {
  id: TEST_USER_ID,
  email: "admin@opsmap.app",
  user_metadata: {},
};

export const adminProfile = {
  id: TEST_USER_ID,
  email: "admin@opsmap.app",
  full_name: null,
  role: "admin",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};