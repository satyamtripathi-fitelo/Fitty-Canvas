import { cn } from "@/lib/utils";

const BRAND_GREEN = "#064021";

type FittyCanvasLogoProps = {
  className?: string;
};

export function FittyCanvasLogo({ className }: FittyCanvasLogoProps) {
  return (
    <div className={cn("flex flex-wrap items-end gap-x-1 gap-y-0", className)}>
      <span className="sr-only">Fitty Canvas</span>
      <span
        aria-hidden
        className="font-fitty text-[clamp(1.35rem,4vw,1.85rem)] font-bold leading-none tracking-[-0.04em]"
        style={{ color: BRAND_GREEN }}
      >
        Fitty
      </span>
      <span
        aria-hidden
        className="font-fitty text-[clamp(1.35rem,4vw,1.85rem)] font-bold leading-none tracking-[-0.04em]"
        style={{ color: BRAND_GREEN }}
      >
        Canvas
      </span>
    </div>
  );
}
