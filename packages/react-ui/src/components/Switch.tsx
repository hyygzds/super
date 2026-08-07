import { useState, type KeyboardEvent } from "react";

export type SwitchProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function Switch({
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  id,
  className = "",
}: SwitchProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const checked = checkedProp ?? uncontrolled;

  function toggle() {
    if (disabled) return;
    const next = !checked;
    if (checkedProp === undefined) setUncontrolled(next);
    onCheckedChange?.(next);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle();
    }
  }

  const trackCls = [
    "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600",
    disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
    checked
      ? "border-sky-600 bg-sky-600"
      : "border-slate-300 bg-slate-200",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const thumbCls = [
    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
    checked ? "translate-x-5" : "translate-x-0.5",
  ].join(" ");

  return (
    <button
      type="button"
      role="switch"
      id={id}
      disabled={disabled}
      aria-checked={checked}
      className={trackCls}
      onClick={toggle}
      onKeyDown={handleKeyDown}
    >
      <span className={thumbCls} />
    </button>
  );
}
