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
    <div className="space-y-3">
      <label className="text-sm font-medium text-muted-foreground">AI Model</label>
      <div className="grid grid-cols-2 gap-2 rounded-xl border bg-card p-1">
        <button
          type="button"
          onClick={() => onModelChange("gemini")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[10px] px-3 py-2.5 text-sm font-medium transition",
            model === "gemini"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Sparkles className="h-4 w-4" />
          Gemini
        </button>
        <button
          type="button"
          onClick={() => onModelChange("openai")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[10px] px-3 py-2.5 text-sm font-medium transition",
            model === "openai"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Brain className="h-4 w-4" />
          OpenAI
        </button>
      </div>
    </div>
  );
}
