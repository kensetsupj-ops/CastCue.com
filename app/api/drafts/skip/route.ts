import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const SkipDraftSchema = z.object({
  draft_id: z.string().uuid(),
});

/**
 * Skip a draft notification
 * POST /api/drafts/skip
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 認証チェック
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { draft_id } = SkipDraftSchema.parse(body);

    // SECURITY: Combined query to prevent timing attacks and enumeration
    // Only allow skipping pending drafts
    const { data: draft, error: draftError } = await supabaseAdmin
      .from("drafts")
      .select("id, status")
      .eq("id", draft_id)
      .eq("user_id", user.id)  // SECURITY: Ownership check in query
      .single();

    // SECURITY: Return generic 404 for both non-existent and unauthorized drafts
    if (draftError || !draft) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 }
      );
    }

    // Check if draft is still pending
    if (draft.status !== "pending") {
      return NextResponse.json(
        { error: "Draft has already been processed" },
        { status: 400 }
      );
    }

    // Update draft status to skipped
    const { error } = await supabaseAdmin
      .from("drafts")
      .update({ status: "skipped" })
      .eq("id", draft_id);

    if (error) {
      throw error;
    }

    console.log(`[skip] Draft ${draft_id} skipped by user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: "Draft skipped successfully"
    });
  } catch (error: any) {
    console.error("Skip draft error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
