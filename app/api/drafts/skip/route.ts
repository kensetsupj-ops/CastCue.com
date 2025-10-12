import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/db";

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
    const { draft_id } = SkipDraftSchema.parse(body);

    // Update draft status to skipped
    const { error } = await supabaseAdmin
      .from("drafts")
      .update({ status: "skipped" })
      .eq("id", draft_id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Skip draft error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
