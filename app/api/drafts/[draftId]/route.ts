import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";

/**
 * Get draft by ID
 * GET /api/drafts/[draftId]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { draftId: string } }
) {
  try {
    const { draftId } = params;

    // Get draft with stream info
    const { data: draft, error: draftError } = await supabaseAdmin
      .from("drafts")
      .select(`
        *,
        stream:streams (
          id,
          platform,
          stream_id,
          started_at,
          peak
        )
      `)
      .eq("id", draftId)
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 }
      );
    }

    // Get user's default template for initial body
    const { data: template } = await supabaseAdmin
      .from("templates")
      .select("*")
      .eq("user_id", draft.user_id)
      .eq("variant", "A")
      .limit(1)
      .single();

    // Render template if available
    let defaultTemplate = "";
    if (template) {
      defaultTemplate = template.body
        .replace(/{title}/g, draft.title)
        .replace(/{category}/g, "")
        .replace(/{twitch_url}/g, draft.twitch_url);
    }

    // Get past effective posts (top 5 by lift)
    const { data: pastDeliveries } = await supabaseAdmin
      .from("deliveries")
      .select(`
        id,
        post_id,
        created_at,
        stream:streams (
          id,
          title
        )
      `)
      .eq("user_id", draft.user_id)
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(5);

    // Format past posts
    const pastPosts = pastDeliveries?.map((delivery: any) => ({
      id: delivery.id,
      body: `【配信開始】${delivery.stream?.title || ""}\n${draft.twitch_url}\n\n#Twitch #配信中`,
      template: "テンプレートA",
      clicks: 0, // TODO: Get actual click count from clicks table
      lift: 0, // TODO: Get actual lift from v_lift view
      conversion: 0, // TODO: Calculate conversion
      datetime: new Date(delivery.created_at).toLocaleDateString("ja-JP"),
    })) || [];

    return NextResponse.json({
      draft,
      defaultTemplate,
      pastPosts,
    });
  } catch (error: any) {
    console.error("Get draft error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
