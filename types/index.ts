export type OutputFormat = "jpg" | "png" | "webp";

export type AIModel = "gemini" | "openai";

export type RatioPreset = {
  label: string;
  description: string;
  width: number | null;
  height: number | null;
};

export type GenerationUsage = {
  provider: AIModel;
  model: string;
  totalTokens: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  inputTextTokens?: number | null;
  inputImageTokens?: number | null;
  outputTextTokens?: number | null;
  outputImageTokens?: number | null;
  cachedTokens?: number | null;
  raw?: unknown;
};

export type UploadedImage = {
  jobId: string;
  originalUrl: string;
  originalWidth: number;
  originalHeight: number;
  fileName: string;
  fileSize: number;
};

export type ImageJob = {
  id: string;
  original_url: string;
  output_url: string | null;
  original_width: number | null;
  original_height: number | null;
  target_ratio: string | null;
  target_width: number | null;
  target_height: number | null;
  prompt: string | null;
  output_format: string | null;
  ai_model?: string | null;
  usage_total_tokens?: number | null;
  usage_input_tokens?: number | null;
  usage_output_tokens?: number | null;
  usage_input_text_tokens?: number | null;
  usage_input_image_tokens?: number | null;
  usage_output_text_tokens?: number | null;
  usage_output_image_tokens?: number | null;
  usage_cached_tokens?: number | null;
  usage_raw?: unknown;
  status: "pending" | "processing" | "done" | "error";
  created_at: string;
};

export type ConvertResponse = {
  outputUrl: string;
  width: number;
  height: number;
  format: OutputFormat;
  jobId?: string;
  usage?: GenerationUsage | null;
};
