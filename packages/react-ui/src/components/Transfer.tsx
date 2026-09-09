import { useState } from "react";
import { Button } from "./Button";
import { Checkbox } from "./Checkbox";

export type TransferItem = {
  key: string;
  title: string;
  disabled?: boolean;
};

export type TransferProps = {
  dataSource: TransferItem[];
  targetKeys?: string[];
  defaultTargetKeys?: string[];
  titles?: [string, string];
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  onTargetKeysChange?: (next: string[]) => void;
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

export function Transfer({
  dataSource,
  targetKeys: targetKeysProp,
  defaultTargetKeys = [],
  titles = ["源列表", "目标列表"],
  disabled = false,
  className = "",
  "aria-label": ariaLabel = "穿梭框",
  onTargetKeysChange,
}: TransferProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultTargetKeys);
  const [sourceChecked, setSourceChecked] = useState<string[]>([]);
  const [targetChecked, setTargetChecked] = useState<string[]>([]);
  const targetKeys = targetKeysProp ?? uncontrolled;
  const { source, target } = splitPanels(dataSource, targetKeys);

  function commit(next: string[]) {
    if (targetKeysProp === undefined) setUncontrolled(next);
    onTargetKeysChange?.(next);
  }

  function moveToTarget() {
    const movable = new Set(
      source
        .filter((item) => !item.disabled && sourceChecked.includes(item.key))
        .map((item) => item.key),
    );
    if (movable.size === 0) return;
    const nextSet = new Set(targetKeys);
    for (const key of movable) nextSet.add(key);
    commit(orderedKeys(dataSource, nextSet));
    setSourceChecked((prev) => prev.filter((key) => !movable.has(key)));
  }

  function moveToSource() {
    const movable = new Set(
      target
        .filter((item) => !item.disabled && targetChecked.includes(item.key))
        .map((item) => item.key),
    );
    if (movable.size === 0) return;
    const nextSet = new Set(targetKeys);
    for (const key of movable) nextSet.delete(key);
    commit(orderedKeys(dataSource, nextSet));
    setTargetChecked((prev) => prev.filter((key) => !movable.has(key)));
  }

  const canMoveRight =
    !disabled &&
    source.some((item) => !item.disabled && sourceChecked.includes(item.key));
  const canMoveLeft =
    !disabled &&
    target.some((item) => !item.disabled && targetChecked.includes(item.key));

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex items-stretch gap-3 ${className}`.trim()}
    >
      <TransferPanel
        title={titles[0]}
        items={source}
        checkedKeys={sourceChecked}
        disabled={disabled}
        onCheckedKeysChange={setSourceChecked}
      />
      <div className="flex flex-col justify-center gap-2">
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
      <TransferPanel
        title={titles[1]}
        items={target}
        checkedKeys={targetChecked}
        disabled={disabled}
        onCheckedKeysChange={setTargetChecked}
      />
    </div>
  );
}

type PanelProps = {
  title: string;
  items: TransferItem[];
  checkedKeys: string[];
  disabled: boolean;
  onCheckedKeysChange: (keys: string[]) => void;
};

function TransferPanel({
  title,
  items,
  checkedKeys,
  disabled,
  onCheckedKeysChange,
}: PanelProps) {
  const enabled = items.filter((item) => !item.disabled);
  const enabledKeys = enabled.map((item) => item.key);
  const checkedEnabled = enabledKeys.filter((key) => checkedKeys.includes(key));
  const allChecked =
    enabledKeys.length > 0 && checkedEnabled.length === enabledKeys.length;
  const indeterminate =
    checkedEnabled.length > 0 && checkedEnabled.length < enabledKeys.length;

  function toggleAll(next: boolean) {
    if (disabled) return;
    if (next) {
      const merged = new Set([...checkedKeys, ...enabledKeys]);
      onCheckedKeysChange(items.map((item) => item.key).filter((k) => merged.has(k)));
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
    <div className="flex w-56 flex-col rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-sm text-slate-800">
        <Checkbox
          checked={allChecked}
          indeterminate={indeterminate}
          disabled={disabled || enabledKeys.length === 0}
          onCheckedChange={toggleAll}
        >
          <span className="sr-only">{title}全选</span>
        </Checkbox>
        <span>
          {title} {checkedEnabled.length}/{enabledKeys.length}
        </span>
      </div>
      <div
        role="listbox"
        aria-label={title}
        className="flex min-h-40 flex-col gap-1 p-2"
      >
        {items.length === 0 ? (
          <div className="px-1 py-6 text-center text-sm text-slate-400">
            暂无数据
          </div>
        ) : (
          items.map((item) => (
            <div key={item.key} role="option" aria-selected={checkedKeys.includes(item.key)}>
              <Checkbox
                checked={checkedKeys.includes(item.key)}
                disabled={disabled || item.disabled}
                onCheckedChange={(next) => toggleItem(item.key, next)}
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
