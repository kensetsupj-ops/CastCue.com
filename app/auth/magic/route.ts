import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// マジックリンクトークンを処理するエンドポイント
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const type = searchParams.get('type')
  const email = searchParams.get('email')
  const next = searchParams.get('next') ?? '/dashboard'

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_ORIGIN
  if (!siteUrl) {
    return new NextResponse('Server configuration error', { status: 500 })
  }

  if (!token || !type || !email) {
    console.error('[auth/magic] Missing token, type, or email')
    return NextResponse.redirect(`${siteUrl}/login?error=invalid_link`)
  }

  try {
    const supabase = await createClient()

    // マジックリンクトークンを検証
    const { data, error } = await supabase.auth.verifyOtp({
      type: type as 'magiclink' | 'email',
      token: token,
      email: email
    })

    if (error) {
      console.error('[auth/magic] Token verification failed:', error)
      return NextResponse.redirect(`${siteUrl}/login?error=verification_failed`)
    }

    console.log('[auth/magic] Magic link verified successfully')

    // ダッシュボードにリダイレクト
    return NextResponse.redirect(`${siteUrl}${next}`)

  } catch (error) {
    console.error('[auth/magic] Unexpected error:', error)
    return NextResponse.redirect(`${siteUrl}/login?error=unexpected_error`)
  }
}