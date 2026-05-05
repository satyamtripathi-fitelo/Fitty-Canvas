import { createClient } from "@supabase/supabase-js";

let supabaseBrowserClient: ReturnType<typeof createClient> | null = null;

function trimEnv(value: string | undefined) {
  return value?.trim() ?? "";
}

/** Project API URL, e.g. https://xxxx.supabase.co (no trailing slash). */
export function getSupabaseProjectUrl() {
  return trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || trimEnv(process.env.SUPABASE_URL);
}

/** Defaults match `supabase/schema.sql`. Override if your buckets use different names. */
export function getUploadBucketName() {
  return trimEnv(process.env.SUPABASE_STORAGE_BUCKET_UPLOADS) || "fitty-uploads";
}

export function getOutputBucketName() {
  return trimEnv(process.env.SUPABASE_STORAGE_BUCKET_OUTPUTS) || "fitty-outputs";
}

export function hasSupabaseConfig() {
  const url = getSupabaseProjectUrl();
  const anon = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return Boolean(url && anon);
}

export function getSupabaseBrowserClient() {
  const supabaseUrl = getSupabaseProjectUrl();
  const supabaseAnonKey = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  supabaseBrowserClient ??= createClient(supabaseUrl, supabaseAnonKey);

  return supabaseBrowserClient;
}

export function getSupabaseAdminClient() {
  const supabaseUrl = getSupabaseProjectUrl();
  const supabaseServiceRoleKey = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
  if (!supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length) {
    throw new Error(`Missing ${missing.join(" and ")}. Add them to .env.local and restart the dev server.`);
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
