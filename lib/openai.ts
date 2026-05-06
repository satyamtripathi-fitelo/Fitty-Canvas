import OpenAI, { toFile } from "openai";

const DEFAULT_OPENAI_MODEL = "gpt-image-1.5";
const DEFAULT_OPENAI_QUALITY = "low";

type OpenAIImageSize = "1024x1024" | "1536x1024" | "1024x1536";
type OpenAIImageQuality = "low" | "medium" | "high" | "auto";

function trimEnv(value: string | undefined) {
  return value?.trim() ?? "";
}

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  return new OpenAI({ apiKey });
}

export function getOpenAIModelId() {
  const requestedModelId = trimEnv(process.env.OPENAI_MODEL);
  if (!requestedModelId) return DEFAULT_OPENAI_MODEL;

  if (isAllowedOpenAIImageModel(requestedModelId)) return requestedModelId;

  console.warn(
    `[openai] Ignoring OPENAI_MODEL="${requestedModelId}". Use a GPT Image model such as gpt-image-1.5, gpt-image-1, or gpt-image-1-mini.`
  );
  return DEFAULT_OPENAI_MODEL;
}

export function getOpenAIImageCanvasSize(width: number, height: number) {
  const size = determineImageSize(width, height);
  const [canvasWidth, canvasHeight] = size.split("x").map(Number);

  return {
    width: canvasWidth,
    height: canvasHeight,
    size
  };
}

export async function generateImageWithOpenAI(options: {
  prompt: string;
  image: Buffer;
  mask: Buffer;
  width: number;
  height: number;
}): Promise<Buffer> {
  const client = getOpenAIClient();
  const modelId = getOpenAIModelId();
  const size = determineImageSize(options.width, options.height);
  const quality = getOpenAIImageQuality();

  const response = await client.images.edit({
    model: modelId,
    image: await toFile(options.image, "outpaint-input.png", { type: "image/png" }),
    mask: await toFile(options.mask, "outpaint-mask.png", { type: "image/png" }),
    prompt: options.prompt,
    size,
    quality,
    input_fidelity: modelId.includes("mini") ? "low" : "high",
    output_format: "png",
    n: 1
  });

  const imageData = response.data?.[0]?.b64_json;

  if (!imageData) {
    throw new Error("OpenAI did not return an image.");
  }

  return Buffer.from(imageData, "base64");
}

function isAllowedOpenAIImageModel(modelId: string) {
  const id = modelId.toLowerCase();
  return id === "gpt-image-1.5" || id === "gpt-image-1" || id === "gpt-image-1-mini" || id === "chatgpt-image-latest";
}

function getOpenAIImageQuality(): OpenAIImageQuality {
  const requestedQuality = trimEnv(process.env.OPENAI_IMAGE_QUALITY).toLowerCase();
  if (requestedQuality === "medium" || requestedQuality === "high" || requestedQuality === "auto") {
    return requestedQuality;
  }

  return DEFAULT_OPENAI_QUALITY;
}

function determineImageSize(width: number, height: number): OpenAIImageSize {
  const aspectRatio = width / height;

  if (Math.abs(aspectRatio - 1) < 0.08) {
    return "1024x1024";
  }

  return aspectRatio > 1 ? "1536x1024" : "1024x1536";
}
