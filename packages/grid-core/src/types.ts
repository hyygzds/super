export type GridColumn = {
  field: string;
  title: string;
  width?: number;
  hidden?: boolean;
  /** Sticky column on horizontal scroll. */
  fixed?: "left" | "right";
  children?: GridColumn[];
};

export enum SelectionMode {
  CheckboxOnly = "checkbox_only",
  Hybrid = "hybrid",
}

export type VirtualWindowInput = {
  enabled: boolean;
  rowCount: number;
  /** Fixed row height, or estimate when `rowHeights` entries are missing. */
  rowHeight: number;
  /**
   * Optional per-row heights (aligned with `rowCount`).
   * `undefined` entries fall back to `rowHeight`.
   * When omitted entirely, uses fixed-height math.
   */
  rowHeights?: Array<number | undefined>;
  scrollTop: number;
  viewportHeight: number;
  /** Extra rows above/below the viewport. Default used by callers: 2 */
  overscan: number;
};

export type VirtualWindowResult = {
  /** Inclusive start index into the row list */
  startIndex: number;
  /** Exclusive end index */
  endIndex: number;
  /** Y offset for the translated body */
  offsetY: number;
  totalHeight: number;
  visibleCount: number;
};

export type PageSliceInput = {
  pageIndex: number;
  pageSize: number;
  total: number;
};

export type PageSliceResult = {
  pageIndex: number;
  pageSize: number;
  total: number;
  pageCount: number;
  start: number;
  end: number;
};
