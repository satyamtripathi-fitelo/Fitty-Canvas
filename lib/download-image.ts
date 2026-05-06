import type { OutputFormat } from "@/types";

export async function downloadImage(url: string, format: OutputFormat, name = "fitty-canvas") {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to fetch output file.");

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `${name}-${Date.now()}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}
