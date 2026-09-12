import {
  useState,
  type ChangeEvent,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

export type InputProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
  onClick?: (event: MouseEvent<HTMLInputElement>) => void;
  type?: "text" | "password" | "search";
  placeholder?: string;
  clearable?: boolean;
  maxLength?: number;
  disabled?: boolean;
  readOnly?: boolean;
  id?: string;
  className?: string;
  "aria-haspopup"?: "dialog" | "listbox" | "menu" | "grid" | "tree";
  "aria-expanded"?: boolean;
};

const inputCls =
  "w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50";

export function Input({
  value: valueProp,
  defaultValue = "",
  onChange,
  onBlur,
  onFocus,
  onClick,
  type = "text",
  placeholder,
  clearable = false,
  maxLength,
  disabled = false,
  readOnly = false,
  id,
  className = "",
  "aria-haspopup": ariaHasPopup,
  "aria-expanded": ariaExpanded,
}: InputProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = valueProp ?? uncontrolled;

  function commit(next: string) {
    if (valueProp === undefined) setUncontrolled(next);
    onChange?.(next);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (readOnly) return;
    commit(e.target.value);
  }

  function handleClear() {
    commit("");
  }

  const showClear = clearable && !disabled && value.length > 0;

  const wrapperCls = `relative inline-flex w-full items-center ${className}`.trim();

  let clearButton: ReactNode = null;
  if (showClear) {
    clearButton = (
      <button
        type="button"
        aria-label="清除"
        className="absolute right-1.5 rounded px-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        onClick={handleClear}
      >
        ×
      </button>
    );
  }

  return (
    <div className={wrapperCls}>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        readOnly={readOnly}
        aria-haspopup={ariaHasPopup}
        aria-expanded={ariaExpanded}
        className={`${inputCls}${showClear ? " pr-7" : ""}`}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
        onClick={onClick}
      />
      {clearButton}
    </div>
  );
}
