import { NextResponse } from "next/server";
import { createRequestLogger } from "@/lib/server-log";
import { getSupabaseAdminClient, getUploadBucketName } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase-server";
import { getImageMetadata } from "@/lib/sharp-utils";

export const runtime = "nodejs";

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/tiff",
  "image/gif",
  "image/bmp"
]);

const TYPES_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  tif: "image/tiff",
  tiff: "image/tiff",
  gif: "image/gif",
  bmp: "image/bmp"
};

export async function POST(request: Request) {
  const log = createRequestLogger("upload");

  try {
    log.info("request:start");
    
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      log.info("request:unauthorized");
      return NextResponse.json({ error: "Please sign in to upload images." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      log.info("request:missing-file");
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    const resolvedType = resolveImageType(file);

    log.info("file:received", {
      name: file.name,
      type: file.type,
      resolvedType,
      size: file.size
    });

    if (!resolvedType || !ACCEPTED_TYPES.has(resolvedType)) {
      log.info("file:unsupported-type", { type: file.type, name: file.name });
      return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await getImageMetadata(buffer);
    const supabase = getSupabaseAdminClient();
    const uploadBucket = getUploadBucketName();
    const extension = extensionFromFile(file);
    const filename = `${crypto.randomUUID()}.${extension}`;

    log.info("storage:upload:start", {
      bucket: uploadBucket,
      filename,
      width: metadata.width,
      height: metadata.height
    });

    const upload = await supabase.storage
      .from(uploadBucket)
      .upload(filename, buffer, {
        contentType: resolvedType,
        upsert: false
      });

    if (upload.error) {
      log.error("storage:upload:error", upload.error, { bucket: uploadBucket, filename });
      const hint =
        upload.error.message?.includes("Bucket not found") || upload.error.message?.includes("not found")
          ? ` Create bucket "${uploadBucket}" in Supabase Storage (or set SUPABASE_STORAGE_BUCKET_UPLOADS in .env.local).`
          : "";
      return NextResponse.json({ error: upload.error.message + hint }, { status: 500 });
    }

    const { data: publicData } = supabase.storage.from(uploadBucket).getPublicUrl(filename);
    const originalUrl = publicData.publicUrl;

    log.info("db:image_jobs:insert:start", { bucket: uploadBucket, filename });

    const insert = await supabase
      .from("image_jobs")
      .insert({
        original_url: originalUrl,
        original_width: metadata.width,
        original_height: metadata.height,
        status: "pending",
        user_id: user.id
      })
      .select("id")
      .single();

    if (insert.error) {
      log.error("db:image_jobs:insert:error", insert.error);
      return NextResponse.json({ error: insert.error.message }, { status: 500 });
    }

    log.info("request:success", {
      jobId: insert.data.id,
      width: metadata.width,
      height: metadata.height
    });

    return NextResponse.json({
      jobId: insert.data.id,
      originalUrl,
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      fileName: file.name,
      fileSize: file.size
    });
  } catch (error) {
    log.error("request:error", error);
    return NextResponse.json({ error: getErrorMessage(error), requestId: log.id }, { status: 500 });
  }
}

function extensionFromFile(file: File) {
  const byType = Object.fromEntries(Object.entries(TYPES_BY_EXTENSION).map(([extension, type]) => [type, extension]));

  return byType[resolveImageType(file) ?? ""] ?? file.name.split(".").pop()?.toLowerCase() ?? "jpg";
}

function resolveImageType(file: File) {
  if (file.type) return file.type.toLowerCase();

  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension ? TYPES_BY_EXTENSION[extension] : undefined;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Upload failed.";
}
