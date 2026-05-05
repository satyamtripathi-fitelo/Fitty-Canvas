import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function trimEnv(value: string | undefined) {
  return value?.trim() ?? "";
}

function getSupabaseProjectUrl() {
  return trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || trimEnv(process.env.SUPABASE_URL);
}

// Create a Supabase client for server-side API routes that can read auth cookies
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const supabaseUrl = getSupabaseProjectUrl();
  const supabaseAnonKey = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
