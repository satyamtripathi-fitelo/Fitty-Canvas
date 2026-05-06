import sharp from "sharp";
import type { OutputFormat } from "@/types";

type ResizeOptions = {
  width: number;
  height: number;
  background?: string;
};

type NormalizeOptions = ResizeOptions & {
  trimDarkBars?: boolean;
};

type CanvasSize = {
  width: number;
  height: number;
};

type OutpaintCanvas = CanvasSize & {
  image: Buffer;
  mask: Buffer;
  placedWidth: number;
  placedHeight: number;
  left: number;
  top: number;
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
    .rotate()
    .resize(width, height, { fit: "cover", position: "centre" })
    .blur(36)
    .modulate({ brightness: 0.9, saturation: 0.95 })
    .toBuffer();

  const contain = await sharp(buffer)
    .rotate()
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

export async function coverToCanvas(buffer: Buffer, options: ResizeOptions) {
  return sharp(buffer)
    .rotate()
    .resize(options.width, options.height, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
}

export async function normalizeToCanvas(buffer: Buffer, options: NormalizeOptions) {
  const source = options.trimDarkBars ? await trimNearBlackBars(buffer) : buffer;
  return coverToCanvas(source, options);
}

export async function createOutpaintCanvas(buffer: Buffer, size: CanvasSize): Promise<OutpaintCanvas> {
  const normalized = await sharp(buffer).rotate().png().toBuffer({ resolveWithObject: true });
  const scale = Math.min(size.width / normalized.info.width, size.height / normalized.info.height);
  const placedWidth = Math.max(1, Math.round(normalized.info.width * scale));
  const placedHeight = Math.max(1, Math.round(normalized.info.height * scale));
  const left = Math.round((size.width - placedWidth) / 2);
  const top = Math.round((size.height - placedHeight) / 2);
  const placedImage = await sharp(normalized.data).resize(placedWidth, placedHeight).png().toBuffer();
  const protectedMaskArea = await sharp({
    create: {
      width: placedWidth,
      height: placedHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .png()
    .toBuffer();

  const image = await sharp({
    create: {
      width: size.width,
      height: size.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: placedImage, left, top }])
    .png()
    .toBuffer();

  const mask = await sharp({
    create: {
      width: size.width,
      height: size.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: protectedMaskArea, left, top }])
    .png()
    .toBuffer();

  return {
    image,
    mask,
    width: size.width,
    height: size.height,
    placedWidth,
    placedHeight,
    left,
    top
  };
}

export function getFastImageCanvasSize(width: number, height: number, maxLongEdge = 1024): CanvasSize {
  const aspectRatio = width / height;

  if (aspectRatio >= 1) {
    return {
      width: maxLongEdge,
      height: Math.max(1, Math.round(maxLongEdge / aspectRatio))
    };
  }

  return {
    width: Math.max(1, Math.round(maxLongEdge * aspectRatio)),
    height: maxLongEdge
  };
}

async function trimNearBlackBars(buffer: Buffer) {
  const original = await sharp(buffer).rotate().metadata();
  if (!original.width || !original.height) return buffer;

  const { data, info } = await sharp(buffer)
    .rotate()
    .trim({ background: "#000000", threshold: 14 })
    .png()
    .toBuffer({ resolveWithObject: true });

  const removedWidth = original.width - info.width;
  const removedHeight = original.height - info.height;
  const removedMeaningfulBorder = removedWidth >= Math.max(4, original.width * 0.015) || removedHeight >= Math.max(4, original.height * 0.015);
  const retainedEnoughImage = info.width >= original.width * 0.35 && info.height >= original.height * 0.35;

  return removedMeaningfulBorder && retainedEnoughImage ? data : buffer;
}

export async function convertImage(buffer: Buffer, options: ConvertOptions) {
  const { format, quality } = options;
  const image =
    options.width && options.height
      ? sharp(buffer, { animated: false }).rotate().resize(options.width, options.height, { fit: "cover", position: "centre" })
      : sharp(buffer, { animated: false }).rotate();

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
