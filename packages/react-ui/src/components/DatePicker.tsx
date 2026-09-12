import { useEffect, useRef, useState, type FocusEvent } from "react";
import {
  addMonths,
  buildMonthGrid,
  isIsoDateInRange,
  isValidIsoDate,
  todayIso,
  visibleMonthFromValue,
} from "@component-ai/form-core";
import { Input } from "./Input";

export type DatePickerProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  id?: string;
  className?: string;
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const navBtnCls =
  "inline-flex h-7 w-7 items-center justify-center rounded text-sm text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:pointer-events-none disabled:opacity-50";

export function DatePicker({
  value: valueProp,
  defaultValue = "",
  onChange,
  onBlur,
  placeholder = "请选择日期",
  clearable = false,
  disabled = false,
  min,
  max,
  id,
  className = "",
}: DatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(defaultValue);
  const current = valueProp ?? uncontrolled;
  const [visible, setVisible] = useState(() =>
    visibleMonthFromValue(current),
  );

  const inputValue = focused ? draft : current;

  function commit(next: string) {
    if (valueProp === undefined) setUncontrolled(next);
    onChange?.(next);
  }

  function pick(iso: string) {
    if (disabled || !isIsoDateInRange(iso, min, max)) return;
    commit(iso);
    setDraft(iso);
    setVisible(visibleMonthFromValue(iso));
    setOpen(false);
  }

  function toggleOpen() {
    if (disabled) return;
    setOpen((wasOpen) => {
      const next = !wasOpen;
      if (next) setVisible(visibleMonthFromValue(current));
      return next;
    });
  }

  function handleInputChange(next: string) {
    setDraft(next);
    if (next === "") commit("");
  }

  function handleInputFocus() {
    if (disabled) return;
    setFocused(true);
    setDraft(current);
    setVisible(visibleMonthFromValue(current));
    setOpen(true);
  }

  function handleInputBlur(event: FocusEvent<HTMLInputElement>) {
    setFocused(false);
    if (
      draft === "" ||
      (isValidIsoDate(draft) && isIsoDateInRange(draft, min, max))
    ) {
      if (draft !== current) commit(draft);
    } else {
      setDraft(current);
    }
    onBlur?.(event);
  }

  function shiftMonth(delta: number) {
    setVisible((month) => {
      const next = addMonths({ y: month.y, m: month.m, d: 1 }, delta);
      return { y: next.y, m: next.m };
    });
  }

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const cells = buildMonthGrid(visible.y, visible.m, { min, max });
  const today = todayIso();
  const todayDisabled = !isIsoDateInRange(today, min, max);

  return (
    <div
      ref={rootRef}
      className={`relative inline-flex w-full items-center gap-1 ${className}`.trim()}
    >
      <div className="min-w-0 flex-1" onFocus={handleInputFocus}>
        <Input
          id={id}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          clearable={clearable}
          disabled={disabled}
        />
      </div>
      <button
        type="button"
        aria-label="打开日历"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={toggleOpen}
      >
        <svg
          aria-hidden
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v8H4V8z" />
        </svg>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="选择日期"
          className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between gap-1">
            <button
              type="button"
              aria-label="上一年"
              className={navBtnCls}
              onClick={() => shiftMonth(-12)}
            >
              «
            </button>
            <button
              type="button"
              aria-label="上一月"
              className={navBtnCls}
              onClick={() => shiftMonth(-1)}
            >
              ‹
            </button>
            <div className="min-w-0 flex-1 text-center text-sm font-medium text-slate-800">
              {visible.y}年{visible.m}月
            </div>
            <button
              type="button"
              aria-label="下一月"
              className={navBtnCls}
              onClick={() => shiftMonth(1)}
            >
              ›
            </button>
            <button
              type="button"
              aria-label="下一年"
              className={navBtnCls}
              onClick={() => shiftMonth(12)}
            >
              »
            </button>
          </div>
          <div role="grid" aria-label={`${visible.y}年${visible.m}月`}>
            <div className="mb-1 grid grid-cols-7 text-center text-xs text-slate-500">
              {WEEKDAYS.map((label) => (
                <div key={label} role="columnheader">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((cell) => {
                const selected = cell.iso === current;
                const isToday = cell.iso === today;
                const dayCls = [
                  "h-8 w-full rounded text-sm",
                  cell.inCurrentMonth ? "text-slate-800" : "text-slate-400",
                  selected
                    ? "bg-sky-600 text-white"
                    : "hover:bg-slate-100",
                  isToday && !selected ? "ring-1 ring-sky-600" : "",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600",
                  "disabled:pointer-events-none disabled:opacity-40",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    role="gridcell"
                    aria-label={cell.iso}
                    aria-selected={selected}
                    aria-disabled={cell.disabled}
                    disabled={cell.disabled}
                    className={dayCls}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(cell.iso)}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              aria-label="今天"
              disabled={todayDisabled}
              className="rounded px-2 py-1 text-sm text-sky-700 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:pointer-events-none disabled:opacity-40"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(today)}
            >
              今天
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
