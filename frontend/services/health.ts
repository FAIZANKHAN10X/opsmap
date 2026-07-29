/**
 * Health check client — verifies frontend can reach the backend.
 */

import { apiRequest } from "@/services/api-client";

export type HealthResponse = {
  success: boolean;
  data: {
    status: string;
    service: string;
    environment: string;
  };
  message: string | null;
};

export async function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health");
}
