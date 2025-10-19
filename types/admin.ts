/**
 * Admin Dashboard Type Definitions
 */

/**
 * User statistics
 */
export interface UserStats {
  total: number; // Total registered users
  twitchConnected: number; // Users with Twitch connected
  xConnected: number; // Users with X connected
  pushSubscribed: number; // Users with push notifications enabled
  activeLastWeek: number; // Active users in last 7 days
  activeLastMonth: number; // Active users in last 30 days
}

/**
 * Growth trend data point
 */
export interface GrowthDataPoint {
  date: string; // YYYY-MM-DD
  newUsers: number; // New users registered on this date
  cumulative: number; // Cumulative total users up to this date
}

/**
 * Growth statistics
 */
export interface GrowthStats {
  daily: GrowthDataPoint[]; // Daily signup data for past 30 days
}

/**
 * Activity statistics
 */
export interface ActivityStats {
  postsThisMonth: number; // Total posts this month
  lastPostAt: string | null; // ISO timestamp of last post
}

/**
 * Sampling health status
 */
export interface SamplingHealth {
  lastRunAt: string | null; // ISO timestamp of last sampling run
  intervalMinutes: number | null; // Minutes since previous sample
  status: "healthy" | "warning" | "error"; // Health status
}

/**
 * Quota reset health status
 */
export interface QuotaResetHealth {
  lastResetDate: string | null; // ISO date of last reset
  nextResetDate: string; // ISO date of next scheduled reset
  status: "healthy" | "error"; // Health status
}

/**
 * Error rate statistics
 */
export interface ErrorRateStats {
  last24Hours: number; // Error rate percentage (0-100)
  failedPosts: number; // Number of failed posts
  totalPosts: number; // Total posts in the period
}

/**
 * System health statistics
 */
export interface HealthStats {
  sampling: SamplingHealth; // GitHub Actions cron health
  quotaReset: QuotaResetHealth; // Vercel cron health
  errorRate: ErrorRateStats; // Post failure rate
}

/**
 * Sampling metrics period stats
 */
export interface SamplingPeriodStats {
  totalRuns: number; // Total number of sampling runs
  avgActiveStreams: number; // Average concurrent streams
  avgExecutionTime: number; // Average execution time (ms)
  maxExecutionTime: number; // Max execution time (ms)
  errorRate: number; // Error rate percentage
}

/**
 * Vercel Pro migration recommendation
 */
export interface VercelProRecommendation {
  status: "free-ok" | "prepare-migration" | "migrate-now" | "critical";
  reason: string; // Human-readable reason
  currentPlan: "GitHub Actions Free" | "Vercel Pro" | "Vercel Pro + Batch";
  recommendedPlan: "GitHub Actions Free" | "Vercel Pro" | "Vercel Pro + Batch";
  estimatedCost: number; // Monthly cost in USD
  daysUntilLimit: number | null; // Estimated days until hitting limit
}

/**
 * Sampling metrics for Vercel Pro migration decision
 */
export interface SamplingMetrics {
  weekly: SamplingPeriodStats; // Past 7 days
  monthly: SamplingPeriodStats; // Past 30 days
  peak: {
    concurrentStreams: number; // Peak concurrent streams in past 30 days
    estimatedTotalUsers: number; // Estimated total users based on 8.33% ratio
  };
  recommendation: VercelProRecommendation; // Migration recommendation
}

/**
 * Complete admin statistics response
 */
export interface AdminStatsResponse {
  users: UserStats;
  growth: GrowthStats;
  activity: ActivityStats;
  health: HealthStats;
  sampling: SamplingMetrics;
}
