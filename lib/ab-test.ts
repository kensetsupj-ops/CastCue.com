import { supabaseAdmin } from "./db";

/**
 * Select template variant for A/B testing
 * Uses 50/50 random selection between A and B
 *
 * @param userId - User ID
 * @returns Selected template or null if no templates found
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
      .single();

    if (template) {
      return template;
    }
  }

  // Otherwise, select randomly between A and B (50/50 split)
  const variant = Math.random() < 0.5 ? "A" : "B";

  const { data: template, error } = await supabaseAdmin
    .from("templates")
    .select("*")
    .eq("user_id", userId)
    .eq("variant", variant)
    .limit(1)
    .single();

  if (error || !template) {
    // Fallback: try to get any template
    const { data: fallback } = await supabaseAdmin
      .from("templates")
      .select("*")
      .eq("user_id", userId)
      .limit(1)
      .single();

    return fallback;
  }

  return template;
}

/**
 * Calculate win rate for each template variant
 *
 * Win rate is calculated as:
 * (Number of deliveries with positive lift) / (Total number of deliveries)
 *
 * @param userId - User ID
 * @returns Win rates for each variant
 */
export async function calculateWinRates(userId: string) {
  // Get all deliveries with template info and lift calculation
  const { data: deliveries, error } = await supabaseAdmin
    .from("deliveries")
    .select(`
      id,
      template_id,
      stream_id,
      created_at,
      templates (
        id,
        variant,
        name
      )
    `)
    .eq("user_id", userId)
    .eq("status", "sent")
    .not("template_id", "is", null)
    .not("stream_id", "is", null);

  if (error || !deliveries) {
    return {
      A: { wins: 0, total: 0, winRate: 0 },
      B: { wins: 0, total: 0, winRate: 0 },
    };
  }

  // Calculate lift for each delivery
  const deliveriesWithLift = await Promise.all(
    deliveries.map(async (delivery: any) => {
      const lift = await calculateDeliveryLift(delivery.stream_id, delivery.created_at);
      return {
        ...delivery,
        lift,
      };
    })
  );

  // Group by variant and calculate win rates
  const stats = {
    A: { wins: 0, total: 0, winRate: 0 },
    B: { wins: 0, total: 0, winRate: 0 },
  };

  for (const delivery of deliveriesWithLift) {
    if (!delivery.templates) continue;

    const variant = delivery.templates.variant as "A" | "B";

    stats[variant].total++;

    // Consider it a "win" if lift > 0
    if (delivery.lift > 0) {
      stats[variant].wins++;
    }
  }

  // Calculate win rates
  stats.A.winRate = stats.A.total > 0 ? stats.A.wins / stats.A.total : 0;
  stats.B.winRate = stats.B.total > 0 ? stats.B.wins / stats.B.total : 0;

  return stats;
}

/**
 * Calculate lift for a specific delivery
 *
 * @param streamId - Stream ID
 * @param deliveryTime - Delivery timestamp
 * @returns Lift value (viewer increase)
 */
async function calculateDeliveryLift(
  streamId: number,
  deliveryTime: string
): Promise<number> {
  const postTime = new Date(deliveryTime);

  // Get samples around the post time
  const { data: samples } = await supabaseAdmin
    .from("samples")
    .select("*")
    .eq("stream_id", streamId)
    .order("taken_at", { ascending: true });

  if (!samples || samples.length === 0) {
    return 0;
  }

  // Samples 5 minutes before post
  const fiveMinBefore = new Date(postTime.getTime() - 5 * 60 * 1000);
  const beforeSamples = samples.filter((s: any) => {
    const takenAt = new Date(s.taken_at);
    return takenAt >= fiveMinBefore && takenAt < postTime;
  });

  // Samples 5 minutes after post
  const fiveMinAfter = new Date(postTime.getTime() + 5 * 60 * 1000);
  const afterSamples = samples.filter((s: any) => {
    const takenAt = new Date(s.taken_at);
    return takenAt >= postTime && takenAt <= fiveMinAfter;
  });

  if (beforeSamples.length === 0 || afterSamples.length === 0) {
    return 0;
  }

  // Calculate average viewer count before and after
  const beforeAvg =
    beforeSamples.reduce((sum: number, s: any) => sum + s.viewer_count, 0) /
    beforeSamples.length;

  const afterAvg =
    afterSamples.reduce((sum: number, s: any) => sum + s.viewer_count, 0) /
    afterSamples.length;

  // Lift is the difference
  const lift = Math.round(afterAvg - beforeAvg);

  return lift > 0 ? lift : 0;
}

/**
 * Get template performance stats for dashboard
 *
 * @param userId - User ID
 * @returns Template stats with usage count and win rate
 */
export async function getTemplateStats(userId: string) {
  const winRates = await calculateWinRates(userId);

  // Get usage counts
  const { data: templates } = await supabaseAdmin
    .from("templates")
    .select(`
      id,
      name,
      variant,
      deliveries:deliveries(count)
    `)
    .eq("user_id", userId);

  if (!templates) {
    return [];
  }

  return templates.map((template: any) => {
    const variant = template.variant as "A" | "B";
    const usageCount = template.deliveries?.[0]?.count || 0;

    return {
      id: template.id,
      name: template.name,
      variant: template.variant,
      usageCount,
      winRate: winRates[variant].winRate,
      wins: winRates[variant].wins,
      total: winRates[variant].total,
    };
  });
}
