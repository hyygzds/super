import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type TooltipProps = {
  content?: ReactNode;
  children?: ReactNode;
  disabled?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

function positionStyle(rect: DOMRect): CSSProperties {
  const left = rect.left + rect.width / 2;
  if (rect.top < 48) {
    return {
      top: rect.bottom + 8,
      left,
      transform: "translateX(-50%)",
    };
  }
  return {
    top: rect.top - 8,
    left,
    transform: "translate(-50%, -100%)",
  };
}

export function Tooltip({
  content,
  children,
  disabled = false,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className = "",
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [coords, setCoords] = useState<CSSProperties>({});
  const open = openProp ?? uncontrolledOpen;
  const hasContent = content != null && content !== "";

  function commitOpen(next: boolean) {
    if (openProp === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    setCoords(positionStyle(triggerRef.current.getBoundingClientRect()));
  }, [open]);

  if (disabled || !hasContent) {
    return <>{children}</>;
  }

  return (
    <span
      ref={triggerRef}
      className={`inline-flex min-w-0 max-w-full ${className}`.trim()}
      onMouseEnter={() => commitOpen(true)}
      onMouseLeave={() => commitOpen(false)}
    >
      {children}
      {open
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-[1000] max-w-sm rounded-md bg-slate-900 px-2.5 py-1.5 text-xs leading-5 text-white shadow-lg whitespace-pre-wrap break-words"
              style={coords}
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
