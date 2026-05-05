import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pagination parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = (page - 1) * limit;

    // Fetch user's images with pagination
    const { data, error, count } = await supabase
      .from("image_jobs")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .eq("status", "done")
      .not("output_url", "is", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      jobs: data ?? [],
      total: count ?? 0,
      page,
      limit,
      hasMore: (count ?? 0) > offset + limit
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch history." },
      { status: 500 }
    );
  }
}
