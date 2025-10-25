import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'
import { cookies } from 'next/headers'

// Twitch OAuth開始エンドポイント
export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_ORIGIN
  if (!siteUrl) {
    return new NextResponse('Server configuration error', { status: 500 })
  }

  const clientId = process.env.TWITCH_CLIENT_ID
  if (!clientId) {
    return new NextResponse('Twitch client ID not configured', { status: 500 })
  }

  // ランダムなstateを生成して検証用に保存
  const state = Math.random().toString(36).substring(7)
  const cookieStore = await cookies()
  cookieStore.set('twitch_auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10 // 10分
  })

  // Twitch OAuth URLを構築
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${siteUrl}/api/auth/twitch/callback`,
    response_type: 'code',
    scope: 'user:read:email',
    state
  })

  const authUrl = `https://id.twitch.tv/oauth2/authorize?${params.toString()}`

  return NextResponse.redirect(authUrl)
}