import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

/**
 * Supabase client for client-side operations
 * Uses anon key with RLS enabled
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Supabase client for server-side operations
 * Uses service role key to bypass RLS when needed
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Database types
 */
export type ChannelType = "x" | "discord";
export type DeliveryStatus = "queued" | "sent" | "failed" | "skipped";
export type Variant = "A" | "B";

export interface Profile {
  user_id: string;
  display_name: string | null;
  created_at: string;
}

export interface TwitchAccount {
  id: string;
  user_id: string;
  broadcaster_id: string;
  login: string;
  display_name: string;
  verified_at: string | null;
  created_at: string;
}

export interface XConnection {
  id: string;
  user_id: string;
  scope: string[];
  access_token_cipher: string;
  refresh_token_cipher: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface DiscordWebhook {
  id: string;
  user_id: string;
  webhook_url: string;
  created_at: string;
}

export interface Stream {
  id: number;
  user_id: string;
  platform: string;
  stream_id: string;
  started_at: string;
  ended_at_est: string | null;
  peak: number | null;
  created_at: string;
}

export interface Sample {
  id: number;
  stream_id: number;
  taken_at: string;
  viewer_count: number;
}

export interface Template {
  id: string;
  user_id: string;
  name: string;
  body: string;
  variant: Variant;
  created_at: string;
}

export interface Delivery {
  id: string;
  user_id: string;
  stream_id: number | null;
  channel: ChannelType;
  status: DeliveryStatus;
  idempotency_key: string;
  post_id: string | null;
  error: string | null;
  latency_ms: number | null;
  created_at: string;
}

export interface Link {
  id: string;
  user_id: string;
  short_code: string;
  target_url: string;
  campaign_id: string | null;
  created_at: string;
}

export interface Click {
  id: number;
  link_id: string;
  at: string;
  ua: string | null;
  referrer: string | null;
}

export interface Quota {
  user_id: string;
  monthly_limit: number;
  monthly_used: number;
  global_monthly_used: number;
  reset_on: string;
}

export interface Draft {
  id: string;
  user_id: string;
  stream_id: number | null;
  title: string;
  twitch_url: string;
  image_url: string | null;
  status: "pending" | "posted" | "skipped";
  created_at: string;
}

export interface PushSubscription {
  id: number;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  created_at: string;
}
