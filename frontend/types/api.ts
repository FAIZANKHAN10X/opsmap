/** Generic API envelope types (aligned with API_SPEC.md). */

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
