import type { GridColumn, HeaderCell } from "./types";

function isLeaf(col: GridColumn): boolean {
  return !col.children || col.children.length === 0;
}

export function flattenLeafColumns(columns: GridColumn[]): GridColumn[] {
  const out: GridColumn[] = [];
  function walk(cols: GridColumn[]) {
    for (const col of cols) {
      if (col.hidden) continue;
      if (isLeaf(col)) out.push(col);
      else walk(col.children!);
    }
  }
  walk(columns);
  return out;
}

function leafCount(col: GridColumn): number {
  if (col.hidden) return 0;
  if (isLeaf(col)) return 1;
  return col.children!.reduce((sum, c) => sum + leafCount(c), 0);
}

function treeDepth(cols: GridColumn[]): number {
  let max = 1;
  for (const col of cols) {
    if (col.hidden) continue;
    if (!isLeaf(col)) {
      max = Math.max(max, 1 + treeDepth(col.children!));
    }
  }
  return max;
}

/**
 * Build multi-row header matrix. Parent groups get colspan = leaf count;
 * leaf cells get rowspan filling remaining levels.
 */
export function buildHeaderRows(columns: GridColumn[]): HeaderCell[][] {
  const visible = columns.filter((c) => !c.hidden);
  if (visible.length === 0) return [];

  const depth = treeDepth(visible);
  const rows: HeaderCell[][] = Array.from({ length: depth }, () => []);

  function walk(cols: GridColumn[], level: number) {
    for (const col of cols) {
      if (col.hidden) continue;
      if (isLeaf(col)) {
        rows[level]!.push({
          title: col.title,
          colspan: 1,
          rowspan: depth - level,
          column: col,
        });
      } else {
        const leaves = leafCount(col);
        if (leaves === 0) continue;
        rows[level]!.push({
          title: col.title,
          colspan: leaves,
          rowspan: 1,
        });
        walk(col.children!, level + 1);
      }
    }
  }

  walk(visible, 0);
  return rows;
}
