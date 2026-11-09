import type { ReactNode } from "react";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function HighlightMatch({ text, query }: { text: string; query: string }) {
  const term = query.trim();
  if (!term) return text;

  const parts: ReactNode[] = [];
  const matches = text.matchAll(new RegExp(escapeRegExp(term), "gi"));
  let cursor = 0;
  for (const match of matches) {
    if (match.index === undefined) continue;
    parts.push(text.slice(cursor, match.index));
    parts.push(<mark key={match.index} className="bg-yellow-200 text-inherit">{match[0]}</mark>);
    cursor = match.index + match[0].length;
  }
  if (!parts.length) return text;
  parts.push(text.slice(cursor));
  return parts;
}
