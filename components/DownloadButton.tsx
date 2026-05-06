"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { downloadImage } from "@/lib/download-image";
import type { OutputFormat } from "@/types";

type DownloadButtonProps = {
  url: string | null;
  format: OutputFormat;
};

export function DownloadButton({ url, format }: DownloadButtonProps) {
  async function download() {
    if (!url) return;

    try {
      await downloadImage(url, format);
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
