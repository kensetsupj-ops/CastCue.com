"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut, User, FileText, Clock, Loader2, Bell, BellOff, BellRing } from "lucide-react";

interface Profile {
  twitch_user_id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  broadcaster_type: string;
  email?: string;
}

interface Template {
  id: string;
  name: string;
  variant: string;
}

interface Settings {
  default_template_id: string | null;
  grace_timer: number;
  auto_action: "post" | "skip";
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(null);
  const [graceTimer, setGraceTimer] = useState<number>(90);
  const [autoAction, setAutoAction] = useState<"post" | "skip">("skip");

  // Web Push state
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Discord state
  const [discordConnected, setDiscordConnected] = useState(false);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const [discordMaskedUrl, setDiscordMaskedUrl] = useState("");
  const [discordLoading, setDiscordLoading] = useState(false);

  useEffect(() => {
    loadData();
    checkPushSubscription();
    checkDiscordConnection();
  }, []);

  const checkPushSubscription = async () => {
    try {
      if (!('Notification' in window)) {
        console.log('このブラウザは通知をサポートしていません');
        return;
      }

      setPushPermission(Notification.permission);

      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    } catch (error) {
      console.error('購読状態確認エラー:', error);
    }
  };

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker登録成功:', registration);
        return registration;
      } catch (error) {
        console.error('Service Worker登録失敗:', error);
        throw error;
      }
    }
    throw new Error('このブラウザはService Workerをサポートしていません');
  };

  const handleSubscribePush = async () => {
    try {
      setPushLoading(true);

      // 通知許可を要求
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== 'granted') {
        alert('通知が許可されませんでした');
        return;
      }

      // Service Workerを登録
      const registration = await registerServiceWorker();

      // VAPID公開鍵を取得
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID公開鍵が設定されていません');
      }

      // URLBase64をUint8Arrayに変換
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      // Push購読を作成
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // サーバーに購読情報を送信
      const response = await fetch('/api/push/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) {
        throw new Error('購読登録に失敗しました');
      }

      setIsSubscribed(true);
      alert('通知を有効にしました');
    } catch (error: any) {
      console.error('Push購読エラー:', error);
      alert(`通知の有効化に失敗しました: ${error.message}`);
    } finally {
      setPushLoading(false);
    }
  };

  const handleUnsubscribePush = async () => {
    try {
      setPushLoading(true);

      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          await subscription.unsubscribe();
          setIsSubscribed(false);
          alert('通知を無効にしました');
        }
      }
    } catch (error: any) {
      console.error('Push購読解除エラー:', error);
      alert(`通知の無効化に失敗しました: ${error.message}`);
    } finally {
      setPushLoading(false);
    }
  };

  // VAPID公開鍵をURLBase64からUint8Arrayに変換
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

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

      // Load templates
      const templatesResponse = await fetch('/api/templates');
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData.templates || []);
      }

      // Load settings
      const settingsResponse = await fetch('/api/settings');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        const settings = settingsData.settings;

        setDefaultTemplateId(settings.default_template_id);
        setGraceTimer(settings.grace_timer);
        setAutoAction(settings.auto_action);
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

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_template_id: defaultTemplateId,
          grace_timer: graceTimer,
          auto_action: autoAction,
        }),
      });

      if (!response.ok) {
        throw new Error('設定の保存に失敗しました');
      }

      alert('設定を保存しました');
    } catch (error: any) {
      console.error('設定保存エラー:', error);
      alert(`設定の保存に失敗しました: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const checkDiscordConnection = async () => {
    try {
      const response = await fetch('/api/discord/connect');
      if (response.ok) {
        const data = await response.json();
        setDiscordConnected(data.connected);
        if (data.connected) {
          setDiscordMaskedUrl(data.webhook_url);
        }
      }
    } catch (error) {
      console.error('Discord接続確認エラー:', error);
    }
  };

  const handleConnectDiscord = async () => {
    if (!discordWebhookUrl) {
      alert('Webhook URLを入力してください');
      return;
    }

    try {
      setDiscordLoading(true);

      const response = await fetch('/api/discord/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: discordWebhookUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to connect Discord webhook');
      }

      setDiscordConnected(true);
      setDiscordWebhookUrl("");
      alert('Discord Webhookを登録しました！テストメッセージが送信されています。');
      await checkDiscordConnection();
    } catch (error: any) {
      console.error('Discord接続エラー:', error);
      alert(`Discord Webhookの登録に失敗しました: ${error.message}`);
    } finally {
      setDiscordLoading(false);
    }
  };

  const handleDisconnectDiscord = async () => {
    if (!confirm('Discord Webhookの連携を解除しますか？')) {
      return;
    }

    try {
      setDiscordLoading(true);

      const response = await fetch('/api/discord/disconnect', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Discord webhook');
      }

      setDiscordConnected(false);
      setDiscordMaskedUrl("");
      alert('Discord Webhookの連携を解除しました');
    } catch (error: any) {
      console.error('Discord解除エラー:', error);
      alert(`Discord Webhookの解除に失敗しました: ${error.message}`);
    } finally {
      setDiscordLoading(false);
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
          <p className="text-sm text-neutral-sub">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-display font-bold text-neutral-ink">設定</h1>
        <p className="mt-2 text-body text-neutral-sub">
          アカウント設定と連携管理
        </p>
      </div>

      {/* プロフィール（読み取り専用） */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            プロフィール
          </CardTitle>
          <CardDescription>Twitchから取得された情報（編集不可）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile ? (
            <>
              <div className="flex items-center gap-4">
                <img
                  src={profile.profile_image_url}
                  alt={profile.display_name}
                  className="w-16 h-16"
                />
                <div>
                  <p className="text-body font-medium text-neutral-ink">{profile.display_name}</p>
                  <p className="text-small text-neutral-sub">@{profile.login}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-neutral-sub">Twitch ID</label>
                  <p className="text-body text-neutral-ink mt-1">{profile.twitch_user_id}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-sub">配信者タイプ</label>
                  <p className="text-body text-neutral-ink mt-1">
                    {profile.broadcaster_type === 'partner' ? 'パートナー' :
                     profile.broadcaster_type === 'affiliate' ? 'アフィリエイト' : '一般'}
                  </p>
                </div>

                {profile.email && (
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-neutral-sub">メールアドレス</label>
                    <p className="text-body text-neutral-ink mt-1">{profile.email}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-border">
                <p className="text-xs text-neutral-sub">
                  ※ プロフィール情報はTwitchから自動的に同期されます。変更はTwitch側で行ってください。
                </p>
              </div>
            </>
          ) : (
            <p className="text-body text-neutral-sub">プロフィール情報が見つかりません</p>
          )}
        </CardContent>
      </Card>

      {/* デフォルトテンプレート設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" strokeWidth={1.75} />
            デフォルトテンプレート
          </CardTitle>
          <CardDescription>通知の「テンプレートで投稿」ボタンで使用されるテンプレート</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-ink mb-2">
              テンプレートを選択
            </label>
            <select
              value={defaultTemplateId || ""}
              onChange={(e) => setDefaultTemplateId(e.target.value || null)}
              className="w-full px-3 py-2 border border-neutral-border text-sm bg-neutral-surface text-neutral-ink focus:outline-none focus:ring-2 focus:ring-focus"
            >
              <option value="">選択してください</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} (バリアント {template.variant})
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-sub mt-2">
              配信開始通知で即座に投稿する際に使用されます
            </p>
          </div>

          <div className="pt-3 border-t border-neutral-border">
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

      {/* 猶予タイマー設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" strokeWidth={1.75} />
            猶予タイマー設定
          </CardTitle>
          <CardDescription>編集ページでの自動処理までの待機時間</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-ink mb-2">
              猶予時間（秒）
            </label>
            <input
              type="number"
              value={graceTimer}
              onChange={(e) => setGraceTimer(parseInt(e.target.value))}
              min={30}
              max={300}
              step={10}
              className="w-full px-3 py-2 border border-neutral-border text-sm bg-neutral-surface text-neutral-ink focus:outline-none focus:ring-2 focus:ring-focus"
            />
            <p className="text-xs text-neutral-sub mt-2">
              30〜300秒の間で設定できます（推奨: 90秒）
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-ink mb-2">
              タイムアウト時の動作
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 border border-neutral-border hover:bg-neutral-bg cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="autoAction"
                  value="post"
                  checked={autoAction === "post"}
                  onChange={(e) => setAutoAction(e.target.value as "post" | "skip")}
                  className="w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium text-neutral-ink">自動投稿</p>
                  <p className="text-xs text-neutral-sub">編集内容をそのまま投稿します</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 border border-neutral-border hover:bg-neutral-bg cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="autoAction"
                  value="skip"
                  checked={autoAction === "skip"}
                  onChange={(e) => setAutoAction(e.target.value as "post" | "skip")}
                  className="w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium text-neutral-ink">スキップ</p>
                  <p className="text-xs text-neutral-sub">投稿せずにキャンセルします</p>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-border">
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

      {/* 通知設定 */}
      <Card>
        <CardHeader>
          <CardTitle>通知設定</CardTitle>
          <CardDescription>配信開始時の通知設定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              {pushPermission === 'granted' && isSubscribed ? (
                <BellRing className="h-5 w-5 text-success" />
              ) : pushPermission === 'denied' ? (
                <BellOff className="h-5 w-5 text-danger" />
              ) : (
                <Bell className="h-5 w-5 text-neutral-sub" />
              )}
              <div>
                <p className="text-body text-neutral-ink">Web Push通知</p>
                <p className="text-small text-neutral-sub">
                  {pushPermission === 'granted' && isSubscribed
                    ? '有効 - 配信開始時に通知が届きます'
                    : pushPermission === 'denied'
                    ? 'ブロック済み - ブラウザ設定から許可してください'
                    : 'ブラウザでプッシュ通知を受け取る'}
                </p>
              </div>
            </div>

            {pushPermission === 'denied' ? (
              <Button variant="outline" size="sm" disabled>
                ブロック済み
              </Button>
            ) : isSubscribed ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnsubscribePush}
                disabled={pushLoading}
                className="text-danger border-danger/20 hover:bg-danger/10"
              >
                {pushLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 mr-2" />
                    無効にする
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSubscribePush}
                disabled={pushLoading}
              >
                {pushLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    有効にする
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-body text-neutral-ink">メール通知</p>
              <p className="text-small text-neutral-sub">重要な更新をメールで受け取る</p>
            </div>
            <Button variant="outline" size="sm" disabled>未実装</Button>
          </div>
        </CardContent>
      </Card>

      {/* Discord Webhook設定 */}
      <Card>
        <CardHeader>
          <CardTitle>Discord Webhook（未実装）</CardTitle>
          <CardDescription>X投稿割当がなくなった際の代替通知先</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {discordConnected ? (
            <>
              <div className="flex items-start gap-3 p-3 bg-success/10 border border-success/20">
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-ink">連携済み</p>
                  <p className="text-xs text-neutral-sub mt-1 font-mono break-all">
                    {discordMaskedUrl}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectDiscord}
                  disabled={discordLoading}
                  className="text-danger border-danger/20 hover:bg-danger/10"
                >
                  {discordLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    '連携解除'
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-ink mb-2">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={discordWebhookUrl}
                  onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full px-3 py-2 border border-neutral-border text-sm bg-neutral-surface text-neutral-ink focus:outline-none focus:ring-2 focus:ring-focus"
                  disabled={discordLoading}
                />
                <p className="text-xs text-neutral-sub mt-2">
                  Discordサーバーの設定からWebhook URLを取得してください
                </p>
              </div>

              <div className="pt-3 border-t border-neutral-border">
                <Button
                  size="sm"
                  onClick={handleConnectDiscord}
                  disabled={discordLoading || !discordWebhookUrl}
                >
                  {discordLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      テスト中...
                    </>
                  ) : (
                    'テスト送信 & 登録'
                  )}
                </Button>
              </div>
            </>
          )}

          <div className="pt-3 border-t border-neutral-border">
            <div className="flex items-start gap-2 p-3 bg-neutral-bg border border-neutral-border">
              <div className="flex-1">
                <p className="text-xs font-medium text-neutral-ink">Discord Webhookについて</p>
                <p className="text-xs text-neutral-sub mt-1">
                  月間X投稿割当（12回）を使い切った場合、自動的にDiscord Webhookにフォールバックします。
                  Webhookを設定しておくことで、投稿できなくても配信開始を通知できます。
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 危険操作 */}
      <Card className="border-danger/20">
        <CardHeader>
          <CardTitle className="text-danger">危険操作</CardTitle>
          <CardDescription>ログアウトと連携解除</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-body text-neutral-ink">ログアウト</p>
              <p className="text-small text-neutral-sub">セッションを終了します</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-danger border-danger/20 hover:bg-danger/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              ログアウト
            </Button>
          </div>

          <div className="pt-3 border-t border-neutral-border">
            <p className="text-xs text-neutral-sub">
              ※ 連携解除は「連携」ページから行えます
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
