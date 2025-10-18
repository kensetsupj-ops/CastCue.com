import { supabaseAdmin } from "./db";

/**
 * Get user statistics
 */
export async function getUserStats() {
  try {
    // Total registered users
    const { count: total } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Twitch connected users
    const { data: twitchAccounts } = await supabaseAdmin
      .from("twitch_accounts")
      .select("user_id");
    const twitchConnected = new Set(
      twitchAccounts?.map((a) => a.user_id) || []
    ).size;

    // X connected users
    const { data: xConnections } = await supabaseAdmin
      .from("x_connections")
      .select("user_id");
    const xConnected = new Set(xConnections?.map((c) => c.user_id) || []).size;

    // Push subscribed users
    const { data: pushSubscriptions } = await supabaseAdmin
      .from("push_subscriptions")
      .select("user_id");
    const pushSubscribed = new Set(
      pushSubscriptions?.map((s) => s.user_id) || []
    ).size;

    // Active users last 7 days
    const { data: activeWeek } = await supabaseAdmin
      .from("deliveries")
      .select("user_id")
      .gte(
        "created_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      );
    const activeLastWeek = new Set(activeWeek?.map((d) => d.user_id) || [])
      .size;

    // Active users last 30 days
    const { data: activeMonth } = await supabaseAdmin
      .from("deliveries")
      .select("user_id")
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      );
    const activeLastMonth = new Set(activeMonth?.map((d) => d.user_id) || [])
      .size;

    return {
      total: total || 0,
      twitchConnected,
      xConnected,
      pushSubscribed,
      activeLastWeek,
      activeLastMonth,
    };
  } catch (error) {
    console.error("[admin-stats] Error getting user stats:", error);
    throw error;
  }
}

/**
 * Get growth trends (daily signups for past 30 days)
 */
export async function getGrowthStats() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get all users created in last 30 days
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Group by date
    const dateMap = new Map<string, number>();
    profiles?.forEach((profile) => {
      const date = new Date(profile.created_at).toISOString().split("T")[0];
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    // Get total users before 30 days ago (for cumulative calculation)
    const { count: baseCount } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .lt("created_at", thirtyDaysAgo.toISOString());

    // Build daily array with cumulative counts
    const daily: Array<{
      date: string;
      newUsers: number;
      cumulative: number;
    }> = [];

    let cumulative = baseCount || 0;

    // Generate all dates in range
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      const newUsers = dateMap.get(dateStr) || 0;
      cumulative += newUsers;

      daily.push({
        date: dateStr,
        newUsers,
        cumulative,
      });
    }

    return { daily };
  } catch (error) {
    console.error("[admin-stats] Error getting growth stats:", error);
    throw error;
  }
}

/**
 * Get activity statistics
 */
export async function getActivityStats() {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Posts this month
    const { count: postsThisMonth } = await supabaseAdmin
      .from("deliveries")
      .select("*", { count: "exact", head: true })
      .gte("created_at", firstDayOfMonth.toISOString());

    // Last post timestamp
    const { data: lastPost } = await supabaseAdmin
      .from("deliveries")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    return {
      postsThisMonth: postsThisMonth || 0,
      lastPostAt: lastPost?.[0]?.created_at || null,
    };
  } catch (error) {
    console.error("[admin-stats] Error getting activity stats:", error);
    throw error;
  }
}

/**
 * Get system health statistics
 */
export async function getHealthStats() {
  try {
    // Sampling health (GitHub Actions cron)
    const { data: recentSamples } = await supabaseAdmin
      .from("samples")
      .select("taken_at")
      .order("taken_at", { ascending: false })
      .limit(2);

    let samplingHealth: {
      lastRunAt: string | null;
      intervalMinutes: number | null;
      status: "healthy" | "warning" | "error";
    } = {
      lastRunAt: null,
      intervalMinutes: null,
      status: "error",
    };

    if (recentSamples && recentSamples.length > 0) {
      samplingHealth.lastRunAt = recentSamples[0].taken_at;

      if (recentSamples.length === 2) {
        const last = new Date(recentSamples[0].taken_at).getTime();
        const previous = new Date(recentSamples[1].taken_at).getTime();
        const intervalMinutes = (last - previous) / 1000 / 60;
        samplingHealth.intervalMinutes = Math.round(intervalMinutes * 10) / 10;

        // Status based on interval
        if (intervalMinutes <= 10) {
          samplingHealth.status = "healthy"; // 5-10 minutes is normal
        } else if (intervalMinutes <= 15) {
          samplingHealth.status = "warning"; // 10-15 minutes
        } else {
          samplingHealth.status = "error"; // 15+ minutes
        }
      } else {
        // Only one sample exists, check if it's recent
        const lastRunTime = new Date(recentSamples[0].taken_at).getTime();
        const minutesSinceLastRun = (Date.now() - lastRunTime) / 1000 / 60;

        if (minutesSinceLastRun <= 10) {
          samplingHealth.status = "healthy";
        } else if (minutesSinceLastRun <= 15) {
          samplingHealth.status = "warning";
        } else {
          samplingHealth.status = "error";
        }
      }
    }

    // Quota reset health (Vercel cron)
    const { data: latestQuota } = await supabaseAdmin
      .from("quotas")
      .select("reset_on")
      .order("reset_on", { ascending: false })
      .limit(1);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate next reset date (1st of next month)
    const nextResetDate = new Date(
      currentYear,
      currentMonth + 1,
      1
    ).toISOString();

    let quotaResetHealth: {
      lastResetDate: string | null;
      nextResetDate: string;
      status: "healthy" | "error";
    } = {
      lastResetDate: latestQuota?.[0]?.reset_on || null,
      nextResetDate,
      status: "error",
    };

    if (latestQuota && latestQuota.length > 0) {
      const lastResetDate = new Date(latestQuota[0].reset_on);
      const lastResetMonth = lastResetDate.getMonth();
      const lastResetYear = lastResetDate.getFullYear();

      // Check if reset happened this month
      if (
        lastResetMonth === currentMonth &&
        lastResetYear === currentYear
      ) {
        quotaResetHealth.status = "healthy";
      }
    }

    // Error rate (past 24 hours)
    const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: totalPosts } = await supabaseAdmin
      .from("deliveries")
      .select("*", { count: "exact", head: true })
      .gte("created_at", past24Hours);

    const { count: failedPosts } = await supabaseAdmin
      .from("deliveries")
      .select("*", { count: "exact", head: true })
      .gte("created_at", past24Hours)
      .eq("status", "failed");

    const errorRatePercent =
      totalPosts && totalPosts > 0
        ? Math.round((failedPosts! / totalPosts) * 1000) / 10 // Round to 1 decimal
        : 0;

    return {
      sampling: samplingHealth,
      quotaReset: quotaResetHealth,
      errorRate: {
        last24Hours: errorRatePercent,
        failedPosts: failedPosts || 0,
        totalPosts: totalPosts || 0,
      },
    };
  } catch (error) {
    console.error("[admin-stats] Error getting health stats:", error);
    throw error;
  }
}

/**
 * Get sampling metrics for Vercel Pro migration decision
 */
export async function getSamplingMetrics() {
  try {
    const past7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const past30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get recent metrics (past 7 days)
    const { data: recentMetrics, error: recentError } = await supabaseAdmin
      .from("sampling_metrics")
      .select("*")
      .gte("executed_at", past7Days)
      .order("executed_at", { ascending: false });

    // If table doesn't exist (PGRST205), return default data
    if (recentError) {
      if (recentError.code === 'PGRST205') {
        console.warn('[admin-stats] sampling_metrics table does not exist, returning default data');
        return getDefaultSamplingMetrics();
      }
      throw recentError;
    }

    // Get monthly metrics (past 30 days)
    const { data: monthlyMetrics, error: monthlyError } = await supabaseAdmin
      .from("sampling_metrics")
      .select("*")
      .gte("executed_at", past30Days)
      .order("executed_at", { ascending: false });

    if (monthlyError) {
      if (monthlyError.code === 'PGRST205') {
        console.warn('[admin-stats] sampling_metrics table does not exist, returning default data');
        return getDefaultSamplingMetrics();
      }
      throw monthlyError;
    }

    // Calculate statistics
    const weekStats = calculateMetricsStats(recentMetrics || []);
    const monthStats = calculateMetricsStats(monthlyMetrics || []);

    // Get peak concurrent streams (max active_streams_count in past 30 days)
    const peakStreams = monthlyMetrics && monthlyMetrics.length > 0
      ? Math.max(...monthlyMetrics.map((m) => m.active_streams_count))
      : 0;

    // Get average concurrent streams
    const avgStreamsWeek = weekStats.avgActiveStreams;
    const avgStreamsMonth = monthStats.avgActiveStreams;

    // Calculate estimated total users based on avg concurrent and 8.33% ratio
    const estimatedTotalUsers = Math.round(avgStreamsMonth / 0.0833);

    // Vercel Pro migration recommendation
    const recommendation = getVercelProRecommendation({
      peakStreams,
      avgStreamsWeek,
      avgStreamsMonth,
      avgExecutionTimeMs: monthStats.avgExecutionTime,
      estimatedTotalUsers,
    });

    return {
      weekly: {
        totalRuns: weekStats.totalRuns,
        avgActiveStreams: weekStats.avgActiveStreams,
        avgExecutionTime: weekStats.avgExecutionTime,
        maxExecutionTime: weekStats.maxExecutionTime,
        errorRate: weekStats.errorRate,
      },
      monthly: {
        totalRuns: monthStats.totalRuns,
        avgActiveStreams: monthStats.avgActiveStreams,
        avgExecutionTime: monthStats.avgExecutionTime,
        maxExecutionTime: monthStats.maxExecutionTime,
        errorRate: monthStats.errorRate,
      },
      peak: {
        concurrentStreams: peakStreams,
        estimatedTotalUsers,
      },
      recommendation,
    };
  } catch (error) {
    console.error("[admin-stats] Error getting sampling metrics:", error);
    throw error;
  }
}

/**
 * Calculate statistics from sampling metrics
 */
function calculateMetricsStats(metrics: any[]) {
  if (metrics.length === 0) {
    return {
      totalRuns: 0,
      avgActiveStreams: 0,
      avgExecutionTime: 0,
      maxExecutionTime: 0,
      errorRate: 0,
    };
  }

  const totalRuns = metrics.length;
  const totalActiveStreams = metrics.reduce((sum, m) => sum + m.active_streams_count, 0);
  const totalExecutionTime = metrics.reduce((sum, m) => sum + m.execution_time_ms, 0);
  const maxExecutionTime = Math.max(...metrics.map((m) => m.execution_time_ms));
  const totalErrors = metrics.filter((m) => m.error_message !== null).length;

  return {
    totalRuns,
    avgActiveStreams: Math.round((totalActiveStreams / totalRuns) * 10) / 10,
    avgExecutionTime: Math.round(totalExecutionTime / totalRuns),
    maxExecutionTime,
    errorRate: Math.round((totalErrors / totalRuns) * 1000) / 10, // %
  };
}

/**
 * Get default sampling metrics when table doesn't exist
 */
function getDefaultSamplingMetrics() {
  return {
    weekly: {
      totalRuns: 0,
      avgActiveStreams: 0,
      avgExecutionTime: 0,
      maxExecutionTime: 0,
      errorRate: 0,
    },
    monthly: {
      totalRuns: 0,
      avgActiveStreams: 0,
      avgExecutionTime: 0,
      maxExecutionTime: 0,
      errorRate: 0,
    },
    peak: {
      concurrentStreams: 0,
      estimatedTotalUsers: 0,
    },
    recommendation: {
      status: "free-ok" as const,
      reason: "サンプリングデータがまだありません。GitHub Actions Freeで開始できます。",
      currentPlan: "GitHub Actions Free" as const,
      recommendedPlan: "GitHub Actions Free" as const,
      estimatedCost: 0,
      daysUntilLimit: null,
    },
  };
}

/**
 * Get Vercel Pro migration recommendation based on metrics
 */
function getVercelProRecommendation(params: {
  peakStreams: number;
  avgStreamsWeek: number;
  avgStreamsMonth: number;
  avgExecutionTimeMs: number;
  estimatedTotalUsers: number;
}): {
  status: "free-ok" | "prepare-migration" | "migrate-now" | "critical";
  reason: string;
  currentPlan: "GitHub Actions Free" | "Vercel Pro" | "Vercel Pro + Batch";
  recommendedPlan: "GitHub Actions Free" | "Vercel Pro" | "Vercel Pro + Batch";
  estimatedCost: number;
  daysUntilLimit: number | null;
} {
  const { peakStreams, avgStreamsWeek, avgStreamsMonth, avgExecutionTimeMs, estimatedTotalUsers } = params;

  // GitHub Actions Free limit: ~10 concurrent streams (120 total users)
  const FREE_LIMIT = 10;
  const FREE_USER_LIMIT = 120;

  // Vercel Pro standard limit: ~200 concurrent streams (2,500 total users)
  const PRO_STANDARD_LIMIT = 200;
  const PRO_USER_LIMIT = 2500;

  // Current estimated plan
  let currentPlan: "GitHub Actions Free" | "Vercel Pro" | "Vercel Pro + Batch" = "GitHub Actions Free";
  if (peakStreams > PRO_STANDARD_LIMIT) {
    currentPlan = "Vercel Pro + Batch";
  } else if (peakStreams > FREE_LIMIT) {
    currentPlan = "Vercel Pro";
  }

  // Critical: Peak exceeds Vercel Pro standard capacity
  if (peakStreams >= PRO_STANDARD_LIMIT) {
    return {
      status: "critical",
      reason: `ピーク同時配信数が${peakStreams}人に達しています。バッチ処理の実装が必要です。`,
      currentPlan,
      recommendedPlan: "Vercel Pro + Batch",
      estimatedCost: 20,
      daysUntilLimit: null,
    };
  }

  // Migrate now: Peak or average exceeds free tier
  if (peakStreams >= FREE_LIMIT || avgStreamsWeek >= FREE_LIMIT * 0.8) {
    const growthRate = avgStreamsMonth > 0 ? (avgStreamsWeek - avgStreamsMonth) / avgStreamsMonth : 0;
    const daysUntilLimit = growthRate > 0
      ? Math.round((PRO_STANDARD_LIMIT - avgStreamsWeek) / (avgStreamsWeek * growthRate / 7))
      : null;

    return {
      status: "migrate-now",
      reason: `平均同時配信数が${avgStreamsWeek.toFixed(1)}人（推定ユーザー数: ${estimatedTotalUsers}人）に達しています。Vercel Proへの移行を推奨します。`,
      currentPlan,
      recommendedPlan: "Vercel Pro",
      estimatedCost: 20,
      daysUntilLimit,
    };
  }

  // Prepare migration: Approaching free tier limit
  if (peakStreams >= FREE_LIMIT * 0.7 || avgStreamsWeek >= FREE_LIMIT * 0.6) {
    const daysUntilLimit = avgStreamsWeek > 0
      ? Math.round((FREE_LIMIT - avgStreamsWeek) / (avgStreamsWeek / 30))
      : null;

    return {
      status: "prepare-migration",
      reason: `平均同時配信数が${avgStreamsWeek.toFixed(1)}人（推定ユーザー数: ${estimatedTotalUsers}人）です。まもなく無料枠の限界（10人）に達します。`,
      currentPlan,
      recommendedPlan: "Vercel Pro",
      estimatedCost: 20,
      daysUntilLimit,
    };
  }

  // Free tier is OK
  return {
    status: "free-ok",
    reason: `現在の平均同時配信数は${avgStreamsWeek.toFixed(1)}人（推定ユーザー数: ${estimatedTotalUsers}人）です。GitHub Actions Freeで問題ありません。`,
    currentPlan,
    recommendedPlan: "GitHub Actions Free",
    estimatedCost: 0,
    daysUntilLimit: avgStreamsWeek > 0
      ? Math.round((FREE_LIMIT - avgStreamsWeek) / (avgStreamsWeek / 30))
      : null,
  };
}

/**
 * Get all admin statistics
 */
export async function getAllStats() {
  const [users, growth, activity, health, sampling] = await Promise.all([
    getUserStats(),
    getGrowthStats(),
    getActivityStats(),
    getHealthStats(),
    getSamplingMetrics(),
  ]);

  return {
    users,
    growth,
    activity,
    health,
    sampling,
  };
}
