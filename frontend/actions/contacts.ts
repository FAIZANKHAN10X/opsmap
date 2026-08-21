"use server";

import { revalidatePath } from "next/cache";

import type { AssetContact, Contact } from "@/types/domain";

import { runAction, runListAction, withServerContext } from "@/lib/server/action-context";
import { requireRole } from "@/lib/server/authorize";
import { toAssetContact, toContact } from "@/lib/server/mappers";
import { parsePagination } from "@/lib/server/pagination";
import { ContactService } from "@/lib/server/services/contacts";
import {
  getDemoContact,
  listDemoAssetContacts,
  listDemoContacts,
} from "@/lib/demo/provider";

export type ContactCreateInput = {
  type: string;
  full_name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
  properties?: Array<{ asset_id: string; role: string }>;
};

export type ContactUpdateInput = {
  type?: string;
  full_name?: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
  properties?: Array<{ asset_id: string; role: string }>;
};

export type ContactListParams = {
  page?: number;
  limit?: number;
  search?: string | null;
  type?: string | null;
};

const CONTACT_ROUTES = [
  "/dashboard/contacts",
  "/dashboard/contacts/[id]",
  "/dashboard/properties/[id]",
] as const;

function revalidateContactRoutes() {
  for (const path of CONTACT_ROUTES) revalidatePath(path);
}

export async function listContacts(params?: ContactListParams, demo?: boolean) {
  return runListAction<Contact>(async () => {
    const { page, limit } = parsePagination(params?.page, params?.limit);
    const { client } = await withServerContext();

    if (demo) {
      const { items, total, linksByContactId } = await listDemoContacts({
        page,
        limit,
        search: params?.search ?? null,
        type: params?.type ?? null,
      });
      return {
        items: items.map((row) => toContact(row, linksByContactId[row.id] ?? [])),
        total,
        page,
        limit,
      };
    }
    const service = new ContactService(client);
    const { items, total, linksByContactId } = await service.list({
      page,
      limit,
      search: params?.search ?? null,
      type: params?.type ?? null,
    });
    return {
      items: items.map((row) => toContact(row, linksByContactId[row.id] ?? [])),
      total,
      page,
      limit,
    };
  });
}

export async function getContact(id: string, demo?: boolean) {
  return runAction<Contact>(async () => {
    const { client } = await withServerContext();
    if (demo) {
      const { contact, links } = await getDemoContact(id);
      return toContact(contact, links);
    }
    const service = new ContactService(client);
    const { contact, links } = await service.get(id);
    return toContact(contact, links);
  });
}

/** Contacts linked to a specific property (property details surface). */
export async function listAssetContacts(assetId: string, demo?: boolean) {
  return runListAction<AssetContact>(async () => {
    const { client } = await withServerContext();
    if (demo) {
      const items = await listDemoAssetContacts(assetId);
      return {
        items: items.map(({ contact, role }) => toAssetContact(assetId, contact, role)),
        total: items.length,
        page: 1,
        limit: items.length,
      };
    }
    const service = new ContactService(client);
    const rows = await service.listByAssetId(assetId);
    return {
      items: rows.map(({ contact, link }) => toAssetContact(assetId, contact, link.role)),
      total: rows.length,
      page: 1,
      limit: rows.length,
    };
  });
}

export async function createContact(payload: ContactCreateInput) {
  return runAction<Contact>(async () => {
    const ctx = await withServerContext();
    const actor = requireRole(ctx.actor, "operator", "create", "contact");
    const service = new ContactService(ctx.client, { actor });
    const { contact, links } = await service.create(payload);
    revalidateContactRoutes();
    return toContact(contact, links);
  });
}

export async function updateContact(id: string, payload: ContactUpdateInput) {
  return runAction<Contact>(async () => {
    const ctx = await withServerContext();
    const actor = requireRole(ctx.actor, "operator", "update", "contact");
    const service = new ContactService(ctx.client, { actor });
    const { contact, links } = await service.update(id, payload);
    revalidateContactRoutes();
    return toContact(contact, links);
  });
}

export async function deleteContact(id: string) {
  return runAction<null>(async () => {
    const ctx = await withServerContext();
    const actor = requireRole(ctx.actor, "manager", "delete", "contact");
    const service = new ContactService(ctx.client, { actor });
    await service.delete(id);
    revalidateContactRoutes();
    return null;
  });
}