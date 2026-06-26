"use client";

import { useState, useEffect, useCallback } from "react";
import { IconSearch, IconX } from "@tabler/icons-react";

/**
 * GlobalSearch provides a searchable input triggered by a search icon.
 *
 * Spec: Section 8.3
 * - Placeholder: "Search features, teams, or issues..."
 * - Keyboard shortcut: ⌘K / Ctrl+K
 * - Expands to full-width input when active
 *
 * Note: This is a placeholder until the search scope and API endpoint are
 * defined in Wave 0.
 */
export interface GlobalSearchProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export default function GlobalSearch({
  placeholder = "Search features, teams, or issues...",
  onSearch,
}: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSearch?.(query);
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        data-testid="global-search-trigger"
        aria-label="Search"
        onClick={toggle}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          border: "none",
          background: "transparent",
          color: "var(--color-text-secondary)",
          cursor: "pointer",
          borderRadius: "var(--radius-md)",
        }}
      >
        <IconSearch size={20} stroke={1.5} />
      </button>
    );
  }

  return (
    <form
      data-testid="global-search-form"
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        flex: 1,
        maxWidth: 400,
        padding: "var(--space-2) var(--space-3)",
        border: "1px solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-surface-card)",
      }}
    >
      <IconSearch size={18} stroke={1.5} color="var(--color-text-secondary)" />
      <input
        type="text"
        data-testid="global-search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Global search"
        autoFocus
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: "var(--font-size-body)",
          color: "var(--color-text-primary)",
        }}
      />
      <button
        type="button"
        data-testid="global-search-close"
        aria-label="Close search"
        onClick={close}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          background: "transparent",
          color: "var(--color-text-secondary)",
          cursor: "pointer",
        }}
      >
        <IconX size={18} stroke={1.5} />
      </button>
    </form>
  );
}
