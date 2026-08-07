import type { DisplayRow, GroupByConfig } from "./types";

function normalizeFields(groupBy: GroupByConfig): string[] {
  const fields = Array.isArray(groupBy) ? groupBy : [groupBy];
  return fields.filter((f) => typeof f === "string" && f.length > 0);
}

function rowGroupKey(row: Record<string, unknown>, fields: string[]): string {
  return fields.map((f) => String(row[f] ?? "")).join("\u0001");
}

function rowGroupLabel(row: Record<string, unknown>, fields: string[]): string {
  return fields.map((f) => String(row[f] ?? "")).join(" / ");
}

/**
 * Preserve first-seen group order. Always expanded (group header + members).
 */
export function buildGroupedRows(
  data: Record<string, unknown>[],
  groupBy?: GroupByConfig,
): DisplayRow[] {
  const fields = groupBy === undefined ? [] : normalizeFields(groupBy);
  if (fields.length === 0) {
    return data.map((row, dataIndex) => ({ kind: "data", row, dataIndex }));
  }

  type Bucket = {
    key: string;
    label: string;
    items: { row: Record<string, unknown>; dataIndex: number }[];
  };

  const order: string[] = [];
  const map = new Map<string, Bucket>();

  data.forEach((row, dataIndex) => {
    const key = rowGroupKey(row, fields);
    let bucket = map.get(key);
    if (!bucket) {
      bucket = { key, label: rowGroupLabel(row, fields), items: [] };
      map.set(key, bucket);
      order.push(key);
    }
    bucket.items.push({ row, dataIndex });
  });

  const out: DisplayRow[] = [];
  for (const key of order) {
    const bucket = map.get(key)!;
    out.push({
      kind: "group",
      key: bucket.key,
      label: bucket.label,
      count: bucket.items.length,
    });
    for (const item of bucket.items) {
      out.push({ kind: "data", row: item.row, dataIndex: item.dataIndex });
    }
  }
  return out;
}
