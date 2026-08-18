import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { isSmtpConfigured } from "@/lib/server/email/config";

/**
 * Service health. Unauthenticated by design (mirrors the Python /health).
 * Reports "degraded" when the core Supabase dependency is not configured;
 * actual DB/storage reachability is not probed here (no live checks, no
 * obsolete Redis ping from the Python reference implementation).
 */
export async function GET() {
  const supabaseConfigured = isSupabaseConfigured();
  return NextResponse.json({
    success: true,
    data: {
      status: supabaseConfigured ? "ok" : "degraded",
      service: "OpsMap",
      environment: process.env.NODE_ENV ?? "development",
      supabase: supabaseConfigured ? "configured" : "unavailable",
      email: isSmtpConfigured() ? "smtp" : "log_only",
    },
    message: null,
  });
}