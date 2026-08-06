"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

// EDITABLE TEXT
//
// The one new interactive primitive the visual editor is built on. Renders `value` as
// plain, static text - identical className/style to whatever the call site already
// used, so read-only rendering (app/benchmark/page.tsx, Landing.test.tsx, any future
// public/published-page renderer) looks pixel-identical whether or not `onCommit` is
// ever passed. Doesn't know about persistence or failure: the caller's `onCommit` owns
// that (see app/editor/[id]/page.tsx's onEditContent) - if a commit fails upstream and
// the caller reverts its own `value` prop, this component just re-renders with the old
// value, same as any other controlled-from-above component.
export interface EditableTextProps {
  value: string;
  onCommit?: (next: string) => void;
  multiline?: boolean;
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3";
  className?: string;
  style?: CSSProperties;

  // Display-only decoration of the same string that gets edited. Editing still operates
  // on the plain `value`; this only changes how it is painted when idle. Exists so a
  // headline can emphasise one word INSIDE itself without that word becoming a second,
  // separately-stored field that has to agree with the first one.
  //
  // Plain data, not a render function, and that is load-bearing: the published page is a
  // React Server Component tree (app/s/[slug]/page.tsx), and a function prop crossing
  // into a client component throws "Functions cannot be passed directly to Client
  // Components" at request time. The whole test suite renders on the client and cannot
  // observe that boundary - it was caught by loading a real published page.
  highlight?: { word: string; gradient: string };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function withHighlight(value: string, highlight: EditableTextProps["highlight"]): ReactNode {
  const word = highlight?.word?.trim();
  if (!word) return value;

  // Word-boundary, case-insensitive, first occurrence only. A bare substring match would
  // light up the "art" inside "started".
  const match = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").exec(value);
  if (!match) return value;

  return (
    <>
      {value.slice(0, match.index)}
      <span className="bg-clip-text text-transparent" style={{ backgroundImage: highlight!.gradient }}>
        {match[0]}
      </span>
      {value.slice(match.index + match[0].length)}
    </>
  );
}

const EDITABLE_HOVER_CLASS = "cursor-text hover:outline hover:outline-1 hover:outline-dashed hover:outline-white/30 rounded-sm";

export default function EditableText({ value, onCommit, multiline = false, as: Tag = "span", className, style, highlight }: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = multiline ? textareaRef.current : inputRef.current;
    if (editing && el) {
      el.focus();
      el.select();
    }
  }, [editing, multiline]);

  function startEditing() {
    if (!onCommit) return;
    setDraft(value);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    const next = draft.trim();
    if (next.length > 0 && next !== value) {
      onCommit?.(next);
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      cancel();
      return;
    }
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      commit();
      return;
    }
    if (multiline && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commit();
    }
  }

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={textareaRef}
          value={draft}
          rows={3}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          onClick={(e) => e.stopPropagation()}
          className={className}
          style={style}
        />
      );
    }
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
        className={className}
        style={style}
      />
    );
  }

  return (
    <Tag
      className={[className, onCommit ? EDITABLE_HOVER_CLASS : ""].filter(Boolean).join(" ") || undefined}
      style={style}
      onClick={(e) => {
        if (!onCommit) return;
        e.stopPropagation();
        startEditing();
      }}
    >
      {withHighlight(value, highlight)}
    </Tag>
  );
}
