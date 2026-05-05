import sharp from "sharp";
import type { OutputFormat } from "@/types";

type ResizeOptions = {
  width: number;
  height: number;
  background?: string;
};

type ConvertOptions = {
  format: OutputFormat;
  quality: number;
  width?: number;
  height?: number;
};

export async function getImageMetadata(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Unable to read image dimensions.");
  }

  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format
  };
}

export async function resizeToCanvas(buffer: Buffer, options: ResizeOptions) {
  const { width, height, background = "#ffffff" } = options;
  const cover = await sharp(buffer)
    .resize(width, height, { fit: "cover", position: "centre" })
    .blur(36)
    .modulate({ brightness: 0.9, saturation: 0.95 })
    .toBuffer();

  const contain = await sharp(buffer)
    .resize(width, height, {
      fit: "contain",
      withoutEnlargement: false,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background
    }
  })
    .composite([
      { input: cover, gravity: "centre" },
      { input: contain, gravity: "centre" }
    ])
    .png()
    .toBuffer();
}

export async function convertImage(buffer: Buffer, options: ConvertOptions) {
  const { format, quality } = options;
  const image = sharp(buffer, { animated: false }).rotate();

  if (format === "jpg") {
    return image.flatten({ background: "#ffffff" }).jpeg({ quality, mozjpeg: true }).toBuffer();
  }

  if (format === "png") {
    return image.png({ compressionLevel: 9 }).toBuffer();
  }

  if (format === "webp") {
    return image.webp({ quality }).toBuffer();
  }

  // Default to JPG
  return image.flatten({ background: "#ffffff" }).jpeg({ quality, mozjpeg: true }).toBuffer();
}

export function getMimeType(format: OutputFormat) {
  const mimeTypes: Record<OutputFormat, string> = {
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp"
  };

  return mimeTypes[format] || "image/jpeg";
}

export function normalizeFormat(format: string | null | undefined): OutputFormat {
  const normalized = String(format ?? "jpg").toLowerCase();
  if (["jpg", "png", "webp"].includes(normalized)) {
    return normalized as OutputFormat;
  }

  return "jpg";
}
