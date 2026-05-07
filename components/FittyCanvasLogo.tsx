import { cn } from "@/lib/utils";

const BRAND_GREEN = "#064021";

type FittyCanvasLogoProps = {
  className?: string;
};

export function FittyCanvasLogo({ className }: FittyCanvasLogoProps) {
  return (
    <div className={cn("flex items-end gap-1.5", className)}>
      <span className="sr-only">Fitty Canvas</span>
      <img
        src="/brand/fitty-wordmark-transparent.png"
        alt=""
        aria-hidden
        className="h-[1.45rem] w-auto translate-y-[0.04em] object-contain sm:h-[1.65rem]"
      />
      <span
        aria-hidden
        className="font-fitty text-[1.54rem] font-semibold leading-[0.88] tracking-[-0.025em] sm:text-[1.75rem]"
        style={{ color: BRAND_GREEN }}
      >
        Canvas
      </span>
    </div>
  );
}
