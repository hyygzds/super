import type { FilterPredicate, FilterState } from "./types";

export function cellContains(value: unknown, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (value == null) return false;
  return String(value).toLowerCase().includes(q);
}

export function activeFilterEntries(
  filters: FilterState | null | undefined,
): Array<[string, string]> {
  if (!filters) return [];
  return Object.entries(filters).filter(
    ([, value]) => value != null && String(value).trim() !== "",
  );
}

export function setFilterValue(
  current: FilterState | null | undefined,
  field: string,
  value: string,
): FilterState {
  const next: FilterState = { ...(current ?? {}) };
  if (value === "") {
    delete next[field];
  } else {
    next[field] = value;
  }
  return next;
}

function rowMatches(
  row: Record<string, unknown>,
  entries: Array<[string, string]>,
  predicates?: Record<string, FilterPredicate>,
): boolean {
  for (const [field, query] of entries) {
    const predicate = predicates?.[field] ?? cellContains;
    if (!predicate(row[field], query, row)) return false;
  }
  return true;
}

export function filterRows<T extends Record<string, unknown>>(
  rows: readonly T[],
  filters: FilterState | null | undefined,
  options?: {
    predicates?: Record<string, FilterPredicate>;
    childrenField?: string;
  },
): T[] {
  const entries = activeFilterEntries(filters);
  if (entries.length === 0) return rows as T[];

  const predicates = options?.predicates;
  const childrenField = options?.childrenField;

  return rows.flatMap((row) => {
    const kids = childrenField ? row[childrenField] : undefined;
    const filteredKids = Array.isArray(kids)
      ? filterRows(kids as Record<string, unknown>[], filters, options)
      : null;
    const selfMatch = rowMatches(row, entries, predicates);
    const hasKids = filteredKids !== null && filteredKids.length > 0;

    if (!selfMatch && !hasKids) return [];
    if (filteredKids === null) return [row];
    if (filteredKids === kids && selfMatch) return [row];
    return [{ ...row, [childrenField!]: filteredKids } as T];
  });
}
