import { supabaseAdmin } from "./db";
import { getDefaultTemplate } from "./default-template";

/**
 * Select template for auto-post
 * Uses user's default template if set, otherwise uses the most recently created template
 * If no user templates exist, returns the system default template
 *
 * @param userId - User ID
 * @returns Selected template (never null - returns default template as fallback)
 */
export async function selectTemplateForABTest(userId: string) {
  // Get user's default template setting
  const { data: settings } = await supabaseAdmin
    .from("user_settings")
    .select("default_template_id")
    .eq("user_id", userId)
    .single();

  // If user has a default template, use it
  if (settings?.default_template_id) {
    const { data: template } = await supabaseAdmin
      .from("templates")
      .select("*")
      .eq("id", settings.default_template_id)
      .eq("user_id", userId)  // SECURITY: Explicit ownership check
      .single();

    if (template) {
      return template;
    }
  }

  // Otherwise, use the most recently created template
  const { data: template, error } = await supabaseAdmin
    .from("templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !template) {
    console.log("[selectTemplateForABTest] No user templates found, using system default");
    // Return system default template when user has no templates
    return getDefaultTemplate();
  }

  return template;
}
