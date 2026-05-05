"use client";

import { useEffect, useMemo, useState } from "react";
import { Moon, RotateCcw, Sun } from "lucide-react";
import { toast } from "sonner";
import { apiUrl, describeApiUnreachable } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { FittyCanvasLogo } from "@/components/FittyCanvasLogo";
import { ConvertButton } from "@/components/ConvertButton";
import { DownloadButton } from "@/components/DownloadButton";
import { FormatSelector } from "@/components/FormatSelector";
import { ImagePreviewPanel } from "@/components/ImagePreviewPanel";
import { ImageUploader } from "@/components/ImageUploader";
import { PromptInput } from "@/components/PromptInput";
import { RatioSelector } from "@/components/RatioSelector";
import { ModelSelector } from "@/components/ModelSelector";
import { AuthButton } from "@/components/AuthButton";
import type { ConvertResponse, ImageJob, OutputFormat, AIModel, RatioPreset, UploadedImage } from "@/types";

const RATIO_PRESETS: RatioPreset[] = [
  { label: "Original", description: "Keep source ratio", width: null, height: null },
  { label: "1:1", description: "Square", width: 1, height: 1 },
  { label: "16:9", description: "Landscape", width: 16, height: 9 },
  { label: "9:16", description: "Portrait", width: 9, height: 16 },
  { label: "4:3", description: "Standard Photo", width: 4, height: 3 },
  { label: "3:4", description: "Portrait Photo", width: 3, height: 4 },
  { label: "4:5", description: "Instagram Portrait", width: 4, height: 5 },
  { label: "5:4", description: "Instagram Landscape", width: 5, height: 4 },
  { label: "21:9", description: "Cinematic", width: 21, height: 9 },
  { label: "3:2", description: "Classic Camera", width: 3, height: 2 },
  { label: "2:3", description: "Classic Portrait", width: 2, height: 3 },
  { label: "A4", description: "Document", width: 210, height: 297 },
  { label: "Custom", description: "W x H", width: null, height: null }
];

export default function Home() {
  const { user, session } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState("Original");
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<OutputFormat>("jpg");
  const [quality, setQuality] = useState(90);
  const [aiModel, setAiModel] = useState<AIModel>("gemini");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [history, setHistory] = useState<ImageJob[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
    const longEdge = ratioWidth >= ratioHeight ? 1920 : 1080;
    const width = ratioWidth >= ratioHeight ? longEdge : Math.round((longEdge * ratioWidth) / ratioHeight);
    const height = ratioWidth >= ratioHeight ? Math.round((longEdge * ratioHeight) / ratioWidth) : longEdge;

    return { width, height, label: preset.label };
  }, [customHeight, customWidth, selectedRatio, uploadedImage]);

  const originalRatio = uploadedImage ? `${uploadedImage.originalWidth} / ${uploadedImage.originalHeight}` : "1 / 1";
  const outputRatio = `${target.width} / ${target.height}`;
  const showConvertedPreview = converting || Boolean(outputUrl);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (user) {
      void refreshHistory(true);
    } else {
      setHistory([]);
      setHistoryPage(1);
      setHasMoreHistory(false);
      // Clear uploaded image and output when user signs out
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

  async function refreshHistory(reset = false, pageOverride?: number) {
    if (!user) return;
    
    setLoadingHistory(true);
    const page = pageOverride ?? (reset ? 1 : historyPage);
    
    try {
      const response = await fetch(apiUrl(`/api/history?page=${page}&limit=10`), { 
        headers: getAuthHeaders(session?.access_token),
        cache: "no-store" 
      });
      const payload = await response.json();
      
      if (response.ok) {
        if (reset) {
          setHistory(payload.jobs ?? []);
          setHistoryPage(1);
        } else {
          setHistory((prev) => [...prev, ...(payload.jobs ?? [])]);
          setHistoryPage(page);
        }
        setHasMoreHistory(payload.hasMore ?? false);
      } else if (response.status === 401) {
        // User not authenticated
        setHistory([]);
        setHasMoreHistory(false);
      }
    } catch {
      if (reset) {
        setHistory([]);
      }
    } finally {
      setLoadingHistory(false);
    }
  }

  async function loadMoreHistory() {
    const nextPage = historyPage + 1;
    await refreshHistory(false, nextPage);
  }

  async function convert() {
    if (!uploadedImage || converting) return;

    setConverting(true);
    setOutputUrl(null);
    toast.info("Conversion started");

    let reachedApi = false;
    try {
      const response = await fetch(apiUrl("/api/convert"), {
        method: "POST",
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
      void refreshHistory(true);
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

  function downloadConvertedImage() {
    if (!outputUrl) return;
    
    const link = document.createElement('a');
    link.href = outputUrl;
    link.download = `converted-${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started");
  }

  function reset() {
    setUploadedImage(null);
    setOutputUrl(null);
    setPrompt("");
    setSelectedRatio("Original");
    setFormat("jpg");
    setQuality(90);
    toast.message("Canvas reset");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-4">
            <FittyCanvasLogo />
            <p className="max-w-xs text-xs leading-snug text-muted-foreground sm:pb-1">
              AI-powered image resizing &amp; enhancement
            </p>
          </div>
          <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
            <a href="#home" className="transition hover:text-foreground">
              Home
            </a>
            {user && (
              <a href="#history" className="transition hover:text-foreground">
                History
              </a>
            )}
          </nav>
          <div className="flex items-center gap-3">
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

      <div id="home" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-sm font-medium text-primary">Premium internal image operations</p>
          <h1 className="text-[28px] font-semibold tracking-tight sm:text-4xl">
            Resize, outpaint, enhance, and export images in one focused workspace.
          </h1>
        </div>

        {user && uploadedImage ? (
          <div
            className={cn(
              "grid gap-6",
              showConvertedPreview ? "lg:grid-cols-2" : "lg:grid-cols-1 lg:max-w-3xl"
            )}
          >
            <ImagePreviewPanel
              label="Original"
              imageUrl={uploadedImage.originalUrl}
              ratio={originalRatio}
              emptyText="Upload an image to begin."
              onClose={clearOriginalImage}
            />
            {showConvertedPreview ? (
              <ImagePreviewPanel
                label="Converted"
                imageUrl={outputUrl ?? undefined}
                ratio={outputRatio}
                loading={converting}
                emptyText="Run convert to see output."
                onDownload={downloadConvertedImage}
                format={format}
              />
            ) : null}
          </div>
        ) : null}

        {!user ? (
          <section className="mt-6">
            <div className="rounded-2xl border border-dashed bg-muted/30 p-12 text-center">
              <h2 className="mb-3 text-2xl font-semibold">Sign in to get started</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                You need to sign in with Google to upload and convert images
              </p>
              <AuthButton />
            </div>
          </section>
        ) : (
          <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="mb-4 text-xl font-semibold">Original Image</h2>
              <ImageUploader
                uploadedImage={uploadedImage}
                accessToken={session?.access_token}
                onUploaded={(image) => {
                  setUploadedImage(image);
                  setOutputUrl(null);
                }}
                onUploadingChange={setUploading}
              />
            </div>

            <aside className="space-y-5 rounded-2xl border bg-card p-5">
              <div>
                <h2 className="mb-3 text-xl font-semibold">Output Settings</h2>
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

              <div>
                <h2 className="mb-3 text-xl font-semibold">AI Model</h2>
                <ModelSelector model={aiModel} onModelChange={setAiModel} />
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold">Prompt</h2>
                <PromptInput value={prompt} onChange={setPrompt} />
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold">Export</h2>
                <FormatSelector format={format} quality={quality} onFormatChange={setFormat} onQualityChange={setQuality} />
              </div>

              <div className="space-y-3">
                <ConvertButton disabled={!uploadedImage || uploading} loading={converting || uploading} onClick={() => void convert()} />
                <DownloadButton url={outputUrl} format={format} />
                <button
                  type="button"
                  onClick={reset}
                  className="flex w-full items-center justify-center gap-2 rounded-[10px] px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </aside>
          </section>
        )}

        <section id="history" className="mt-8 rounded-2xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Your History</h2>
            {user && history.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {history.length} image{history.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {!user ? (
            <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Sign in with Google to view your conversion history
              </p>
              <AuthButton />
            </div>
          ) : history.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {history.map((item) => (
                  <a
                    key={item.id}
                    href={item.output_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-xl border bg-background p-2 transition hover:border-primary"
                  >
                    <div className="checkerboard flex aspect-square items-center justify-center overflow-hidden rounded-lg">
                      {item.output_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={item.output_url} 
                          alt="Converted history thumbnail" 
                          className="h-full w-full object-cover" 
                        />
                      ) : null}
                    </div>
                    <div className="mt-2 truncate text-xs font-medium">
                      {item.target_ratio ?? "Converted"}
                    </div>
                    <div className="text-xs uppercase text-muted-foreground">
                      {item.output_format ?? "image"}
                    </div>
                  </a>
                ))}
              </div>
              {hasMoreHistory && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void loadMoreHistory()}
                    disabled={loadingHistory}
                    className="rounded-[10px] border px-6 py-2 text-sm font-medium transition hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    {loadingHistory ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No images yet. Upload and convert your first image to see it here!
              </p>
            </div>
          )}
        </section>
      </div>
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

function getAuthHeaders(accessToken: string | undefined, headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);

  if (accessToken) {
    nextHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  return nextHeaders;
}
