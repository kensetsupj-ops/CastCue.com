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

  // Get the correct redirect URL from environment
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_ORIGIN
  if (!siteUrl) {
    console.error('[auth/callback] NEXT_PUBLIC_SITE_URL not configured')
    return new NextResponse('Server configuration error', { status: 500 })
  }

  // エラーパラメータがある場合は詳細をログ出力
  if (error || errorDescription) {
    console.error('[auth/callback] OAuth error:', {
      error,
      errorDescription,
      url: request.url
    })

    // メールエラーの場合でもセッションが作成されている可能性があるので確認
    if (errorDescription?.includes('email') || errorDescription?.includes('Email')) {
      console.log('[auth/callback] Email error detected in URL params, checking for existing session...')
      const supabase = await createClient()
      const { data: sessionData } = await supabase.auth.getSession()

      if (sessionData?.session) {
        console.log('[auth/callback] Session found despite OAuth error, continuing with authentication...')
        // プロフィール同期を実行
        await syncTwitchProfile(sessionData.session.user.id, sessionData.session.provider_token ?? undefined)
        return NextResponse.redirect(`${siteUrl}${next}`)
      } else {
        console.log('[auth/callback] No session found, user needs to retry authentication')
      }
    }
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
  console.warn('[auth/callback] No code or auth failed, redirecting to login', {
    hasCode: !!code,
    hasError: !!error,
    errorDescription
  })

  const errorMessage = errorDescription || error || 'no_code'
  return NextResponse.redirect(`${siteUrl}/login?error=auth_failed&message=${encodeURIComponent(errorMessage)}`)
}

async function syncTwitchProfile(userId: string, providerToken?: string) {
  console.log('[syncTwitchProfile] Starting Twitch profile sync for user:', userId)

  if (!providerToken) {
    console.log('[syncTwitchProfile] No provider token available, attempting basic profile creation')
    // プロバイダートークンがない場合でも基本的なプロフィールを作成
    try {
      const { supabaseAdmin } = await import('@/lib/db')
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)

      if (authUser?.user) {
        const identities = authUser.user.identities || []
        const twitchIdentity = identities.find((id: any) => id.provider === 'twitch')

        if (twitchIdentity) {
          console.log('[syncTwitchProfile] Creating basic profile from identity data')
          await supabaseAdmin.from('profiles').upsert({
            user_id: userId,
            twitch_user_id: twitchIdentity.id,
            login: twitchIdentity.identity_data?.name || twitchIdentity.identity_data?.preferred_username || 'unknown',
            display_name: twitchIdentity.identity_data?.full_name || twitchIdentity.identity_data?.name || 'Unknown User',
            profile_image_url: twitchIdentity.identity_data?.avatar_url || null,
            broadcaster_type: 'none',
            email: authUser.user.email || null,
          })
          console.log('[syncTwitchProfile] Basic profile created successfully')
        }
      }
    } catch (error) {
      console.error('[syncTwitchProfile] Error creating basic profile:', error)
    }
    return
  }

  try {
    // Twitch Helix APIでユーザー情報を取得
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID!,
      },
    })

    const responseData = await response.json()
    console.log('[syncTwitchProfile] Twitch API response status:', response.status)

    if (!responseData.data || responseData.data.length === 0) {
      console.log('[syncTwitchProfile] No user data from Twitch API')
      return
    }

    const twitchUser = responseData.data[0]
    console.log('[syncTwitchProfile] Got Twitch user data:', {
      id: twitchUser.id,
      login: twitchUser.login,
      display_name: twitchUser.display_name,
      hasEmail: !!twitchUser.email
    })

    // プロフィールをSupabaseに保存
    const { supabaseAdmin } = await import('@/lib/db')

    const { data: profileData, error: profileError } = await supabaseAdmin.from('profiles').upsert({
      user_id: userId,
      twitch_user_id: twitchUser.id,
      login: twitchUser.login,
      display_name: twitchUser.display_name,
      profile_image_url: twitchUser.profile_image_url,
      broadcaster_type: twitchUser.broadcaster_type || 'none',
      email: twitchUser.email || null,  // emailが取得できない場合はnullを設定
    }).select()

    if (profileError) {
      console.error('[syncTwitchProfile] Error upserting profile:', profileError)
    } else {
      console.log('[syncTwitchProfile] Profile upserted successfully:', profileData)
    }
  } catch (error) {
    console.error('[syncTwitchProfile] Unexpected error during profile sync:', error)
  }
}
