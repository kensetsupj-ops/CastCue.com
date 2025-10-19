import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * POST /api/discord/disconnect
 * Disconnects Discord webhook
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete Discord webhook from database
    const { error } = await supabase
      .from('discord_webhooks')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Discord disconnect error:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect Discord webhook' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Discord disconnect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
