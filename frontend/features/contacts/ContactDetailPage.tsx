"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingBlock } from "@/components/feedback/LoadingBlock";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ContactForm } from "@/features/contacts/ContactForm";
import { contactTypeLabel, roleLabel } from "@/features/contacts/contactMeta";
import { listAssets } from "@/services/assets";
import { deleteContact, getContact, updateContact } from "@/services/contacts";
import { useShell } from "@/stores/shell-context";
import { useToast } from "@/stores/toast-context";
import { usePermissions } from "@/stores/user-context";
import type {
  Asset,
  Contact,
  ContactCreateInput,
  ContactUpdateInput,
} from "@/types/domain";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; contact: Contact };

export function ContactDetailPage({ contactId }: { contactId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { demoMode, refreshKey, bumpRefresh } = useShell();
  const { canEdit, canDelete } = usePermissions();

  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [editing, setEditing] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    let cancelled = false;
    getContact(contactId, demoMode)
      .then((res) => {
        if (cancelled) return;
        setLoadState({ status: "ready", contact: res.data });
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setLoadState({
            status: "error",
            message: err.message || "Failed to load contact.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [contactId, demoMode, refreshKey]);

  async function openEdit() {
    setEditing(true);
    try {
      const res = await listAssets({ limit: 100 }, demoMode);
      setAssets(res.data);
    } catch {
      setAssets([]);
    }
  }

  async function handleSave(payload: ContactCreateInput | ContactUpdateInput) {
    await updateContact(contactId, payload as ContactUpdateInput);
    setEditing(false);
    toast.success("Contact updated");
    bumpRefresh();
  }

  async function handleDelete(contact: Contact) {
    if (
      !window.confirm(
        `Delete "${contact.full_name}"? This removes the contact and its property links.`,
      )
    ) {
      return;
    }
    try {
      await deleteContact(contact.id);
      toast.success("Contact deleted");
      bumpRefresh();
      router.push("/dashboard/contacts");
    } catch (err) {
      toast.error(
        "Could not delete contact",
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
          <BackLink />
          <ErrorState message={loadState.message} />
        </div>
      </div>
    );
  }

  const contact = loadState.contact;
  const canMutate = canEdit && !demoMode;

  return (
    <div className="h-full overflow-y-auto bg-[var(--ops-bg)]">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <BackLink />

        <div className="bg-white rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-[var(--ops-shadow-sm)] p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[var(--ops-accent-muted)] text-[var(--ops-accent-hover)] flex items-center justify-center font-bold text-[20px]">
                {contact.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-mono text-[12px] font-bold tracking-wider text-[var(--ops-text-muted)] uppercase mb-1">
                  {contactTypeLabel(contact.type)}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ops-text)]">
                  {contact.full_name}
                </h1>
                {contact.company ? (
                  <p className="mt-1 text-[14px] text-[var(--ops-text-secondary)]">
                    {contact.company}
                  </p>
                ) : null}
              </div>
            </div>

            {canMutate && (canEdit || canDelete) && !editing ? (
              <div className="flex flex-wrap gap-3">
                {canEdit ? (
                  <Button variant="secondary" size="md" onClick={() => void openEdit()} className="rounded-full shadow-sm bg-white">
                    <Icon name="edit" size={16} />
                    Edit contact
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    variant="danger"
                    size="md"
                    className="rounded-full shadow-sm"
                    onClick={() => void handleDelete(contact)}
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
          <div className="bg-white rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-sm p-6 md:p-8">
            <ContactForm
              mode="edit"
              initial={contact}
              assets={assets}
              onSubmit={handleSave}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="Details">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-[14px]">
                <Field label="Type" value={contactTypeLabel(contact.type)} />
                <Field label="Company" value={contact.company ?? "—"} />
                <Field label="Email" value={contact.email ?? "—"} />
                <Field label="Phone" value={contact.phone ?? "—"} />
                <Field label="WhatsApp" value={contact.whatsapp ?? "—"} />
                <Field
                  label="Added"
                  value={new Date(contact.created_at).toLocaleDateString()}
                />
              </dl>
              {contact.notes ? (
                <div className="mt-4 pt-4 border-t border-[var(--ops-border-subtle)]">
                  <dt className="text-[13px] text-[var(--ops-text-muted)] mb-1">Notes</dt>
                  <dd className="whitespace-pre-wrap text-[14px] text-[var(--ops-text)] font-medium leading-relaxed">
                    {contact.notes}
                  </dd>
                </div>
              ) : null}
            </Section>

            <Section title="Associated Properties">
              {contact.properties.length === 0 ? (
                <p className="text-[14px] text-[var(--ops-text-muted)]">
                  No associated properties.
                </p>
              ) : (
                <ul className="space-y-2">
                  {contact.properties.map((link) => (
                    <li key={`${link.asset_id}-${link.role}`}>
                      <Link
                        href={`/dashboard/properties/${link.asset_id}`}
                        className="flex items-center gap-3 rounded-[var(--ops-radius-lg)] border border-[var(--ops-border-subtle)] bg-[var(--ops-bg)] px-3 py-2.5 hover:border-[var(--ops-border-strong)] transition-colors"
                      >
                        <span className="w-20 shrink-0 text-[13px] font-semibold text-[var(--ops-text-muted)]">
                          {roleLabel(link.role)}
                        </span>
                        <span className="truncate font-medium text-[var(--ops-text)]">
                          {link.asset_name}
                        </span>
                        <Icon
                          name="chevron-right"
                          size={16}
                          className="ml-auto shrink-0 text-[var(--ops-text-muted)]"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/contacts"
      className="mb-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ops-text-secondary)] hover:text-[var(--ops-text)] transition-colors"
    >
      <Icon name="chevron-left" size={16} />
      Back to contacts
    </Link>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-[var(--ops-shadow-sm)] p-6">
      <h3 className="mb-5 text-[16px] font-bold text-[var(--ops-text)]">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-[var(--ops-text-secondary)]">{label}</dt>
      <dd className="mt-1 font-semibold text-[var(--ops-text)] break-words">{value}</dd>
    </div>
  );
}