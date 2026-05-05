import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Prompt-based edits need an image-capable model (image -> image).
 * The paid "best" default for this project is Gemini 3 Pro Image Preview.
 * GEMINI_MODEL is only honored for Gemini 3 image model IDs so stale 2.x env
 * values cannot silently downgrade this paid image pipeline.
 */
const DEFAULT_GEMINI_MODEL = "gemini-3-pro-image-preview";

function trimEnv(value: string | undefined) {
  return value?.trim() ?? "";
}

export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  const modelId = getGeminiModelId();

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelId });
}

export function getGeminiModelId() {
  const requestedModelId = trimEnv(process.env.GEMINI_MODEL);
  if (!requestedModelId) return DEFAULT_GEMINI_MODEL;
  if (isAllowedGemini3ImageModel(requestedModelId)) return requestedModelId;

  console.warn(
    `[gemini] Ignoring GEMINI_MODEL="${requestedModelId}". This app is pinned to a Gemini 3 image-output model.`
  );
  return DEFAULT_GEMINI_MODEL;
}

function isAllowedGemini3ImageModel(modelId: string) {
  const id = modelId.toLowerCase();
  return (
    id.startsWith("gemini-3") &&
    (id.includes("image-preview") || id.includes("pro-image") || id.includes("image-generation"))
  );
}

export function extractGeminiImage(result: Awaited<ReturnType<ReturnType<typeof getGeminiModel>["generateContent"]>>) {
  const parts = result.response.candidates?.flatMap((candidate) => candidate.content.parts) ?? [];
  const imagePart = parts.find((part) => "inlineData" in part && part.inlineData?.data);

  if (!imagePart || !("inlineData" in imagePart) || !imagePart.inlineData?.data) {
    const textFallback = parts
      .filter((part): part is { text: string } => "text" in part && typeof (part as { text?: string }).text === "string")
      .map((part) => part.text)
      .join("\n")
      .trim();
    if (textFallback) {
      throw new Error(
        `Gemini returned text instead of an image. Try GEMINI_MODEL=gemini-2.5-flash-image or another image-capable model. Model said: ${textFallback.slice(0, 280)}${textFallback.length > 280 ? "…" : ""}`
      );
    }
    throw new Error(
      "Gemini did not return an image. Use an image-capable model (default: gemini-2.5-flash-image) or leave the prompt empty for Sharp-only resizing."
    );
  }

  return Buffer.from(imagePart.inlineData.data, "base64");
}
