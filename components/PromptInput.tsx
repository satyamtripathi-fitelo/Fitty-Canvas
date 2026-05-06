"use client";

import { WandSparkles } from "lucide-react";

type PromptInputProps = {
  value: string;
  onChange: (value: string) => void;
};

const SUGGESTIONS = [
  "Extend the background naturally and preserve the subject exactly.",
  "Enhance lighting, sharpen details, and keep the scene realistic.",
  "Create a premium editorial look with balanced colors and natural outpainting."
];

export function PromptInput({ value, onChange }: PromptInputProps) {
  function suggestPrompt() {
    const next = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          maxLength={500}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Describe changes to your image... (optional)"
          className="min-h-20 w-full resize-none rounded-[10px] border bg-card px-3 py-2 pr-11 text-sm outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={suggestPrompt}
          aria-label="Suggest prompt"
          className="absolute right-2 top-2 rounded-lg border bg-background p-2 text-primary transition hover:bg-primary hover:text-primary-foreground"
        >
          <WandSparkles className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-start justify-between gap-4 text-[11px] text-muted-foreground">
        <p>Optional AI instructions.</p>
        <span>{value.length}/500</span>
      </div>
    </div>
  );
}
