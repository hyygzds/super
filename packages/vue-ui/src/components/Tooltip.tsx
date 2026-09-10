import {
  Teleport,
  computed,
  defineComponent,
  ref,
  watch,
  type CSSProperties,
  type PropType,
} from "vue";

function positionStyle(rect: DOMRect): CSSProperties {
  const left = rect.left + rect.width / 2;
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
    class: { type: String, default: "" },
  },
  emits: {
    "update:open": (_open: boolean) => true,
  },
  setup(props, { emit, slots }) {
    const triggerRef = ref<HTMLElement | null>(null);
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

    function syncPosition() {
      if (!triggerRef.value) return;
      coords.value = positionStyle(triggerRef.value.getBoundingClientRect());
    }

    watch(currentOpen, (open) => {
      if (open) syncPosition();
    });

    return () => {
      if (props.disabled || !hasContent.value) {
        return slots.default?.();
      }

      return (
        <span
          ref={triggerRef}
          class={`inline-flex min-w-0 max-w-full ${props.class}`.trim()}
          onMouseenter={() => commitOpen(true)}
          onMouseleave={() => commitOpen(false)}
        >
          {slots.default?.()}
          {currentOpen.value ? (
            <Teleport to="body">
              <div
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
