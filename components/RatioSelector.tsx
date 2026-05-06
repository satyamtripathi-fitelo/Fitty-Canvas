"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const selectedPreset = presets.find((preset) => preset.label === selectedLabel);

  return (
    <div className="space-y-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-3 rounded-[10px] border bg-card px-3 py-2 text-left text-sm transition hover:border-primary"
        >
          <span>
            <span className="font-semibold">{selectedLabel}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {selectedPreset?.description ?? "Custom size"}
            </span>
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-180")} />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-xl border bg-popover p-2 shadow-lg">
            <div className="grid grid-cols-3 gap-2">
              {presets.map((preset) => {
                const selected = selectedLabel === preset.label;

                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      onSelect(preset.label);
                      setOpen(false);
                    }}
                    className={cn(
                      "rounded-[10px] border px-2 py-2 text-left text-xs transition",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary hover:text-foreground"
                    )}
                  >
                    <span className="block font-semibold">{preset.label}</span>
                    <span className="block truncate opacity-80">{preset.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {selectedLabel === "Custom" ? (
        <div className="grid grid-cols-2 gap-2">
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
      ) : (
        <button
          type="button"
          onClick={() => {
            onSelect("Custom");
            setOpen(false);
          }}
          className="text-xs font-medium text-primary transition hover:text-primary/80"
        >
          Use custom dimensions
        </button>
      )}
    </div>
  );
}
