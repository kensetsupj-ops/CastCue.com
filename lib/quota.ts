import { supabaseAdmin } from "./db";

const GLOBAL_CAP = 400; // Free tier monthly cap
const DEFAULT_USER_LIMIT = 12; // Default user monthly limit

export interface QuotaInfo {
  user_remaining: number;
  global_remaining: number;
  user_used: number;
  user_limit: number;
  global_used: number;
  global_limit: number;
  reset_on: string;
  can_post: boolean;
  warning_level: "none" | "low" | "critical"; // none < 60%, low < 90%, critical >= 90%
}

/**
 * Get quota information for a user
 */
export async function getQuota(userId: string): Promise<QuotaInfo> {
  const { data, error } = await supabaseAdmin
    .from("quotas")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    // Initialize quota if not exists
    await initializeQuota(userId);
    return getQuota(userId);
  }

  const userRemaining = data.monthly_limit - data.monthly_used;
  const globalRemaining = GLOBAL_CAP - data.global_monthly_used;

  const canPost = userRemaining > 0 && globalRemaining > 0;

  // Calculate warning level based on global usage
  let warningLevel: "none" | "low" | "critical" = "none";
  const globalUsagePercent = (data.global_monthly_used / GLOBAL_CAP) * 100;

  if (globalUsagePercent >= 90) {
    warningLevel = "critical";
  } else if (globalUsagePercent >= 60) {
    warningLevel = "low";
  }

  return {
    user_remaining: userRemaining,
    global_remaining: globalRemaining,
    user_used: data.monthly_used,
    user_limit: data.monthly_limit,
    global_used: data.global_monthly_used,
    global_limit: GLOBAL_CAP,
    reset_on: data.reset_on,
    can_post,
    warning_level: warningLevel,
  };
}

/**
 * Initialize quota for a user
 */
export async function initializeQuota(userId: string): Promise<void> {
  const resetDate = getNextMonthFirstDay();

  const { error } = await supabaseAdmin.from("quotas").insert({
    user_id: userId,
    monthly_limit: DEFAULT_USER_LIMIT,
    monthly_used: 0,
    global_monthly_used: 0,
    reset_on: resetDate,
  });

  if (error && error.code !== "23505") {
    // Ignore duplicate key error
    throw error;
  }
}

/**
 * Consume quota (attempt to use 1 post)
 * Returns true if quota was successfully consumed, false if not enough quota
 */
export async function consumeQuota(
  userId: string,
  amount: number = 1
): Promise<boolean> {
  const quota = await getQuota(userId);

  if (!quota.can_post || quota.user_remaining < amount || quota.global_remaining < amount) {
    return false;
  }

  // Use RPC function for atomic update
  const { data, error } = await supabaseAdmin.rpc("consume_quota", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    console.error("Error consuming quota:", error);
    return false;
  }

  return data === true;
}

/**
 * Reset monthly quotas (should be run on the first day of each month)
 */
export async function resetMonthlyQuotas(): Promise<void> {
  const resetDate = getNextMonthFirstDay();

  const { error } = await supabaseAdmin
    .from("quotas")
    .update({
      monthly_used: 0,
      global_monthly_used: 0,
      reset_on: resetDate,
    })
    .lte("reset_on", new Date().toISOString().split("T")[0]);

  if (error) {
    throw error;
  }
}

/**
 * Get the first day of next month
 */
function getNextMonthFirstDay(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString().split("T")[0];
}

/**
 * Check if fallback to Discord should be enabled
 * (when global usage >= 90%)
 */
export function shouldFallbackToDiscord(quota: QuotaInfo): boolean {
  return quota.warning_level === "critical";
}
