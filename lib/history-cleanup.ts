import { getOutputBucketName, getUploadBucketName } from "@/lib/supabase";

const DEFAULT_HISTORY_LIMIT = 40;

type StorageClient = ReturnType<ReturnType<typeof import("@/lib/supabase").getSupabaseAdminClient>["storage"]["from"]>;
type SupabaseAdmin = ReturnType<typeof import("@/lib/supabase").getSupabaseAdminClient>;

type JobForCleanup = {
  id: string;
  original_url: string | null;
  output_url: string | null;
};

export async function enforceUserHistoryLimit(supabase: SupabaseAdmin, userId: string, limit = DEFAULT_HISTORY_LIMIT) {
  const { data, error } = await supabase
    .from("image_jobs")
    .select("id, original_url, output_url")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(limit, limit + 199);

  if (error || !data?.length) return;

  const jobs = data as JobForCleanup[];
  await removeFiles(supabase.storage.from(getUploadBucketName()), jobs.map((job) => filePathFromPublicUrl(job.original_url, getUploadBucketName())));
  await removeFiles(supabase.storage.from(getOutputBucketName()), jobs.map((job) => filePathFromPublicUrl(job.output_url, getOutputBucketName())));

  const ids = jobs.map((job) => job.id);
  await supabase.from("image_jobs").delete().eq("user_id", userId).in("id", ids);
}

async function removeFiles(bucket: StorageClient, paths: Array<string | null>) {
  const uniquePaths = Array.from(new Set(paths.filter((path): path is string => Boolean(path))));
  if (!uniquePaths.length) return;

  await bucket.remove(uniquePaths);
}

function filePathFromPublicUrl(url: string | null, bucket: string) {
  if (!url) return null;

  try {
    const path = new URL(url).pathname;
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = path.indexOf(marker);

    if (index === -1) return null;

    return decodeURIComponent(path.slice(index + marker.length));
  } catch {
    return null;
  }
}
