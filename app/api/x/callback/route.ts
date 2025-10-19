import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto';
import { cookies } from 'next/headers';

// Force dynamic rendering (uses cookies)
export const dynamic = 'force-dynamic';

/**
 * GET /api/x/callback
 * Handles X (Twitter) OAuth2 callback with PKCE
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('X OAuth error:', error);
    return NextResponse.redirect(`${origin}/integrations?error=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/integrations?error=invalid_callback`);
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${origin}/login`);
    }

    // Verify state parameter
    const cookieStore = await cookies();
    const savedState = cookieStore.get('x_state')?.value;
    const codeVerifier = cookieStore.get('x_code_verifier')?.value;

    if (!savedState || !codeVerifier) {
      return NextResponse.redirect(`${origin}/integrations?error=missing_pkce`);
    }

    if (savedState !== state) {
      return NextResponse.redirect(`${origin}/integrations?error=state_mismatch`);
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: process.env.X_CLIENT_ID!,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/x/callback`,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(`${origin}/integrations?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope } = tokenData;

    // Encrypt tokens
    const accessTokenCipher = encrypt(access_token);
    const refreshTokenCipher = refresh_token ? encrypt(refresh_token) : null;

    // Calculate expiration time
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null;

    // Store in database
    await supabase.from('x_connections').upsert({
      user_id: user.id,
      scope: scope ? scope.split(' ') : ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
      access_token_cipher: accessTokenCipher,
      refresh_token_cipher: refreshTokenCipher,
      expires_at: expiresAt,
    });

    // Clear PKCE cookies
    cookieStore.delete('x_state');
    cookieStore.delete('x_code_verifier');

    // Redirect to integrations page
    return NextResponse.redirect(`${origin}/integrations?success=true`);
  } catch (error) {
    console.error('X OAuth callback error:', error);
    return NextResponse.redirect(`${origin}/integrations?error=callback_failed`);
  }
}
