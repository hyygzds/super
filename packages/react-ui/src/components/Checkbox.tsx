import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

export type CheckboxProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
  className?: string;
  children?: ReactNode;
  onCheckedChange?: (checked: boolean) => void;
};

export function Checkbox({
  checked: checkedProp,
  defaultChecked = false,
  indeterminate = false,
  disabled = false,
  required = false,
  name,
  value,
  className = "",
  children,
  onCheckedChange,
}: CheckboxProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const checked = checkedProp ?? uncontrolled;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    if (checkedProp === undefined) setUncontrolled(next);
    onCheckedChange?.(next);
  }

  const wrapperCls =
    `inline-flex items-center gap-2 text-sm text-slate-800 ${
      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
    } ${className}`.trim();

  const boxCls =
    "h-4 w-4 shrink-0 rounded border border-slate-300 text-sky-600 accent-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed";

  return (
    <label className={wrapperCls}>
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        required={required}
        name={name}
        value={value}
        aria-checked={indeterminate ? "mixed" : checked}
        className={boxCls}
        onChange={handleChange}
      />
      {children}
    </label>
  );
}
