import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

function trimEnv(value: string | undefined) {
  return value?.trim() ?? "";
}

function getSupabaseProjectUrl() {
  return trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || trimEnv(process.env.SUPABASE_URL);
}

// Create a Supabase client for server-side API routes that can read auth cookies
export function getSupabaseServerClient(request: Request) {
  const supabaseUrl = getSupabaseProjectUrl();
  const supabaseAnonKey = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const cookieHeader = request.headers.get('cookie') || '';

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        cookie: cookieHeader
      }
    }
  });
}

export async function getAuthenticatedUser(request: Request): Promise<User | null> {
  const supabase = getSupabaseServerClient(request);
  const authHeader = request.headers.get("authorization") ?? "";
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);

  if (bearerMatch?.[1]) {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(bearerMatch[1]);

    return error ? null : user;
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  return session?.user ?? null;
}
