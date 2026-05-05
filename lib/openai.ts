import OpenAI from "openai";

/**
 * OpenAI's latest image generation model is gpt-image-2 (ChatGPT Images 2.0).
 * Released April 2026, it features native reasoning, 2K resolution, improved text rendering,
 * and web search integration.
 * 
 * DALL-E 3 was deprecated on May 12, 2026.
 */
const DEFAULT_OPENAI_MODEL = "gpt-image-2";

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
  
  // Allow gpt-image-2 and its variants
  if (isAllowedOpenAIImageModel(requestedModelId)) return requestedModelId;

  console.warn(
    `[openai] Ignoring OPENAI_MODEL="${requestedModelId}". This app requires gpt-image-2 or compatible model.`
  );
  return DEFAULT_OPENAI_MODEL;
}

function isAllowedOpenAIImageModel(modelId: string) {
  const id = modelId.toLowerCase();
  // Accept gpt-image-2 and its variants
  return id.includes("gpt-image-2") || id.includes("gpt-5") && id.includes("image");
}

/**
 * Generate an image using OpenAI's gpt-image-2 model.
 * This model supports image-to-image editing and generation.
 */
export async function generateImageWithOpenAI(options: {
  prompt: string;
  imageBase64?: string;
  imageMimeType?: string;
  width: number;
  height: number;
}): Promise<Buffer> {
  const client = getOpenAIClient();
  const modelId = getOpenAIModelId();

  // For gpt-image-2, we use the chat completions endpoint with image generation
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  if (options.imageBase64 && options.imageMimeType) {
    // Image editing mode - provide the source image
    messages.push({
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: `data:${options.imageMimeType};base64,${options.imageBase64}`
          }
        },
        {
          type: "text",
          text: options.prompt
        }
      ]
    });
  } else {
    // Text-to-image mode
    messages.push({
      role: "user",
      content: options.prompt
    });
  }

  const response = await client.chat.completions.create({
    model: modelId,
    messages,
    // @ts-ignore - gpt-image-2 specific parameters
    response_format: { type: "image" },
    // @ts-ignore
    image_config: {
      size: determineImageSize(options.width, options.height)
    }
  });

  // Extract the image from the response
  const imageContent = response.choices[0]?.message?.content;
  
  if (!imageContent) {
    throw new Error("OpenAI did not return an image.");
  }

  // The response contains base64 image data
  // Parse the response to extract the image
  let imageData: string;
  
  if (typeof imageContent === "string") {
    // Try to extract base64 data from the response
    const base64Match = imageContent.match(/data:image\/[^;]+;base64,([^"]+)/);
    if (base64Match) {
      imageData = base64Match[1];
    } else {
      // Assume the entire content is base64
      imageData = imageContent;
    }
  } else {
    throw new Error("Unexpected response format from OpenAI.");
  }

  return Buffer.from(imageData, "base64");
}

/**
 * Determine the appropriate image size for OpenAI based on target dimensions.
 * gpt-image-2 supports: 1024x1024, 1024x1792, 1792x1024, and 2K resolutions
 */
function determineImageSize(width: number, height: number): string {
  const aspectRatio = width / height;

  // For 2K generation (if both dimensions are large)
  if (width >= 1536 || height >= 1536) {
    if (Math.abs(aspectRatio - 1) < 0.1) {
      return "2048x2048";
    } else if (aspectRatio > 1) {
      return "2048x1536";
    } else {
      return "1536x2048";
    }
  }

  // Standard sizes
  if (Math.abs(aspectRatio - 1) < 0.1) {
    // Square
    return "1024x1024";
  } else if (aspectRatio > 1) {
    // Landscape
    return "1792x1024";
  } else {
    // Portrait
    return "1024x1792";
  }
}
