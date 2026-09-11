export type TreeFlatRow = {
  key: string;
  row: Record<string, unknown>;
  depth: number;
  parentKey: string | null;
  hasChildren: boolean;
  expanded: boolean;
};

export type FlattenTreeInput = {
  data: Record<string, unknown>[];
  idField?: string;
  childrenField?: string;
  /** Keys of expanded nodes */
  expandedKeys?: readonly string[];
};

function nodeKey(
  row: Record<string, unknown>,
  idField: string,
  fallback: string,
): string {
  const v = row[idField];
  return v !== undefined && v !== null ? String(v) : fallback;
}

function childrenOf(
  row: Record<string, unknown>,
  childrenField: string,
): Record<string, unknown>[] {
  const c = row[childrenField];
  return Array.isArray(c) ? (c as Record<string, unknown>[]) : [];
}

/**
 * Depth-first flatten. Only expanded nodes' children are included.
 * `hasChildren` is true when the node has a non-empty children array
 * OR when `row.__hasChildren === true` (lazy placeholder before load).
 */
export function flattenTree(input: FlattenTreeInput): TreeFlatRow[] {
  const idField = input.idField ?? "id";
  const childrenField = input.childrenField ?? "children";
  const expanded = new Set(input.expandedKeys ?? []);
  const out: TreeFlatRow[] = [];

  function walk(
    rows: Record<string, unknown>[],
    depth: number,
    parentKey: string | null,
    path: string,
  ) {
    rows.forEach((row, index) => {
      const key = nodeKey(row, idField, `${path}/${index}`);
      const kids = childrenOf(row, childrenField);
      const lazyFlag = row.__hasChildren === true;
      const hasChildren = kids.length > 0 || lazyFlag;
      const isExpanded = expanded.has(key);
      out.push({
        key,
        row,
        depth,
        parentKey,
        hasChildren,
        expanded: isExpanded,
      });
      if (hasChildren && isExpanded && kids.length > 0) {
        walk(kids, depth + 1, key, `${path}/${index}`);
      }
    });
  }

  walk(input.data, 0, null, "r");
  return out;
}

export function toggleExpandKey(
  expandedKeys: readonly string[],
  key: string,
): string[] {
  const set = new Set(expandedKeys);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  return [...set];
}

/** Keys of nodes that have children (needed to reveal a filtered subtree). */
export function collectExpandableKeys(
  rows: readonly Record<string, unknown>[],
  options?: { idField?: string; childrenField?: string },
): string[] {
  const idField = options?.idField ?? "id";
  const childrenField = options?.childrenField ?? "children";
  const keys: string[] = [];

  function walk(
    nodes: readonly Record<string, unknown>[],
    path: string,
  ) {
    nodes.forEach((row, index) => {
      const key = nodeKey(row, idField, `${path}/${index}`);
      const kids = childrenOf(row, childrenField);
      if (kids.length > 0 || row.__hasChildren === true) {
        keys.push(key);
      }
      if (kids.length > 0) walk(kids, `${path}/${index}`);
    });
  }

  walk(rows, "r");
  return keys;
}

/** Collect keys of node and all descendants in the tree (regardless of expand). */
export function collectDescendantKeys(
  row: Record<string, unknown>,
  idField = "id",
  childrenField = "children",
): string[] {
  const keys: string[] = [];
  function walk(node: Record<string, unknown>, path: string) {
    const key = nodeKey(node, idField, path);
    keys.push(key);
    for (const [i, child] of childrenOf(node, childrenField).entries()) {
      walk(child, `${path}/${i}`);
    }
  }
  walk(row, "n");
  return keys;
}

export type CascadeSelectInput = {
  selectedKeys: readonly string[];
  /** Key being toggled */
  key: string;
  /** Full tree roots */
  data: Record<string, unknown>[];
  idField?: string;
  childrenField?: string;
  multiple?: boolean;
  cascadeChild?: boolean;
  cascadeParent?: boolean;
};

function findNode(
  data: Record<string, unknown>[],
  key: string,
  idField: string,
  childrenField: string,
): Record<string, unknown> | null {
  for (const [i, row] of data.entries()) {
    const k = nodeKey(row, idField, `r/${i}`);
    if (k === key) return row;
    const found = findNode(childrenOf(row, childrenField), key, idField, childrenField);
    if (found) return found;
  }
  return null;
}

type NodeInfo = {
  key: string;
  parentKey: string | null;
  childKeys: string[];
};

function indexTree(
  data: Record<string, unknown>[],
  idField: string,
  childrenField: string,
): Map<string, NodeInfo> {
  const map = new Map<string, NodeInfo>();
  function walk(
    rows: Record<string, unknown>[],
    parentKey: string | null,
    path: string,
  ) {
    for (const [i, row] of rows.entries()) {
      const key = nodeKey(row, idField, `${path}/${i}`);
      const kids = childrenOf(row, childrenField);
      const childKeys = kids.map((c, ci) =>
        nodeKey(c, idField, `${path}/${i}/${ci}`),
      );
      map.set(key, { key, parentKey, childKeys });
      walk(kids, key, `${path}/${i}`);
    }
  }
  walk(data, null, "r");
  return map;
}

/**
 * Toggle selection with optional parent/child cascade.
 * When cascadeParent: parent is selected only if all children selected;
 * partial → parent not in selectedKeys (UI uses isTreeIndeterminate).
 */
export function cascadeToggleKey(input: CascadeSelectInput): string[] {
  const idField = input.idField ?? "id";
  const childrenField = input.childrenField ?? "children";
  const multiple = input.multiple !== false;
  const index = indexTree(input.data, idField, childrenField);
  const selected = new Set(input.selectedKeys);
  const node = findNode(input.data, input.key, idField, childrenField);

  if (!multiple) {
    return selected.has(input.key) ? [] : [input.key];
  }

  const selecting = !selected.has(input.key);

  if (selecting) {
    selected.add(input.key);
    if (input.cascadeChild && node) {
      for (const k of collectDescendantKeys(node, idField, childrenField)) {
        selected.add(k);
      }
    }
  } else {
    selected.delete(input.key);
    if (input.cascadeChild && node) {
      for (const k of collectDescendantKeys(node, idField, childrenField)) {
        selected.delete(k);
      }
    }
  }

  if (input.cascadeParent) {
    let parentKey = index.get(input.key)?.parentKey ?? null;
    while (parentKey) {
      const info = index.get(parentKey);
      if (!info) break;
      const allSelected =
        info.childKeys.length > 0 &&
        info.childKeys.every((ck) => selected.has(ck));
      if (allSelected) selected.add(parentKey);
      else selected.delete(parentKey);
      parentKey = info.parentKey;
    }
  }

  return [...selected];
}

/** Parent checkbox indeterminate when some but not all descendants selected. */
export function isTreeIndeterminate(
  selectedKeys: readonly string[],
  nodeKeyValue: string,
  data: Record<string, unknown>[],
  idField = "id",
  childrenField = "children",
): boolean {
  const node = findNode(data, nodeKeyValue, idField, childrenField);
  if (!node) return false;
  const desc = collectDescendantKeys(node, idField, childrenField).filter(
    (k) => k !== nodeKeyValue,
  );
  if (desc.length === 0) return false;
  const selected = new Set(selectedKeys);
  const count = desc.filter((k) => selected.has(k)).length;
  return count > 0 && count < desc.length;
}
