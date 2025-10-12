import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Discord embed color (blue)
 */
const EMBED_COLOR = 5814783;

/**
 * Send message to Discord webhook
 */
async function sendDiscordWebhook(
  webhookUrl: string,
  payload: {
    content?: string;
    embeds?: any[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Discord API error: ${response.status} - ${error}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending Discord webhook:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Format stream notification as Discord embed
 */
function formatStreamEmbed(
  title: string,
  twitchUrl: string,
  imageUrl?: string,
  category?: string
): any {
  const embed: any = {
    title: title,
    url: twitchUrl,
    color: EMBED_COLOR,
    timestamp: new Date().toISOString(),
    footer: {
      text: "CastCue - 配信通知",
    },
  };

  if (imageUrl) {
    embed.thumbnail = { url: imageUrl };
  }

  if (category) {
    embed.fields = [
      {
        name: "カテゴリー",
        value: category,
        inline: true,
      },
    ];
  }

  return embed;
}

/**
 * Post to Discord with template
 */
export async function postToDiscord(
  userId: string,
  draftId: string,
  template: string,
  variables: {
    title: string;
    twitch_url: string;
    image_url?: string;
    category?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user's Discord webhook URL
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("discord_webhook_url")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.discord_webhook_url) {
      return {
        success: false,
        error: "Discord webhook not configured",
      };
    }

    // Replace template variables in content
    let content = template;
    content = content.replace(/\{title\}/g, variables.title);
    content = content.replace(/\{twitch_url\}/g, variables.twitch_url);
    content = content.replace(/\{category\}/g, variables.category || "");

    // Create embed
    const embed = formatStreamEmbed(
      variables.title,
      variables.twitch_url,
      variables.image_url,
      variables.category
    );

    // Send webhook
    const result = await sendDiscordWebhook(profile.discord_webhook_url, {
      content: content || undefined,
      embeds: [embed],
    });

    if (result.success) {
      // Record post in database
      await supabaseAdmin.from("posts").insert({
        user_id: userId,
        draft_id: draftId,
        platform: "discord",
        content: content,
        posted_at: new Date().toISOString(),
      });
    }

    return result;
  } catch (error) {
    console.error("Error in postToDiscord:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Post immediately to Discord with user's default template
 */
export async function postToDiscordImmediately(
  userId: string,
  draftId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get draft details
    const { data: draft, error: draftError } = await supabaseAdmin
      .from("drafts")
      .select("title, twitch_url, image_url")
      .eq("id", draftId)
      .single();

    if (draftError || !draft) {
      return {
        success: false,
        error: "Draft not found",
      };
    }

    // Get user's default Discord template
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("discord_template")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.discord_template) {
      return {
        success: false,
        error: "Default Discord template not found",
      };
    }

    // Post to Discord
    const result = await postToDiscord(userId, draftId, profile.discord_template, {
      title: draft.title,
      twitch_url: draft.twitch_url,
      image_url: draft.image_url,
    });

    return result;
  } catch (error) {
    console.error("Error in postToDiscordImmediately:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
