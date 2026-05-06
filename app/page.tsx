"use client";

import { useEffect, useMemo, useState } from "react";
import { Moon, RotateCcw, Sun, X } from "lucide-react";
import { toast } from "sonner";
import { apiUrl, describeApiUnreachable } from "@/lib/client-api";
import { downloadImage } from "@/lib/download-image";
import { useAuth } from "@/lib/auth-context";
import { FittyCanvasLogo } from "@/components/FittyCanvasLogo";
import { ConvertButton } from "@/components/ConvertButton";
import { FormatSelector } from "@/components/FormatSelector";
import { ImagePreviewPanel } from "@/components/ImagePreviewPanel";
import { ImageUploader } from "@/components/ImageUploader";
import { PromptInput } from "@/components/PromptInput";
import { RatioSelector } from "@/components/RatioSelector";
import { ModelSelector } from "@/components/ModelSelector";
import { AuthButton } from "@/components/AuthButton";
import type { AIModel, ConvertResponse, OutputFormat, RatioPreset, UploadedImage } from "@/types";

const RATIO_PRESETS: RatioPreset[] = [
  { label: "Original", description: "Keep source ratio", width: null, height: null },
  { label: "1:1", description: "Square", width: 1, height: 1 },
  { label: "16:9", description: "Landscape", width: 16, height: 9 },
  { label: "9:16", description: "Portrait", width: 9, height: 16 },
  { label: "4:3", description: "Standard", width: 4, height: 3 },
  { label: "3:4", description: "Portrait", width: 3, height: 4 },
  { label: "4:5", description: "Social", width: 4, height: 5 },
  { label: "5:4", description: "Landscape", width: 5, height: 4 },
  { label: "21:9", description: "Cinematic", width: 21, height: 9 },
  { label: "3:2", description: "Camera", width: 3, height: 2 },
  { label: "2:3", description: "Portrait", width: 2, height: 3 },
  { label: "A4", description: "Document", width: 210, height: 297 },
  { label: "Custom", description: "W x H", width: null, height: null }
];

export default function Home() {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState("Original");
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<OutputFormat>("jpg");
  const [quality] = useState(100);
  const [aiModel, setAiModel] = useState<AIModel>("gemini");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const target = useMemo(() => {
    if (selectedRatio === "Original" && uploadedImage) {
      return {
        width: uploadedImage.originalWidth,
        height: uploadedImage.originalHeight,
        label: "Original"
      };
    }

    if (selectedRatio === "Custom") {
      return {
        width: Math.max(1, customWidth || 1),
        height: Math.max(1, customHeight || 1),
        label: `${customWidth}:${customHeight}`
      };
    }

    const preset = RATIO_PRESETS.find((item) => item.label === selectedRatio) ?? RATIO_PRESETS[1];
    const ratioWidth = preset.width ?? 1;
    const ratioHeight = preset.height ?? 1;
    const longEdge = ratioWidth >= ratioHeight ? 1600 : 1000;
    const width = ratioWidth >= ratioHeight ? longEdge : Math.round((longEdge * ratioWidth) / ratioHeight);
    const height = ratioWidth >= ratioHeight ? Math.round((longEdge * ratioHeight) / ratioWidth) : longEdge;

    return { width, height, label: preset.label };
  }, [customHeight, customWidth, selectedRatio, uploadedImage]);

  const originalRatio = uploadedImage ? `${uploadedImage.originalWidth} / ${uploadedImage.originalHeight}` : "1 / 1";
  const outputRatio = `${target.width} / ${target.height}`;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!user) {
      setUploadedImage(null);
      setOutputUrl(null);
    }
  }, [user]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void convert();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  async function convert() {
    if (!uploadedImage || converting) return;

    setConverting(true);
    setOutputUrl(null);
    toast.info("Conversion started");

    let reachedApi = false;
    try {
      const response = await fetch(apiUrl("/api/convert"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: uploadedImage.jobId,
          imageUrl: uploadedImage.originalUrl,
          targetRatio: target.label,
          targetWidth: target.width,
          targetHeight: target.height,
          prompt,
          outputFormat: format,
          quality,
          aiModel
        })
      });
      reachedApi = true;
      const payload = (await readJsonResponse(response)) as ConvertResponse & { error?: string; requestId?: string };

      if (!response.ok) {
        const requestId = payload.requestId ? ` Request ID: ${payload.requestId}.` : "";
        throw new Error((payload.error ?? "Conversion failed.") + requestId);
      }

      setOutputUrl(payload.outputUrl);
      toast.success("Conversion complete");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Conversion failed.";
      const network =
        !reachedApi &&
        (msg.toLowerCase().includes("fetch failed") ||
          msg.toLowerCase().includes("failed to fetch") ||
          msg.toLowerCase().includes("networkerror"));
      toast.error(network ? describeApiUnreachable() : msg);
    } finally {
      setConverting(false);
    }
  }

  function clearOriginalImage() {
    setUploadedImage(null);
    setOutputUrl(null);
    toast.message("Image cleared");
  }

  async function downloadConvertedImage() {
    if (!outputUrl) return;

    try {
      await downloadImage(outputUrl, format, "converted");
      toast.success("Download started");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed.");
    }
  }

  function reset() {
    setUploadedImage(null);
    setOutputUrl(null);
    setPrompt("");
    setSelectedRatio("Original");
    setFormat("jpg");
    toast.message("Canvas reset");
  }

  return (
    <main className="flex h-screen overflow-hidden bg-background text-foreground">
      <div className="flex min-h-0 w-full flex-col">
        <header className="shrink-0 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center gap-3">
              <FittyCanvasLogo />
              <p className="hidden truncate text-xs text-muted-foreground sm:block">AI-powered image resizing</p>
            </div>
            <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
              <a href="/" className="text-foreground transition hover:text-primary">
                Home
              </a>
              {user ? (
                <a href="/history" className="transition hover:text-foreground">
                  History
                </a>
              ) : null}
            </nav>
            <div className="flex items-center gap-2">
              <AuthButton />
              <button
                type="button"
                onClick={() => setDarkMode((value) => !value)}
                className="rounded-[10px] border p-2 transition hover:border-primary hover:text-primary"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </header>

        <div id="home" className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-3 px-4 py-3">
          <div className="shrink-0">
            <p className="text-xs font-medium text-primary">Premium internal image operations</p>
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              Resize, outpaint, enhance, and export images.
            </h1>
          </div>

          {!user ? (
            <section className="grid min-h-0 flex-1 place-items-center rounded-xl border border-dashed bg-muted/30 p-8 text-center">
              <div>
                <h2 className="mb-2 text-2xl font-semibold">Sign in to get started</h2>
                <p className="mb-5 text-sm text-muted-foreground">Upload and convert images with your saved history.</p>
                <AuthButton />
              </div>
            </section>
          ) : (
            <section className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="flex min-h-0 flex-col gap-3 rounded-xl border bg-card p-3">
                <div className="shrink-0">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Upload</h2>
                    <a href="/history" className="text-xs font-medium text-primary transition hover:text-primary/80">
                      Open history
                    </a>
                  </div>
                  <ImageUploader
                    uploadedImage={uploadedImage}
                    onUploaded={(image) => {
                      setUploadedImage(image);
                      setOutputUrl(null);
                    }}
                    onUploadingChange={setUploading}
                  />
                </div>

                <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2">
                  <ImagePreviewPanel
                    label="Original"
                    imageUrl={uploadedImage?.originalUrl}
                    ratio={originalRatio}
                    loading={uploading}
                    emptyText="Upload an image to begin."
                    onClose={clearOriginalImage}
                    onExpand={uploadedImage?.originalUrl ? () => setExpandedImageUrl(uploadedImage.originalUrl) : undefined}
                  />
                  <ImagePreviewPanel
                    label="Converted"
                    imageUrl={outputUrl ?? undefined}
                    ratio={outputRatio}
                    loading={converting}
                    emptyText="Run convert to see output."
                    onDownload={downloadConvertedImage}
                    onExpand={outputUrl ? () => setExpandedImageUrl(outputUrl) : undefined}
                    format={format}
                  />
                </div>
              </div>

              <aside className="flex min-h-0 flex-col gap-3 rounded-xl border bg-card p-3">
                <div className="shrink-0">
                  <h2 className="mb-2 text-sm font-semibold">Output</h2>
                  <RatioSelector
                    presets={RATIO_PRESETS}
                    selectedLabel={selectedRatio}
                    customWidth={customWidth}
                    customHeight={customHeight}
                    onSelect={(label) => {
                      setSelectedRatio(label);
                      setOutputUrl(null);
                    }}
                    onCustomChange={(width, height) => {
                      setCustomWidth(width);
                      setCustomHeight(height);
                      setSelectedRatio("Custom");
                      setOutputUrl(null);
                    }}
                  />
                </div>

                <ModelSelector model={aiModel} onModelChange={setAiModel} />

                <div className="min-h-0">
                  <h2 className="mb-2 text-sm font-semibold">Prompt</h2>
                  <PromptInput value={prompt} onChange={setPrompt} />
                </div>

                <div>
                  <h2 className="mb-2 text-sm font-semibold">Export</h2>
                  <FormatSelector format={format} onFormatChange={setFormat} />
                </div>

                <div className="mt-auto space-y-2">
                  <ConvertButton disabled={!uploadedImage || uploading} loading={converting || uploading} onClick={() => void convert()} />
                  <button
                    type="button"
                    onClick={reset}
                    className="flex w-full items-center justify-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                </div>
              </aside>
            </section>
          )}
        </div>
      </div>
      {expandedImageUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-6 backdrop-blur">
          <div className="absolute right-4 top-4 flex items-center gap-2">
            {expandedImageUrl === outputUrl ? (
              <button
                type="button"
                onClick={() => void downloadConvertedImage()}
                className="rounded-[10px] border bg-card px-4 py-2 text-sm font-semibold transition hover:border-primary hover:text-primary"
              >
                Download
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setExpandedImageUrl(null)}
              className="rounded-[10px] border bg-card p-2 transition hover:border-primary hover:text-primary"
              aria-label="Close expanded image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={expandedImageUrl} alt="Expanded preview" className="max-h-full max-w-full object-contain" />
        </div>
      ) : null}
    </main>
  );
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: `Server returned a non-JSON response (${response.status}). Check the dev-server terminal logs.`
    };
  }
}
