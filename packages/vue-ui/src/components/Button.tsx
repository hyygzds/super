import { computed, defineComponent, mergeProps, type PropType } from "vue";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantMap: Record<ButtonVariant, string> = {
  primary:
    "bg-sky-600 text-white hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600",
  secondary:
    "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400",
  ghost:
    "bg-transparent text-slate-900 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400",
};

export default defineComponent({
  name: "Button",
  inheritAttrs: false,
  props: {
    variant: {
      type: String as PropType<ButtonVariant>,
      default: "primary",
    },
    disabled: Boolean,
    type: {
      type: String as PropType<HTMLButtonElement["type"]>,
      default: "button",
    },
    onClick: Function as PropType<(event: MouseEvent) => void>,
  },
  setup(props, { slots, attrs }) {
    const base =
      "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";
    const variantClass = computed(() => variantMap[props.variant]);

    return () => (
      <button
        {...mergeProps(
          {
            type: props.type,
            disabled: props.disabled,
            class: `${base} ${variantClass.value}`,
            onClick: props.onClick,
          },
          attrs,
        )}
      >
        {slots.default?.()}
      </button>
    );
  },
});
