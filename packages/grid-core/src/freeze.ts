import type { FixedSide, FrozenState } from "./types";

function hasOwnFrozenKey(
  frozen: FrozenState | undefined,
  field: string,
): frozen is FrozenState {
  return !!frozen && Object.prototype.hasOwnProperty.call(frozen, field);
}

export function resolveColumnFixed(
  field: string,
  columnFixed: FixedSide | undefined,
  frozen?: FrozenState,
): FixedSide | undefined {
  if (hasOwnFrozenKey(frozen, field)) {
    return frozen[field] ?? undefined;
  }
  return columnFixed;
}

export function nextFrozenState(
  frozen: FrozenState | undefined,
  field: string,
  columnFixed?: FixedSide,
): FrozenState {
  const current = resolveColumnFixed(field, columnFixed, frozen);
  const next: FixedSide | null =
    current === undefined ? "left" : current === "left" ? "right" : null;
  return { ...frozen, [field]: next };
}

export function setColumnFrozen(
  frozen: FrozenState | undefined,
  field: string,
  side: FixedSide | null,
): FrozenState {
  return { ...frozen, [field]: side };
}
