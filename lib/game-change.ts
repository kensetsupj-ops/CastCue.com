import { supabaseAdmin } from "./db";

/**
 * Check if game change notification is allowed (cooldown check)
 */
export async function canNotifyGameChange(streamId: string): Promise<boolean> {
  const { data: lastEvent } = await supabaseAdmin
    .from("game_change_events")
    .select("detected_at, notified")
    .eq("stream_id", streamId)
    .eq("notified", true)
    .order("detected_at", { ascending: false })
    .limit(1)
    .single();

  if (!lastEvent) return true;

  // Get user's cooldown setting (default 10 minutes)
  const { data: stream } = await supabaseAdmin
    .from("streams")
    .select("user_id")
    .eq("id", streamId)
    .single();

  if (!stream) return false;

  const { data: settings } = await supabaseAdmin
    .from("user_settings")
    .select("game_change_cooldown")
    .eq("user_id", stream.user_id)
    .single();

  const cooldownSeconds = settings?.game_change_cooldown || 600; // 10 minutes default
  const cooldownMs = cooldownSeconds * 1000;

  const timeSinceLastNotification =
    Date.now() - new Date(lastEvent.detected_at).getTime();

  return timeSinceLastNotification >= cooldownMs;
}

/**
 * Check if game is in user's whitelist (if whitelist is set)
 */
export async function isGameWhitelisted(
  userId: string,
  gameName: string
): Promise<boolean> {
  const { data: settings } = await supabaseAdmin
    .from("user_settings")
    .select("game_change_whitelist")
    .eq("user_id", userId)
    .single();

  const whitelist = settings?.game_change_whitelist;

  // If no whitelist, allow all games
  if (!whitelist || whitelist.length === 0) return true;

  // Check if game is in whitelist
  return whitelist.includes(gameName);
}

/**
 * Handle game change detection and create draft
 */
export async function handleGameChange(
  userId: string,
  streamId: string,
  previousCategory: string | null,
  newCategory: string,
  broadcasterLogin: string,
  title: string,
  thumbnailUrl: string
): Promise<{ success: boolean; draftId?: string; reason?: string }> {
  // Check if notifications are enabled
  const { data: settings } = await supabaseAdmin
    .from("user_settings")
    .select("notify_game_change")
    .eq("user_id", userId)
    .single();

  if (!settings?.notify_game_change) {
    return { success: false, reason: "notifications_disabled" };
  }

  // Check cooldown
  const canNotify = await canNotifyGameChange(streamId);
  if (!canNotify) {
    return { success: false, reason: "cooldown_active" };
  }

  // Check whitelist
  const isWhitelisted = await isGameWhitelisted(userId, newCategory);
  if (!isWhitelisted) {
    return { success: false, reason: "not_in_whitelist" };
  }

  // Update streams table
  await supabaseAdmin
    .from("streams")
    .update({
      current_category: newCategory,
      previous_category: previousCategory,
      category_changed_at: new Date().toISOString(),
    })
    .eq("id", streamId);

  // Create draft for game change
  const twitchUrl = `https://twitch.tv/${broadcasterLogin}`;
  const { data: draft, error: draftError } = await supabaseAdmin
    .from("drafts")
    .insert({
      user_id: userId,
      stream_id: streamId,
      draft_type: "game_change",
      title: title,
      twitch_url: twitchUrl,
      image_url: thumbnailUrl,
      previous_category: previousCategory,
      new_category: newCategory,
      status: "pending",
    })
    .select("id")
    .single();

  if (draftError || !draft) {
    console.error("Failed to create game change draft:", draftError);
    return { success: false, reason: "draft_creation_failed" };
  }

  // Record game change event
  await supabaseAdmin.from("game_change_events").insert({
    stream_id: streamId,
    previous_category: previousCategory,
    new_category: newCategory,
    draft_id: draft.id,
    notified: true,
  });

  return { success: true, draftId: draft.id };
}
