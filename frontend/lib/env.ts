/**
 * Frontend environment accessors.
 * Public values must use the NEXT_PUBLIC_ prefix.
 */

export function getPublicApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}
