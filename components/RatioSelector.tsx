"use client";

import type { RatioPreset } from "@/types";
import { cn } from "@/lib/utils";

type RatioSelectorProps = {
  presets: RatioPreset[];
  selectedLabel: string;
  customWidth: number;
  customHeight: number;
  onSelect: (label: string) => void;
  onCustomChange: (width: number, height: number) => void;
};

export function RatioSelector({
  presets,
  selectedLabel,
  customWidth,
  customHeight,
  onSelect,
  onCustomChange
}: RatioSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {presets.map((preset) => {
          const selected = selectedLabel === preset.label;

          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onSelect(preset.label)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm transition",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:border-primary hover:text-foreground"
              )}
            >
              <span className="font-medium">{preset.label}</span>
              <span className="ml-2 text-xs opacity-80">{preset.description}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Custom W
          <input
            type="number"
            min={1}
            value={customWidth}
            onChange={(event) => onCustomChange(Number(event.target.value), customHeight)}
            onFocus={() => onSelect("Custom")}
            className="w-full rounded-[10px] border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-primary"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Custom H
          <input
            type="number"
            min={1}
            value={customHeight}
            onChange={(event) => onCustomChange(customWidth, Number(event.target.value))}
            onFocus={() => onSelect("Custom")}
            className="w-full rounded-[10px] border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-primary"
          />
        </label>
      </div>
    </div>
  );
}
