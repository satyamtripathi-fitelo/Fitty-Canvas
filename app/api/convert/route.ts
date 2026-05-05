import { NextResponse } from "next/server";
import { extractGeminiImage, getGeminiModel, getGeminiModelId } from "@/lib/gemini";
import { createRequestLogger } from "@/lib/server-log";
import { loadImageForConversion } from "@/lib/storage-download";
import { getOutputBucketName, getSupabaseAdminClient, getSupabaseProjectUrl } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  convertImage,
  getImageMetadata,
  getMimeType,
  normalizeFormat,
  resizeToCanvas
} from "@/lib/sharp-utils";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_RATIO_PROMPT =
  "Change the image to the requested aspect ratio by naturally extending or cropping the scene. Preserve the main subject, style, lighting, colors, and important details. Fill any new canvas areas realistically with matching background content. Do not add borders, letterboxing, black bars, text, watermarks, or frames.";

type ConvertRequest = {
  jobId?: string;
  imageUrl?: string;
  targetRatio?: string;
  targetWidth?: number;
  targetHeight?: number;
  prompt?: string;
  outputFormat?: string;
  quality?: number;
  background?: string;
};

export async function POST(request: Request) {
  const log = createRequestLogger("convert");
  let jobId: string | undefined;
  let userId: string | undefined;

  try {
    const supabaseAuth = await getSupabaseServerClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    if (!user) {
      log.info("request:unauthorized");
      return NextResponse.json({ error: "Please sign in to convert images." }, { status: 401 });
    }
    userId = user.id;

    const body = (await request.json()) as ConvertRequest;
    jobId = body.jobId;

    log.info("request:start", {
      jobId,
      targetRatio: body.targetRatio,
      targetWidth: body.targetWidth,
      targetHeight: body.targetHeight,
      outputFormat: body.outputFormat,
      hasPrompt: Boolean(body.prompt?.trim())
    });

    if (!body.imageUrl) {
      log.info("request:missing-image-url");
      return NextResponse.json({ error: "imageUrl is required." }, { status: 400 });
    }

    const targetWidth = Math.max(1, Math.round(Number(body.targetWidth)));
    const targetHeight = Math.max(1, Math.round(Number(body.targetHeight)));

    if (!Number.isFinite(targetWidth) || !Number.isFinite(targetHeight)) {
      log.info("request:invalid-dimensions", { targetWidth: body.targetWidth, targetHeight: body.targetHeight });
      return NextResponse.json({ error: "Valid target dimensions are required." }, { status: 400 });
    }

    const outputFormat = normalizeFormat(body.outputFormat);
    const quality = clamp(Number(body.quality) || 90, 10, 100);
    const prompt = body.prompt?.trim() ?? "";
    const supabase = getSupabaseAdminClient();

    if (jobId) {
      await supabase.from("image_jobs").update({ status: "processing" }).eq("id", jobId).eq("user_id", user.id);
    }

    const projectUrl = getSupabaseProjectUrl();
    log.info("source:load:start");
    const { buffer: sourceBuffer, contentType: sourceContentType } = await loadImageForConversion(
      supabase,
      body.imageUrl,
      projectUrl
    );

    const sourceMetadata = await getImageMetadata(sourceBuffer);
    log.info("source:load:success", {
      contentType: sourceContentType,
      width: sourceMetadata.width,
      height: sourceMetadata.height,
      bytes: sourceBuffer.length
    });

    const shouldUseGemini = Boolean(prompt) || sourceMetadata.width !== targetWidth || sourceMetadata.height !== targetHeight;
    const resized = shouldUseGemini
      ? await resizeWithGemini(sourceBuffer, {
          targetRatio: body.targetRatio ?? `${targetWidth}:${targetHeight}`,
          targetWidth,
          targetHeight,
          prompt: [DEFAULT_RATIO_PROMPT, prompt].filter(Boolean).join(" "),
          sourceMime: sourceContentType,
          log
        }).catch((error) => {
          log.error("gemini:generate:error", error);
          return resizeToCanvas(sourceBuffer, {
            width: targetWidth,
            height: targetHeight,
            background: body.background
          });
        })
      : await resizeToCanvas(sourceBuffer, {
          width: targetWidth,
          height: targetHeight,
          background: body.background
        });

    const outputBuffer = await convertImage(resized, {
      format: outputFormat,
      quality,
      width: targetWidth,
      height: targetHeight
    });
    const extension = outputFormat === "jpg" ? "jpg" : outputFormat;
    const filename = `${crypto.randomUUID()}.${extension}`;
    const outputBucket = getOutputBucketName();
    log.info("storage:output-upload:start", {
      bucket: outputBucket,
      filename,
      format: outputFormat,
      bytes: outputBuffer.length
    });

    const upload = await supabase.storage.from(outputBucket).upload(filename, outputBuffer, {
      contentType: getMimeType(outputFormat),
      upsert: false
    });

    if (upload.error) {
      log.error("storage:output-upload:error", upload.error, { bucket: outputBucket, filename });
      const hint =
        upload.error.message?.includes("Bucket not found") || upload.error.message?.includes("not found")
          ? ` Create bucket "${outputBucket}" in Supabase Storage (or set SUPABASE_STORAGE_BUCKET_OUTPUTS in .env.local).`
          : "";
      throw new Error(upload.error.message + hint);
    }

    const { data: publicData } = supabase.storage.from(outputBucket).getPublicUrl(filename);
    const outputUrl = publicData.publicUrl;

    if (jobId) {
      const update = await supabase
        .from("image_jobs")
        .update({
          output_url: outputUrl,
          original_width: sourceMetadata.width,
          original_height: sourceMetadata.height,
          target_ratio: body.targetRatio,
          target_width: targetWidth,
          target_height: targetHeight,
          prompt: prompt || null,
          output_format: outputFormat,
          status: "done"
        })
        .eq("id", jobId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (update.error) {
        throw new Error(`Unable to save conversion history: ${update.error.message}`);
      }

      if (!update.data) {
        const insert = await supabase
          .from("image_jobs")
          .insert({
            original_url: body.imageUrl,
            output_url: outputUrl,
            original_width: sourceMetadata.width,
            original_height: sourceMetadata.height,
            target_ratio: body.targetRatio,
            target_width: targetWidth,
            target_height: targetHeight,
            prompt: prompt || null,
            output_format: outputFormat,
            status: "done",
            user_id: user.id
          })
          .select("id")
          .single();

        if (insert.error) {
          throw new Error(`Unable to save conversion history: ${insert.error.message}`);
        }
        jobId = insert.data?.id;
      }
    } else {
      const insert = await supabase
        .from("image_jobs")
        .insert({
          original_url: body.imageUrl,
          output_url: outputUrl,
          original_width: sourceMetadata.width,
          original_height: sourceMetadata.height,
          target_ratio: body.targetRatio,
          target_width: targetWidth,
          target_height: targetHeight,
          prompt: prompt || null,
          output_format: outputFormat,
          status: "done",
          user_id: user.id
        })
        .select("id")
        .single();
      if (insert.error) {
        throw new Error(`Unable to save conversion history: ${insert.error.message}`);
      }
      jobId = insert.data?.id;
    }

    log.info("request:success", {
      jobId,
      outputBucket,
      filename,
      width: targetWidth,
      height: targetHeight
    });

    return NextResponse.json({
      outputUrl,
      width: targetWidth,
      height: targetHeight,
      format: outputFormat,
      jobId
    });
  } catch (error) {
    log.error("request:error", error, { jobId });
    if (jobId && userId) {
      try {
        const supabase = getSupabaseAdminClient();
        await supabase.from("image_jobs").update({ status: "error" }).eq("id", jobId).eq("user_id", userId);
      } catch {
        // Preserve the original conversion error for the response.
      }
    }

    return NextResponse.json({ error: getErrorMessage(error), requestId: log.id }, { status: 500 });
  }
}

async function resizeWithGemini(
  buffer: Buffer,
  options: {
    targetRatio: string;
    targetWidth: number;
    targetHeight: number;
    prompt: string;
    sourceMime: string;
    log: ReturnType<typeof createRequestLogger>;
  }
) {
  const model = getGeminiModel();
  options.log.info("gemini:generate:start", {
    model: getGeminiModelId(),
    sourceMime: options.sourceMime,
    targetWidth: options.targetWidth,
    targetHeight: options.targetHeight
  });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: options.sourceMime,
        data: buffer.toString("base64")
      }
    },
    {
      text: `Resize this image to ${options.targetWidth}x${options.targetHeight} (${options.targetRatio}) aspect ratio. ${options.prompt} Return only the modified image.`
    }
  ]);

  const image = extractGeminiImage(result);
  options.log.info("gemini:generate:success", { outputBytes: image.length });
  return image;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Conversion failed.";
}
