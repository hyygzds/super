export type CalendarYmd = { y: number; m: number; d: number };

export type CalendarCell = {
  iso: string;
  day: number;
  inCurrentMonth: boolean;
  disabled: boolean;
};

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}

function isValidYmd(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || y < 1 || y > 9999) return false;
  if (!Number.isInteger(m) || m < 1 || m > 12) return false;
  if (!Number.isInteger(d) || d < 1) return false;
  return d <= daysInMonth(y, m);
}

export function parseIsoDate(value: string): CalendarYmd | null {
  const match = ISO_DATE_RE.exec(value);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!isValidYmd(y, m, d)) return null;
  return { y, m, d };
}

export function formatIsoDate(ymd: CalendarYmd): string {
  const y = String(ymd.y).padStart(4, "0");
  const m = String(ymd.m).padStart(2, "0");
  const d = String(ymd.d).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isValidIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null;
}

export function compareIsoDate(a: string, b: string): number | null {
  if (!isValidIsoDate(a) || !isValidIsoDate(b)) return null;
  if (a === b) return 0;
  return a > b ? 1 : -1;
}

export function isIsoDateInRange(
  value: string,
  min?: string,
  max?: string,
): boolean {
  if (!isValidIsoDate(value)) return false;
  if (min && isValidIsoDate(min) && value < min) return false;
  if (max && isValidIsoDate(max) && value > max) return false;
  return true;
}

export function addMonths(ymd: CalendarYmd, delta: number): CalendarYmd {
  const raw = ymd.m - 1 + delta;
  const y = ymd.y + Math.floor(raw / 12);
  const m = ((raw % 12) + 12) % 12 + 1;
  const d = Math.min(ymd.d, daysInMonth(y, m));
  return { y, m, d };
}

export function todayIso(now: Date = new Date()): string {
  return formatIsoDate({
    y: now.getFullYear(),
    m: now.getMonth() + 1,
    d: now.getDate(),
  });
}

export function visibleMonthFromValue(
  value: string,
  now: Date = new Date(),
): { y: number; m: number } {
  const parsed = parseIsoDate(value);
  if (parsed) return { y: parsed.y, m: parsed.m };
  return { y: now.getFullYear(), m: now.getMonth() + 1 };
}

function addDays(ymd: CalendarYmd, delta: number): CalendarYmd {
  const date = new Date(ymd.y, ymd.m - 1, ymd.d + delta);
  return {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
  };
}

function weekdaySun0(ymd: CalendarYmd): number {
  return new Date(ymd.y, ymd.m - 1, ymd.d).getDay();
}

export function buildMonthGrid(
  year: number,
  month: number,
  options?: {
    min?: string;
    max?: string;
    weekStartsOn?: 0 | 1;
  },
): CalendarCell[] {
  const weekStartsOn = options?.weekStartsOn ?? 0;
  const first: CalendarYmd = { y: year, m: month, d: 1 };
  const firstWeekday = weekdaySun0(first);
  const leading = (firstWeekday - weekStartsOn + 7) % 7;
  const start = addDays(first, -leading);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const ymd = addDays(start, i);
    const iso = formatIsoDate(ymd);
    cells.push({
      iso,
      day: ymd.d,
      inCurrentMonth: ymd.y === year && ymd.m === month,
      disabled: !isIsoDateInRange(iso, options?.min, options?.max),
    });
  }
  return cells;
}
