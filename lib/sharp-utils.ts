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
  const { format, quality, width, height } = options;
  const image = sharp(buffer, { animated: false }).rotate();

  if (format === "pdf") {
    const jpeg = await image.jpeg({ quality }).toBuffer();
    const metadata = await getImageMetadata(jpeg);
    return createSingleImagePdf(jpeg, width ?? metadata.width, height ?? metadata.height);
  }

  if (format === "jpg") {
    return image.flatten({ background: "#ffffff" }).jpeg({ quality, mozjpeg: true }).toBuffer();
  }

  if (format === "png") {
    return image.png({ compressionLevel: 9 }).toBuffer();
  }

  if (format === "webp") {
    return image.webp({ quality }).toBuffer();
  }

  if (format === "avif") {
    return image.avif({ quality }).toBuffer();
  }

  return image.tiff({ quality }).toBuffer();
}

export function getMimeType(format: OutputFormat) {
  const mimeTypes: Record<OutputFormat, string> = {
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
    tiff: "image/tiff",
    pdf: "application/pdf"
  };

  return mimeTypes[format];
}

export function normalizeFormat(format: string | null | undefined): OutputFormat {
  const normalized = String(format ?? "jpg").toLowerCase();
  if (["jpg", "png", "webp", "avif", "tiff", "pdf"].includes(normalized)) {
    return normalized as OutputFormat;
  }

  return "jpg";
}

function createSingleImagePdf(jpegBuffer: Buffer, width: number, height: number) {
  const pageWidth = Math.max(1, Math.round(width));
  const pageHeight = Math.max(1, Math.round(height));
  const objects: string[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
  );
  objects.push(
    `<< /Type /XObject /Subtype /Image /Width ${pageWidth} /Height ${pageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBuffer.length} >>\nstream\n${jpegBuffer.toString("binary")}\nendstream`
  );

  const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ`;
  objects.push(`<< /Length ${Buffer.byteLength(content, "binary")} >>\nstream\n${content}\nendstream`);

  const chunks: string[] = ["%PDF-1.4\n"];
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(chunks.join(""), "binary"));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = Buffer.byteLength(chunks.join(""), "binary");
  chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach((offset) => {
    chunks.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  });
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return Buffer.from(chunks.join(""), "binary");
}
