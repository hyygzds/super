import {
  useEffect,
  useState,
  type ChangeEvent,
  type FocusEvent,
} from "react";

export type InputNumberProps = {
  value?: number | null;
  defaultValue?: number | null;
  onChange?: (value: number | null) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
};

function applyPrecision(n: number, precision?: number): number {
  if (precision === undefined) return n;
  const factor = 10 ** precision;
  return Math.round(n * factor) / factor;
}

function clamp(n: number, min?: number, max?: number): number {
  let next = n;
  if (min !== undefined && next < min) next = min;
  if (max !== undefined && next > max) next = max;
  return next;
}

function formatNumber(n: number | null, precision?: number): string {
  if (n === null || Number.isNaN(n)) return "";
  const rounded = applyPrecision(n, precision);
  if (precision !== undefined) return rounded.toFixed(precision);
  return String(rounded);
}

function parseDraft(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-" || trimmed === "+" || trimmed === ".") {
    return null;
  }
  const n = Number(trimmed);
  if (Number.isNaN(n)) return null;
  return n;
}

const inputCls =
  "min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-center text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50";

const btnCls =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50";

export function InputNumber({
  value: valueProp,
  defaultValue = null,
  onChange,
  onBlur,
  min,
  max,
  step = 1,
  precision,
  placeholder,
  disabled = false,
  id,
  className = "",
}: InputNumberProps) {
  const [uncontrolled, setUncontrolled] = useState<number | null>(defaultValue);
  const value = valueProp !== undefined ? valueProp : uncontrolled;

  const [draft, setDraft] = useState<string | null>(null);
  const display = draft !== null ? draft : formatNumber(value, precision);

  useEffect(() => {
    setDraft(null);
  }, [value]);

  function commit(next: number | null) {
    let committed = next;
    if (committed !== null) {
      committed = applyPrecision(clamp(committed, min, max), precision);
    }
    if (valueProp === undefined) setUncontrolled(committed);
    setDraft(null);
    onChange?.(committed);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setDraft(raw);
    if (raw.trim() === "") {
      if (valueProp === undefined) setUncontrolled(null);
      onChange?.(null);
      return;
    }
    // Keep invalid / intermediate text in draft only; emit when parseable.
    const parsed = parseDraft(raw);
    if (parsed === null) return;
    if (valueProp === undefined) setUncontrolled(parsed);
    onChange?.(parsed);
  }

  function handleBlur(e: FocusEvent<HTMLInputElement>) {
    const raw = draft !== null ? draft : e.target.value;
    if (raw.trim() === "") {
      commit(null);
    } else {
      const parsed = parseDraft(raw);
      if (parsed === null) {
        setDraft(null);
      } else {
        commit(parsed);
      }
    }
    onBlur?.(e);
  }

  function stepBy(delta: number) {
    const base = value ?? 0;
    commit(base + delta);
  }

  const wrapperCls = `inline-flex w-full items-center gap-1 ${className}`.trim();

  return (
    <div className={wrapperCls}>
      <button
        type="button"
        aria-label="−"
        className={btnCls}
        disabled={disabled}
        onClick={() => stepBy(-step)}
      >
        −
      </button>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={display}
        placeholder={placeholder}
        disabled={disabled}
        className={inputCls}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      <button
        type="button"
        aria-label="+"
        className={btnCls}
        disabled={disabled}
        onClick={() => stepBy(step)}
      >
        +
      </button>
    </div>
  );
}
