/**
 * Shared TypeScript types for the OpsMap frontend.
 * Domain types will be added in later phases.
 */

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  message: string | null;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Array<{ field: string; message: string }>;
  };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
