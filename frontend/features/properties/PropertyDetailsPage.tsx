"use client";

/* eslint-disable react-hooks/refs */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingBlock } from "@/components/feedback/LoadingBlock";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { AssetDocuments } from "@/features/assets/AssetDocuments";
import { AssetMedia } from "@/features/assets/AssetMedia";
import { PropertyEditor } from "@/features/assets/PropertyEditor";
import {
  contactTypeLabel,
  roleLabel,
} from "@/features/contacts/contactMeta";
import { PropertyMap } from "@/features/map/PropertyMapLazy";
import {
  linkAssetContact,
  listAssetContacts,
  listContacts,
  unlinkAssetContact,
} from "@/services/contacts";
import { deleteAsset, getAsset } from "@/services/assets";
import { listAssetTypes } from "@/services/asset-types";
import { listAssetStatuses } from "@/services/dashboard";
import { getProject } from "@/services/projects";
import { statusColor } from "@/lib/status-colors";
import {
  COVER_DOCUMENT_META_KEY,
  PROPERTY_CONTACT_ROLES,
} from "@/types/domain";
import { useShell } from "@/stores/shell-context";
import { useToast } from "@/stores/toast-context";
import { useUser } from "@/stores/user-context";
import type {
  Asset,
  AssetContact,
  AssetStatus,
  AssetType,
  Contact,
  Project,
} from "@/types/domain";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; asset: Asset };

function metaText(asset: Asset, key: string): string | null {
  const val = asset.metadata[key];
  if (typeof val === "string" && val.trim() !== "") return val.trim();
  if (typeof val === "number") return String(val);
  return null;
}

/** Formats price metadata with its currency for display. */
export function formatPrice(
  asset: Asset,
): { amount: number; currency: string; formatted: string } | null {
  const raw = asset.metadata.price;
  const amount = typeof raw === "string" ? Number(raw) : raw;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  const currency =
    typeof asset.metadata.currency === "string" &&
    /^[A-Z]{3}$/.test(asset.metadata.currency)
      ? asset.metadata.currency
      : null;
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat("en-US", {
      style: currency ? "currency" : "decimal",
      currency: currency ?? "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    formatted = `${amount.toLocaleString("en-US")}${currency ? ` ${currency}` : ""}`;
  }
  return { amount, currency: currency ?? "", formatted };
}

export function PropertyDetailsPage({ assetId }: { assetId: string }) {
  const router = useRouter();
  const { demoMode, refreshKey, bumpRefresh } = useShell();
  const toast = useToast();
  const user = useUser();

  const role = user?.role;
  const canEdit = role === "admin" || role === "manager" || role === "operator";
  const canDelete = role === "admin" || role === "manager";

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [statuses, setStatuses] = useState<AssetStatus[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [contacts, setContacts] = useState<AssetContact[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [editing, setEditing] = useState(false);
  const refs = {
    overview: useRef<HTMLDivElement>(null),
    gallery: useRef<HTMLDivElement>(null),
    details: useRef<HTMLDivElement>(null),
    features: useRef<HTMLDivElement>(null),
    location: useRef<HTMLDivElement>(null),
    documents: useRef<HTMLDivElement>(null),
    contacts: useRef<HTMLDivElement>(null),
    operations: useRef<HTMLDivElement>(null),
    activity: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getAsset(assetId, demoMode),
      listAssetStatuses(),
      listAssetTypes(),
      listAssetContacts(assetId, demoMode),
    ])
      .then(([assetRes, statusRes, typeRes, contactsRes]) => {
        if (cancelled) return;
        setStatuses(statusRes.data);
        setTypes(typeRes.data);
        setContacts(contactsRes.data);
        setLoadState({ status: "ready", asset: assetRes.data });
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setLoadState({
            status: "error",
            message: err.message || "Failed to load property.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [assetId, demoMode, refreshKey]);

  // Development context for the header (non-blocking; never fails the page).
  useEffect(() => {
    if (loadState.status !== "ready" || demoMode) return;
    let cancelled = false;
    getProject(loadState.asset.project_id)
      .then((res) => {
        if (!cancelled) setProject(res.data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [loadState, demoMode]);

  async function handleDelete(asset: Asset) {
    if (!window.confirm(`Delete "${asset.name}"? This removes it from the map and list.`)) {
      return;
    }
    try {
      await deleteAsset(asset.id);
      toast.success("Property deleted");
      bumpRefresh();
      router.push("/dashboard/development");
    } catch (err) {
      toast.error(
        "Could not delete property",
        err instanceof Error ? err.message : undefined,
      );
    }
  }

  if (loadState.status === "loading") {
    return <LoadingBlock rows={6} />;
  }

  if (loadState.status === "error") {
    return (
      <div className="h-full overflow-y-auto bg-[var(--ops-bg)]">
        <div className="mx-auto max-w-4xl p-4 md:p-8">
          <Link
            href="/dashboard/development"
            className="mb-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ops-text-secondary)] hover:text-[var(--ops-text)] transition-colors"
          >
            <Icon name="chevron-left" size={16} />
            Back to properties
          </Link>
          <ErrorState message={loadState.message} />
        </div>
      </div>
    );
  }

  const asset = loadState.asset;
  const status = asset.asset_status_id
    ? statuses.find((s) => s.id === asset.asset_status_id)
    : undefined;
  const type = asset.asset_type_id
    ? types.find((t) => t.id === asset.asset_type_id)
    : undefined;
  const canMutate = !demoMode;
  const coverDocumentId = asset.metadata[COVER_DOCUMENT_META_KEY];
  const features = Array.isArray(asset.metadata.features)
    ? asset.metadata.features.map((f) => String(f))
    : [];
  const isPlaced =
    typeof asset.latitude === "number" &&
    Number.isFinite(asset.latitude) &&
    typeof asset.longitude === "number" &&
    Number.isFinite(asset.longitude);
  const statusColorHex = statusColor(status?.slug ?? "", status?.color ?? null);

  return (
    <div className="h-full overflow-y-auto bg-[var(--ops-bg)]">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <div>
          <Link
            href="/dashboard/development"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ops-text-secondary)] hover:text-[var(--ops-text)] transition-colors"
          >
            <Icon name="chevron-left" size={16} />
            Back to properties
          </Link>
        </div>

        {/* PROPERTY HEADER */}
        <div className="bg-white rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-[var(--ops-shadow-sm)] overflow-hidden">
          {/* MEDIA HERO — cover photo or polished empty state */}
          {typeof coverDocumentId === "string" ? (
            <div className="w-full h-[300px] bg-[var(--ops-surface-hover)] relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/documents/${coverDocumentId}/thumbnail`}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-[180px] bg-gradient-to-br from-[var(--ops-accent-muted)] via-[var(--ops-surface-hover)] to-[var(--ops-surface)] flex flex-col items-center justify-center gap-2">
              <Icon name="image" size={28} className="text-[var(--ops-text-muted)]" />
              <p className="text-[14px] font-semibold text-[var(--ops-text-secondary)]">No photos yet</p>
              {canMutate && canEdit ? (
                <p className="text-[13px] text-[var(--ops-text-muted)]">Add photos in the media section below.</p>
              ) : null}
            </div>
          )}
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[12px] font-bold tracking-wider text-[var(--ops-text-muted)] uppercase mb-1">
                  {asset.code ?? "PROPERTY"}
                </p>
                <h1 className="text-3xl font-bold text-[var(--ops-text)] tracking-tight">
                  {asset.name}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-[var(--ops-text-secondary)] font-medium">
                  {project ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="layers" size={14} /> {project.name}
                    </span>
                  ) : null}
                  {type ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="home" size={14} /> {type.name}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColorHex }} />
                    {status?.name ?? "No status"}
                  </span>
                  {metaText(asset, "address") ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="pin" size={14} /> {metaText(asset, "address")}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2">
                {formatPrice(asset) ? (
                  <p className="text-xl font-bold tracking-tight text-[var(--ops-text)]">
                    {formatPrice(asset)!.formatted}
                  </p>
                ) : null}
                {status ? (
                  <span
                    className="inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-semibold"
                    style={{ backgroundColor: `${statusColorHex}15`, color: statusColorHex }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColorHex }} />
                    {status.name}
                  </span>
                ) : null}
              </div>
            </div>

            {canMutate && (canEdit || canDelete) && !editing ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {canEdit ? (
                  <Button variant="secondary" size="md" onClick={() => setEditing(true)} className="rounded-full shadow-sm bg-white">
                    <Icon name="edit" size={16} />
                    Edit property
                  </Button>
                ) : null}
                {canEdit ? (
                  <Link
                    href="/dashboard/development"
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--ops-border-subtle)] bg-white px-5 text-[14px] font-semibold text-[var(--ops-text-secondary)] shadow-sm hover:border-[var(--ops-border-strong)] transition-colors"
                  >
                    <Icon name="pin" size={16} />
                    {isPlaced ? "Adjust location" : "Place on map"}
                  </Link>
                ) : null}
                {canDelete ? (
                  <Button
                    variant="danger"
                    size="md"
                    className="rounded-full shadow-sm"
                    onClick={() => void handleDelete(asset)}
                  >
                    <Icon name="trash" size={16} />
                    Delete
                  </Button>
                ) : null}
              </div>
            ) : null}

            {demoMode ? (
              <p className="mt-4 text-[13px] font-medium text-[var(--ops-warning)] bg-[var(--ops-warning-muted)] p-3 rounded-[var(--ops-radius-lg)] inline-flex gap-2">
                <Icon name="info" size={16} /> Demo Mode is read-only.
              </p>
            ) : null}
          </div>
        </div>

        {editing ? (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm">
            <div className="flex w-full max-w-[640px] flex-col bg-[var(--ops-bg)] shadow-2xl">
              <PropertyEditor
                mode="edit"
                projectId={asset.project_id}
                initial={asset}
                types={types}
                statuses={statuses}
                onClose={() => setEditing(false)}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Professional anchor nav — lightweight, no second router */}
            <nav
              aria-label="Property sections"
              className="sticky top-0 z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-[var(--ops-bg)]/80 backdrop-blur border-b border-[var(--ops-border-subtle)] flex gap-1.5 overflow-x-auto scrollbar-none"
            >
              {[
                ["overview", "Overview"],
                ["gallery", "Gallery"],
                ["details", "Details"],
                ["features", "Features"],
                ["location", "Location"],
                ["documents", "Documents"],
                ["contacts", "Contacts"],
                ["operations", "Operations"],
                ["activity", "Activity"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => refs[key as keyof typeof refs].current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="shrink-0 rounded-full border border-[var(--ops-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ops-text-secondary)] hover:border-[var(--ops-accent)] hover:text-[var(--ops-accent)] transition-colors"
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* GALLERY — prominent, cover + thumbnails */}
            <div ref={refs.gallery}>
              <Section title="Gallery">
                <AssetMedia asset={asset} />
                <p className="mt-3 text-xs text-[var(--ops-text-muted)]">
                  Cover corresponds to <code className="rounded bg-[var(--ops-surface-hover)] px-1 py-0.5">metadata.cover_document_id</code> · edit via Edit property
                </p>
              </Section>
            </div>

            {/* KEY PROPERTY FACTS */}
            <div ref={refs.overview}>
              <Section title="Key Facts">
                <dl className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-4 text-[14px]">
                  {formatPrice(asset) ? (
                    <Field label="Price" value={formatPrice(asset)!.formatted} />
                  ) : null}
                  <Field label="Bedrooms" value={metaText(asset, "bedrooms") ?? "—"} />
                  <Field label="Bathrooms" value={metaText(asset, "bathrooms") ?? "—"} />
                  <Field
                    label="Built-up area"
                    value={metaText(asset, "area_sqm") ? `${metaText(asset, "area_sqm")} sqm` : "—"}
                  />
                  <Field
                    label="Plot area"
                    value={metaText(asset, "plot_area_sqm") ? `${metaText(asset, "plot_area_sqm")} sqm` : "—"}
                  />
                  <Field label="Parking" value={metaText(asset, "parking") ?? "—"} />
                  <Field label="Floor" value={metaText(asset, "floor") ?? "—"} />
                </dl>
              </Section>
            </div>

            {/* DESCRIPTION */}
            {asset.description ? (
              <Section title="Description">
                <p className="whitespace-pre-wrap text-[14px] text-[var(--ops-text)] font-medium leading-relaxed">
                  {asset.description}
                </p>
              </Section>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* PROPERTY DETAILS */}
              <div ref={refs.details}>
                <Section title="Property Details">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[14px]">
                    <Field label="Furnishing" value={metaText(asset, "furnishing") ?? "—"} />
                    <Field label="View" value={metaText(asset, "view") ?? "—"} />
                    <Field label="Capacity (max pax)" value={metaText(asset, "capacity") ?? metaText(asset, "pax") ?? "—"} />
                    <Field label="Placed (pax)" value={metaText(asset, "placed") ?? "—"} />
                  </dl>
                </Section>
              </div>

              {/* FEATURES / AMENITIES */}
              <div ref={refs.features}>
                <Section title="Features & Amenities">
                  {features.length === 0 ? (
                    <p className="text-[14px] text-[var(--ops-text-muted)]">
                      No features recorded for this property.
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {features.map((feature) => (
                        <li
                          key={feature}
                          className="rounded-full border border-[var(--ops-border-subtle)] bg-[var(--ops-surface-hover)] px-3 py-1.5 text-[13px] font-semibold text-[var(--ops-text-secondary)]"
                        >
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              </div>

              {/* LOCATION — real geographic map */}
              <div ref={refs.location}>
                <Section title="Location">
                  {isPlaced ? (
                    <div className="space-y-3">
                      <div className="h-56 overflow-hidden rounded-[var(--ops-radius-lg)] border border-[var(--ops-border-subtle)]">
                        <PropertyMap
                          className="h-full w-full"
                          assets={[asset]}
                          statuses={statuses}
                          selectedAssetId={asset.id}
                        />
                      </div>
                      <p className="font-mono text-[12px] text-[var(--ops-text-muted)]">
                        {asset.latitude!.toFixed(6)}, {asset.longitude!.toFixed(6)}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-[var(--ops-radius-lg)] border border-dashed border-[var(--ops-border-strong)] bg-[var(--ops-surface-hover)] p-4">
                      <p className="text-[14px] font-semibold text-[var(--ops-text)]">Property not placed on the map</p>
                      <p className="mt-1 text-[13px] text-[var(--ops-text-muted)]">
                        Open the development workspace, edit this property, and click the real map to set its location.
                      </p>
                      {canMutate && canEdit ? (
                        <Link
                          href="/dashboard/development"
                          className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ops-accent-hover)] hover:underline"
                        >
                          Place on map <Icon name="chevron-right" size={14} />
                        </Link>
                      ) : null}
                    </div>
                  )}
                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-[14px] border-t border-[var(--ops-border-subtle)] pt-4">
                    {project ? (
                      <Field label="Development" value={project.name} />
                    ) : null}
                    <Field label="Address" value={metaText(asset, "address") ?? "—"} className="col-span-2" />
                  </dl>
                </Section>
              </div>

              {/* OPERATIONS NOTES */}
              <div ref={refs.operations}>
                <Section title="Operations">
                  {asset.notes ? (
                    <p className="whitespace-pre-wrap text-[14px] text-[var(--ops-text)] font-medium leading-relaxed">
                      {asset.notes}
                    </p>
                  ) : (
                    <p className="text-[14px] text-[var(--ops-text-muted)]">No internal notes yet.</p>
                  )}
                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-[14px] border-t border-[var(--ops-border-subtle)] pt-4">
                    <Field label="Status" value={status?.name ?? "—"} />
                    <Field label="Placement" value={isPlaced ? "Placed" : "Not placed"} />
                  </dl>
                </Section>
              </div>
            </div>

            <div ref={refs.documents}>
              <Section title="Documents">
                <AssetDocuments assetId={asset.id} mode="documents" />
              </Section>
            </div>

            {/* CONTACTS */}
            <div ref={refs.contacts}>
              <PropertyContactsSection
                assetId={asset.id}
                contacts={contacts}
                canLink={canMutate && canEdit}
                canRemove={canMutate && canDelete}
                onChanged={() => bumpRefresh()}
              />
            </div>

            {/* ACTIVITY — honest, derived timestamps only */}
            <div ref={refs.activity}>
              <Section title="Activity">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-[13px] text-[var(--ops-text-secondary)]">Created</span>
                    <span className="font-mono text-xs text-[var(--ops-text)]">{new Date(asset.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[13px] text-[var(--ops-text-secondary)]">Last updated</span>
                    <span className="font-mono text-xs text-[var(--ops-text)]">{new Date(asset.updated_at).toLocaleString()}</span>
                  </div>
                  <p className="pt-3 text-xs leading-relaxed text-[var(--ops-text-muted)] border-t border-[var(--ops-border-subtle)]">
                    Derived from record timestamps — not an audited history. Durable audit log is future infrastructure (see Dashboard).
                  </p>
                </div>
              </Section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Contacts linked via property_contacts with add/remove management. */
function PropertyContactsSection({
  assetId,
  contacts,
  canLink,
  canRemove,
  onChanged,
}: {
  assetId: string;
  contacts: AssetContact[];
  /** operator+ (matches property_contacts_insert RLS). */
  canLink: boolean;
  /** manager+ (matches property_contacts_delete RLS). */
  canRemove: boolean;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [directory, setDirectory] = useState<Contact[] | null>(null);
  const [contactId, setContactId] = useState("");
  const [role, setRole] = useState("owner");
  const [busy, setBusy] = useState(false);

  async function loadDirectory() {
    try {
      const res = await listContacts({ page: 1, limit: 100 });
      setDirectory(res.data);
    } catch (err) {
      toast.error(
        "Could not load contacts",
        err instanceof Error ? err.message : undefined,
      );
    }
  }

  function openAdd() {
    setAdding(true);
    setContactId("");
    setRole("owner");
    if (directory === null) void loadDirectory();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId) return;
    setBusy(true);
    try {
      await linkAssetContact(assetId, contactId, role);
      toast.success("Contact linked");
      setAdding(false);
      onChanged();
    } catch (err) {
      toast.error(
        "Could not link contact",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(contact: AssetContact) {
    if (!window.confirm(`Remove ${contact.contact.full_name} (${roleLabel(contact.role)}) from this property?`)) {
      return;
    }
    try {
      await unlinkAssetContact(assetId, contact.contact.id, contact.role);
      toast.success("Contact removed");
      onChanged();
    } catch (err) {
      toast.error(
        "Could not remove contact",
        err instanceof Error ? err.message : undefined,
      );
    }
  }

  return (
    <Section title="Contacts">
      {contacts.length === 0 && !adding ? (
        <p className="text-[14px] text-[var(--ops-text-muted)]">
          No contacts linked to this property.
        </p>
      ) : null}

      {contacts.length > 0 ? (
        <ul className="space-y-2">
          {contacts.map(({ contact, role }) => (
            <li key={`${contact.id}-${role}`}>
              <div className="flex items-center gap-3 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border-subtle)] bg-[var(--ops-bg)] px-3 py-2.5">
                <span className="w-20 shrink-0 text-[13px] font-semibold text-[var(--ops-text-muted)]">
                  {roleLabel(role)}
                </span>
                <Link
                  href={`/dashboard/contacts/${contact.id}`}
                  className="truncate font-medium text-[var(--ops-text)] hover:underline"
                >
                  {contact.full_name}
                </Link>
                <span className="shrink-0 rounded-full border border-[var(--ops-border)] px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase text-[var(--ops-text-secondary)]">
                  {contactTypeLabel(contact.type)}
                </span>
                {canRemove ? (
                  <button
                    type="button"
                    onClick={() => void handleRemove({ asset_id: assetId, contact, role })}
                    aria-label={`Remove ${contact.full_name}`}
                    className="ml-auto shrink-0 rounded-full p-1.5 text-[var(--ops-text-muted)] hover:bg-[var(--ops-danger-muted)] hover:text-[var(--ops-danger)] transition-colors"
                  >
                    <Icon name="x" size={16} />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {adding ? (
        <form onSubmit={handleAdd} className="mt-3 flex flex-col sm:flex-row gap-3">
          <select
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            required
            className="flex-1 rounded-[var(--ops-radius-lg)] border border-transparent bg-[var(--ops-surface-hover)] px-4 py-2.5 text-[14px] text-[var(--ops-text)] focus:border-[var(--ops-border-subtle)] focus:bg-[var(--ops-surface)] focus:outline-none focus:ring-4 focus:ring-[var(--ops-accent-muted)] transition-all"
            aria-label="Contact"
          >
            <option value="" disabled>
              Select a contact…
            </option>
            {(directory ?? [])
              .filter((c) => !contacts.some((l) => l.contact.id === c.id && l.role === role))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                  {c.company ? ` — ${c.company}` : ""}
                </option>
              ))}
          </select>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="sm:w-40 rounded-[var(--ops-radius-lg)] border border-transparent bg-[var(--ops-surface-hover)] px-4 py-2.5 text-[14px] text-[var(--ops-text)] focus:border-[var(--ops-border-subtle)] focus:bg-[var(--ops-surface)] focus:outline-none focus:ring-4 focus:ring-[var(--ops-accent-muted)] transition-all"
            aria-label="Role"
          >
            {PROPERTY_CONTACT_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="md" disabled={busy || !contactId} className="rounded-full shadow-sm">
              Link
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={() => setAdding(false)} className="rounded-full shadow-sm bg-white">
              Cancel
            </Button>
          </div>
        </form>
      ) : canLink ? (
        <button
          type="button"
          onClick={openAdd}
          className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ops-accent-hover)] hover:underline"
        >
          <Icon name="plus" size={16} /> Link a contact
        </button>
      ) : null}
    </Section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-[var(--ops-shadow-sm)] p-6">
      <h3 className="mb-5 text-[16px] font-bold text-[var(--ops-text)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[13px] text-[var(--ops-text-secondary)]">{label}</dt>
      <dd className="mt-1 font-semibold text-[var(--ops-text)]">{value}</dd>
    </div>
  );
}
