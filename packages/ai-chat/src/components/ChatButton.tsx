import type { ButtonHTMLAttributes } from "react";

export type ChatButtonVariant = "primary" | "secondary";

export type ChatButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ChatButtonVariant;
};

const variantClass: Record<ChatButtonVariant, string> = {
  primary:
    "bg-sky-600 text-white hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600",
  secondary:
    "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400",
};

export function ChatButton({
  variant = "primary",
  className = "",
  type = "button",
  children,
  ...rest
}: ChatButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";

  return (
    <button
      type={type}
      className={`${base} ${variantClass[variant]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
