import {
  computed,
  defineComponent,
  ref,
  type PropType,
} from "vue";
import Button from "./Button";
import { Checkbox } from "./Checkbox";

export type TransferItem = {
  key: string;
  title: string;
  disabled?: boolean;
};

export type TransferProps = {
  dataSource: TransferItem[];
  modelValue?: string[];
  defaultModelValue?: string[];
  titles?: [string, string];
  disabled?: boolean;
  class?: string;
  ariaLabel?: string;
};

function splitPanels(dataSource: TransferItem[], targetKeys: string[]) {
  const selected = new Set(targetKeys);
  const source: TransferItem[] = [];
  const target: TransferItem[] = [];
  for (const item of dataSource) {
    if (selected.has(item.key)) target.push(item);
    else source.push(item);
  }
  return { source, target };
}

function orderedKeys(dataSource: TransferItem[], keys: Set<string>): string[] {
  return dataSource.map((item) => item.key).filter((key) => keys.has(key));
}

export const Transfer = defineComponent({
  name: "Transfer",
  props: {
    dataSource: {
      type: Array as PropType<TransferItem[]>,
      required: true,
    },
    modelValue: Array as PropType<string[]>,
    defaultModelValue: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    titles: {
      type: Array as unknown as PropType<[string, string]>,
      default: () => ["源列表", "目标列表"],
    },
    disabled: { type: Boolean, default: false },
    class: { type: String, default: "" },
    ariaLabel: { type: String, default: "穿梭框" },
  },
  emits: {
    "update:modelValue": (_next: string[]) => true,
  },
  setup(props, { emit, attrs }) {
    const internalKeys = ref<string[]>([...(props.defaultModelValue ?? [])]);
    const sourceChecked = ref<string[]>([]);
    const targetChecked = ref<string[]>([]);

    const targetKeys = computed(() =>
      props.modelValue !== undefined ? props.modelValue : internalKeys.value,
    );

    function commit(next: string[]) {
      if (props.modelValue === undefined) internalKeys.value = next;
      emit("update:modelValue", next);
    }

    function renderPanel(
      title: string,
      items: TransferItem[],
      checkedKeys: string[],
      onCheckedKeysChange: (keys: string[]) => void,
    ) {
      const enabled = items.filter((item) => !item.disabled);
      const enabledKeys = enabled.map((item) => item.key);
      const checkedEnabled = enabledKeys.filter((key) =>
        checkedKeys.includes(key),
      );
      const allChecked =
        enabledKeys.length > 0 &&
        checkedEnabled.length === enabledKeys.length;
      const indeterminate =
        checkedEnabled.length > 0 &&
        checkedEnabled.length < enabledKeys.length;

      function toggleAll(next: boolean) {
        if (props.disabled) return;
        if (next) {
          const merged = new Set([...checkedKeys, ...enabledKeys]);
          onCheckedKeysChange(
            items.map((item) => item.key).filter((key) => merged.has(key)),
          );
        } else {
          onCheckedKeysChange(
            checkedKeys.filter((key) => !enabledKeys.includes(key)),
          );
        }
      }

      function toggleItem(key: string, next: boolean) {
        if (next) onCheckedKeysChange([...checkedKeys, key]);
        else onCheckedKeysChange(checkedKeys.filter((k) => k !== key));
      }

      return (
        <div class="flex w-56 flex-col rounded-lg border border-slate-200 bg-white">
          <div class="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-sm text-slate-800">
            <Checkbox
              modelValue={allChecked}
              indeterminate={indeterminate}
              disabled={props.disabled || enabledKeys.length === 0}
              onUpdate:modelValue={toggleAll}
            >
              <span class="sr-only">{title}全选</span>
            </Checkbox>
            <span>
              {title} {checkedEnabled.length}/{enabledKeys.length}
            </span>
          </div>
          <div
            role="listbox"
            aria-label={title}
            class="flex min-h-40 flex-col gap-1 p-2"
          >
            {items.length === 0 ? (
              <div class="px-1 py-6 text-center text-sm text-slate-400">
                暂无数据
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.key}
                  role="option"
                  aria-selected={checkedKeys.includes(item.key)}
                >
                  <Checkbox
                    modelValue={checkedKeys.includes(item.key)}
                    disabled={props.disabled || item.disabled}
                    onUpdate:modelValue={(next: boolean) =>
                      toggleItem(item.key, next)
                    }
                  >
                    {item.title}
                  </Checkbox>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    return () => {
      const keys = targetKeys.value;
      const { source, target } = splitPanels(props.dataSource, keys);
      const titles = props.titles ?? ["源列表", "目标列表"];
      const canMoveRight =
        !props.disabled &&
        source.some(
          (item) => !item.disabled && sourceChecked.value.includes(item.key),
        );
      const canMoveLeft =
        !props.disabled &&
        target.some(
          (item) => !item.disabled && targetChecked.value.includes(item.key),
        );

      function moveToTarget() {
        const movable = new Set(
          source
            .filter(
              (item) =>
                !item.disabled && sourceChecked.value.includes(item.key),
            )
            .map((item) => item.key),
        );
        if (movable.size === 0) return;
        const nextSet = new Set(keys);
        for (const key of movable) nextSet.add(key);
        commit(orderedKeys(props.dataSource, nextSet));
        sourceChecked.value = sourceChecked.value.filter(
          (key) => !movable.has(key),
        );
      }

      function moveToSource() {
        const movable = new Set(
          target
            .filter(
              (item) =>
                !item.disabled && targetChecked.value.includes(item.key),
            )
            .map((item) => item.key),
        );
        if (movable.size === 0) return;
        const nextSet = new Set(keys);
        for (const key of movable) nextSet.delete(key);
        commit(orderedKeys(props.dataSource, nextSet));
        targetChecked.value = targetChecked.value.filter(
          (key) => !movable.has(key),
        );
      }

      const groupLabel =
        (attrs["aria-label"] as string | undefined) ?? props.ariaLabel;

      return (
        <div
          role="group"
          aria-label={groupLabel}
          class={["inline-flex items-stretch gap-3", props.class]
            .filter(Boolean)
            .join(" ")}
        >
          {renderPanel(titles[0], source, sourceChecked.value, (next) => {
            sourceChecked.value = next;
          })}
          <div class="flex flex-col justify-center gap-2">
            <Button
              variant="secondary"
              aria-label="移到右侧"
              disabled={!canMoveRight}
              onClick={moveToTarget}
            >
              {">"}
            </Button>
            <Button
              variant="secondary"
              aria-label="移到左侧"
              disabled={!canMoveLeft}
              onClick={moveToSource}
            >
              {"<"}
            </Button>
          </div>
          {renderPanel(titles[1], target, targetChecked.value, (next) => {
            targetChecked.value = next;
          })}
        </div>
      );
    };
  },
});
