import { useEffect, useRef, useState, type FocusEvent } from "react";
import {
  buildMonthGrid,
  isIsoDateInRange,
  parseIsoDate,
  shiftMonth,
  todayIsoDate,
} from "@component-ai/form-core";
import { Button } from "./Button";
import { Input } from "./Input";

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
  "aria-label"?: string;
};

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

function viewFromValue(value: string): { year: number; month: number } {
  const parsed = parseIsoDate(value);
  if (parsed) return { year: parsed.year, month: parsed.month };
  const now = parseIsoDate(todayIsoDate());
  return now ?? { year: 1970, month: 1 };
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
  "aria-label": ariaLabel = "日期选择",
}: DatePickerProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = valueProp ?? uncontrolled;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => viewFromValue(value));
  const rootRef = useRef<HTMLDivElement | null>(null);

  function commit(next: string) {
    if (valueProp === undefined) setUncontrolled(next);
    onChange?.(next);
  }

  function openPanel() {
    if (disabled) return;
    setView(viewFromValue(value));
    setOpen(true);
  }

  function togglePanel() {
    if (disabled) return;
    if (open) {
      setOpen(false);
      return;
    }
    openPanel();
  }

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el?.contains(e.target as Node)) setOpen(false);
    };
    const onDocKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [open]);

  const cells = buildMonthGrid(view.year, view.month);
  const today = todayIsoDate();

  return (
    <div
      ref={rootRef}
      className={`relative w-full ${className}`.trim()}
      aria-label={ariaLabel}
    >
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1" onClick={openPanel}>
          <Input
            id={id}
            value={value}
            onChange={commit}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            readOnly
            clearable={clearable}
          />
        </div>
        <Button
          variant="ghost"
          disabled={disabled}
          aria-label="打开日历"
          aria-haspopup="dialog"
          aria-expanded={open}
          className="h-8 w-8 shrink-0 px-0 py-0 text-slate-600"
          onClick={togglePanel}
        >
          <span aria-hidden>📅</span>
        </Button>
      </div>

      {open ? (
        <div
          role="dialog"
          aria-label="选择日期"
          className="absolute z-50 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <Button
              variant="ghost"
              aria-label="上个月"
              className="h-8 w-8 px-0 py-0"
              onClick={() => setView((cur) => shiftMonth(cur.year, cur.month, -1))}
            >
              ‹
            </Button>
            <div className="text-sm font-medium text-slate-800">
              {view.year}年{view.month}月
            </div>
            <Button
              variant="ghost"
              aria-label="下个月"
              className="h-8 w-8 px-0 py-0"
              onClick={() => setView((cur) => shiftMonth(cur.year, cur.month, 1))}
            >
              ›
            </Button>
          </div>

          <div role="grid" aria-label={`${view.year}年${view.month}月`}>
            <div role="row" className="mb-1 grid grid-cols-7">
              {WEEKDAYS.map((label) => (
                <div
                  key={label}
                  role="columnheader"
                  className="py-1 text-center text-xs text-slate-500"
                >
                  {label}
                </div>
              ))}
            </div>
            {Array.from({ length: 6 }, (_, week) => (
              <div key={week} role="row" className="grid grid-cols-7">
                {cells.slice(week * 7, week * 7 + 7).map((cell) => {
                  const selected = cell.iso === value;
                  const isToday = cell.iso === today;
                  const inRange = isIsoDateInRange(cell.iso, minDate, maxDate);
                  return (
                    <div
                      key={cell.iso}
                      role="gridcell"
                      aria-selected={selected}
                      className="p-0.5"
                    >
                      <button
                        type="button"
                        aria-label={cell.iso}
                        disabled={!inRange}
                        className={[
                          "flex h-8 w-full items-center justify-center rounded text-sm",
                          cell.inCurrentMonth ? "text-slate-800" : "text-slate-400",
                          selected
                            ? "bg-sky-600 text-white"
                            : isToday
                              ? "font-semibold text-sky-700 ring-1 ring-sky-400"
                              : "hover:bg-slate-100",
                          "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
                        ].join(" ")}
                        onClick={() => {
                          if (!inRange) return;
                          commit(cell.iso);
                          setOpen(false);
                        }}
                      >
                        {cell.day}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <Button
            variant="secondary"
            aria-label="今天"
            className="mt-2 w-full py-1.5"
            disabled={!isIsoDateInRange(today, minDate, maxDate)}
            onClick={() => {
              commit(today);
              setOpen(false);
            }}
          >
            今天
          </Button>
        </div>
      ) : null}
    </div>
  );
}
