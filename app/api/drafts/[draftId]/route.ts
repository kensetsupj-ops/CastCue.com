import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { selectTemplateForABTest } from "@/lib/ab-test";

/**
 * Get draft by ID
 * GET /api/drafts/[draftId]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const { draftId } = await params;

    // 認証チェック
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // SECURITY: Get draft with ownership check in single query to prevent enumeration
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
      .eq("user_id", user.id)  // SECURITY: Combined query prevents timing/enumeration attacks
      .single();

    // SECURITY: Return generic 404 for both non-existent and unauthorized drafts
    if (draftError || !draft) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 }
      );
    }

    // Get template for initial body
    // This will use default template if set, otherwise use most recently created
    // Falls back to system default template if user has no templates
    const template = await selectTemplateForABTest(draft.user_id);

    // Render template (always available - falls back to system default)
    // Note: {twitch_url} is always added at the end automatically
    let defaultTemplate = template.body
      .replace(/{twitch_url}/g, "") // Remove {twitch_url} placeholder if it exists (will be added at the end)
      .replace(/{title}/g, draft.title) // Support {title} for backward compatibility
      .replace(/\{配信タイトル\}/g, draft.title) // Support {配信タイトル} placeholder
      .trim(); // Remove trailing whitespace

    // Always add Twitch URL at the end
    defaultTemplate = `${defaultTemplate}\n${draft.twitch_url}`;

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

    console.log('[api/drafts] Past deliveries count:', pastDeliveries?.length || 0);
    console.log('[api/drafts] Past posts count:', pastPosts.length);

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
