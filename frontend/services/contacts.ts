/**
 * Contact service — delegates to Server Actions backed by Supabase.
 * First-class Contacts (Phase 2): CRUD + property relationships.
 */

import type {
  ApiListSuccess,
  ApiSuccess,
  AssetContact,
  Contact,
  ContactCreateInput,
  ContactUpdateInput,
} from "@/types/domain";

import {
  createContact as createContactAction,
  deleteContact as deleteContactAction,
  getContact as getContactAction,
  listAssetContacts as listAssetContactsAction,
  listContacts as listContactsAction,
  updateContact as updateContactAction,
} from "@/actions/contacts";
import { unwrapAction, unwrapListAction } from "@/services/helpers";

export type ListContactsParams = {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
};

export async function listContacts(
  params: ListContactsParams = {},
  demo = false,
): Promise<ApiListSuccess<Contact>> {
  return unwrapListAction(
    await listContactsAction(
      {
        page: params.page,
        limit: params.limit,
        search: params.search ?? null,
        type: params.type ?? null,
      },
      demo,
    ),
  );
}

export async function getContact(id: string, demo = false): Promise<ApiSuccess<Contact>> {
  return unwrapAction(await getContactAction(id, demo));
}

export async function listAssetContacts(
  assetId: string,
  demo = false,
): Promise<ApiListSuccess<AssetContact>> {
  return unwrapListAction(await listAssetContactsAction(assetId, demo));
}

export async function createContact(
  input: ContactCreateInput,
): Promise<ApiSuccess<Contact>> {
  return unwrapAction(await createContactAction(input));
}

export async function updateContact(
  id: string,
  input: ContactUpdateInput,
): Promise<ApiSuccess<Contact>> {
  return unwrapAction(await updateContactAction(id, input));
}

export async function deleteContact(id: string): Promise<void> {
  unwrapAction(await deleteContactAction(id));
}