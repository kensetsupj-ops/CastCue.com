import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/db'

/**
 * カスタム認証ヘルパー
 * Supabaseのセッションが失敗した場合のフォールバック
 */
export async function getCurrentUser() {
  try {
    // まずSupabaseのセッションを確認
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (user && !error) {
      return { user, source: 'supabase' }
    }

    // Supabaseセッションがない場合、カスタムセッションを確認
    const cookieStore = await cookies()
    const userIdCookie = cookieStore.get('castcue_user_id')
    const profileCookie = cookieStore.get('castcue_profile')

    if (userIdCookie?.value) {
      // カスタムセッションが存在する場合、ユーザー情報を取得
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userIdCookie.value)

      if (userData?.user && !userError) {
        return {
          user: userData.user,
          source: 'custom',
          profile: profileCookie ? JSON.parse(profileCookie.value) : null
        }
      }
    }

    return { user: null, source: null }
  } catch (error) {
    console.error('[auth-helpers] Error getting current user:', error)
    return { user: null, source: null }
  }
}

/**
 * 認証チェック
 * ユーザーがログインしているかどうかを確認
 */
export async function requireAuth() {
  const { user } = await getCurrentUser()

  if (!user) {
    throw new Error('Authentication required')
  }

  return user
}

/**
 * セッションのクリア
 */
export async function clearSession() {
  const cookieStore = await cookies()

  // カスタムセッションクッキーを削除
  cookieStore.delete('castcue_user_id')
  cookieStore.delete('castcue_profile')

  // Supabaseのセッションもクリア
  const supabase = await createClient()
  await supabase.auth.signOut()
}