export function toggleKey(
  selectedKeys: readonly string[],
  key: string,
  multiple: boolean,
): string[] {
  const set = new Set(selectedKeys);
  if (multiple) {
    if (set.has(key)) set.delete(key);
    else set.add(key);
    return [...set];
  }
  if (set.has(key) && set.size === 1) return [];
  return [key];
}

export function selectAllKeys(allKeys: readonly string[]): string[] {
  return [...allKeys];
}

export function clearKeys(): string[] {
  return [];
}

export function isAllSelected(
  selectedKeys: readonly string[],
  allKeys: readonly string[],
): boolean {
  if (allKeys.length === 0) return false;
  const set = new Set(selectedKeys);
  return allKeys.every((k) => set.has(k));
}

export function isIndeterminate(
  selectedKeys: readonly string[],
  allKeys: readonly string[],
): boolean {
  if (selectedKeys.length === 0) return false;
  return !isAllSelected(selectedKeys, allKeys);
}
