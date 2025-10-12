"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Twitter, Webhook, CheckCircle2, XCircle, Loader2, AlertCircle, Bell } from "lucide-react";

interface XConnection {
  id: string;
  scope: string[];
  expires_at: string | null;
  created_at: string;
}

interface DiscordWebhook {
  id: string;
  webhook_url: string;
  created_at: string;
}

export default function IntegrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [xConnection, setXConnection] = useState<XConnection | null>(null);
  const [discordWebhook, setDiscordWebhook] = useState<DiscordWebhook | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);

  useEffect(() => {
    // Check for OAuth callback messages
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success) {
      setMessage({ type: 'success', text: 'X連携が完了しました' });
    } else if (error) {
      const errorMessages: Record<string, string> = {
        invalid_callback: '無効なコールバックです',
        missing_pkce: 'セキュリティ検証に失敗しました',
        state_mismatch: 'セキュリティ検証に失敗しました（state不一致）',
        token_exchange_failed: 'トークン取得に失敗しました',
        callback_failed: 'コールバック処理に失敗しました',
      };
      setMessage({
        type: 'error',
        text: errorMessages[error] || 'エラーが発生しました',
      });
    }

    loadConnections();
  }, [searchParams]);

  const loadConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Load X connection
      const { data: xData } = await supabase
        .from('x_connections')
        .select('id, scope, expires_at, created_at')
        .eq('user_id', user.id)
        .single();

      setXConnection(xData);

      // Load Discord webhook
      const { data: discordData } = await supabase
        .from('discord_webhooks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setDiscordWebhook(discordData);

      // Check Push notification permission
      if ('Notification' in window) {
        setPushPermission(Notification.permission);

        if ('serviceWorker' in navigator && Notification.permission === 'granted') {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setPushSubscribed(!!subscription);
        }
      }
    } catch (error) {
      console.error('連携情報読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePushEnable = async () => {
    try {
      if (!('Notification' in window)) {
        alert('お使いのブラウザはプッシュ通知をサポートしていません');
        return;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission !== 'granted') {
        alert('通知の許可が必要です');
        return;
      }

      // Register service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Subscribe to push
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          alert('VAPID公開鍵が設定されていません');
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });

        // Send subscription to server
        const response = await fetch('/api/push/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });

        if (!response.ok) {
          throw new Error('購読の登録に失敗しました');
        }

        setPushSubscribed(true);
        alert('プッシュ通知を有効にしました！');
      }
    } catch (error: any) {
      console.error('プッシュ通知有効化エラー:', error);
      alert(`プッシュ通知の有効化に失敗しました: ${error.message}`);
    }
  };

  const handlePushDisable = async () => {
    if (!confirm('プッシュ通知を無効化しますか？')) return;

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          await subscription.unsubscribe();
          setPushSubscribed(false);
          alert('プッシュ通知を無効にしました');
        }
      }
    } catch (error) {
      console.error('プッシュ通知無効化エラー:', error);
      alert('プッシュ通知の無効化に失敗しました');
    }
  };

  const handleXConnect = async () => {
    setConnecting(true);
    try {
      // Call API to initiate OAuth flow
      const response = await fetch('/api/x/auth', {
        method: 'POST',
      });

      const { authUrl } = await response.json();

      if (authUrl) {
        // Redirect to X OAuth page
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('X連携開始エラー:', error);
      alert('X連携の開始に失敗しました');
      setConnecting(false);
    }
  };

  const handleXDisconnect = async () => {
    if (!confirm('X連携を解除しますか？配信通知が投稿されなくなります。')) {
      return;
    }

    try {
      const response = await fetch('/api/x/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setXConnection(null);
        alert('X連携を解除しました');
      } else {
        throw new Error('解除に失敗しました');
      }
    } catch (error) {
      console.error('X連携解除エラー:', error);
      alert('X連携の解除に失敗しました');
    }
  };

  const handleDiscordConnect = () => {
    // TODO: Implement Discord webhook setup
    alert('Discord Webhook設定は未実装です');
  };

  const handleDiscordDisconnect = async () => {
    if (!confirm('Discord Webhook連携を解除しますか？')) {
      return;
    }

    try {
      const response = await fetch('/api/discord/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setDiscordWebhook(null);
        alert('Discord連携を解除しました');
      } else {
        throw new Error('解除に失敗しました');
      }
    } catch (error) {
      console.error('Discord連携解除エラー:', error);
      alert('Discord連携の解除に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-display font-bold text-neutral-ink">連携</h1>
        <p className="mt-2 text-body text-neutral-sub">
          配信通知の投稿先を連携します
        </p>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <Card className={message.type === 'success' ? 'border-success/20 bg-success/5' : 'border-danger/20 bg-danger/5'}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-danger flex-shrink-0" />
              )}
              <p className="text-body text-neutral-ink">{message.text}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMessage(null)}
                className="ml-auto"
              >
                閉じる
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* X (Twitter) Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Twitter className="h-5 w-5" />
            X（Twitter）連携
          </CardTitle>
          <CardDescription>
            配信開始時にポストを自動投稿します（OAuth2 PKCE）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {xConnection ? (
            <>
              <div className="flex items-start gap-3 p-4 rounded-md border border-success/20 bg-success/5">
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-body font-medium text-neutral-ink">連携済み</p>
                  <p className="text-small text-neutral-sub mt-1">
                    連携日: {new Date(xConnection.created_at).toLocaleDateString('ja-JP')}
                  </p>
                  <p className="text-small text-neutral-sub">
                    スコープ: {xConnection.scope.join(', ')}
                  </p>
                  {xConnection.expires_at && (
                    <p className="text-small text-neutral-sub">
                      有効期限: {new Date(xConnection.expires_at).toLocaleDateString('ja-JP')}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleXDisconnect}
                className="text-danger border-danger/20 hover:bg-danger/10"
              >
                <XCircle className="h-4 w-4 mr-2" />
                連携解除
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 p-4 rounded-md border border-neutral-border bg-neutral-bg">
                <XCircle className="h-5 w-5 text-neutral-sub flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-body font-medium text-neutral-ink">未連携</p>
                  <p className="text-small text-neutral-sub mt-1">
                    X（Twitter）アカウントを連携すると、配信開始時に自動でポストが投稿されます
                  </p>
                </div>
              </div>
              <Button
                onClick={handleXConnect}
                disabled={connecting}
                className="bg-black hover:bg-neutral-800"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    連携中...
                  </>
                ) : (
                  <>
                    <Twitter className="h-4 w-4 mr-2" />
                    Xアカウントを連携
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Push Notification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            プッシュ通知
          </CardTitle>
          <CardDescription>
            配信開始時にブラウザ通知を受け取ります
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pushSubscribed ? (
            <>
              <div className="flex items-start gap-3 p-4 rounded-md border border-success/20 bg-success/5">
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-body font-medium text-neutral-ink">有効</p>
                  <p className="text-small text-neutral-sub mt-1">
                    プッシュ通知が有効になっています
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handlePushDisable}
                className="text-danger border-danger/20 hover:bg-danger/10"
              >
                <XCircle className="h-4 w-4 mr-2" />
                無効化
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 p-4 rounded-md border border-neutral-border bg-neutral-bg">
                <XCircle className="h-5 w-5 text-neutral-sub flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-body font-medium text-neutral-ink">無効</p>
                  <p className="text-small text-neutral-sub mt-1">
                    プッシュ通知を有効にすると、配信開始時にブラウザ通知を受け取れます
                  </p>
                </div>
              </div>
              <Button
                onClick={handlePushEnable}
                disabled={pushPermission === 'denied'}
              >
                {pushPermission === 'denied' ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    通知が拒否されています
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    プッシュ通知を有効化
                  </>
                )}
              </Button>
              {pushPermission === 'denied' && (
                <p className="text-small text-danger">
                  ブラウザの設定から通知を許可してください
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Information */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-small text-neutral-ink">
            <strong>重要:</strong> X連携はTwitchログインとは別です。配信通知を投稿するには、ここでXアカウントを連携してください。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
