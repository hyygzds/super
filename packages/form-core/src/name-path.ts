export type NamePath = string | Array<string | number>;

export function parseNamePath(path: NamePath): Array<string | number> {
  if (Array.isArray(path)) {
    return path.map((seg) => {
      if (typeof seg === "number") return seg;
      if (/^\d+$/.test(seg)) return Number(seg);
      return seg;
    });
  }
  const segments: Array<string | number> = [];
  const re = /([^.\[\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(path)) !== null) {
    if (match[1] !== undefined) {
      const raw = match[1];
      segments.push(/^\d+$/.test(raw) ? Number(raw) : raw);
    } else if (match[2] !== undefined) {
      segments.push(Number(match[2]));
    }
  }
  return segments;
}

export function normalizeNamePath(path: NamePath): string {
  return parseNamePath(path)
    .map((seg) => String(seg))
    .join(".");
}

export function joinNamePath(
  ...parts: Array<NamePath | string | number>
): string {
  const segments: Array<string | number> = [];
  for (const part of parts) {
    if (part === undefined || part === null || part === "") continue;
    if (typeof part === "number") {
      segments.push(part);
    } else if (typeof part === "string" || Array.isArray(part)) {
      segments.push(...parseNamePath(part));
    }
  }
  return normalizeNamePath(segments);
}

export function getValueAtPath(
  root: unknown,
  path: NamePath,
): unknown {
  const segments = parseNamePath(path);
  let current: unknown = root;
  for (const seg of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string | number, unknown>)[seg as string];
  }
  return current;
}

export function setValueAtPath(
  root: Record<string, unknown>,
  path: NamePath,
  value: unknown,
): void {
  const segments = parseNamePath(path);
  if (segments.length === 0) return;

  let current: Record<string | number, unknown> = root;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const seg = segments[i]!;
    const nextSeg = segments[i + 1]!;
    let next = current[seg as string];
    if (next === null || next === undefined || typeof next !== "object") {
      next = typeof nextSeg === "number" ? [] : {};
      current[seg as string] = next;
    }
    current = next as Record<string | number, unknown>;
  }
  const last = segments[segments.length - 1]!;
  current[last as string] = value;
}
