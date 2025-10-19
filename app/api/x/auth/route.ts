import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCodeVerifier, generateCodeChallenge, generateState } from '@/lib/pkce';
import { cookies } from 'next/headers';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * POST /api/x/auth
 * Initiates X (Twitter) OAuth2 PKCE flow
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store code verifier and state in cookies (temporary)
    const cookieStore = await cookies();
    cookieStore.set('x_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });
    cookieStore.set('x_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    // Build X OAuth2 authorization URL
    const clientId = process.env.X_CLIENT_ID!;
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/x/callback`;
    const scopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];

    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('X OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
