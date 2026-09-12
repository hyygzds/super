export type CalendarCell = {
  iso: string;
  day: number;
  inMonth: boolean;
  disabled: boolean;
};

export type CalendarGrid = {
  year: number;
  month: number;
  weeks: CalendarCell[][];
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
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
  return date;
}

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addMonths(date: Date, delta: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const next = new Date(year, month + delta, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

export function isDateInRange(
  iso: string,
  minDate?: string,
  maxDate?: string,
): boolean {
  if (minDate && iso < minDate) return false;
  if (maxDate && iso > maxDate) return false;
  return true;
}

function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function buildMonthGrid(
  year: number,
  month: number,
  options?: { minDate?: string; maxDate?: string },
): CalendarGrid {
  const first = new Date(year, month - 1, 1);
  const start = new Date(year, month - 1, 1 - mondayIndex(first));
  const weeks: CalendarCell[][] = [];

  for (let week = 0; week < 6; week += 1) {
    const row: CalendarCell[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const cellDate = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + week * 7 + weekday,
      );
      const iso = formatIsoDate(cellDate);
      row.push({
        iso,
        day: cellDate.getDate(),
        inMonth: cellDate.getMonth() === month - 1,
        disabled: !isDateInRange(iso, options?.minDate, options?.maxDate),
      });
    }
    weeks.push(row);
  }

  return { year, month, weeks };
}
