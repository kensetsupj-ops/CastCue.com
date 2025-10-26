import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_ORIGIN
  if (!siteUrl) {
    return new NextResponse('Server configuration error', { status: 500 })
  }

  // エラーチェック
  if (error) {
    console.error('[twitch/callback] OAuth error:', error)
    return NextResponse.redirect(`${siteUrl}/login?error=auth_failed&message=${encodeURIComponent(error)}`)
  }

  // State検証
  const cookieStore = await cookies()
  const savedState = cookieStore.get('twitch_auth_state')?.value

  if (!state || state !== savedState) {
    console.error('[twitch/callback] State mismatch')
    return NextResponse.redirect(`${siteUrl}/login?error=state_mismatch`)
  }

  // Stateクッキーを削除
  cookieStore.delete('twitch_auth_state')

  if (!code) {
    console.error('[twitch/callback] No authorization code')
    return NextResponse.redirect(`${siteUrl}/login?error=no_code`)
  }

  try {
    // Twitchトークンを取得
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID!,
        client_secret: process.env.TWITCH_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${siteUrl}/api/auth/twitch/callback`
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('[twitch/callback] Token exchange failed:', errorText)
      return NextResponse.redirect(`${siteUrl}/login?error=token_exchange_failed`)
    }

    const tokenData = await tokenResponse.json()
    const { access_token } = tokenData

    // Twitchユーザー情報を取得
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID!,
      }
    })

    if (!userResponse.ok) {
      console.error('[twitch/callback] Failed to get user info')
      return NextResponse.redirect(`${siteUrl}/login?error=user_info_failed`)
    }

    const userData = await userResponse.json()
    const twitchUser = userData.data[0]

    console.log('[twitch/callback] Got Twitch user:', {
      id: twitchUser.id,
      login: twitchUser.login,
      display_name: twitchUser.display_name,
      hasEmail: !!twitchUser.email
    })

    // 既存のプロフィールを確認
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('twitch_user_id', twitchUser.id)
      .single()

    let userId: string

    if (existingProfile) {
      // 既存ユーザー
      userId = existingProfile.user_id
      console.log('[twitch/callback] Existing user found:', userId)

      // 既存ユーザーのメタデータを更新（最新のTwitch情報で）
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          provider: 'twitch',
          twitch_id: twitchUser.id,
          twitch_login: twitchUser.login,
          display_name: twitchUser.display_name,
          profile_image_url: twitchUser.profile_image_url
        }
      })
    } else {
      // 新規ユーザーを作成
      // メールアドレスがない場合は仮のメールアドレスを使用
      const email = twitchUser.email || `twitch_${twitchUser.id}@castcue.local`

      console.log('[twitch/callback] Creating new user with email:', email)

      // ランダムなパスワードを生成
      const password = `twitch_${twitchUser.id}_${Math.random().toString(36).substring(7)}`

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password, // パスワードを設定
        email_confirm: true, // メール確認をスキップ
        user_metadata: {
          provider: 'twitch',
          twitch_id: twitchUser.id,
          twitch_login: twitchUser.login,
          display_name: twitchUser.display_name,
          profile_image_url: twitchUser.profile_image_url,
          temp_password: password // 一時的にパスワードを保存（後で使用）
        },
        app_metadata: {
          provider: 'twitch',
          providers: ['twitch']
        }
      })

      if (authError || !authData.user) {
        console.error('[twitch/callback] Failed to create user:', authError)

        // ユーザーが既に存在する場合の処理
        if (authError?.message?.includes('already exists')) {
          console.warn('[twitch/callback] User with this email already exists, creating new unique email')

          // 別のメールアドレスで再試行（タイムスタンプを追加）
          const retryEmail = `twitch_${twitchUser.id}_${Date.now()}@castcue.local`
          const { data: retryData, error: retryError } = await supabaseAdmin.auth.admin.createUser({
            email: retryEmail,
            email_confirm: true,
            user_metadata: {
              provider: 'twitch',
              twitch_id: twitchUser.id,
              twitch_login: twitchUser.login,
              display_name: twitchUser.display_name,
              profile_image_url: twitchUser.profile_image_url
            },
            app_metadata: {
              provider: 'twitch',
              providers: ['twitch']
            }
          })

          if (retryError || !retryData.user) {
            console.error('[twitch/callback] Retry failed:', retryError)
            return NextResponse.redirect(`${siteUrl}/login?error=user_creation_failed`)
          }

          userId = retryData.user.id
          console.log('[twitch/callback] User created with retry email:', userId)
        } else {
          console.error('[twitch/callback] User creation failed:', authError?.message)
          return NextResponse.redirect(`${siteUrl}/login?error=user_creation_failed`)
        }
      } else {
        userId = authData.user.id
        console.log('[twitch/callback] New user created:', userId)
      }
    }

    // プロフィールを作成/更新
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      user_id: userId,
      twitch_user_id: twitchUser.id,
      login: twitchUser.login,
      display_name: twitchUser.display_name,
      profile_image_url: twitchUser.profile_image_url,
      broadcaster_type: twitchUser.broadcaster_type || 'none',
      email: twitchUser.email || null
    })

    if (profileError) {
      console.error('[twitch/callback] Failed to upsert profile:', profileError)
    }

    // セッションを作成
    console.log('[twitch/callback] Setting up authentication for user:', userId)

    // ユーザー情報を取得
    const { data: userAuthData } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (userAuthData?.user) {
      // インパーソネーショントークンを生成（管理者権限で他のユーザーとしてログイン）
      console.log('[twitch/callback] Generating impersonation token')

      const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: userAuthData.user.email!,
        options: {
          redirectTo: `${siteUrl}/dashboard`
        }
      })

      if (!tokenError && tokenData) {
        // リカバリーリンクを使用してリダイレクト
        console.log('[twitch/callback] Redirecting with recovery link')
        return NextResponse.redirect(tokenData.properties.action_link)
      }

      // 別の方法：マジックリンクを生成
      console.log('[twitch/callback] Trying magic link as fallback')
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userAuthData.user.email!,
        options: {
          redirectTo: `${siteUrl}/dashboard`
        }
      })

      if (!linkError && linkData) {
        console.log('[twitch/callback] Redirecting with magic link')
        const magicLinkUrl = linkData.properties.action_link
        // カスタムマジックリンクハンドラーを通す
        const customMagicUrl = `${siteUrl}/auth/magic?token=${linkData.properties.hashed_token}&type=magiclink&next=/dashboard`
        return NextResponse.redirect(customMagicUrl)
      }
    }

    // フォールバック：直接ダッシュボードにリダイレクト
    const response = NextResponse.redirect(`${siteUrl}/dashboard`)

    // ユーザーIDをクッキーに保存（バックアップ）
    response.cookies.set('twitch_user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7日間
    })

    console.log('[twitch/callback] Authentication completed, redirecting to dashboard')
    return response

  } catch (error) {
    console.error('[twitch/callback] Unexpected error:', error)
    return NextResponse.redirect(`${siteUrl}/login?error=unexpected_error`)
  }
}