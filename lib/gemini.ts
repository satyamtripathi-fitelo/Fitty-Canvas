import { GoogleGenerativeAI } from "@google/generative-ai";

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
  
  // Allow any Gemini image-capable model
  if (isAllowedGeminiImageModel(requestedModelId)) return requestedModelId;

  console.warn(
    `[gemini] Ignoring GEMINI_MODEL="${requestedModelId}". This app requires an image-capable Gemini model.`
  );
  return DEFAULT_GEMINI_MODEL;
}

function isAllowedGeminiImageModel(modelId: string) {
  const id = modelId.toLowerCase();
  // Accept Gemini 2.x and 3.x image models
  return (
    (id.startsWith("gemini-2") || id.startsWith("gemini-3")) &&
    (id.includes("image") || id.includes("flash-image") || id.includes("pro-image"))
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
