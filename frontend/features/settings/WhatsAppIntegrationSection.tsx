"use client";

/**
 * WhatsApp integration foundation (Phase 4).
 *
 * Foundation slot only — the UI honestly represents "Not connected". WhatsApp
 * messaging, webhooks, lead ingestion, conversations, automation, and message
 * storage are intentionally NOT implemented and no credential fields are
 * invented. Functional integration is deferred to a dedicated phase.
 */

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function WhatsAppIntegrationSection() {
  const [showNote, setShowNote] = useState(false);

  return (
    <div className="rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] shadow-sm bg-[var(--ops-surface)]">
      <header className="flex flex-wrap items-start gap-3 border-b border-[var(--ops-border-subtle)] p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[var(--ops-text)]">
            WhatsApp
          </h2>
          <span className="rounded-full border border-[var(--ops-border)] px-2 py-0.5 font-mono text-[10px] tracking-wide text-[var(--ops-text-muted)] uppercase">
            Not connected
          </span>
        </div>
        <p className="mt-1 w-full max-w-xl text-[13px] text-[var(--ops-text-secondary)]">
          Messaging and lead capture are not available yet. This is the
          configuration slot for a future WhatsApp connection.
        </p>
        <div className="ml-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowNote((v) => !v)}
          >
            <Icon name="info" size={14} />
            Configure
          </Button>
        </div>
      </header>

      <div className="space-y-3 p-4">
        <p className="text-sm text-[var(--ops-text-secondary)]">
          No WhatsApp integration is connected. When a connection is
          configured, its status and settings will appear here.
        </p>
        {showNote ? (
          <div className="rounded-[var(--ops-radius)] border border-[var(--ops-border-subtle)] bg-[var(--ops-bg)] p-3 text-xs text-[var(--ops-text-secondary)]">
            WhatsApp functionality is intentionally deferred: messaging,
            webhooks, inbound/outbound messages, lead ingestion, contact
            creation, automation, and message storage are not implemented and
            no credentials are stored. The integration architecture is designed
            in a dedicated phase.
          </div>
        ) : null}
      </div>
    </div>
  );
}