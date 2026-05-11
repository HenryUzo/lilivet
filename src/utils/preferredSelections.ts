import type { Prisma } from "@prisma/client";

type PreferredSelectionLike = {
  date?: unknown;
};

function isPreferredSelection(value: unknown): value is PreferredSelectionLike {
  return typeof value === "object" && value !== null;
}

export function toDateKey(value: string) {
  return value.slice(0, 10);
}

export function normalizeDateFilterBoundary(value?: string | null) {
  return value ? toDateKey(value) : undefined;
}

export function extractPreferredSelectionDateKeys(preferredSelections: Prisma.JsonValue | unknown) {
  if (!Array.isArray(preferredSelections)) {
    return [];
  }

  const keys = new Set<string>();

  for (const selection of preferredSelections) {
    if (!isPreferredSelection(selection) || typeof selection.date !== "string" || selection.date.length < 10) {
      continue;
    }

    keys.add(toDateKey(selection.date));
  }

  return [...keys].sort((left, right) => left.localeCompare(right));
}
