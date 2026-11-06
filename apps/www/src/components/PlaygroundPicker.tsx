"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/kadal/ui/select";

export type PlaygroundExample = { name: string; label: string; title: string };

/**
 * The example picker on /playground. The page is static, so the island reads the `?example=`
 * parameter itself and announces every change as a `kadal:example` event for the page script,
 * which swaps the LiveCodes project. Rendered client-only: the initial value depends on the URL.
 */
export function PlaygroundPicker({
  examples,
  fallback,
}: {
  examples: PlaygroundExample[];
  fallback: string;
}) {
  const [value, setValue] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("example");
    return examples.some((e) => e.name === requested) ? (requested as string) : fallback;
  });
  const items = examples.map((e) => ({ value: e.name, label: e.label }));
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (typeof next !== "string" || next === value) return;
        setValue(next);
        window.dispatchEvent(new CustomEvent("kadal:example", { detail: next }));
      }}
      items={items}
    >
      <SelectTrigger className="min-w-52 bg-background" aria-label="Example">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" className="max-h-[70vh]">
        {examples.map((e) => (
          <SelectItem key={e.name} value={e.name}>
            {e.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
