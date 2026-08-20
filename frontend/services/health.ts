/**
 * Health check client — verifies the frontend app's /api/health endpoint.
 */

export type HealthResponse = {
  success: boolean;
  data: {
    status: "ok" | "degraded";
    service: string;
    environment: string;
    supabase: "configured" | "unavailable";
    email: "smtp" | "log_only";
  };
  message: string | null;
};

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as HealthResponse;
}