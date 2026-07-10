import type { GridColumn } from "./types";

const SELECTION_WIDTH = 48;
const ROW_NUMBER_WIDTH = 56;
const DEFAULT_COL_WIDTH = 120;

export type StickyLayoutInput = {
  columns: GridColumn[];
  showSelection: boolean;
  showRowNumber: boolean;
};

export type StickyFieldInfo =
  | { sticky: false }
  | { sticky: "left" | "right"; offset: number; isEdge: boolean };

export type StickyLayout = {
  dataFields: string[];
  selection?: { left: number };
  rowNumber?: { left: number };
  byField: Record<string, StickyFieldInfo>;
  widthOf: (field: string) => number;
};

export function computeStickyLayout(input: StickyLayoutInput): StickyLayout {
  const visible = input.columns.filter((c) => !c.hidden);
  const widthOf = (field: string) => {
    const col = visible.find((c) => c.field === field);
    return col?.width ?? DEFAULT_COL_WIDTH;
  };

  const leftCols = visible.filter((c) => c.fixed === "left");
  const rightCols = visible.filter((c) => c.fixed === "right");
  const midCols = visible.filter((c) => c.fixed !== "left" && c.fixed !== "right");
  const dataFields = [
    ...leftCols.map((c) => c.field),
    ...midCols.map((c) => c.field),
    ...rightCols.map((c) => c.field),
  ];

  const byField: Record<string, StickyFieldInfo> = {};
  let left = 0;
  const selection = input.showSelection ? { left: 0 } : undefined;
  if (input.showSelection) left += SELECTION_WIDTH;

  const rowNumber = input.showRowNumber ? { left } : undefined;
  if (input.showRowNumber) left += ROW_NUMBER_WIDTH;

  leftCols.forEach((col, i) => {
    byField[col.field] = {
      sticky: "left",
      offset: left,
      isEdge: i === leftCols.length - 1,
    };
    left += col.width ?? DEFAULT_COL_WIDTH;
  });

  midCols.forEach((col) => {
    byField[col.field] = { sticky: false };
  });

  let right = 0;
  for (let i = rightCols.length - 1; i >= 0; i--) {
    const col = rightCols[i]!;
    byField[col.field] = {
      sticky: "right",
      offset: right,
      isEdge: i === 0,
    };
    right += col.width ?? DEFAULT_COL_WIDTH;
  }

  return { dataFields, selection, rowNumber, byField, widthOf };
}
