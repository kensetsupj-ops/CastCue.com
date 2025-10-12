import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/x/disconnect
 * Disconnects X (Twitter) connection and removes stored tokens
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete X connection from database
    const { error } = await supabase
      .from('x_connections')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('X disconnect error:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect X account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('X disconnect error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
