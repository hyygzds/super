import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

function isNodeDevelopment(): boolean {
  const proc = (globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } })
    .process;
  return proc?.env?.NODE_ENV === "development";
}

type Orientation = "horizontal" | "vertical";

type CheckboxGroupContextValue = {
  value: string[];
  setItemChecked: (itemValue: string, checked: boolean) => void;
  disabled: boolean;
  name?: string;
};

const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(
  null,
);

export type CheckboxProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  value?: string;
  className?: string;
  children?: ReactNode;
  onCheckedChange?: (checked: boolean) => void;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "checked" | "defaultChecked" | "onChange" | "value"
>;

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path
        d="M2 5.2 4.1 7.3 8 2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path
        d="M2.5 5h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Checkbox({
  checked: checkedProp,
  defaultChecked = false,
  indeterminate = false,
  disabled = false,
  value,
  className = "",
  children,
  onCheckedChange,
  id: idProp,
  ...rest
}: CheckboxProps) {
  const group = useContext(CheckboxGroupContext);
  const reactId = useId();
  const id = idProp ?? `checkbox-${reactId}`;
  const inputRef = useRef<HTMLInputElement>(null);

  const [uncontrolled, setUncontrolled] = useState(defaultChecked);

  if (group && checkedProp !== undefined && isNodeDevelopment()) {
    console.warn(
      "[Checkbox] `checked` is ignored inside CheckboxGroup; group value wins.",
    );
  }

  const inGroup = group != null && value != null;
  const checked = inGroup
    ? group.value.includes(value)
    : checkedProp !== undefined
      ? checkedProp
      : uncontrolled;

  const isDisabled = disabled || (group?.disabled ?? false);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate && !checked;
    }
  }, [indeterminate, checked]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    if (inGroup && value != null) {
      group!.setItemChecked(value, next);
      return;
    }
    if (checkedProp === undefined) setUncontrolled(next);
    onCheckedChange?.(next);
  }

  const showChecked = checked;
  const showIndeterminate = indeterminate && !checked;
  const boxState = showChecked || showIndeterminate ? "border-sky-600 bg-sky-600" : "border-slate-300 bg-white";

  return (
    <label
      className={`inline-flex items-center gap-2 text-sm text-slate-900 ${isDisabled ? "opacity-50" : ""} ${className}`.trim()}
    >
      <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          {...rest}
          ref={inputRef}
          id={id}
          type="checkbox"
          className="peer absolute inset-0 z-10 m-0 h-4 w-4 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          checked={checked}
          disabled={isDisabled}
          value={value}
          aria-checked={showIndeterminate ? "mixed" : checked}
          onChange={handleChange}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-flex h-4 w-4 items-center justify-center rounded border text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-600 ${boxState}`}
        >
          {showChecked ? <CheckIcon /> : null}
          {showIndeterminate ? <MinusIcon /> : null}
        </span>
      </span>
      {children != null && children !== false ? (
        <span>{children}</span>
      ) : null}
    </label>
  );
}

export type CheckboxGroupProps = {
  value?: string[];
  defaultValue?: string[];
  disabled?: boolean;
  orientation?: Orientation;
  className?: string;
  children?: ReactNode;
  onValueChange?: (value: string[]) => void;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

export function CheckboxGroup({
  value: valueProp,
  defaultValue = [],
  disabled = false,
  orientation = "vertical",
  className = "",
  children,
  onValueChange,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: CheckboxGroupProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp! : uncontrolled;

  function setItemChecked(itemValue: string, nextChecked: boolean) {
    const set = new Set(value);
    if (nextChecked) set.add(itemValue);
    else set.delete(itemValue);
    const next = [...set];
    if (!isControlled) setUncontrolled(next);
    onValueChange?.(next);
  }

  const layout =
    orientation === "horizontal"
      ? "flex flex-row flex-wrap gap-3"
      : "flex flex-col gap-2";

  return (
    <CheckboxGroupContext.Provider
      value={{ value, setItemChecked, disabled }}
    >
      <div
        role="group"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        className={`${layout} ${className}`.trim()}
      >
        {children}
      </div>
    </CheckboxGroupContext.Provider>
  );
}
