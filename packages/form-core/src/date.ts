export type IsoDateParts = {
  year: number;
  month: number;
  day: number;
};

export type CalendarCell = {
  iso: string;
  day: number;
  inCurrentMonth: boolean;
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseIsoDate(value: string): IsoDateParts | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month - 1, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const cursor = new Date(year, month - 1, 1 - mondayOffset);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth() + 1;
    const d = cursor.getDate();
    cells.push({
      iso: formatIsoDate(y, m, d),
      day: d,
      inCurrentMonth: y === year && m === month,
    });
    cursor.setDate(d + 1);
  }
  return cells;
}

export function compareIsoDate(a: string, b: string): number {
  const left = parseIsoDate(a);
  const right = parseIsoDate(b);
  if (!left || !right) return 0;
  if (left.year !== right.year) return left.year - right.year;
  if (left.month !== right.month) return left.month - right.month;
  return left.day - right.day;
}

export function isIsoDateInRange(
  iso: string,
  minDate?: string,
  maxDate?: string,
): boolean {
  if (!parseIsoDate(iso)) return false;
  if (minDate && parseIsoDate(minDate) && compareIsoDate(iso, minDate) < 0) {
    return false;
  }
  if (maxDate && parseIsoDate(maxDate) && compareIsoDate(iso, maxDate) > 0) {
    return false;
  }
  return true;
}

export function todayIsoDate(now: Date = new Date()): string {
  return formatIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}
