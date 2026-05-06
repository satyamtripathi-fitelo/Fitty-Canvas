import { Loader2 } from "lucide-react";

type ConvertButtonProps = {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
};

export function ConvertButton({ disabled, loading, onClick }: ConvertButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {loading ? "Converting..." : "Convert"}
    </button>
  );
}
