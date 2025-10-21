"use client";

import { Suspense } from "react";
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

function IntegrationsContent() {
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
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    confirmVariant?: 'default' | 'danger';
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Detect browser type
  const detectBrowser = (): 'edge' | 'chrome' | 'firefox' | 'safari' | 'other' => {
    if (typeof window === 'undefined') return 'other';

    const userAgent = window.navigator.userAgent.toLowerCase();

    if (userAgent.includes('edg/')) return 'edge';
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';

    return 'other';
  };

  // Get browser-specific notification unblock instructions
  const getNotificationInstructions = (browser: ReturnType<typeof detectBrowser>) => {
    const instructions = {
      edge: {
        name: 'Microsoft Edge',
        steps: [
          { step: '1', text: 'アドレスバー左の<strong>鍵アイコン</strong>（または<strong>情報アイコン</strong>）をクリック' },
          { step: '2', text: '<strong>「このサイトの権限」</strong>または<strong>「サイトの設定」</strong>を選択' },
          { step: '3', text: '<strong>「通知」</strong>の項目を見つけて<strong>「許可」</strong>に変更' },
          { step: '4', text: 'このページを再読み込み（F5キー）' },
        ],
        settingsUrl: 'edge://settings/content/notifications',
      },
      chrome: {
        name: 'Google Chrome',
        steps: [
          { step: '1', text: 'アドレスバー左の<strong>鍵アイコン</strong>（または<strong>サイト設定アイコン</strong>）をクリック' },
          { step: '2', text: '<strong>「サイトの設定」</strong>を選択' },
          { step: '3', text: '<strong>「通知」</strong>の項目を<strong>「許可」</strong>に変更' },
          { step: '4', text: 'このページを再読み込み（F5キー）' },
        ],
        settingsUrl: 'chrome://settings/content/notifications',
      },
      firefox: {
        name: 'Mozilla Firefox',
        steps: [
          { step: '1', text: 'アドレスバー左の<strong>鍵アイコン</strong>をクリック' },
          { step: '2', text: '<strong>「接続が安全です」</strong>横の<strong>「＞」</strong>をクリック' },
          { step: '3', text: '<strong>「詳細を表示」</strong>を選択' },
          { step: '4', text: '<strong>「許可設定」</strong>タブで<strong>「通知の送信」</strong>を<strong>「許可」</strong>に変更' },
          { step: '5', text: 'このページを再読み込み（F5キー）' },
        ],
        settingsUrl: 'about:preferences#privacy',
      },
      safari: {
        name: 'Safari',
        steps: [
          { step: '1', text: '<strong>Safari</strong>メニューから<strong>「設定」</strong>を開く' },
          { step: '2', text: '<strong>「Webサイト」</strong>タブを選択' },
          { step: '3', text: '左側のメニューから<strong>「通知」</strong>を選択' },
          { step: '4', text: 'このサイトを見つけて<strong>「許可」</strong>に変更' },
          { step: '5', text: 'このページを再読み込み（Command + R）' },
        ],
        settingsUrl: null,
      },
      other: {
        name: 'お使いのブラウザ',
        steps: [
          { step: '1', text: 'ブラウザの<strong>設定</strong>を開く' },
          { step: '2', text: '<strong>「プライバシー」</strong>または<strong>「サイトの設定」</strong>を探す' },
          { step: '3', text: '<strong>「通知」</strong>の設定を見つける' },
          { step: '4', text: 'このサイト（localhost:3000）を<strong>「許可」</strong>に変更' },
          { step: '5', text: 'このページを再読み込み' },
        ],
        settingsUrl: null,
      },
    };

    return instructions[browser];
  };

  // Helper function to convert VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      document.title = "連携 | CastCue";
    }, 0);
    return () => clearTimeout(timer);
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadConnections = async () => {
    // Force loading to false after 5 seconds as failsafe
    const failsafeTimeout = setTimeout(() => {
      console.warn('読み込みタイムアウト: 強制的にローディングを解除します');
      setLoading(false);
    }, 5000);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('ユーザー情報取得エラー:', userError);
        clearTimeout(failsafeTimeout);
        setLoading(false);
        router.push('/login');
        return;
      }
      if (!user) {
        clearTimeout(failsafeTimeout);
        setLoading(false);
        router.push('/login');
        return;
      }

      console.log('連携情報を読み込み中... user_id:', user.id);

      // Load X connection
      const { data: xData, error: xError } = await supabase
        .from('x_connections')
        .select('id, scope, expires_at, created_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (xError) {
        console.error('X連携情報取得エラー:', xError);
      } else {
        console.log('X連携情報:', xData ? '連携済み' : '未連携');
        setXConnection(xData);
      }

      // Load Discord webhook
      const { data: discordData, error: discordError } = await supabase
        .from('discord_webhooks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (discordError) {
        console.error('Discord連携情報取得エラー:', discordError);
      } else {
        console.log('Discord連携情報:', discordData ? '連携済み' : '未連携');
        setDiscordWebhook(discordData);
      }

      // Check Push notification permission
      if ('Notification' in window) {
        setPushPermission(Notification.permission);
        console.log('通知許可状態:', Notification.permission);

        if ('serviceWorker' in navigator && Notification.permission === 'granted') {
          console.log('Service Worker購読状態を確認中...');
          try {
            // Add timeout for Service Worker ready check
            const swReadyTimeout = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Service Worker ready timeout')), 2000)
            );

            const registration = await Promise.race([
              navigator.serviceWorker.ready,
              swReadyTimeout
            ]).catch((err) => {
              console.warn('Service Worker readyがタイムアウトしました:', err);
              return null;
            });

            if (registration) {
              const subscription = await registration.pushManager.getSubscription();
              setPushSubscribed(!!subscription);
              console.log('プッシュ購読状態:', subscription ? '購読済み' : '未購読');
            } else {
              console.log('Service Worker登録なし');
              setPushSubscribed(false);
            }
          } catch (swError) {
            console.error('Service Worker状態確認エラー:', swError);
            setPushSubscribed(false);
          }
        } else {
          console.log('Service Worker確認スキップ:', {
            hasServiceWorker: 'serviceWorker' in navigator,
            permission: Notification.permission
          });
        }
      }

      console.log('連携情報読み込み完了');
      clearTimeout(failsafeTimeout);
    } catch (error) {
      console.error('連携情報読み込みエラー:', error);
      clearTimeout(failsafeTimeout);
    } finally {
      setLoading(false);
    }
  };

  const handlePushEnableConfirm = () => {
    setConfirmDialog({
      show: true,
      title: 'プッシュ通知を有効化',
      message: '配信開始時にブラウザ通知を受け取るようにしますか？次の画面で通知の許可をお願いします。',
      confirmText: '有効化',
      confirmVariant: 'default',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, show: false });
        await handlePushEnable();
      }
    });
  };

  const handlePushEnable = async () => {
    try {
      console.log('プッシュ通知有効化を開始...');

      if (!('Notification' in window)) {
        setMessage({ type: 'error', text: 'お使いのブラウザはプッシュ通知をサポートしていません' });
        return;
      }

      // Request permission
      console.log('通知許可をリクエスト中...', 'Current:', Notification.permission);
      const permission = await Notification.requestPermission();
      console.log('通知許可の結果:', permission);

      // Ensure state is updated immediately
      setPushPermission(permission);
      console.log('pushPermission state updated to:', permission);

      if (permission !== 'granted') {
        console.log('通知が拒否されました。バナーを表示します。');
        setMessage({ type: 'error', text: '通知がブロックされています。以下の手順で設定を変更してください。' });
        return;
      }

      // Register service worker
      if ('serviceWorker' in navigator) {
        console.log('Service Workerを登録中...');

        // Check if service worker file exists
        try {
          const swResponse = await fetch('/sw.js', { method: 'HEAD' });
          if (!swResponse.ok) {
            throw new Error('Service Workerファイルが見つかりません');
          }
        } catch (error) {
          console.error('Service Worker確認エラー:', error);
          setMessage({ type: 'error', text: 'Service Workerファイルの読み込みに失敗しました' });
          return;
        }

        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker登録リクエスト完了');

        // Wait for service worker to be ready with timeout
        console.log('Service Workerの準備を待機中...');
        const readyTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Service Workerの準備がタイムアウトしました')), 10000)
        );

        try {
          await Promise.race([navigator.serviceWorker.ready, readyTimeout]);
          console.log('Service Worker準備完了');
        } catch (timeoutError: any) {
          console.error('Service Workerタイムアウト:', timeoutError);
          setMessage({ type: 'error', text: 'Service Workerの準備に時間がかかりすぎています。ページを再読み込みしてください。' });
          return;
        }

        // Subscribe to push
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        console.log('VAPID公開鍵:', vapidPublicKey ? '設定されています' : '未設定');

        if (!vapidPublicKey) {
          setMessage({ type: 'error', text: 'VAPID公開鍵が設定されていません。管理者に連絡してください。' });
          return;
        }

        console.log('プッシュ購読中...');

        // Check if already subscribed
        const existingSubscription = await registration.pushManager.getSubscription();

        let subscription;
        if (existingSubscription) {
          console.log('既存の購読を使用:', existingSubscription.endpoint);
          subscription = existingSubscription;
        } else {
          console.log('VAPID公開鍵を変換中...');
          const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
          console.log('変換完了、購読リクエスト送信...');

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey,
          });
          console.log('プッシュ購読完了:', subscription.endpoint);
        }

        // Send subscription to server
        console.log('サーバーに購読情報を送信中...');
        const response = await fetch('/api/push/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('サーバー登録エラー:', errorData);
          throw new Error(errorData.error || '購読の登録に失敗しました');
        }

        // Cleanup old subscriptions from other browsers/devices
        console.log('古い購読をクリーンアップ中...');
        const cleanupResponse = await fetch('/api/push/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentEndpoint: subscription.endpoint }),
        });

        if (cleanupResponse.ok) {
          const cleanupData = await cleanupResponse.json();
          console.log(`古い購読を削除: ${cleanupData.removed}件`);
        } else {
          console.warn('古い購読のクリーンアップに失敗しましたが、処理を続行します');
        }

        console.log('プッシュ通知有効化完了');
        setPushSubscribed(true);
        setMessage({ type: 'success', text: 'プッシュ通知を有効にしました！' });
      }
    } catch (error: any) {
      console.error('プッシュ通知有効化エラー:', error);
      console.error('エラー詳細:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      setMessage({
        type: 'error',
        text: `プッシュ通知の有効化に失敗しました: ${error.message}`
      });
    }
  };

  const handlePushDisable = async () => {
    setConfirmDialog({
      show: true,
      title: 'プッシュ通知を無効化',
      message: 'プッシュ通知を無効化しますか？配信開始時の通知が届かなくなります。',
      confirmText: '無効化',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
              await subscription.unsubscribe();
              setPushSubscribed(false);
              setMessage({ type: 'success', text: 'プッシュ通知を無効にしました' });
            }
          }
        } catch (error) {
          console.error('プッシュ通知無効化エラー:', error);
          setMessage({ type: 'error', text: 'プッシュ通知の無効化に失敗しました' });
        } finally {
          setConfirmDialog({ ...confirmDialog, show: false });
        }
      }
    });
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
    setConfirmDialog({
      show: true,
      title: 'X連携を解除',
      message: 'X連携を解除しますか？配信通知が投稿されなくなります。',
      confirmText: '解除',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetch('/api/x/disconnect', {
            method: 'POST',
          });

          if (response.ok) {
            setXConnection(null);
            setMessage({ type: 'success', text: 'X連携を解除しました' });
          } else {
            throw new Error('解除に失敗しました');
          }
        } catch (error) {
          console.error('X連携解除エラー:', error);
          setMessage({ type: 'error', text: 'X連携の解除に失敗しました' });
        } finally {
          setConfirmDialog({ ...confirmDialog, show: false });
        }
      }
    });
  };

  const handleDiscordConnect = () => {
    // TODO: Implement Discord webhook setup
    setMessage({ type: 'error', text: 'Discord Webhook設定は未実装です' });
  };

  const handleDiscordDisconnect = async () => {
    setConfirmDialog({
      show: true,
      title: 'Discord連携を解除',
      message: 'Discord Webhook連携を解除しますか？',
      confirmText: '解除',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetch('/api/discord/disconnect', {
            method: 'POST',
          });

          if (response.ok) {
            setDiscordWebhook(null);
            setMessage({ type: 'success', text: 'Discord連携を解除しました' });
          } else {
            throw new Error('解除に失敗しました');
          }
        } catch (error) {
          console.error('Discord連携解除エラー:', error);
          setMessage({ type: 'error', text: 'Discord連携の解除に失敗しました' });
        } finally {
          setConfirmDialog({ ...confirmDialog, show: false });
        }
      }
    });
  };

  const handleTestNotification = async () => {
    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('テスト通知の送信に失敗しました');
      }

      const data = await response.json();

      if (data.sent > 0) {
        setMessage({ type: 'success', text: 'テスト通知を送信しました。ブラウザ通知を確認してください。' });
      } else {
        setMessage({ type: 'error', text: 'プッシュ通知の購読が見つかりませんでした。' });
      }
    } catch (error: any) {
      console.error('テスト通知エラー:', error);
      setMessage({ type: 'error', text: `テスト通知の送信に失敗しました: ${error.message}` });
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
        <h1 className="text-display font-bold text-neutral-ink dark:text-gray-100">連携</h1>
        <p className="mt-2 text-body text-neutral-sub dark:text-gray-400">
          配信通知の投稿先を連携します
        </p>
      </div>

      {/* Confirmation Dialog Modal */}
      {confirmDialog.show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setConfirmDialog({ ...confirmDialog, show: false })}
        >
          <Card
            className={`max-w-md w-full mx-4 ${confirmDialog.confirmVariant === 'danger' ? 'border-danger' : 'border-primary'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-body font-semibold text-neutral-ink dark:text-gray-100">
                    {confirmDialog.title}
                  </h3>
                  <p className="mt-2 text-body text-neutral-sub dark:text-gray-400">
                    {confirmDialog.message}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={confirmDialog.onConfirm}
                    variant="default"
                    className={confirmDialog.confirmVariant === 'danger' ? 'bg-danger hover:bg-danger/90' : 'bg-primary hover:bg-primary/90'}
                  >
                    {confirmDialog.confirmText || '実行'}
                  </Button>
                  <Button
                    onClick={() => setConfirmDialog({ ...confirmDialog, show: false })}
                    variant="outline"
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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

      {/* X (Twitter) Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-gray-100">
            X（Twitter）連携
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            配信開始時にポストを自動投稿します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {xConnection ? (
            <>
              <div className="flex items-start gap-3 p-4 rounded-md border border-success/20 dark:border-success/30 bg-success/5 dark:bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-body font-medium text-neutral-ink dark:text-gray-100">連携済み</p>
                  <p className="text-small text-neutral-sub dark:text-gray-400 mt-1">
                    連携日: {new Date(xConnection.created_at).toLocaleDateString('ja-JP')}
                  </p>
                  <p className="text-small text-neutral-sub dark:text-gray-400">
                    スコープ: {xConnection.scope.join(', ')}
                  </p>
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
              <div className="flex items-start gap-3 p-4 rounded-md border border-neutral-border dark:border-gray-700 bg-neutral-bg dark:bg-gray-700">
                <XCircle className="h-5 w-5 text-neutral-sub dark:text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-body font-medium text-neutral-ink dark:text-gray-100">未連携</p>
                  <p className="text-small text-neutral-sub dark:text-gray-400 mt-1">
                    X（Twitter）アカウントを連携すると、配信開始時に自動でポストが投稿されます
                  </p>
                </div>
              </div>
              <Button
                onClick={handleXConnect}
                disabled={connecting}
                className="bg-black hover:bg-neutral-800"
                data-tutorial-target="x-connect-button"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    連携中...
                  </>
                ) : (
                  <>
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
          <CardTitle className="flex items-center gap-2 dark:text-gray-100">
            <Bell className="h-5 w-5" />
            プッシュ通知
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            配信開始時にブラウザ通知を受け取ります
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pushSubscribed ? (
            <>
              <div className="flex items-start gap-3 p-4 rounded-md border border-success/20 dark:border-success/30 bg-success/5 dark:bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-body font-medium text-neutral-ink dark:text-gray-100">有効</p>
                  <p className="text-small text-neutral-sub dark:text-gray-400 mt-1">
                    プッシュ通知が有効になっています
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleTestNotification}
                  variant="outline"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  テスト通知を送信
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePushDisable}
                  className="text-danger border-danger/20 hover:bg-danger/10"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  無効化
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 p-4 rounded-md border border-neutral-border dark:border-gray-700 bg-neutral-bg dark:bg-gray-700">
                <XCircle className="h-5 w-5 text-neutral-sub dark:text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-body font-medium text-neutral-ink dark:text-gray-100">無効</p>
                  <p className="text-small text-neutral-sub dark:text-gray-400 mt-1">
                    プッシュ通知を有効にすると、配信開始時にブラウザ通知を受け取れます
                  </p>
                </div>
              </div>
              {(() => {
                console.log('[Banner Check] pushPermission:', pushPermission, 'pushSubscribed:', pushSubscribed);
                return pushPermission === 'denied';
              })() ? (
                (() => {
                  console.log('[Banner Display] Showing notification blocked banner');
                  const browser = detectBrowser();
                  const instructions = getNotificationInstructions(browser);

                  return (
                    <Card className="border-warning bg-warning/5 dark:bg-warning/10">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                          <div className="flex-1 space-y-3">
                            <div>
                              <h4 className="font-semibold text-neutral-ink dark:text-gray-100">
                                ブラウザ通知がブロックされています
                              </h4>
                              <p className="mt-2 text-small text-neutral-sub dark:text-gray-400">
                                配信開始時に即座に通知を受け取るには、ブラウザの通知を許可してください。
                              </p>
                            </div>

                            <details className="group">
                              <summary className="cursor-pointer text-small font-medium text-primary hover:underline list-none">
                                <span className="inline-flex items-center gap-1">
                                  解除方法を確認
                                  <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </span>
                              </summary>
                              <div className="mt-3 pl-4 border-l-2 border-primary/20">
                                <p className="text-small font-medium text-neutral-ink dark:text-gray-100 mb-2">
                                  {instructions.name}での解除手順:
                                </p>
                                <ol className="space-y-2 text-small text-neutral-sub dark:text-gray-400">
                                  {instructions.steps.map((item) => (
                                    <li key={item.step} className="flex gap-2">
                                      <span className="font-medium text-primary flex-shrink-0">{item.step}.</span>
                                      <span dangerouslySetInnerHTML={{ __html: item.text }} />
                                    </li>
                                  ))}
                                </ol>
                                {instructions.settingsUrl && (
                                  <div className="mt-3 p-3 bg-neutral-bg dark:bg-gray-700 rounded-md">
                                    <p className="text-small text-neutral-sub dark:text-gray-400">
                                      💡 <strong>ヒント:</strong> 通知設定は <code className="px-1.5 py-0.5 bg-neutral-border dark:bg-gray-600 rounded text-xs">{instructions.settingsUrl}</code> からも変更できます
                                    </p>
                                  </div>
                                )}
                              </div>
                            </details>

                            <Button
                              onClick={() => window.location.reload()}
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto"
                            >
                              設定変更後、ページを再読み込み
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()
              ) : (
                <Button
                  onClick={handlePushEnableConfirm}
                  data-tutorial-target="push-enable-button"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  プッシュ通知を有効化
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Information */}
      <Card className="border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/10">
        <CardContent className="p-4">
          <p className="text-small text-neutral-ink dark:text-gray-100">
            <strong>重要:</strong> X連携はTwitchログインとは別です。配信通知を投稿するには、ここでXアカウントを連携してください。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <IntegrationsContent />
    </Suspense>
  );
}
