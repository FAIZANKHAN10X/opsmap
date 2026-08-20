"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  CONTACT_TYPES,
  PROPERTY_CONTACT_ROLES,
  type Asset,
  type Contact,
  type ContactCreateInput,
  type ContactUpdateInput,
} from "@/types/domain";

type FormMode = "create" | "edit";

type LinkDraft = { assetId: string; role: string };

type ContactFormProps = {
  mode: FormMode;
  initial?: Contact | null;
  assets: Asset[];
  onSubmit: (payload: ContactCreateInput | ContactUpdateInput) => Promise<void>;
  onCancel: () => void;
};

export function ContactForm({
  mode,
  initial,
  assets,
  onSubmit,
  onCancel,
}: ContactFormProps) {
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [type, setType] = useState(initial?.type ?? "other");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [links, setLinks] = useState<LinkDraft[]>(
    initial?.properties?.map((p) => ({ assetId: p.asset_id, role: p.role })) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addLink() {
    setLinks((prev) => [...prev, { assetId: "", role: "owner" }]);
  }

  function updateLink(index: number, patch: Partial<LinkDraft>) {
    setLinks((prev) => prev.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  }

  function removeLink(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const properties = links
      .filter((l) => l.assetId)
      .map((l) => ({ asset_id: l.assetId, role: l.role }));

    const payload: ContactCreateInput = {
      type,
      full_name: fullName.trim(),
      company: company.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      whatsapp: whatsapp.trim() || null,
      notes: notes.trim() || null,
      properties,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setSaving(false);
    }
  }

  const fieldClass =
    "mt-1.5 w-full rounded-[var(--ops-radius-lg)] border border-transparent bg-[var(--ops-surface-hover)] px-4 py-2.5 text-[14px] text-[var(--ops-text)] placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-border-subtle)] focus:bg-[var(--ops-surface)] focus:outline-none focus:ring-4 focus:ring-[var(--ops-accent-muted)] transition-all";
  const labelClass = "block text-[13px] font-semibold text-[var(--ops-text-secondary)]";
  const sectionClass =
    "border border-[var(--ops-border-subtle)] rounded-[var(--ops-radius-xl)] p-5 shadow-sm bg-[var(--ops-surface)]";
  const sectionTitleClass = "mb-4 text-[16px] font-bold text-[var(--ops-text)]";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-6">
      <section className={sectionClass}>
        <h3 className={sectionTitleClass}>Contact</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={labelClass}>Full name *</span>
            <input
              className={fieldClass}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Made Wijaya"
              required
            />
          </label>
          <label>
            <span className={labelClass}>Type</span>
            <select
              className={fieldClass}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {CONTACT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={labelClass}>Company</span>
            <input
              className={fieldClass}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Wijaya Estates"
            />
          </label>
          <label>
            <span className={labelClass}>Email</span>
            <input
              className={fieldClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </label>
          <label>
            <span className={labelClass}>Phone</span>
            <input
              className={fieldClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+62 ..."
            />
          </label>
          <label>
            <span className={labelClass}>WhatsApp</span>
            <input
              className={fieldClass}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+62 ..."
            />
          </label>
          <label className="sm:col-span-2">
            <span className={labelClass}>Notes</span>
            <textarea
              className={fieldClass}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes about this contact..."
            />
          </label>
        </div>
      </section>

      <section className={sectionClass}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className={sectionTitleClass}>Associated Properties</h3>
          <Button variant="tonal" size="sm" onClick={addLink}>
            <Icon name="plus" size={14} />
            Add property
          </Button>
        </div>
        <p className="mb-4 text-[13px] text-[var(--ops-text-secondary)]">
          Link this contact to properties and their role on each one. A contact
          can relate to many properties without duplication.
        </p>
        {links.length === 0 ? (
          <p className="rounded-[var(--ops-radius-lg)] border border-dashed border-[var(--ops-border)] px-4 py-6 text-center text-[13px] text-[var(--ops-text-muted)]">
            No associated properties yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {links.map((link, index) => (
              <li
                key={index}
                className="grid grid-cols-1 gap-2 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border-subtle)] bg-[var(--ops-bg)] p-3 sm:grid-cols-[1fr_160px_auto] sm:items-center"
              >
                <label className="sr-only" htmlFor={`link-asset-${index}`}>
                  Property {index + 1}
                </label>
                <select
                  id={`link-asset-${index}`}
                  className={fieldClass}
                  value={link.assetId}
                  onChange={(e) => updateLink(index, { assetId: e.target.value })}
                >
                  <option value="">Select a property…</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                      {asset.code ? ` (${asset.code})` : ""}
                    </option>
                  ))}
                </select>
                <label className="sr-only" htmlFor={`link-role-${index}`}>
                  Role {index + 1}
                </label>
                <select
                  id={`link-role-${index}`}
                  className={fieldClass}
                  value={link.role}
                  onChange={(e) => updateLink(index, { role: e.target.value })}
                >
                  {PROPERTY_CONTACT_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeLink(index)}
                  aria-label="Remove property link"
                >
                  <Icon name="x" size={16} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <p
          className="bg-[var(--ops-danger-muted)] p-3 rounded-[var(--ops-radius-lg)] text-[14px] font-medium text-[var(--ops-danger)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3 pt-2 sticky bottom-0 bg-[var(--ops-bg)] py-4 border-t border-[var(--ops-border-subtle)] -mx-6 px-6 -mb-6 mt-6 z-10">
        <Button type="button" variant="secondary" size="lg" onClick={onCancel} disabled={saving} className="rounded-full shadow-sm">
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="lg" disabled={saving} className="rounded-full shadow-sm px-8">
          {saving ? "Saving…" : mode === "create" ? "Create Contact" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}