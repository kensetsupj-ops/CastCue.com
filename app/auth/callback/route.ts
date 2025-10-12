import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // プロフィール同期を実行
      await syncTwitchProfile(data.user.id, data.session?.provider_token)

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // エラーの場合はログインページへ
  return NextResponse.redirect(`${origin}/login`)
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
