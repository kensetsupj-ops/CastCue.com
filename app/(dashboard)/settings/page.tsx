"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import { User, Clock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Image from "next/image";

interface Profile {
  twitch_user_id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  broadcaster_type: string;
  email?: string;
}

interface Settings {
  grace_timer: number;
  auto_action: "post" | "skip";
  notify_game_change: boolean;
  game_change_cooldown: number;
  game_change_whitelist: string[];
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [graceTimer, setGraceTimer] = useState<number>(90);
  const [autoAction, setAutoAction] = useState<"post" | "skip">("post");
  const [notifyGameChange, setNotifyGameChange] = useState<boolean>(true);
  const [gameChangeCooldown, setGameChangeCooldown] = useState<number>(10); // Minutes
  const [gameChangeWhitelist, setGameChangeWhitelist] = useState<string>("");
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      document.title = "設定 | CastCue";
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setProfile(profileData);

      // Load settings
      const settingsResponse = await fetch('/api/settings');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        const settings = settingsData.settings;

        setGraceTimer(settings.grace_timer);
        setAutoAction(settings.auto_action);
        setNotifyGameChange(settings.notify_game_change ?? true);
        setGameChangeCooldown((settings.game_change_cooldown ?? 600) / 60); // Convert seconds to minutes
        setGameChangeWhitelist((settings.game_change_whitelist ?? []).join(", "));
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      // Parse whitelist (comma-separated string to array)
      const whitelistArray = gameChangeWhitelist
        .split(',')
        .map(game => game.trim())
        .filter(game => game.length > 0);

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grace_timer: graceTimer,
          auto_action: autoAction,
          notify_game_change: notifyGameChange,
          game_change_cooldown: gameChangeCooldown * 60, // Convert minutes to seconds
          game_change_whitelist: whitelistArray,
        }),
      });

      if (!response.ok) {
        throw new Error('設定の保存に失敗しました');
      }

      setMessage({ type: 'success', text: '設定を保存しました' });
    } catch (error: any) {
      console.error('設定保存エラー:', error);
      setMessage({ type: 'error', text: `設定の保存に失敗しました: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-neutral-sub dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-display font-bold text-neutral-ink dark:text-gray-100">設定</h1>
        <p className="mt-2 text-body text-neutral-sub dark:text-gray-400">
          アカウント設定と連携管理
        </p>
      </div>

      {/* Success/Error Message Modal */}
      {message && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setMessage(null)}
        >
          <Card
            className={`max-w-md w-full mx-4 ${message.type === 'success' ? 'border-success' : 'border-danger'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {message.type === 'success' ? (
                    <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-danger flex-shrink-0" />
                  )}
                  <p className="text-body font-medium text-neutral-ink dark:text-gray-100">
                    {message.text}
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => setMessage(null)}
                    variant="default"
                  >
                    閉じる
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* プロフィール（読み取り専用） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-gray-100">
            <User className="h-5 w-5" />
            プロフィール
          </CardTitle>
          <CardDescription className="dark:text-gray-400">Twitchから取得された情報</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile ? (
            <>
              <div className="flex items-center gap-4">
                <Image
                  src={profile.profile_image_url}
                  alt={profile.display_name}
                  width={64}
                  height={64}
                  className="rounded-full"
                />
                <div>
                  <p className="text-body font-medium text-neutral-ink dark:text-gray-100">{profile.display_name}</p>
                  <p className="text-small text-neutral-sub dark:text-gray-400">@{profile.login}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-neutral-sub dark:text-gray-400">Twitch ID</label>
                  <p className="text-body text-neutral-ink dark:text-gray-100 mt-1">{profile.twitch_user_id}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-sub dark:text-gray-400">配信者タイプ</label>
                  <p className="text-body text-neutral-ink dark:text-gray-100 mt-1">
                    {profile.broadcaster_type === 'partner' ? 'パートナー' :
                     profile.broadcaster_type === 'affiliate' ? 'アフィリエイト' : '一般'}
                  </p>
                </div>

                {profile.email && (
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-neutral-sub dark:text-gray-400">メールアドレス</label>
                    <p className="text-body text-neutral-ink dark:text-gray-100 mt-1">{profile.email}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-border dark:border-gray-700">
                <p className="text-xs text-neutral-sub dark:text-gray-400">
                  ※ プロフィール情報はTwitchから自動的に同期されます。変更はTwitch側で行ってください。
                </p>
              </div>
            </>
          ) : (
            <p className="text-body text-neutral-sub dark:text-gray-400">プロフィール情報が見つかりません</p>
          )}
        </CardContent>
      </Card>

      {/* 猶予タイマー設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-gray-100">
            <Clock className="h-5 w-5" strokeWidth={1.75} />
            猶予タイマー設定
          </CardTitle>
          <CardDescription className="dark:text-gray-400">ブラウザ通知での自動処理までの待機時間</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-ink dark:text-gray-100 mb-2">
              猶予時間（秒）
            </label>
            <input
              type="number"
              value={graceTimer}
              onChange={(e) => setGraceTimer(parseInt(e.target.value))}
              min={30}
              max={300}
              step={10}
              className="w-full px-3 py-2 border border-neutral-border dark:border-gray-700 text-sm bg-neutral-surface dark:bg-gray-800 text-neutral-ink dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-focus"
            />
            <p className="text-xs text-neutral-sub dark:text-gray-400 mt-2">
              30〜300秒の間で設定できます（推奨: 90秒）
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-ink dark:text-gray-100 mb-2">
              タイムアウト時の動作
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 border border-neutral-border dark:border-gray-700 hover:bg-neutral-bg dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="autoAction"
                  value="post"
                  checked={autoAction === "post"}
                  onChange={(e) => setAutoAction(e.target.value as "post" | "skip")}
                  className="w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium text-neutral-ink dark:text-gray-100">自動投稿</p>
                  <p className="text-xs text-neutral-sub dark:text-gray-400">編集内容をそのまま投稿します</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 border border-neutral-border dark:border-gray-700 hover:bg-neutral-bg dark:hover:bg-gray-700 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="autoAction"
                  value="skip"
                  checked={autoAction === "skip"}
                  onChange={(e) => setAutoAction(e.target.value as "post" | "skip")}
                  className="w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium text-neutral-ink dark:text-gray-100">スキップ</p>
                  <p className="text-xs text-neutral-sub dark:text-gray-400">投稿せずにキャンセルします</p>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-border dark:border-gray-700">
            <Button size="sm" onClick={handleSaveSettings} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ゲーム変更通知設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="dark:text-gray-100">ゲーム変更通知</CardTitle>
          <CardDescription className="dark:text-gray-400">配信中のゲーム変更を検出して通知</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-body text-neutral-ink dark:text-gray-100 font-medium">ゲーム変更通知を有効化</p>
              <p className="text-small text-neutral-sub dark:text-gray-400">配信中にゲームが変更されたときに通知します</p>
            </div>
            <Switch
              checked={notifyGameChange}
              onCheckedChange={setNotifyGameChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-ink dark:text-gray-100 mb-2">
              通知間隔（クールダウン）
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={gameChangeCooldown}
                onChange={(e) => setGameChangeCooldown(parseInt(e.target.value) || 1)}
                min={1}
                max={60}
                step={1}
                disabled={!notifyGameChange}
                className="w-24 px-3 py-2 border border-neutral-border dark:border-gray-700 text-sm bg-neutral-surface dark:bg-gray-800 text-neutral-ink dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-50"
              />
              <span className="text-sm text-neutral-sub dark:text-gray-400">分</span>
            </div>
            <p className="text-xs text-neutral-sub dark:text-gray-400 mt-2">
              同じ配信内で次の通知まで待つ時間（1〜60分、推奨: 10分）
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-ink dark:text-gray-100 mb-2">
              通知対象ゲーム（ホワイトリスト）
            </label>
            <textarea
              value={gameChangeWhitelist}
              onChange={(e) => setGameChangeWhitelist(e.target.value)}
              placeholder="例: Minecraft, Apex Legends, Valorant"
              disabled={!notifyGameChange}
              rows={3}
              className="w-full px-3 py-2 border border-neutral-border dark:border-gray-700 text-sm bg-neutral-surface dark:bg-gray-800 text-neutral-ink dark:text-gray-100 placeholder:text-neutral-sub dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-focus disabled:opacity-50"
            />
            <p className="text-xs text-neutral-sub dark:text-gray-400 mt-2">
              通知したいゲームをカンマ区切りで入力（空欄の場合はすべてのゲーム変更を通知）
            </p>
          </div>

          <div className="pt-3 border-t border-neutral-border dark:border-gray-700">
            <div className="flex items-start gap-2 p-3 bg-neutral-bg dark:bg-gray-700 border border-neutral-border dark:border-gray-700 mb-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-neutral-ink dark:text-gray-100">ゲーム変更通知について</p>
                <p className="text-xs text-neutral-sub dark:text-gray-400 mt-1">
                  配信中にプレイゲームが変更されると自動的に検出し、Web Push通知を送信します。
                  通知から「テンプレートで投稿」または「編集して投稿」を選択できます。
                </p>
              </div>
            </div>

            <Button size="sm" onClick={handleSaveSettings} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
