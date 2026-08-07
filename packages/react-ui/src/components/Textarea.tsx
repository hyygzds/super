import {
  useState,
  type ChangeEvent,
  type FocusEvent,
} from "react";

export type TextareaProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: (event: FocusEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  maxLength?: number;
  showCount?: boolean;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
};

const areaCls =
  "w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50";

export function Textarea({
  value: valueProp,
  defaultValue = "",
  onChange,
  onBlur,
  rows = 3,
  maxLength,
  showCount = false,
  placeholder,
  disabled = false,
  id,
  className = "",
}: TextareaProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = valueProp ?? uncontrolled;

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    if (valueProp === undefined) setUncontrolled(next);
    onChange?.(next);
  }

  const wrapperCls = `flex w-full flex-col gap-1 ${className}`.trim();

  return (
    <div className={wrapperCls}>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        className={areaCls}
        onChange={handleChange}
        onBlur={onBlur}
      />
      {showCount ? (
        <div className="text-right text-xs text-slate-500">
          {value.length}
          {maxLength !== undefined ? `/${maxLength}` : ""}
        </div>
      ) : null}
    </div>
  );
}
