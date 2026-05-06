"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import type { OutputFormat } from "@/types";

type DownloadButtonProps = {
  url: string | null;
  format: OutputFormat;
};

export function DownloadButton({ url, format }: DownloadButtonProps) {
  async function download() {
    if (!url) return;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Unable to fetch output file.");

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `fitty-canvas-${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed.");
    }
  }

  if (!url) return null;

  return (
    <button
      type="button"
      onClick={download}
      className="flex w-full items-center justify-center gap-2 rounded-[10px] border px-4 py-2.5 text-sm font-semibold transition hover:border-primary hover:text-primary"
    >
      <Download className="h-4 w-4" />
      Download
    </button>
  );
}
