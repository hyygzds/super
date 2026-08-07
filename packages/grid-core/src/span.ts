import type { DisplayRow, GridColumn, SpanMethod, SpanResult } from "./types";

/**
 * Normalize spanMethod over display rows (group rows get zero-size placeholders).
 * Spans cannot cross group header rows. Covered cells are `{ rowspan: 0, colspan: 0 }`.
 */
export function normalizeSpans(input: {
  displayRows: DisplayRow[];
  columns: GridColumn[];
  spanMethod: SpanMethod;
}): SpanResult[][] {
  const { displayRows, columns, spanMethod } = input;
  const rowCount = displayRows.length;
  const colCount = columns.length;
  const result: SpanResult[][] = Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => ({ rowspan: 1, colspan: 1 })),
  );
  const covered: boolean[][] = Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => false),
  );

  for (let r = 0; r < rowCount; r++) {
    const display = displayRows[r]!;
    if (display.kind === "group") {
      for (let c = 0; c < colCount; c++) {
        result[r]![c] = { rowspan: 0, colspan: 0 };
        covered[r]![c] = true;
      }
      continue;
    }

    for (let c = 0; c < colCount; c++) {
      if (covered[r]![c]) {
        result[r]![c] = { rowspan: 0, colspan: 0 };
        continue;
      }

      const raw = spanMethod({
        row: display.row,
        column: columns[c]!,
        rowIndex: r,
        columnIndex: c,
      });

      let rowspan = Math.max(1, Math.floor(raw?.rowspan ?? 1));
      let colspan = Math.max(1, Math.floor(raw?.colspan ?? 1));

      // Clamp so we don't cross a group row or leave the grid.
      let maxRowSpan = 1;
      for (let rr = r; rr < rowCount; rr++) {
        if (displayRows[rr]!.kind === "group" && rr !== r) break;
        maxRowSpan = rr - r + 1;
      }
      rowspan = Math.min(rowspan, maxRowSpan, rowCount - r);
      colspan = Math.min(colspan, colCount - c);

      // Shrink if any target cell already covered.
      outer: for (let rr = r; rr < r + rowspan; rr++) {
        for (let cc = c; cc < c + colspan; cc++) {
          if ((rr !== r || cc !== c) && covered[rr]![cc]) {
            if (rr === r) colspan = cc - c;
            else rowspan = rr - r;
            break outer;
          }
        }
      }
      rowspan = Math.max(1, rowspan);
      colspan = Math.max(1, colspan);

      result[r]![c] = { rowspan, colspan };
      for (let rr = r; rr < r + rowspan; rr++) {
        for (let cc = c; cc < c + colspan; cc++) {
          covered[rr]![cc] = true;
          if (rr !== r || cc !== c) {
            result[rr]![cc] = { rowspan: 0, colspan: 0 };
          }
        }
      }
    }
  }

  return result;
}
