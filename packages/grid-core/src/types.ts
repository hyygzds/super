export type GridColumn = {
  field: string;
  title: string;
  width?: number;
  hidden?: boolean;
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
  rowHeight: number;
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
  /** Y offset for the translated body (startIndex * rowHeight for fixed height) */
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
