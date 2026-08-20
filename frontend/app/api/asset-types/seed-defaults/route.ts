import { isSupabaseConfigured } from "@/lib/env";
import { errorJson, listJson, methodNotAllowedJson, serviceUnavailableJson } from "@/lib/server/http";
import { toAssetType } from "@/lib/server/mappers";
import { AssetTypeRepository } from "@/lib/server/repositories/asset-types";
import { AssetTypeService } from "@/lib/server/services/asset-types";
import { createClient } from "@/lib/supabase/server";

/**
 * Idempotently create missing default asset types (Property Types seed).
 * Mirrors POST /api/asset-statuses/seed-defaults: returns the full active
 * list (page=1, limit=100) so clients refresh from a single call.
 */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return serviceUnavailableJson("Supabase is not configured.");
  }
  const client = await createClient();
  const service = new AssetTypeService(new AssetTypeRepository(client));
  try {
    await service.seedDefaults();
    const { items, total } = await service.list({ page: 1, limit: 100 });
    const data = items.map(toAssetType);
    return listJson(data, {
      page: 1,
      limit: 100,
      total,
      pages: Math.ceil(total / 100) || 0,
    });
  } catch (e) {
    return errorJson(e);
  }
}

export function GET() {
  return methodNotAllowedJson();
}

export function PUT() {
  return methodNotAllowedJson();
}

export function PATCH() {
  return methodNotAllowedJson();
}

export function DELETE() {
  return methodNotAllowedJson();
}