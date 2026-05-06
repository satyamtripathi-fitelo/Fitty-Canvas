import { ImageIcon, Download, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ImagePreviewPanelProps = {
  label: string;
  imageUrl?: string;
  ratio: string;
  loading?: boolean;
  emptyText: string;
  onClose?: () => void;
  onDownload?: () => void;
  onExpand?: () => void;
  format?: string;
};

export function ImagePreviewPanel({ 
  label, 
  imageUrl, 
  ratio, 
  loading, 
  emptyText, 
  onClose,
  onDownload,
  onExpand,
  format
}: ImagePreviewPanelProps) {
  return (
    <section className="flex min-h-0 flex-col rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase text-muted-foreground">{label}</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full border px-2 py-1 text-[11px] text-muted-foreground">{ratio}</span>
          {onClose && imageUrl && !loading && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border p-1.5 text-muted-foreground transition hover:border-primary hover:text-primary"
              aria-label="Clear image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {onExpand && imageUrl && !loading && (
            <button
              type="button"
              onClick={onExpand}
              className="rounded-full border p-1.5 text-muted-foreground transition hover:border-primary hover:text-primary"
              aria-label="Expand image"
              title="Expand"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
          {onDownload && imageUrl && !loading && (
            <button
              type="button"
              onClick={onDownload}
              className="rounded-full border p-1.5 text-muted-foreground transition hover:border-primary hover:text-primary"
              aria-label="Download image"
              title="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="checkerboard flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border p-2">
        <div
          className={cn(
            "relative flex max-h-full min-h-32 w-full max-w-full items-center justify-center overflow-hidden rounded-lg border bg-background/80",
            loading &&
              "animate-shimmer bg-[linear-gradient(90deg,rgba(27,67,44,0.06),rgba(27,67,44,0.14),rgba(27,67,44,0.06))] bg-[length:200%_100%]"
          )}
          style={{ aspectRatio: ratio }}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              {label === "Original" ? "Uploading image..." : "Converting image..."}
            </div>
          ) : imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={`${label} preview`} className="h-full w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
              <ImageIcon className="h-7 w-7" />
              {emptyText}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
