import type { Prisma } from "@prisma/client";

type PreferredSelectionLike = {
  date?: unknown;
  timeSlots?: unknown;
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

type NormalizedPreferredSelection = {
  date: string;
  timeSlots: string[];
};

function parseDateTimeInputParts(value: string) {
  const match = value.match(
    /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>\d{2}):(?<minute>\d{2})$/
  );

  if (!match?.groups) {
    return null;
  }

  return {
    year: Number(match.groups.year),
    month: Number(match.groups.month),
    day: Number(match.groups.day),
    hour: Number(match.groups.hour),
    minute: Number(match.groups.minute)
  };
}

function getSafeTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "Africa/Lagos";
  }
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const effectiveTimeZone = getSafeTimeZone(timeZone);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: effectiveTimeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  const asUtcTime = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return asUtcTime - date.getTime();
}

function toUtcIsoFromTimeZone(value: string, timeZone: string) {
  const parts = parseDateTimeInputParts(value);

  if (!parts) {
    return null;
  }

  const utcGuess = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0)
  );
  let offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  let zonedDate = new Date(utcGuess.getTime() - offset);
  const correctedOffset = getTimeZoneOffsetMs(zonedDate, timeZone);

  if (correctedOffset !== offset) {
    offset = correctedOffset;
    zonedDate = new Date(utcGuess.getTime() - offset);
  }

  return zonedDate.toISOString();
}

export function normalizeSelectionDateKey(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

export function normalizePreferredSelections(
  preferredSelections: Prisma.JsonValue | unknown
): NormalizedPreferredSelection[] {
  if (!Array.isArray(preferredSelections)) {
    return [];
  }

  return preferredSelections.flatMap((selection) => {
    if (!isPreferredSelection(selection) || typeof selection.date !== "string" || !Array.isArray(selection.timeSlots)) {
      return [];
    }

    const date = normalizeSelectionDateKey(selection.date);

    if (!date) {
      return [];
    }

    const timeSlots = selection.timeSlots.filter((slot): slot is string => typeof slot === "string");

    return [{ date, timeSlots }];
  });
}

export function getPreferredSelectionInstant(date: string, timeSlot: string, timeZone: string) {
  const normalizedTime = timeSlot.trim();
  const normalizedDate = normalizeSelectionDateKey(date);
  const effectiveTimeZone = getSafeTimeZone(timeZone);

  if (!normalizedDate || !/^\d{1,2}:\d{2}$/.test(normalizedTime)) {
    return null;
  }

  const [hours, minutes] = normalizedTime.split(":");
  const localValue = `${normalizedDate}T${hours.padStart(2, "0")}:${minutes}`;
  const isoValue = toUtcIsoFromTimeZone(localValue, effectiveTimeZone);

  if (!isoValue) {
    return null;
  }

  const instant = new Date(isoValue);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

export function isPastPreferredSelection(
  date: string,
  timeSlot: string,
  timeZone: string,
  now = new Date()
) {
  const instant = getPreferredSelectionInstant(date, timeSlot, timeZone);
  return Boolean(instant && instant.getTime() <= now.getTime());
}

export function hasPastPreferredSelections(
  preferredSelections: Prisma.JsonValue | unknown,
  timeZone: string,
  now = new Date()
) {
  return normalizePreferredSelections(preferredSelections).some((selection) =>
    selection.timeSlots.some((timeSlot) => isPastPreferredSelection(selection.date, timeSlot, timeZone, now))
  );
}

export function hasAnyFuturePreferredSelection(
  preferredSelections: Prisma.JsonValue | unknown,
  timeZone: string,
  now = new Date()
) {
  return normalizePreferredSelections(preferredSelections).some((selection) =>
    selection.timeSlots.some((timeSlot) => !isPastPreferredSelection(selection.date, timeSlot, timeZone, now))
  );
}
