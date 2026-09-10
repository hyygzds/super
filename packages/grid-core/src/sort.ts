import type { SortCompare, SortState } from "./types";

function isEmptyValue(value: unknown): boolean {
  return value == null || value === "";
}

export function nextSortState(
  current: SortState | null | undefined,
  field: string,
): SortState | null {
  if (!current || current.field !== field) {
    return { field, order: "asc" };
  }
  if (current.order === "asc") {
    return { field, order: "desc" };
  }
  return null;
}

export function compareCellValues(a: unknown, b: unknown): number {
  const aEmpty = isEmptyValue(a);
  const bEmpty = isEmptyValue(b);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return 0;
    if (Number.isNaN(a)) return 1;
    if (Number.isNaN(b)) return -1;
    return a === b ? 0 : a < b ? -1 : 1;
  }

  if (a instanceof Date && b instanceof Date) {
    const da = a.getTime();
    const db = b.getTime();
    return da === db ? 0 : da < db ? -1 : 1;
  }

  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function compareForSort(
  a: unknown,
  b: unknown,
  order: SortState["order"],
  compare: SortCompare,
): number {
  const result = compare(a, b);
  if (result === 0) return 0;
  return order === "asc" ? result : -result;
}

export function sortRows<T extends Record<string, unknown>>(
  rows: readonly T[],
  sort: SortState | null | undefined,
  options?: {
    compare?: SortCompare;
    childrenField?: string;
  },
): T[] {
  if (!sort) return rows as T[];

  const compare = options?.compare ?? compareCellValues;
  const childrenField = options?.childrenField;
  const indexed = rows.map((row, index) => ({ row, index }));

  indexed.sort((left, right) => {
    const byValue = compareForSort(
      left.row[sort.field],
      right.row[sort.field],
      sort.order,
      compare,
    );
    return byValue !== 0 ? byValue : left.index - right.index;
  });

  return indexed.map(({ row }) => {
    if (!childrenField) return row;
    const kids = row[childrenField];
    if (!Array.isArray(kids)) return row;
    const sortedKids = sortRows(
      kids as Record<string, unknown>[],
      sort,
      options,
    );
    if (sortedKids === kids) return row;
    return { ...row, [childrenField]: sortedKids };
  });
}
