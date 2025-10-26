'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * クライアントサイドで認証状態を確認
 * Supabaseセッションまたはカスタムセッションを確認
 */
export async function checkClientAuth() {
  const supabase = createClient()

  // まずSupabaseセッションを確認
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    return { isAuthenticated: true, source: 'supabase', session }
  }

  // Supabaseセッションがない場合、カスタムセッションを確認
  if (typeof window !== 'undefined') {
    const hasCastcueUserId = document.cookie
      .split('; ')
      .find(row => row.startsWith('castcue_user_id='))

    const hasCastcueProfile = document.cookie
      .split('; ')
      .find(row => row.startsWith('castcue_profile='))

    if (hasCastcueUserId) {
      return {
        isAuthenticated: true,
        source: 'custom',
        profile: hasCastcueProfile ? JSON.parse(decodeURIComponent(hasCastcueProfile.split('=')[1])) : null
      }
    }
  }

  return { isAuthenticated: false, source: null }
}

/**
 * 認証が必要なページで使用
 * 認証されていない場合はログインページにリダイレクト
 */
export async function requireClientAuth(router: any) {
  const authStatus = await checkClientAuth()

  if (!authStatus.isAuthenticated) {
    router.push('/login')
    return null
  }

  return authStatus
}