import { NextResponse } from "next/server";
import { extractGeminiImage, getGeminiModel, getGeminiModelId } from "@/lib/gemini";
import { generateImageWithOpenAI, getOpenAIImageCanvasSize, getOpenAIModelId } from "@/lib/openai";
import { createRequestLogger } from "@/lib/server-log";
import { loadImageForConversion } from "@/lib/storage-download";
import { getOutputBucketName, getSupabaseAdminClient, getSupabaseProjectUrl } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import {
  coverToCanvas,
  convertImage,
  createOutpaintCanvas,
  getFastImageCanvasSize,
  getImageMetadata,
  getMimeType,
  normalizeToCanvas,
  normalizeFormat,
} from "@/lib/sharp-utils";
import type { AIModel } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60; // Pro plan supports up to 300s, Hobby is 10s

// If on Vercel Hobby plan, you'll need to upgrade to Pro for longer timeouts
// Or reduce image sizes and use faster models

const DEFAULT_RATIO_PROMPT =
  "Create a complete image at the requested aspect ratio by naturally extending or cropping the scene. Preserve the main subject, identity, style, lighting, colors, and important details. Fill every pixel of the final frame edge-to-edge with realistic matching content from the same image. Do not leave transparent, black, white, blurred, duplicated, letterboxed, pillarboxed, bordered, framed, or empty areas.";

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
  aiModel?: AIModel;
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
    const aiModel = body.aiModel || "gemini";
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
      bytes: sourceBuffer.length,
      aiModel
    });

    const shouldUseAI = Boolean(prompt) || sourceMetadata.width !== targetWidth || sourceMetadata.height !== targetHeight;
    
    let resized: Buffer;
    
    if (shouldUseAI) {
      try {
        const timeoutMs = getGenerationTimeoutMs();
        const generated = await Promise.race([
          resizeWithAI(sourceBuffer, {
            targetRatio: body.targetRatio ?? `${targetWidth}:${targetHeight}`,
            targetWidth,
            targetHeight,
            prompt: [DEFAULT_RATIO_PROMPT, prompt].filter(Boolean).join(" "),
            sourceMime: sourceContentType,
            aiModel,
            log
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`${aiModel} generation timed out after ${timeoutMs}ms. Try a smaller image size or use Sharp-only mode.`)), timeoutMs)
          )
        ]);
        resized = await normalizeToCanvas(generated, {
          width: targetWidth,
          height: targetHeight,
          background: body.background,
          trimDarkBars: true
        });
      } catch (error) {
        log.error(`${aiModel}:generate:error`, error);
        throw new Error(`AI resize failed: ${getErrorMessage(error)}`);
      }
    } else {
      resized = await coverToCanvas(sourceBuffer, {
        width: targetWidth,
        height: targetHeight,
        background: body.background
      });
    }

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

async function resizeWithAI(
  buffer: Buffer,
  options: {
    targetRatio: string;
    targetWidth: number;
    targetHeight: number;
    prompt: string;
    sourceMime: string;
    aiModel: AIModel;
    log: ReturnType<typeof createRequestLogger>;
  }
) {
  if (options.aiModel === "openai") {
    return await resizeWithOpenAI(buffer, options);
  } else {
    return await resizeWithGemini(buffer, options);
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
  const canvasSize = getFastImageCanvasSize(options.targetWidth, options.targetHeight, getAIWorkingLongEdge());
  const outpaint = await createOutpaintCanvas(buffer, canvasSize);
  
  options.log.info("gemini:generate:start", {
    model: getGeminiModelId(),
    sourceMime: "image/png",
    targetWidth: outpaint.width,
    targetHeight: outpaint.height,
    protectedArea: `${outpaint.placedWidth}x${outpaint.placedHeight}`
  });

  const geminiRequest = {
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: outpaint.image.toString("base64")
            }
          },
          {
            text: `The uploaded PNG is a ${outpaint.width}x${outpaint.height} target-ratio canvas. The visible photo must be preserved, and transparent/empty areas must be filled by generating realistic continuation from that same scene. Produce one final image at ${outpaint.width}x${outpaint.height} (${options.targetRatio}) with no borders, no black bars, no white bars, no transparency, and no pasted-photo look. ${options.prompt} Return only the final image.`
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"]
    } as Record<string, unknown>
  };
  const result = await (model.generateContent as (request: unknown) => ReturnType<typeof model.generateContent>)(geminiRequest);

  const image = extractGeminiImage(result);
  options.log.info("gemini:generate:success", { outputBytes: image.length });
  return image;
}

async function resizeWithOpenAI(
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
  const canvasSize = getOpenAIImageCanvasSize(options.targetWidth, options.targetHeight);
  const outpaint = await createOutpaintCanvas(buffer, canvasSize);

  options.log.info("openai:generate:start", {
    model: getOpenAIModelId(),
    sourceMime: "image/png",
    targetWidth: outpaint.width,
    targetHeight: outpaint.height,
    protectedArea: `${outpaint.placedWidth}x${outpaint.placedHeight}`
  });

  const fullPrompt = `The input image is already placed on a ${outpaint.width}x${outpaint.height} target-ratio canvas, and the transparent mask marks the missing areas to generate. Preserve the visible photo and naturally outpaint the masked transparent regions so the final result is a complete ${options.targetRatio} image with no black bars, white bars, borders, blur-fill, or pasted-photo look. ${options.prompt}`;

  const image = await generateImageWithOpenAI({
    prompt: fullPrompt,
    image: outpaint.image,
    mask: outpaint.mask,
    width: outpaint.width,
    height: outpaint.height
  });

  options.log.info("openai:generate:success", { outputBytes: image.length });
  return image;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getAIWorkingLongEdge() {
  const requestedLongEdge = Number(process.env.AI_WORKING_LONG_EDGE);
  if (!Number.isFinite(requestedLongEdge)) return 1024;

  return clamp(Math.round(requestedLongEdge), 512, 1536);
}

function getGenerationTimeoutMs() {
  const requestedTimeoutMs = Number(process.env.AI_GENERATION_TIMEOUT_MS);
  if (!Number.isFinite(requestedTimeoutMs)) return 55000;

  return clamp(Math.round(requestedTimeoutMs), 5000, 295000);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Conversion failed.";
}
