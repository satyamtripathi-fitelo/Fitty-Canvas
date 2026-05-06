"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { AuthButton } from "@/components/AuthButton";
import { FittyCanvasLogo } from "@/components/FittyCanvasLogo";
import { apiUrl } from "@/lib/client-api";
import { useAuth } from "@/lib/auth-context";
import type { ImageJob } from "@/types";

const PAGE_SIZE = 5;
const MAX_HISTORY = 40;

export default function HistoryPage() {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (user) {
      void loadHistory(1, true);
    } else {
      setJobs([]);
      setPage(1);
      setHasMore(false);
    }
  }, [user]);

  async function loadHistory(nextPage: number, reset = false) {
    if (!user || loading) return;

    setLoading(true);
    try {
      const response = await fetch(apiUrl(`/api/history?page=${nextPage}&limit=${PAGE_SIZE}`), {
        credentials: "include",
        cache: "no-store"
      });
      const payload = (await response.json()) as { jobs?: ImageJob[]; hasMore?: boolean; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load history.");
      }

      const incoming = payload.jobs ?? [];
      setJobs((current) => (reset ? incoming : [...current, ...incoming]).slice(0, MAX_HISTORY));
      setPage(nextPage);
      setHasMore(Boolean(payload.hasMore) && nextPage * PAGE_SIZE < MAX_HISTORY);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load history.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-4">
            <FittyCanvasLogo />
            <a href="/" className="flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Workspace
            </a>
          </div>
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

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-primary">Saved outputs</p>
            <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          </div>
          {user ? <span className="text-xs text-muted-foreground">{jobs.length}/{MAX_HISTORY} images</span> : null}
        </div>

        {!user ? (
          <section className="rounded-xl border border-dashed bg-muted/30 p-10 text-center">
            <p className="mb-4 text-sm text-muted-foreground">Sign in with Google to view your conversion history.</p>
            <AuthButton />
          </section>
        ) : jobs.length > 0 ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {jobs.map((item) => (
                <a
                  key={item.id}
                  href={item.output_url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-xl border bg-card p-2 transition hover:border-primary"
                >
                  <div className="checkerboard flex aspect-square items-center justify-center overflow-hidden rounded-lg">
                    {item.output_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.output_url} alt="Converted history thumbnail" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="mt-2 truncate text-xs font-medium">{item.target_ratio ?? "Converted"}</div>
                  <div className="text-xs uppercase text-muted-foreground">{item.output_format ?? "image"}</div>
                </a>
              ))}
            </section>

            {hasMore ? (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => void loadHistory(page + 1)}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-[10px] border px-6 py-2 text-sm font-medium transition hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  View More
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <section className="rounded-xl border border-dashed bg-muted/30 p-10 text-center">
            <p className="text-sm text-muted-foreground">No images yet. Convert your first image to see it here.</p>
          </section>
        )}
      </div>
    </main>
  );
}
