import {
  useId,
  useState,
  type InputHTMLAttributes,
} from "react";

export type InputType = "text" | "password" | "number";
export type InputSize = "sm" | "md";

export type InputProps = {
  value?: string;
  defaultValue?: string;
  type?: InputType;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  clearable?: boolean;
  size?: InputSize;
  className?: string;
  onValueChange?: (value: string) => void;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size" | "type" | "value" | "defaultValue" | "onChange"
>;

const sizeClass: Record<InputSize, string> = {
  sm: "h-8 px-2.5 text-sm",
  md: "h-9 px-3 text-sm",
};

export function Input({
  value: valueProp,
  defaultValue = "",
  type = "text",
  placeholder,
  disabled = false,
  readOnly = false,
  clearable = false,
  size = "md",
  className = "",
  onValueChange,
  id: idProp,
  ...rest
}: InputProps) {
  const reactId = useId();
  const id = idProp ?? `input-${reactId}`;
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const [showPassword, setShowPassword] = useState(false);

  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp! : uncontrolled;

  function setValue(next: string) {
    if (!isControlled) setUncontrolled(next);
    onValueChange?.(next);
  }

  const inputType =
    type === "password" ? (showPassword ? "text" : "password") : type;

  const showClear = clearable && !disabled && !readOnly && value.length > 0;
  const showPasswordToggle = type === "password" && !disabled;

  return (
    <div
      className={`inline-flex w-full items-center gap-1 rounded-lg border border-slate-300 bg-white ${sizeClass[size]} focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-600 ${disabled ? "opacity-50" : ""} ${className}`.trim()}
    >
      <input
        {...rest}
        id={id}
        type={inputType}
        className="min-w-0 flex-1 border-0 bg-transparent outline-none disabled:cursor-not-allowed"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(e) => setValue(e.target.value)}
      />
      {showClear ? (
        <button
          type="button"
          aria-label="清除"
          className="shrink-0 rounded px-1 text-slate-500 hover:text-slate-800"
          onClick={() => setValue("")}
        >
          ×
        </button>
      ) : null}
      {showPasswordToggle ? (
        <button
          type="button"
          aria-label={showPassword ? "隐藏密码" : "显示密码"}
          className="shrink-0 rounded px-1 text-slate-500 hover:text-slate-800"
          onClick={() => setShowPassword((v) => !v)}
        >
          {showPassword ? "隐" : "显"}
        </button>
      ) : null}
    </div>
  );
}
