import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Force dynamic rendering (uses cookies and request headers)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // エラーパラメータがある場合は詳細をログ出力
  if (error || errorDescription) {
    console.error('[auth/callback] OAuth error:', {
      error,
      errorDescription,
      url: request.url
    })
  }

  // Get the correct redirect URL from environment
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_ORIGIN
  if (!siteUrl) {
    console.error('[auth/callback] NEXT_PUBLIC_SITE_URL not configured')
    return new NextResponse('Server configuration error', { status: 500 })
  }

  if (code) {
    const supabase = await createClient()
    console.log('[auth/callback] Attempting to exchange code for session...')

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[auth/callback] Session exchange error:', {
        error: error.message,
        status: error.status,
        details: error
      })

      // メールアドレスエラーの場合は特別処理を試みる
      if (error.message?.includes('email') || error.message?.includes('Email')) {
        console.log('[auth/callback] Email error detected, attempting workaround...')
        // エラーでもセッションが作成されている可能性があるので確認
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session) {
          console.log('[auth/callback] Session found despite error, continuing...')
          await syncTwitchProfile(sessionData.session.user.id, sessionData.session.provider_token ?? undefined)
          return NextResponse.redirect(`${siteUrl}${next}`)
        }
      }

      // エラーをログインページに伝える
      return NextResponse.redirect(`${siteUrl}/login?error=auth_failed&message=${encodeURIComponent(error.message)}`)
    }

    if (data.user) {
      console.log('[auth/callback] User authenticated successfully:', {
        userId: data.user.id,
        email: data.user.email,
        provider: data.user.app_metadata?.provider
      })

      // プロフィール同期を実行
      await syncTwitchProfile(data.user.id, data.session?.provider_token ?? undefined)

      // Always use NEXT_PUBLIC_SITE_URL for redirect
      const redirectUrl = `${siteUrl}${next}`
      console.log(`[auth/callback] Redirecting to: ${redirectUrl}`)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // エラーの場合はログインページへ
  console.warn('[auth/callback] No code or auth failed, redirecting to login')
  return NextResponse.redirect(`${siteUrl}/login?error=no_code`)
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
    const { supabaseAdmin } = await import('@/lib/db')

    await supabaseAdmin.from('profiles').upsert({
      user_id: userId,
      twitch_user_id: twitchUser.id,
      login: twitchUser.login,
      display_name: twitchUser.display_name,
      profile_image_url: twitchUser.profile_image_url,
      broadcaster_type: twitchUser.broadcaster_type || 'none',
      email: twitchUser.email || null,  // emailが取得できない場合はnullを設定
    })
  } catch (error) {
    console.error('Twitchプロフィール同期エラー:', error)
  }
}
