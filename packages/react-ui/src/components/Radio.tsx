import {
  createContext,
  useContext,
  useId,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

export type RadioOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type RadioGroupProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options?: RadioOption[];
  orientation?: "horizontal" | "vertical";
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  children?: ReactNode;
  "aria-labelledby"?: string;
};

export type RadioProps = {
  value: string;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
};

type RadioGroupContextValue = {
  name: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export function RadioGroup({
  value: valueProp,
  defaultValue = "",
  onChange,
  options,
  orientation = "horizontal",
  disabled = false,
  name: nameProp,
  id,
  className = "",
  children,
  "aria-labelledby": ariaLabelledby,
}: RadioGroupProps) {
  const autoId = useId();
  const name = nameProp ?? `radio-${autoId}`;
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = valueProp ?? uncontrolled;

  function handleChange(next: string) {
    if (valueProp === undefined) setUncontrolled(next);
    onChange?.(next);
  }

  const orientationCls =
    orientation === "vertical" ? "flex flex-col gap-2" : "flex gap-4";

  const rootCls = `${orientationCls} ${className}`.trim();

  return (
    <RadioGroupContext.Provider
      value={{ name, value, disabled, onChange: handleChange }}
    >
      <div
        role="radiogroup"
        id={id}
        aria-labelledby={ariaLabelledby}
        className={rootCls}
      >
        {options?.map((opt) => (
          <Radio key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </Radio>
        ))}
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export function Radio({
  value,
  disabled = false,
  children,
  className = "",
}: RadioProps) {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) {
    throw new Error("Radio must be used within a RadioGroup");
  }
  const group = ctx;

  const isDisabled = disabled || group.disabled;
  const checked = group.value === value;

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) group.onChange(value);
  }

  const wrapperCls =
    `inline-flex items-center gap-2 text-sm text-slate-800 ${
      isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
    } ${className}`.trim();

  const inputCls =
    "h-4 w-4 shrink-0 border-slate-300 text-sky-600 accent-sky-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed";

  return (
    <label className={wrapperCls}>
      <input
        type="radio"
        name={group.name}
        value={value}
        checked={checked}
        disabled={isDisabled}
        className={inputCls}
        onChange={handleChange}
      />
      {children}
    </label>
  );
}
