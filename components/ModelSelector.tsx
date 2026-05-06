"use client";

import type { AIModel } from "@/types";
import { cn } from "@/lib/utils";
import { Sparkles, Brain } from "lucide-react";

type ModelSelectorProps = {
  model: AIModel;
  onModelChange: (model: AIModel) => void;
};

export function ModelSelector({ model, onModelChange }: ModelSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">AI Model</label>
      <div className="grid grid-cols-2 gap-1 rounded-xl border bg-card p-1">
        <button
          type="button"
          onClick={() => onModelChange("gemini")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium transition",
            model === "gemini"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Sparkles className="h-4 w-4" />
          Gemini 3 Pro
        </button>
        <button
          type="button"
          onClick={() => onModelChange("openai")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium transition",
            model === "openai"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Brain className="h-4 w-4" />
          GPT Image 1.5
        </button>
      </div>
    </div>
  );
}
