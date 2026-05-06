"use client";

import type { OutputFormat } from "@/types";
import { cn } from "@/lib/utils";

type FormatSelectorProps = {
  format: OutputFormat;
  onFormatChange: (format: OutputFormat) => void;
};

const FORMATS: OutputFormat[] = ["jpg", "png", "webp"];

export function FormatSelector({ format, onFormatChange }: FormatSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl border bg-card p-1">
      {FORMATS.map((item) => {
        const active = item === format;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onFormatChange(item)}
            className={cn(
              "rounded-[10px] px-3 py-1.5 text-xs font-medium uppercase transition",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
