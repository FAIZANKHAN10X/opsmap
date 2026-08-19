"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import {
  searchSuggestions,
  type SearchSuggestion,
} from "@/services/search";
import { useShell } from "@/stores/shell-context";

export function SearchBar() {
  const router = useRouter();
  const { selectedProjectId, setSearch } = useShell();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      requestId.current += 1;
      const t = window.setTimeout(() => {
        setSuggestions([]);
        setLoadingSuggestions(false);
      }, 0);
      return () => window.clearTimeout(t);
    }

    const id = ++requestId.current;
    const handle = window.setTimeout(() => {
      setLoadingSuggestions(true);
      searchSuggestions(q, {
        project_id: selectedProjectId ?? undefined,
        limit: 6,
      })
        .then((res) => {
          if (requestId.current !== id) return;
          setSuggestions(res.data);
          setActiveIndex(-1);
          setLoadingSuggestions(false);
        })
        .catch(() => {
          if (requestId.current !== id) return;
          setSuggestions([]);
          setLoadingSuggestions(false);
        });
    }, 180);

    return () => {
      window.clearTimeout(handle);
    };
  }, [query, selectedProjectId]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function goToSearch(q: string) {
    setSearch(q);
    setOpen(false);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (selectedProjectId) params.set("project_id", selectedProjectId);
    router.push(`/dashboard/search?${params.toString()}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        const s = suggestions[activeIndex];
        setOpen(false);
        router.push(
          `/dashboard/search?q=${encodeURIComponent(s.name)}&project_id=${s.project_id}`,
        );
        return;
      }
      goToSearch(query);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && (suggestions.length > 0 || loadingSuggestions);

  return (
    <div ref={rootRef} className="relative hidden min-w-0 flex-1 md:block md:max-w-md">
      <label className="relative block">
        <span className="sr-only">Search assets</span>
        <Icon
          name="search"
          size={18}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--ops-text-muted)]"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search properties…"
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          className="h-10 w-full rounded-full border border-transparent bg-[var(--ops-surface-hover)] py-2 pr-4 pl-10 text-[14px] text-[var(--ops-text)] placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-border-subtle)] focus:bg-[var(--ops-surface)] focus:outline-none focus:ring-4 focus:ring-[var(--ops-accent-muted)] transition-all"
        />
      </label>

      {showDropdown ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full z-50 mt-2 max-h-72 w-full overflow-auto rounded-[var(--ops-radius-xl)] border border-[var(--ops-border-subtle)] bg-[var(--ops-surface)] py-2 shadow-[var(--ops-shadow-lg)]"
        >
          {loadingSuggestions && suggestions.length === 0 ? (
            <li className="px-4 py-3 text-xs text-[var(--ops-text-muted)] font-medium">
              Searching…
            </li>
          ) : null}
          {suggestions.map((item, index) => (
            <li key={item.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col px-4 py-2.5 text-left text-[14px] transition-colors",
                  index === activeIndex ? "bg-[var(--ops-accent-muted)]" : "hover:bg-[var(--ops-surface-hover)]"
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  setOpen(false);
                  router.push(
                    `/dashboard/search?q=${encodeURIComponent(item.name)}${
                      item.project_id ? `&project_id=${item.project_id}` : ""
                    }`,
                  );
                }}
              >
                <span className={cn("font-medium", index === activeIndex ? "text-[var(--ops-accent-hover)]" : "text-[var(--ops-text)]")}>
                  {item.name}
                </span>
                <span className="text-xs text-[var(--ops-text-muted)] mt-0.5">
                  {item.label}
                </span>
              </button>
            </li>
          ))}
          <li className="border-t border-[var(--ops-border-subtle)] mt-1 pt-1">
            <button
              type="button"
              className="w-full px-4 py-3 text-left text-[13px] font-medium text-[var(--ops-accent)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-accent-hover)] transition-colors"
              onClick={() => goToSearch(query)}
            >
              View all results for “{query.trim() || "…"}”
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
