import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Parses Supabase public object URLs:
 * `{origin}/storage/v1/object/public/{bucket}/{path}`
 */
export function parseSupabasePublicStorageUrl(
  imageUrl: string,
  projectBaseUrl: string
): { bucket: string; path: string } | null {
  try {
    const url = new URL(imageUrl.trim());
    const baseStr = projectBaseUrl.trim().replace(/\/$/, "");
    const base = new URL(baseStr.startsWith("http") ? baseStr : `https://${baseStr}`);
    if (url.origin !== base.origin) return null;

    const prefix = "/storage/v1/object/public/";
    if (!url.pathname.startsWith(prefix)) return null;

    const tail = url.pathname.slice(prefix.length);
    const slash = tail.indexOf("/");
    if (slash <= 0 || slash >= tail.length - 1) return null;

    const bucket = tail.slice(0, slash);
    const path = decodeURIComponent(tail.slice(slash + 1));
    return { bucket, path };
  } catch {
    return null;
  }
}

export async function downloadFromSupabaseStorage(
  supabase: SupabaseClient,
  bucket: string,
  path: string
): Promise<{ buffer: Buffer; contentType: string | null }> {
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Empty storage response.");
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const contentType = typeof data.type === "string" && data.type.length > 0 ? data.type : null;

  return { buffer, contentType };
}

function mimeFromUrl(url: string): string | null {
  const lower = url.split("?")[0]?.toLowerCase() ?? "";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".avif")) return "image/avif";
  if (lower.endsWith(".tif") || lower.endsWith(".tiff")) return "image/tiff";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

/** Load image bytes for conversion: prefer Storage API (avoids flaky server-side fetch / private buckets). */
export async function loadImageForConversion(
  supabase: SupabaseClient,
  imageUrl: string,
  projectBaseUrl: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const parsed = parseSupabasePublicStorageUrl(imageUrl, projectBaseUrl);

  if (parsed) {
    try {
      const { buffer, contentType } = await downloadFromSupabaseStorage(supabase, parsed.bucket, parsed.path);
      return {
        buffer,
        contentType: contentType ?? mimeFromUrl(imageUrl) ?? "image/jpeg"
      };
    } catch {
      // Fall through to HTTP fetch (e.g. transient Storage error).
    }
  }

  try {
    const imageResponse = await fetch(imageUrl, {
      redirect: "follow",
      headers: { Accept: "image/*,*/*;q=0.8" }
    });

    if (!imageResponse.ok) {
      throw new Error(`HTTP ${imageResponse.status} when downloading image.`);
    }

    const buf = Buffer.from(await imageResponse.arrayBuffer());
    const headerType = imageResponse.headers.get("content-type");
    const contentType =
      (headerType && headerType.split(";")[0]?.trim()) || mimeFromUrl(imageUrl) || "image/jpeg";

    return { buffer: buf, contentType };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not load source image (${reason}). ` +
        `For Supabase uploads, keep using the URL returned from upload, or check VPN/firewall/DNS.`
    );
  }
}
