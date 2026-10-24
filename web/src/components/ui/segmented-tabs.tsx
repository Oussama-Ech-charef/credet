"use client";

import { cn } from "@/lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedTabsProps<T extends string> {
  options: Array<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedTabsProps<T>) {
  return (
    <div aria-label={label} className="segmented" role="group">
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className={cn(
            "segmented__btn",
            value === option.value && "is-active",
          )}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          <span>{option.label}</span>
          {typeof option.count === "number" ? (
            <span className="segmented__count">{option.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
