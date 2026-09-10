import {
  Teleport,
  computed,
  defineComponent,
  nextTick,
  ref,
  useId,
  watch,
  type CSSProperties,
  type PropType,
} from "vue";

export type TooltipProps = {
  content?: string | number;
  disabled?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onlyIfOverflow?: boolean;
  class?: string;
};

function isOverflowing(node: HTMLElement): boolean {
  const nested = Array.from(node.querySelectorAll("*")).filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );
  return [node, ...nested].some(
    (el) =>
      el.scrollWidth - el.clientWidth > 1 ||
      el.scrollHeight - el.clientHeight > 1,
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
      top: `${rect.bottom + 8}px`,
      left: `${left}px`,
      transform: "translateX(-50%)",
    };
  }
  return {
    top: `${rect.top - 8}px`,
    left: `${left}px`,
    transform: "translate(-50%, -100%)",
  };
}

export const Tooltip = defineComponent({
  name: "Tooltip",
  props: {
    content: { type: [String, Number] as PropType<string | number>, default: "" },
    disabled: { type: Boolean, default: false },
    open: { type: Boolean, default: undefined },
    defaultOpen: { type: Boolean, default: false },
    onlyIfOverflow: { type: Boolean, default: false },
    class: { type: String, default: "" },
  },
  emits: {
    "update:open": (_open: boolean) => true,
  },
  setup(props, { emit, slots }) {
    const triggerRef = ref<HTMLElement | null>(null);
    const tooltipId = `tooltip-${useId()}`;
    const internalOpen = ref(props.defaultOpen);
    const coords = ref<CSSProperties>({});
    const isControlled = computed(() => props.open !== undefined);
    const currentOpen = computed(() =>
      isControlled.value ? !!props.open : internalOpen.value,
    );
    const hasContent = computed(
      () => props.content != null && String(props.content) !== "",
    );

    function commitOpen(next: boolean) {
      if (!isControlled.value) internalOpen.value = next;
      emit("update:open", next);
    }

    function tryOpen() {
      if (
        props.onlyIfOverflow &&
        triggerRef.value &&
        !isOverflowing(triggerRef.value)
      ) {
        return;
      }
      commitOpen(true);
    }

    function syncPosition() {
      if (!triggerRef.value) return;
      coords.value = positionStyle(triggerRef.value.getBoundingClientRect());
    }

    watch(
      currentOpen,
      (open, _prev, onCleanup) => {
        if (!open) return;
        void nextTick(syncPosition);
        const onScroll = () => commitOpen(false);
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", syncPosition);
        onCleanup(() => {
          window.removeEventListener("scroll", onScroll, true);
          window.removeEventListener("resize", syncPosition);
        });
      },
      { immediate: true },
    );

    return () => {
      if (props.disabled || !hasContent.value) {
        return slots.default?.();
      }

      return (
        <span
          ref={triggerRef}
          class={`inline-flex min-w-0 max-w-full ${props.class}`.trim()}
          aria-describedby={currentOpen.value ? tooltipId : undefined}
          onMouseenter={tryOpen}
          onMouseleave={() => commitOpen(false)}
          onFocus={tryOpen}
          onBlur={() => commitOpen(false)}
          onKeydown={(event: KeyboardEvent) => {
            if (event.key === "Escape" && currentOpen.value) {
              event.stopPropagation();
              commitOpen(false);
            }
          }}
        >
          {slots.default?.()}
          {currentOpen.value ? (
            <Teleport to="body">
              <div
                id={tooltipId}
                role="tooltip"
                class="pointer-events-none fixed z-[1000] max-w-sm rounded-md bg-slate-900 px-2.5 py-1.5 text-xs leading-5 text-white shadow-lg whitespace-pre-wrap break-words"
                style={coords.value}
              >
                {props.content}
              </div>
            </Teleport>
          ) : null}
        </span>
      );
    };
  },
});
