import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Force dynamic rendering (uses cookies and request headers)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Get the correct redirect URL from environment
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_ORIGIN
  if (!siteUrl) {
    console.error('[auth/callback] NEXT_PUBLIC_SITE_URL not configured')
    return new NextResponse('Server configuration error', { status: 500 })
  }

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // プロフィール同期を実行
      await syncTwitchProfile(data.user.id, data.session?.provider_token ?? undefined)

      // Always use NEXT_PUBLIC_SITE_URL for redirect
      const redirectUrl = `${siteUrl}${next}`
      console.log(`[auth/callback] Redirecting to: ${redirectUrl}`)
      return NextResponse.redirect(redirectUrl)
    }

    console.error('[auth/callback] Auth error:', error)
  }

  // エラーの場合はログインページへ
  console.warn('[auth/callback] No code or auth failed, redirecting to login')
  return NextResponse.redirect(`${siteUrl}/login`)
}

async function syncTwitchProfile(userId: string, providerToken?: string) {
  if (!providerToken) return

  try {
    // Twitch Helix APIでユーザー情報を取得
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID!,
      },
    })

    const { data } = await response.json()
    if (!data || data.length === 0) return

    const twitchUser = data[0]

    // プロフィールをSupabaseに保存
    const { createClient: createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()

    await supabase.from('profiles').upsert({
      user_id: userId,
      twitch_user_id: twitchUser.id,
      login: twitchUser.login,
      display_name: twitchUser.display_name,
      profile_image_url: twitchUser.profile_image_url,
      broadcaster_type: twitchUser.broadcaster_type || 'none',
      email: twitchUser.email,
    })
  } catch (error) {
    console.error('Twitchプロフィール同期エラー:', error)
  }
}
