import { useEffect, useMemo, useRef, useState, type FocusEvent } from "react";
import {
  addMonths,
  buildMonthGrid,
  formatIsoDate,
  isDateInRange,
  parseIsoDate,
} from "@component-ai/form-core";
import { Button } from "./Button";
import { Input } from "./Input";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export type DatePickerProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  minDate?: string;
  maxDate?: string;
  id?: string;
  className?: string;
};

function displayValue(raw: string | undefined): string {
  return parseIsoDate(raw ?? "") ? (raw as string) : "";
}

export function DatePicker({
  value: valueProp,
  defaultValue = "",
  onChange,
  onBlur,
  placeholder = "请选择日期",
  disabled = false,
  clearable = true,
  minDate,
  maxDate,
  id,
  className = "",
}: DatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const selected = displayValue(valueProp ?? uncontrolled);
  const [view, setView] = useState(() => parseIsoDate(selected) ?? new Date());

  useEffect(() => {
    if (!open) return;
    setView(parseIsoDate(selected) ?? new Date());
  }, [open, selected]);

  const grid = useMemo(
    () =>
      buildMonthGrid(view.getFullYear(), view.getMonth() + 1, {
        minDate,
        maxDate,
      }),
    [view, minDate, maxDate],
  );

  function commit(next: string) {
    if (valueProp === undefined) setUncontrolled(next);
    onChange?.(next);
  }

  function handleInputChange(next: string) {
    commit(next);
    setOpen(false);
  }

  function handleInputClick() {
    if (disabled) return;
    setOpen(true);
  }

  function pick(iso: string, cellDisabled: boolean) {
    if (cellDisabled || disabled) return;
    commit(iso);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const today = formatIsoDate(new Date());
  const todayDisabled = !isDateInRange(today, minDate, maxDate);

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <Input
        id={id}
        value={selected}
        placeholder={placeholder}
        disabled={disabled}
        readOnly
        clearable={clearable}
        onChange={handleInputChange}
        onBlur={onBlur}
        onClick={handleInputClick}
        aria-haspopup="dialog"
        aria-expanded={open}
      />
      {open ? (
        <div
          role="dialog"
          aria-label="日期选择"
          className="absolute z-50 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              aria-label="上个月"
              className="h-8 w-8 px-0 py-0"
              onClick={() => setView((current) => addMonths(current, -1))}
            >
              ‹
            </Button>
            <div className="text-sm font-medium text-slate-800">
              {grid.year}年{grid.month}月
            </div>
            <Button
              variant="ghost"
              aria-label="下个月"
              className="h-8 w-8 px-0 py-0"
              onClick={() => setView((current) => addMonths(current, 1))}
            >
              ›
            </Button>
          </div>
          <div role="grid" className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((label) => (
              <div
                key={label}
                className="text-center text-xs text-slate-500"
                role="columnheader"
              >
                {label}
              </div>
            ))}
            {grid.weeks.flat().map((cell) => {
              const isSelected = cell.iso === selected;
              const isToday = cell.iso === today;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  role="gridcell"
                  aria-label={cell.iso}
                  aria-selected={isSelected}
                  data-today={isToday ? "" : undefined}
                  disabled={cell.disabled}
                  className={[
                    "h-8 w-8 rounded text-sm",
                    cell.inMonth ? "text-slate-800" : "text-slate-400",
                    isSelected ? "bg-sky-600 text-white" : "hover:bg-slate-100",
                    isToday && !isSelected ? "ring-1 ring-sky-600" : "",
                    "disabled:pointer-events-none disabled:opacity-40",
                  ].join(" ")}
                  onClick={() => pick(cell.iso, cell.disabled)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              variant="secondary"
              aria-label="今天"
              className="px-3 py-1"
              disabled={todayDisabled}
              onClick={() => pick(today, todayDisabled)}
            >
              今天
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
