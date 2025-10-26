import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/db'

/**
 * APIルート用の認証ヘルパー
 * Supabaseセッションまたはカスタムセッションを確認
 */
export async function getAuthUser(req?: NextRequest) {
  try {
    // まずSupabaseセッションを確認
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()

    if (user && !error) {
      return { user, source: 'supabase' }
    }

    // Supabaseセッションがない場合、カスタムセッションを確認
    const userIdCookie = cookieStore.get('castcue_user_id')

    if (userIdCookie?.value) {
      // ユーザーIDから完全なユーザー情報を取得
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userIdCookie.value)

      if (userData?.user) {
        return {
          user: userData.user,
          source: 'custom'
        }
      }

      // auth.usersテーブルにない場合、profilesテーブルから取得を試みる
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('user_id, email, display_name')
        .eq('user_id', userIdCookie.value)
        .single()

      if (profile) {
        // 簡易的なユーザーオブジェクトを作成
        return {
          user: {
            id: profile.user_id,
            email: profile.email || `twitch_${profile.user_id}@castcue.local`,
            // その他の必要な属性
          } as any,
          source: 'custom-profile'
        }
      }
    }

    return { user: null, source: null }
  } catch (error) {
    console.error('[api-auth] Error getting auth user:', error)
    return { user: null, source: null }
  }
}