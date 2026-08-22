"use client";

/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect, react-hooks/immutability, react-hooks/rules-of-hooks */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { GeoPoint } from "@/features/map/geo";
import { PropertyMap } from "@/features/map/PropertyMapLazy";
import { useShell } from "@/stores/shell-context";
import { useToast } from "@/stores/toast-context";
import { createAsset, updateAsset } from "@/services/assets";
import {
  deleteDocument,
  listAssetDocuments,
  uploadDocument,
} from "@/services/documents";
import {
  createContact,
  linkAssetContact,
  listAssetContacts,
  listContacts,
  unlinkAssetContact,
} from "@/services/contacts";
import { updateAsset as updateAssetForCover } from "@/services/assets";
import type {
  Asset,
  AssetCreateInput,
  AssetStatus,
  AssetType,
  AssetUpdateInput,
  Contact,
  Document,
} from "@/types/domain";
import { COVER_DOCUMENT_META_KEY } from "@/types/domain";

type Mode = "create" | "edit";

type PropertyEditorProps = {
  mode: Mode;
  projectId: string;
  initial?: Asset | null;
  types: AssetType[];
  statuses: AssetStatus[];
  placement?: GeoPoint | null;
  onPlacementChange?: (p: GeoPoint | null) => void;
  onClose: () => void;
  onCreated?: (id: string) => void;
};

const FEATURE_OPTIONS = [
  "Pool",
  "Garden",
  "Balcony / Terrace",
  "Parking",
  "Ocean View",
  "Furnished",
  "Air Conditioning",
  "Gym",
  "Kitchen",
  "Wi-Fi",
];
const CURRENCY_OPTIONS = ["IDR", "USD", "EUR", "AUD", "SGD", "GBP", "JPY"];
const FURNISHING_OPTIONS = ["unfurnished", "semi-furnished", "fully-furnished"];

const ROLE_OPTIONS = ["owner", "assignee", "agent", "client", "vendor", "other"];

function metaStr(a: Asset | null | undefined, k: string): string {
  const v = a?.metadata?.[k];
  return typeof v === "string" ? v : "";
}
function metaNum(a: Asset | null | undefined, k: string): string {
  const v = a?.metadata?.[k];
  return typeof v === "number" && Number.isFinite(v) || (typeof v === "string" && v.trim() !== "")
    ? String(v)
    : "";
}

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
  status: "pending" | "uploading" | "done" | "error";
  documentId?: string;
  error?: string;
};

type PendingDoc = {
  id: string;
  file: File;
  name: string;
  category: string;
  status: "pending" | "uploading" | "done" | "error";
  documentId?: string;
  error?: string;
};

type ContactLinkDraft = {
  id: string;
  contactId: string;
  contactName: string;
  role: string;
  isNew?: boolean; // pending link (not yet persisted for edit)
};

export function PropertyEditor({
  mode,
  projectId,
  initial,
  types,
  statuses,
  placement,
  onPlacementChange,
  onClose,
  onCreated,
}: PropertyEditorProps) {
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    router = useRouter();
  } catch {
    router = null;
  }
  const toast = useToast();
  const { demoMode, bumpRefresh } = useShell();

  // --- Basics ---
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [typeId, setTypeId] = useState(initial?.asset_type_id ?? "");
  const [statusId, setStatusId] = useState(initial?.asset_status_id ?? "");
  const [address, setAddress] = useState(metaStr(initial, "address"));
  const [description, setDescription] = useState(initial?.description ?? "");

  // --- Details ---
  const [bedrooms, setBedrooms] = useState(metaNum(initial, "bedrooms"));
  const [bathrooms, setBathrooms] = useState(metaNum(initial, "bathrooms"));
  const [areaSqm, setAreaSqm] = useState(metaNum(initial, "area_sqm"));
  const [plotAreaSqm, setPlotAreaSqm] = useState(metaNum(initial, "plot_area_sqm"));
  const [floor, setFloor] = useState(metaStr(initial, "floor"));
  const [parking, setParking] = useState(metaNum(initial, "parking"));
  const [furnishing, setFurnishing] = useState(metaStr(initial, "furnishing"));
  const [view, setView] = useState(metaStr(initial, "view"));

  // --- Features ---
  const [featuresText, setFeaturesText] = useState(() => {
    const f = initial?.metadata?.features;
    return Array.isArray(f) ? f.map((x) => String(x)).join(", ") : "";
  });

  // --- Commercial ---
  const [price, setPrice] = useState(metaNum(initial, "price"));
  const [currency, setCurrency] = useState(metaStr(initial, "currency"));

  // --- Operations ---
  const [capacity, setCapacity] = useState(() => {
    if (initial?.metadata?.capacity != null) return String(initial.metadata.capacity);
    if (initial?.metadata?.pax != null) return String(initial.metadata.pax);
    return "";
  });
  const [placed, setPlaced] = useState(metaNum(initial, "placed"));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  // --- Location (controlled via placement prop + local) ---
  const [latitude, setLatitude] = useState(
    initial && typeof initial.latitude === "number" ? String(initial.latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    initial && typeof initial.longitude === "number" ? String(initial.longitude) : "",
  );

  useEffect(() => {
    if (placement) {
      setLatitude(Number(placement.latitude.toFixed(6)).toString());
      setLongitude(Number(placement.longitude.toFixed(6)).toString());
    }
  }, [placement]);

  const isPlaced = latitude.trim() !== "" && longitude.trim() !== "";
  const geoPoint: GeoPoint | null = useMemo(() => {
    if (!isPlaced) return null;
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { latitude: lat, longitude: lng };
  }, [latitude, longitude, isPlaced]);

  function clearPlacement() {
    setLatitude("");
    setLongitude("");
    onPlacementChange?.(null);
  }

  // --- Photos: pending for create, existing+pending for edit ---
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [coverId, setCoverId] = useState<string | null>(
    typeof initial?.metadata?.[COVER_DOCUMENT_META_KEY] === "string"
      ? (initial.metadata[COVER_DOCUMENT_META_KEY] as string)
      : null,
  );
  const [existingDocs, setExistingDocs] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [coverPendingId, setCoverPendingId] = useState<string | null>(null); // pending image id chosen as cover before upload

  // For edit, load existing docs
  useEffect(() => {
    if (mode !== "edit" || !initial?.id) return;
    let cancelled = false;
    setLoadingDocs(true);
    listAssetDocuments(initial.id)
      .then((res) => {
        if (cancelled) return;
        setExistingDocs(res.data);
      })
      .catch(() => {
        if (!cancelled) setExistingDocs([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDocs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, initial?.id]);

  const existingImages = useMemo(
    () => existingDocs.filter((d) => d.category === "image" || d.mime_type?.startsWith("image/")),
    [existingDocs],
  );

  function handleImageFiles(files: FileList | null) {
    if (!files) return;
    const next: PendingImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const previewUrl = URL.createObjectURL(file);
      next.push({
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl,
        status: "pending",
      });
    }
    setPendingImages((prev) => [...prev, ...next]);
  }

  function removePendingImage(id: string) {
    setPendingImages((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      if (coverPendingId === id) setCoverPendingId(null);
      return prev.filter((p) => p.id !== id);
    });
  }

  function movePending(dir: number, idx: number) {
    setPendingImages((prev) => {
      const arr = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return prev;
      const tmp = arr[idx];
      arr[idx] = arr[j];
      arr[j] = tmp;
      return arr;
    });
  }

  // Reorder existing images: for now just cover; full reorder would need persisted order field (not in schema)
  // We support pending reorder only; existing reorder via move not persisted (documented limit)

  async function handleDeleteExistingImage(docId: string) {
    if (!initial?.id) return;
    if (!window.confirm("Delete this photo?")) return;
    try {
      await deleteDocument(docId);
      setExistingDocs((prev) => prev.filter((d) => d.id !== docId));
      if (coverId === docId) {
        setCoverId(null);
        if (mode === "edit" && initial?.id) {
          await updateAssetForCover(initial.id, {
            metadata: { ...initial.metadata, [COVER_DOCUMENT_META_KEY]: null },
          });
        }
      }
      bumpRefresh();
    } catch (e) {
      toast.error("Could not delete photo", e instanceof Error ? e.message : undefined);
    }
  }

  // --- Documents: pending + existing ---
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState("contract");

  function handleDocFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      setPendingDocs((prev) => [
        ...prev,
        {
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          name: docName.trim() || file.name.replace(/\.[^.]+$/, ""),
          category: docCategory,
          status: "pending",
        },
      ]);
    }
    setDocName("");
  }

  function removePendingDoc(id: string) {
    setPendingDocs((prev) => prev.filter((d) => d.id !== id));
  }

  const existingNonImageDocs = useMemo(
    () => existingDocs.filter((d) => d.category !== "image"),
    [existingDocs],
  );

  // --- Contacts ---
  const [contactLinks, setContactLinks] = useState<ContactLinkDraft[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState<Contact[]>([]);
  const [contactRole, setContactRole] = useState("owner");
  const [quickName, setQuickName] = useState("");
  const [quickType, setQuickType] = useState("owner");
  const [searchingContacts, setSearchingContacts] = useState(false);

  // Load existing links for edit
  useEffect(() => {
    if (mode !== "edit" || !initial?.id) return;
    listAssetContacts(initial.id)
      .then((res) => {
        setContactLinks(
          res.data.map((ac) => ({
            id: `link-${ac.contact.id}-${ac.role}`,
            contactId: ac.contact.id,
            contactName: ac.contact.full_name,
            role: ac.role,
          })),
        );
      })
      .catch(() => setContactLinks([]));
  }, [mode, initial?.id]);

  const searchContacts = useCallback(async (q: string) => {
    if (!q.trim()) {
      setContactResults([]);
      return;
    }
    setSearchingContacts(true);
    try {
      const res = await listContacts({ search: q.trim(), limit: 8 });
      setContactResults(res.data);
    } catch {
      setContactResults([]);
    } finally {
      setSearchingContacts(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void searchContacts(contactSearch), 300);
    return () => clearTimeout(t);
  }, [contactSearch, searchContacts]);

  function addContactLink(contact: Contact) {
    if (contactLinks.some((l) => l.contactId === contact.id && l.role === contactRole)) return;
    setContactLinks((prev) => [
      ...prev,
      {
        id: `draft-${contact.id}-${contactRole}-${Date.now()}`,
        contactId: contact.id,
        contactName: contact.full_name,
        role: contactRole,
        isNew: mode === "edit", // for edit, this is new link to persist immediately after
      },
    ]);
    setContactSearch("");
    setContactResults([]);
  }

  async function handleQuickCreateContact() {
    if (!quickName.trim()) return;
    try {
      const res = await createContact({
        full_name: quickName.trim(),
        type: quickType,
        notes: null,
      });
      const c = res.data;
      setContactLinks((prev) => [
        ...prev,
        { id: `draft-${c.id}-${contactRole}`, contactId: c.id, contactName: c.full_name, role: contactRole, isNew: true },
      ]);
      setQuickName("");
      bumpRefresh();
      toast.success("Contact created", c.full_name);
    } catch (e) {
      toast.error("Could not create contact", e instanceof Error ? e.message : undefined);
    }
  }

  function removeContactLink(id: string) {
    const link = contactLinks.find((l) => l.id === id);
    if (!link) return;
    if (mode === "edit" && !link.isNew && initial?.id) {
      // Persisted link — remove via action
      void unlinkAssetContact(initial.id, link.contactId, link.role)
        .then(() => {
          setContactLinks((prev) => prev.filter((l) => l.id !== id));
          bumpRefresh();
        })
        .catch((e) => toast.error("Could not remove contact", e instanceof Error ? e.message : undefined));
    } else {
      setContactLinks((prev) => prev.filter((l) => l.id !== id));
    }
  }

  // --- Validation ---
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Section refs for anchor nav
  const refs = {
    basics: useRef<HTMLDivElement>(null),
    details: useRef<HTMLDivElement>(null),
    features: useRef<HTMLDivElement>(null),
    commercial: useRef<HTMLDivElement>(null),
    location: useRef<HTMLDivElement>(null),
    photos: useRef<HTMLDivElement>(null),
    documents: useRef<HTMLDivElement>(null),
    contacts: useRef<HTMLDivElement>(null),
    operations: useRef<HTMLDivElement>(null),
  };

  function scrollTo(section: keyof typeof refs) {
    refs[section].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Warn on unsaved changes
  const isDirty = useMemo(() => {
    // naive dirty: any field differs from initial or pending files exist
    if (pendingImages.length > 0 || pendingDocs.length > 0 || contactLinks.some((l) => l.isNew)) return true;
    if (mode === "create" && (name.trim() || address.trim() || price.trim())) return true;
    if (mode === "edit" && initial) {
      if (name !== (initial.name ?? "")) return true;
      if (address !== metaStr(initial, "address")) return true;
    }
    return false;
  }, [pendingImages, pendingDocs, contactLinks, name, address, price, mode, initial]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Build metadata + validate
  function buildMetadata(): Record<string, unknown> {
    const metadata: Record<string, unknown> = { ...(initial?.metadata ?? {}) };
    if (address.trim()) metadata.address = address.trim();
    else delete metadata.address;
    if (bedrooms.trim()) metadata.bedrooms = Number(bedrooms);
    else delete metadata.bedrooms;
    if (bathrooms.trim()) metadata.bathrooms = Number(bathrooms);
    else delete metadata.bathrooms;
    if (areaSqm.trim()) metadata.area_sqm = Number(areaSqm);
    else delete metadata.area_sqm;
    if (plotAreaSqm.trim()) metadata.plot_area_sqm = Number(plotAreaSqm);
    else delete metadata.plot_area_sqm;
    if (floor.trim()) metadata.floor = floor.trim();
    else delete metadata.floor;
    if (parking.trim()) metadata.parking = Number(parking);
    else delete metadata.parking;
    if (furnishing.trim()) metadata.furnishing = furnishing.trim();
    else delete metadata.furnishing;
    if (view.trim()) metadata.view = view.trim();
    else delete metadata.view;
    const feats = featuresText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (feats.length > 0) metadata.features = feats;
    else delete metadata.features;
    if (price.trim()) metadata.price = Number(price);
    else delete metadata.price;
    if (currency.trim()) metadata.currency = currency.trim().toUpperCase();
    else delete metadata.currency;
    if (capacity.trim()) metadata.capacity = Number(capacity);
    else delete metadata.capacity;
    if (placed.trim()) metadata.placed = Number(placed);
    else delete metadata.placed;
    delete (metadata as Record<string, unknown>).latitude;
    delete (metadata as Record<string, unknown>).longitude;
    delete (metadata as Record<string, unknown>).map_x;
    delete (metadata as Record<string, unknown>).map_y;
    return metadata;
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Property name is required.";
    if (price.trim() && !Number.isFinite(Number(price))) errs.price = "Price must be a finite number.";
    else if (price.trim() && Number(price) < 0) errs.price = "Price must be ≥ 0.";
    if (currency.trim() && !/^[A-Z]{3}$/i.test(currency.trim())) errs.currency = "Currency must be a 3-letter code.";
    if (bedrooms.trim() && (!Number.isInteger(Number(bedrooms)) || Number(bedrooms) < 0))
      errs.bedrooms = "Bedrooms must be a non-negative integer.";
    if (bathrooms.trim() && (!Number.isFinite(Number(bathrooms)) || Number(bathrooms) < 0))
      errs.bathrooms = "Bathrooms must be ≥ 0.";
    if (areaSqm.trim() && (!Number.isFinite(Number(areaSqm)) || Number(areaSqm) < 0))
      errs.area_sqm = "Area must be ≥ 0.";
    if (plotAreaSqm.trim() && (!Number.isFinite(Number(plotAreaSqm)) || Number(plotAreaSqm) < 0))
      errs.plot_area_sqm = "Plot area must be ≥ 0.";
    if (parking.trim() && (!Number.isInteger(Number(parking)) || Number(parking) < 0))
      errs.parking = "Parking must be a non-negative integer.";
    if (capacity.trim() && (!Number.isInteger(Number(capacity)) || Number(capacity) < 0))
      errs.capacity = "Capacity must be a non-negative integer.";
    if (placed.trim() && (!Number.isInteger(Number(placed)) || Number(placed) < 0))
      errs.placed = "Placed must be a non-negative integer.";
    if ((latitude.trim() && !longitude.trim()) || (!latitude.trim() && longitude.trim())) {
      errs.latitude = "Both latitude and longitude must be provided together.";
      errs.longitude = "Both latitude and longitude must be provided together.";
    } else if (latitude.trim()) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) errs.latitude = "Latitude must be between -90 and 90.";
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) errs.longitude = "Longitude must be between -180 and 180.";
    }
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setSubmitError(null);
    const v = validate();
    if (Object.keys(v).length > 0) {
      setFieldErrors(v);
      setSubmitError("Please correct the highlighted fields.");
      return;
    }

    const metadata = buildMetadata();
    const hasCoords = latitude.trim() !== "" && longitude.trim() !== "";

    setSaving(true);
    try {
      let assetId: string | null = initial?.id ?? null;

      if (mode === "create") {
        const payload: AssetCreateInput = {
          project_id: projectId,
          asset_type_id: typeId || null,
          asset_status_id: statusId || null,
          name: name.trim(),
          code: code.trim() || null,
          description: description.trim() || null,
          notes: notes.trim() || null,
          metadata,
          latitude: hasCoords ? Number(latitude) : undefined,
          longitude: hasCoords ? Number(longitude) : undefined,
        };
        const res = await createAsset(payload);
        assetId = res.data.id;

        // Upload pending images
        const uploadedImages: Array<{ id: string; docId: string }> = [];
        for (const p of pendingImages) {
          p.status = "uploading";
          setPendingImages([...pendingImages]);
          try {
            const up = await uploadDocument({
              asset_id: assetId as string,
              file: p.file,
              category: "image",
            });
            uploadedImages.push({ id: p.id, docId: up.data.id });
          } catch (err) {
            p.status = "error";
            p.error = err instanceof Error ? err.message : "Upload failed";
          }
        }

        // Resolve cover: pending cover id or first uploaded or existing
        let coverToSet: string | null = null;
        if (coverPendingId) {
          const found = uploadedImages.find((u) => u.id === coverPendingId);
          if (found) coverToSet = found.docId;
        } else if (uploadedImages.length > 0 && !coverId) {
          coverToSet = uploadedImages[0].docId;
        } else if (coverId) {
          coverToSet = coverId;
        }
        if (coverToSet) {
          await updateAssetForCover(assetId as string, {
            metadata: { ...metadata, [COVER_DOCUMENT_META_KEY]: coverToSet },
          });
        }

        // Upload pending documents
        for (const d of pendingDocs) {
          try {
            await uploadDocument({
              asset_id: assetId as string,
              file: d.file,
              name: d.name,
              category: d.category,
            });
          } catch {
            // toast but not fatal
          }
        }

        // Link contacts
        for (const link of contactLinks) {
          try {
            await linkAssetContact(assetId as string, link.contactId, link.role);
          } catch {
            // ignore individual link errors
          }
        }

        bumpRefresh();
        toast.success("Property created", name.trim());
        // Cleanup previews
        for (const p of pendingImages) URL.revokeObjectURL(p.previewUrl);
        if (onCreated) onCreated(assetId as string);
        try {
          router?.push(`/dashboard/properties/${assetId}`);
        } catch {}
        onClose();
      } else {
        // Edit
        if (!assetId) throw new Error("Missing asset id");
        const payload: AssetUpdateInput = {
          asset_type_id: typeId || null,
          asset_status_id: statusId || null,
          name: name.trim(),
          code: code.trim() || null,
          description: description.trim() || null,
          notes: notes.trim() || null,
          metadata: coverId
            ? { ...metadata, [COVER_DOCUMENT_META_KEY]: coverId }
            : coverPendingId
              ? metadata
              : { ...metadata, [COVER_DOCUMENT_META_KEY]: null },
          latitude: hasCoords ? Number(latitude) : null,
          longitude: hasCoords ? Number(longitude) : null,
        };
        // If cover is pending image, we need to upload first then set cover
        let pendingCoverDocId: string | null = null;
        if (pendingImages.length > 0) {
          for (const p of pendingImages) {
            try {
              const up = await uploadDocument({
                asset_id: assetId,
                file: p.file,
                category: "image",
              });
              if (p.id === coverPendingId) pendingCoverDocId = up.data.id;
              if (!coverId && !coverPendingId && pendingImages.indexOf(p) === 0) {
                // auto-cover first upload if no cover
                pendingCoverDocId = up.data.id;
              }
            } catch (err) {
              toast.error("Photo upload failed", err instanceof Error ? err.message : undefined);
            }
          }
        }
        if (pendingCoverDocId) {
          payload.metadata = { ...(payload.metadata as Record<string, unknown>), [COVER_DOCUMENT_META_KEY]: pendingCoverDocId };
        } else if (coverPendingId && !pendingCoverDocId) {
          // should not happen
        }

        await updateAsset(assetId, payload);

        // Upload pending docs
        for (const d of pendingDocs) {
          try {
            await uploadDocument({
              asset_id: assetId,
              file: d.file,
              name: d.name,
              category: d.category,
            });
          } catch {
            // ignore
          }
        }

        // Link new contacts (those marked isNew)
        for (const link of contactLinks.filter((l) => l.isNew)) {
          try {
            await linkAssetContact(assetId, link.contactId, link.role);
          } catch (e) {
            toast.error("Could not link contact", e instanceof Error ? e.message : undefined);
          }
        }

        bumpRefresh();
        toast.success("Property updated");
        for (const p of pendingImages) URL.revokeObjectURL(p.previewUrl);
        onClose();
      }
    } catch (err: unknown) {
      // Map server ValidationAppError details to field errors if possible
      const msg = err instanceof Error ? err.message : "Save failed.";
      // Try to parse field errors from message (e.g., "price must be...")
      setSubmitError(msg);
      // Heuristic: map price/currency/bedrooms etc.
      if (/price/i.test(msg)) setFieldErrors((prev) => ({ ...prev, price: msg }));
      else if (/currency/i.test(msg)) setFieldErrors((prev) => ({ ...prev, currency: msg }));
      else if (/latitude|longitude/i.test(msg)) setFieldErrors((prev) => ({ ...prev, latitude: msg, longitude: msg }));
    } finally {
      setSaving(false);
    }
  }

  // --- Render helpers ---
  const fieldClass =
    "mt-1.5 w-full rounded-[var(--ops-radius-lg)] border border-transparent bg-[var(--ops-surface-hover)] px-4 py-2.5 text-[14px] text-[var(--ops-text)] placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-border-subtle)] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--ops-accent-muted)] transition-all";
  const fieldErrorClass =
    "mt-1.5 w-full rounded-[var(--ops-radius-lg)] border border-[var(--ops-danger)] bg-white px-4 py-2.5 text-[14px] text-[var(--ops-text)] focus:outline-none focus:ring-4 focus:ring-[var(--ops-danger)]/20 transition-all";
  const labelClass = "block text-[13px] font-semibold text-[var(--ops-text-secondary)]";
  const sectionClass = "border border-[var(--ops-border-subtle)] rounded-[var(--ops-radius-xl)] p-5 shadow-sm bg-white scroll-mt-4";
  const titleClass = "mb-4 text-[16px] font-bold text-[var(--ops-text)]";

  function toggleFeature(feat: string) {
    const cur = new Set(featuresText.split(",").map((s) => s.trim()).filter(Boolean));
    if (cur.has(feat)) cur.delete(feat);
    else cur.add(feat);
    setFeaturesText(Array.from(cur).join(", "));
  }
  const activeFeatures = new Set(featuresText.split(",").map((s) => s.trim()).filter(Boolean));

  const navItems: Array<{ key: keyof typeof refs; label: string }> = [
    { key: "basics", label: "Basics" },
    { key: "details", label: "Details" },
    { key: "features", label: "Features" },
    { key: "commercial", label: "Commercial" },
    { key: "location", label: "Location" },
    { key: "photos", label: "Photos" },
    { key: "documents", label: "Documents" },
    { key: "contacts", label: "Contacts" },
    { key: "operations", label: "Operations" },
  ];

  if (demoMode) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm font-medium text-[var(--ops-text-muted)]">Demo Mode is read-only — property editing is disabled.</p>
        <Button variant="secondary" size="sm" onClick={onClose} className="mt-4 rounded-full">
          Close
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Anchor nav */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-[var(--ops-bg)]/80 backdrop-blur border-b border-[var(--ops-border-subtle)]">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => scrollTo(item.key)}
              className="shrink-0 rounded-full border border-[var(--ops-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ops-text-secondary)] hover:border-[var(--ops-accent)] hover:text-[var(--ops-accent)] transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--ops-bg)]">
        {/* BASICS */}
        <section ref={refs.basics} className={sectionClass} aria-labelledby="basics-title">
          <h3 id="basics-title" className={titleClass}>
            Basics
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className={labelClass}>Property name *</span>
              <input
                className={fieldErrors.name ? fieldErrorClass : fieldClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Villa 14"
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "err-name" : undefined}
              />
              {fieldErrors.name ? (
                <p id="err-name" className="mt-1 text-xs text-[var(--ops-danger)]">
                  {fieldErrors.name}
                </p>
              ) : null}
            </label>
            <label>
              <span className={labelClass}>Property type</span>
              <select className={fieldClass} value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                <option value="">— Select type</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClass}>Status</span>
              <select className={fieldClass} value={statusId} onChange={(e) => setStatusId(e.target.value)}>
                <option value="">— Select status</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClass}>Unit / Villa No.</span>
              <input className={fieldClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. V-101" />
            </label>
            <label>
              <span className={labelClass}>Development</span>
              <input className={fieldClass} value={projectId} disabled placeholder="Development" />
            </label>
            <label className="sm:col-span-2">
              <span className={labelClass}>Address</span>
              <input
                className={fieldClass}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full property address"
              />
            </label>
            <label className="sm:col-span-2">
              <span className={labelClass}>Description</span>
              <textarea className={fieldClass} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details about this property..." />
            </label>
          </div>
        </section>

        {/* DETAILS */}
        <section ref={refs.details} className={sectionClass} aria-labelledby="details-title">
          <h3 id="details-title" className={titleClass}>
            Details
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={labelClass}>Bedrooms</span>
              <input
                className={fieldErrors.bedrooms ? fieldErrorClass : fieldClass}
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 3"
              />
              {fieldErrors.bedrooms ? <p className="mt-1 text-xs text-[var(--ops-danger)]">{fieldErrors.bedrooms}</p> : null}
            </label>
            <label>
              <span className={labelClass}>Bathrooms</span>
              <input
                className={fieldErrors.bathrooms ? fieldErrorClass : fieldClass}
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 2.5"
              />
              {fieldErrors.bathrooms ? <p className="mt-1 text-xs text-[var(--ops-danger)]">{fieldErrors.bathrooms}</p> : null}
            </label>
            <label>
              <span className={labelClass}>Built-up Area (sqm)</span>
              <input
                className={fieldErrors.area_sqm ? fieldErrorClass : fieldClass}
                value={areaSqm}
                onChange={(e) => setAreaSqm(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 148"
              />
              {fieldErrors.area_sqm ? <p className="mt-1 text-xs text-[var(--ops-danger)]">{fieldErrors.area_sqm}</p> : null}
            </label>
            <label>
              <span className={labelClass}>Plot Area (sqm)</span>
              <input
                className={fieldErrors.plot_area_sqm ? fieldErrorClass : fieldClass}
                value={plotAreaSqm}
                onChange={(e) => setPlotAreaSqm(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 300"
              />
              {fieldErrors.plot_area_sqm ? <p className="mt-1 text-xs text-[var(--ops-danger)]">{fieldErrors.plot_area_sqm}</p> : null}
            </label>
            <label>
              <span className={labelClass}>Parking spaces</span>
              <input
                className={fieldErrors.parking ? fieldErrorClass : fieldClass}
                value={parking}
                onChange={(e) => setParking(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 2"
              />
              {fieldErrors.parking ? <p className="mt-1 text-xs text-[var(--ops-danger)]">{fieldErrors.parking}</p> : null}
            </label>
            <label>
              <span className={labelClass}>Furnishing</span>
              <select className={fieldClass} value={furnishing} onChange={(e) => setFurnishing(e.target.value)}>
                <option value="">—</option>
                {FURNISHING_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={labelClass}>View</span>
              <input className={fieldClass} value={view} onChange={(e) => setView(e.target.value)} placeholder="e.g. Ocean view" />
            </label>
            <label>
              <span className={labelClass}>Floor</span>
              <input className={fieldClass} value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="e.g. Ground" />
            </label>
          </div>
        </section>

        {/* FEATURES */}
        <section ref={refs.features} className={sectionClass} aria-labelledby="features-title">
          <h3 id="features-title" className={titleClass}>
            Features & Amenities
          </h3>
          <div className="mb-4 flex flex-wrap gap-2">
            {FEATURE_OPTIONS.map((feat) => {
              const active = activeFeatures.has(feat);
              return (
                <button
                  key={feat}
                  type="button"
                  onClick={() => toggleFeature(feat)}
                  aria-pressed={active}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-transparent bg-[var(--ops-accent)] text-white shadow-sm"
                      : "border-[var(--ops-border-subtle)] bg-[var(--ops-surface-hover)] text-[var(--ops-text-secondary)] hover:border-[var(--ops-accent)]/40"
                  }`}
                >
                  {feat}
                </button>
              );
            })}
          </div>
          <label>
            <span className={labelClass}>Other features (comma-separated)</span>
            <input
              className={fieldClass}
              value={Array.from(activeFeatures)
                .filter((f) => !FEATURE_OPTIONS.includes(f))
                .join(", ")}
              onChange={(e) => {
                const presets = Array.from(activeFeatures).filter((f) => FEATURE_OPTIONS.includes(f));
                const custom = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean);
                setFeaturesText([...presets, ...custom].join(", "));
              }}
              placeholder="e.g. Rooftop lounge"
            />
          </label>
        </section>

        {/* COMMERCIAL */}
        <section ref={refs.commercial} className={sectionClass} aria-labelledby="commercial-title">
          <h3 id="commercial-title" className={titleClass}>
            Commercial
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={labelClass}>Price</span>
              <input
                className={fieldErrors.price ? fieldErrorClass : fieldClass}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 2500000000"
              />
              {fieldErrors.price ? <p className="mt-1 text-xs text-[var(--ops-danger)]">{fieldErrors.price}</p> : null}
            </label>
            <label>
              <span className={labelClass}>Currency</span>
              <select
                className={fieldErrors.currency ? fieldErrorClass : fieldClass}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="">—</option>
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {fieldErrors.currency ? <p className="mt-1 text-xs text-[var(--ops-danger)]">{fieldErrors.currency}</p> : null}
            </label>
          </div>
        </section>

        {/* LOCATION — embedded Google Map */}
        <section ref={refs.location} className={sectionClass} aria-labelledby="location-title">
          <h3 id="location-title" className={titleClass}>
            Location
          </h3>
          <p className="-mt-3 mb-3 text-xs text-[var(--ops-text-muted)]">Click the map to place the property. Drag to adjust.</p>
          <div className="h-[320px] overflow-hidden rounded-[var(--ops-radius-lg)] border border-[var(--ops-border-subtle)]">
            <PropertyMap
              className="h-full w-full"
              assets={
                initial && isPlaced
                  ? [
                      {
                        ...(initial as Asset),
                        latitude: Number(latitude),
                        longitude: Number(longitude),
                      } as Asset,
                    ]
                  : []
              }
              statuses={statuses}
              selectedAssetId={initial?.id ?? null}
              placementMode
              placement={geoPoint}
              onPlace={(coords) => {
                setLatitude(coords.latitude.toFixed(6));
                setLongitude(coords.longitude.toFixed(6));
                onPlacementChange?.(coords);
              }}
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className={`text-xs font-medium ${isPlaced ? "text-[var(--ops-accent)]" : "text-[var(--ops-text-muted)]"}`}>
              {isPlaced ? `Placed: ${latitude}, ${longitude}` : "Not placed on map"}
            </span>
            {isPlaced ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearPlacement} className="ml-auto">
                Remove placement
              </Button>
            ) : null}
          </div>
          {(fieldErrors.latitude || fieldErrors.longitude) && (
            <p className="mt-2 text-xs text-[var(--ops-danger)]">{fieldErrors.latitude || fieldErrors.longitude}</p>
          )}
          <details className="mt-3 group">
            <summary className="cursor-pointer text-xs font-semibold text-[var(--ops-text-muted)] hover:text-[var(--ops-text)] inline-flex items-center gap-1.5 select-none">
              Advanced coordinates
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 pt-3 border-t border-[var(--ops-border-subtle)]">
              <label>
                <span className={labelClass}>Latitude</span>
                <input
                  className={fieldErrors.latitude ? fieldErrorClass : fieldClass}
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  inputMode="decimal"
                  placeholder="-8.815"
                />
              </label>
              <label>
                <span className={labelClass}>Longitude</span>
                <input
                  className={fieldErrors.longitude ? fieldErrorClass : fieldClass}
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  inputMode="decimal"
                  placeholder="115.088"
                />
              </label>
            </div>
          </details>
        </section>

        {/* PHOTOS */}
        <section ref={refs.photos} className={sectionClass} aria-labelledby="photos-title">
          <h3 id="photos-title" className={titleClass}>
            Photos
          </h3>
          {/* Existing images (edit mode) */}
          {mode === "edit" && (
            <div className="mb-4">
              {loadingDocs ? (
                <p className="text-xs text-[var(--ops-text-muted)]">Loading photos…</p>
              ) : existingImages.length === 0 && pendingImages.length === 0 ? (
                <p className="text-xs text-[var(--ops-text-muted)]">No photos yet.</p>
              ) : null}
              {existingImages.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-3">
                  {existingImages.map((img) => {
                    const isCover = coverId === img.id;
                    return (
                      <div
                        key={img.id}
                        className={`group relative aspect-square overflow-hidden rounded-xl border bg-white ${isCover ? "border-[var(--ops-accent)] ring-2 ring-[var(--ops-accent)]/20" : "border-[var(--ops-border-subtle)]"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.has_thumbnail ? `/api/documents/${img.id}/thumbnail` : `/api/documents/${img.id}/preview`}
                          alt={img.name}
                          className="h-full w-full object-cover"
                        />
                        {isCover ? (
                          <span className="absolute left-2 top-2 rounded-full bg-[var(--ops-accent)] px-2 py-0.5 text-[10px] font-bold text-white uppercase">Cover</span>
                        ) : null}
                        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-1 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-6 rounded-full bg-white px-2 text-[11px]"
                            onClick={() => setCoverId(img.id)}
                          >
                            {isCover ? "Cover ✓" : "Set cover"}
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            className="h-6 w-6 rounded-full bg-white p-0"
                            aria-label={`Delete ${img.name}`}
                            onClick={() => void handleDeleteExistingImage(img.id)}
                          >
                            <Icon name="trash" size={12} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Pending images (both modes) */}
          {pendingImages.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-3">
              {pendingImages.map((p, idx) => {
                const isCoverPending = coverPendingId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`group relative aspect-square overflow-hidden rounded-xl border bg-white ${isCoverPending ? "border-[var(--ops-accent)] ring-2 ring-[var(--ops-accent)]/20" : "border-[var(--ops-border-subtle)]"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.previewUrl} alt={p.file.name} className="h-full w-full object-cover" />
                    {isCoverPending ? (
                      <span className="absolute left-2 top-2 rounded-full bg-[var(--ops-accent)] px-2 py-0.5 text-[10px] font-bold text-white uppercase">Cover</span>
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-1 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-2">
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-6 w-6 rounded-full bg-white p-0"
                          onClick={() => movePending(-1, idx)}
                          disabled={idx === 0}
                          aria-label="Move left"
                        >
                          ←
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-6 w-6 rounded-full bg-white p-0"
                          onClick={() => movePending(1, idx)}
                          disabled={idx === pendingImages.length - 1}
                          aria-label="Move right"
                        >
                          →
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 rounded-full bg-white text-xs"
                        onClick={() => setCoverPendingId(p.id)}
                      >
                        {isCoverPending ? "Cover" : "Set cover"}
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className="h-7 rounded-full bg-white"
                        onClick={() => removePendingImage(p.id)}
                      >
                        <Icon name="trash" size={12} /> Remove
                      </Button>
                    </div>
                    {p.status === "error" ? <p className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-red-600/80 rounded px-1">{p.error}</p> : null}
                  </div>
                );
              })}
            </div>
          )}

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--ops-border)] bg-[var(--ops-surface-hover)] px-4 py-6 text-sm font-medium text-[var(--ops-text-secondary)] hover:border-[var(--ops-accent)] hover:text-[var(--ops-accent)] transition-colors">
            <Icon name="upload" size={16} />
            {pendingImages.length > 0 || existingImages.length > 0 ? "Add more photos" : "Add photos (multiple)"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageFiles(e.target.files)} />
          </label>
          <p className="mt-2 text-xs text-[var(--ops-text-muted)]">Accepted: JPEG/PNG/WebP/GIF up to 10MB. Thumbnails generated server-side.</p>
        </section>

        {/* DOCUMENTS */}
        <section ref={refs.documents} className={sectionClass} aria-labelledby="documents-title">
          <h3 id="documents-title" className={titleClass}>
            Documents
          </h3>
          {mode === "edit" && existingNonImageDocs.length > 0 && (
            <ul className="mb-3 space-y-2">
              {existingNonImageDocs.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 rounded-lg border border-[var(--ops-border-subtle)] bg-white px-3 py-2">
                  <Icon name="file" size={16} className="text-[var(--ops-text-muted)]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[var(--ops-text)]">{doc.name}</p>
                    <p className="text-[10px] text-[var(--ops-text-muted)]">
                      {doc.category} · {doc.filename}
                    </p>
                  </div>
                  <Button type="button" variant="danger" size="sm" onClick={() => void deleteDocument(doc.id).then(() => setExistingDocs((prev) => prev.filter((d) => d.id !== doc.id)))}>
                    <Icon name="trash" size={12} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {pendingDocs.length > 0 && (
            <ul className="mb-3 space-y-2">
              {pendingDocs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-lg border border-[var(--ops-border-subtle)] bg-white px-3 py-2">
                  <Icon name="file" size={16} className="text-[var(--ops-text-muted)]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[var(--ops-text)]">{d.name}</p>
                    <p className="text-[10px] text-[var(--ops-text-muted)]">
                      {d.category} · {d.file.name}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removePendingDoc(d.id)}>
                    <Icon name="x" size={14} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className={fieldClass}
              placeholder="Display name (optional)"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />
            <select className={fieldClass} value={docCategory} onChange={(e) => setDocCategory(e.target.value)}>
              <option value="contract">Contract</option>
              <option value="other">Floor Plan</option>
              <option value="other">Brochure</option>
              <option value="other">Inspection</option>
              <option value="other">Maintenance</option>
              <option value="other">Other</option>
            </select>
          </div>
          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--ops-border)] bg-[var(--ops-surface-hover)] px-4 py-4 text-sm font-medium text-[var(--ops-text-secondary)] hover:border-[var(--ops-accent)] hover:text-[var(--ops-accent)]">
            <Icon name="upload" size={16} /> Add documents (multiple)
            <input type="file" multiple className="hidden" onChange={(e) => handleDocFiles(e.target.files)} />
          </label>
        </section>

        {/* CONTACTS */}
        <section ref={refs.contacts} className={sectionClass} aria-labelledby="contacts-title">
          <h3 id="contacts-title" className={titleClass}>
            Contacts
          </h3>
          {contactLinks.length > 0 && (
            <ul className="mb-3 space-y-2">
              {contactLinks.map((link) => (
                <li key={link.id} className="flex items-center gap-2 rounded-lg border border-[var(--ops-border-subtle)] bg-white px-3 py-2">
                  <span className="flex-1 text-xs font-medium text-[var(--ops-text)]">
                    {link.contactName} <span className="text-[11px] text-[var(--ops-text-muted)]">· {link.role}</span>
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeContactLink(link.id)}>
                    <Icon name="x" size={14} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                className={fieldClass}
                placeholder="Search contacts…"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
              {contactResults.length > 0 && (
                <ul className="absolute left-0 right-0 z-10 mt-1 max-h-40 overflow-y-auto rounded-xl border border-[var(--ops-border)] bg-white shadow-lg">
                  {contactResults.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => addContactLink(c)}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-[var(--ops-surface-hover)]"
                      >
                        <span className="font-medium">{c.full_name}</span>
                        <span className="ml-2 text-[11px] text-[var(--ops-text-muted)]">{c.type}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <select className="w-28 rounded-[var(--ops-radius-lg)] border bg-[var(--ops-surface-hover)] px-2 text-xs" value={contactRole} onChange={(e) => setContactRole(e.target.value)}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          {searchingContacts ? <p className="mt-2 text-xs text-[var(--ops-text-muted)]">Searching…</p> : null}
          <div className="mt-4 rounded-xl border border-[var(--ops-border-subtle)] bg-[var(--ops-surface-hover)] p-3">
            <p className="mb-2 text-xs font-semibold text-[var(--ops-text)]">Quick-create contact</p>
            <div className="flex gap-2">
              <input className="flex-1 rounded-lg border bg-white px-3 py-2 text-xs" placeholder="Full name" value={quickName} onChange={(e) => setQuickName(e.target.value)} />
              <select className="w-24 rounded-lg border bg-white px-2 text-xs" value={quickType} onChange={(e) => setQuickType(e.target.value)}>
                {["owner", "agent", "client", "vendor", "lead", "other"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <Button type="button" variant="secondary" size="sm" onClick={() => void handleQuickCreateContact()} disabled={!quickName.trim()}>
                Create
              </Button>
            </div>
          </div>
        </section>

        {/* OPERATIONS */}
        <section ref={refs.operations} className={sectionClass} aria-labelledby="operations-title">
          <h3 id="operations-title" className={titleClass}>
            Operations
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={labelClass}>Capacity (max pax)</span>
              <input
                className={fieldErrors.capacity ? fieldErrorClass : fieldClass}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 6"
              />
              {fieldErrors.capacity ? <p className="mt-1 text-xs text-[var(--ops-danger)]">{fieldErrors.capacity}</p> : null}
            </label>
            <label>
              <span className={labelClass}>Placed (pax)</span>
              <input
                className={fieldErrors.placed ? fieldErrorClass : fieldClass}
                value={placed}
                onChange={(e) => setPlaced(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 4"
              />
              {fieldErrors.placed ? <p className="mt-1 text-xs text-[var(--ops-danger)]">{fieldErrors.placed}</p> : null}
            </label>
            <label className="sm:col-span-2">
              <span className={labelClass}>Internal notes</span>
              <textarea className={fieldClass} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Operational notes..." />
            </label>
          </div>
        </section>

        {submitError ? (
          <p className="rounded-xl bg-[var(--ops-danger-muted)] p-3 text-sm font-medium text-[var(--ops-danger)]" role="alert">
            {submitError}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end gap-3 border-t border-[var(--ops-border-subtle)] bg-white px-6 py-4">
        <Button type="button" variant="secondary" size="lg" onClick={onClose} disabled={saving} className="rounded-full">
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="lg" disabled={saving} className="rounded-full px-8">
          {saving ? "Saving…" : mode === "create" ? "Create Property" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
