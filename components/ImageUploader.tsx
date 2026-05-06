"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { apiUrl, describeApiUnreachable } from "@/lib/client-api";
import { cn, formatBytes } from "@/lib/utils";
import type { UploadedImage } from "@/types";

type ImageUploaderProps = {
  uploadedImage: UploadedImage | null;
  onUploaded: (image: UploadedImage) => void;
  onUploadingChange: (uploading: boolean) => void;
};

const ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
const FORMATS = ["JPG", "PNG", "WEBP"];

export function ImageUploader({ uploadedImage, onUploaded, onUploadingChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    onUploadingChange(true);
    let reachedApi = false;
    try {
      const response = await fetch(apiUrl("/api/upload"), {
        method: "POST",
        credentials: "include", // Include cookies for authentication
        body: formData
      });
      reachedApi = true;
      const payload = (await readJsonResponse(response)) as Partial<UploadedImage> & { error?: string; requestId?: string };

      if (!response.ok) {
        const requestId = payload.requestId ? ` Request ID: ${payload.requestId}.` : "";
        throw new Error((payload.error ?? "Upload failed.") + requestId);
      }

      onUploaded(payload as UploadedImage);
      toast.success("Upload complete");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Upload failed.";
      const network =
        !reachedApi &&
        (msg.toLowerCase().includes("fetch failed") ||
          msg.toLowerCase().includes("failed to fetch") ||
          msg.toLowerCase().includes("networkerror"));
      toast.error(network ? describeApiUnreachable() : msg);
    } finally {
      onUploadingChange(false);
    }
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    void handleFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center transition",
          dragging ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/70"
        )}
      >
        <input ref={inputRef} type="file" accept={ACCEPT} onChange={handleInput} className="hidden" />
        <UploadCloud className="mb-2 h-7 w-7 text-primary" />
        <p className="text-sm font-semibold">Drop your image here</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          {FORMATS.map((format) => (
            <span key={format} className="rounded-full border bg-background px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              {format}
            </span>
          ))}
        </div>
      </div>

      {uploadedImage ? (
        <div className="mt-2 rounded-xl border bg-background/60 p-3 text-xs">
          <div className="truncate font-medium">{uploadedImage.fileName}</div>
          <div className="mt-1 truncate text-muted-foreground">
            {uploadedImage.originalWidth} x {uploadedImage.originalHeight} px · {formatBytes(uploadedImage.fileSize)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as { error?: string; requestId?: string };
  } catch {
    return {
      error: `Server returned a non-JSON response (${response.status}). Check the dev-server terminal logs.`
    };
  }
}
