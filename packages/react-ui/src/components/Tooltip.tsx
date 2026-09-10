import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
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
  onlyIfOverflow?: boolean;
  className?: string;
};

function isOverflowing(node: HTMLElement): boolean {
  return (
    node.scrollWidth - node.clientWidth > 1 ||
    node.scrollHeight - node.clientHeight > 1
  );
}

function positionStyle(rect: DOMRect): CSSProperties {
  const half = 160;
  const left = Math.min(
    Math.max(rect.left + rect.width / 2, half + 8),
    Math.max(window.innerWidth - half - 8, half + 8),
  );
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
  onlyIfOverflow = false,
  className = "",
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [coords, setCoords] = useState<CSSProperties>({});
  const open = openProp ?? uncontrolledOpen;
  const hasContent = content != null && content !== "";

  function commitOpen(next: boolean) {
    if (openProp === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  function tryOpen() {
    if (
      onlyIfOverflow &&
      triggerRef.current &&
      !isOverflowing(triggerRef.current)
    ) {
      return;
    }
    commitOpen(true);
  }

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      if (!triggerRef.current) return;
      setCoords(positionStyle(triggerRef.current.getBoundingClientRect()));
    };
    update();
    const onScroll = () => commitOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      commitOpen(false);
    }
  }

  if (disabled || !hasContent) {
    return <>{children}</>;
  }

  return (
    <span
      ref={triggerRef}
      className={`block min-w-0 max-w-full truncate ${className}`.trim()}
      aria-describedby={open ? tooltipId : undefined}
      onMouseEnter={tryOpen}
      onMouseLeave={() => commitOpen(false)}
      onFocus={tryOpen}
      onBlur={() => commitOpen(false)}
      onKeyDown={onKeyDown}
    >
      {children}
      {open
        ? createPortal(
            <div
              id={tooltipId}
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
