"use client";

import type { OutputFormat } from "@/types";
import { cn } from "@/lib/utils";

type FormatSelectorProps = {
  format: OutputFormat;
  quality: number;
  onFormatChange: (format: OutputFormat) => void;
  onQualityChange: (quality: number) => void;
};

const FORMATS: OutputFormat[] = ["jpg", "png", "webp"];
const LOSSY_FORMATS = new Set<OutputFormat>(["jpg", "webp"]);

export function FormatSelector({ format, quality, onFormatChange, onQualityChange }: FormatSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 rounded-xl border bg-card p-1">
        {FORMATS.map((item) => {
          const active = item === format;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onFormatChange(item)}
              className={cn(
                "rounded-[10px] px-3 py-2 text-sm font-medium uppercase transition",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item}
            </button>
          );
        })}
      </div>

      {LOSSY_FORMATS.has(format) ? (
        <label className="block space-y-2 text-sm text-muted-foreground">
          <span>Quality: {quality}</span>
          <input
            type="range"
            min={10}
            max={100}
            value={quality}
            onChange={(event) => onQualityChange(Number(event.target.value))}
            className="w-full accent-primary"
          />
        </label>
      ) : null}
    </div>
  );
}
