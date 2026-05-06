import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const MAX_HISTORY_ITEMS = 40;
const PAGE_SIZE = 5;

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pagination parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const requestedLimit = parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10);
    const limit = Math.min(Math.max(1, requestedLimit), PAGE_SIZE);
    const offset = (page - 1) * limit;

    if (offset >= MAX_HISTORY_ITEMS) {
      return NextResponse.json({
        jobs: [],
        total: MAX_HISTORY_ITEMS,
        page,
        limit,
        hasMore: false
      });
    }

    // Use admin client for querying
    const adminClient = getSupabaseAdminClient();
    
    // Fetch user's images with pagination
    const { data, error, count } = await adminClient
      .from("image_jobs")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .eq("status", "done")
      .not("output_url", "is", null)
      .order("created_at", { ascending: false })
      .range(offset, Math.min(offset + limit - 1, MAX_HISTORY_ITEMS - 1));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      jobs: data ?? [],
      total: Math.min(count ?? 0, MAX_HISTORY_ITEMS),
      page,
      limit,
      hasMore: Math.min(count ?? 0, MAX_HISTORY_ITEMS) > offset + limit
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch history." },
      { status: 500 }
    );
  }
}
