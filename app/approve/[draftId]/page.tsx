"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon } from "lucide-react";
import Image from "next/image";

// 過去の効果的な投稿の型定義
interface PastPost {
  id: string;
  body: string;
  template: string;
  clicks: number;
  lift: number;
  conversion: number;
  datetime: string;
}

// X ユーザーの型定義（@メンション用）
interface XUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

export default function ApprovePageWrapper({ params }: { params: Promise<{ draftId: string }> }) {
  const resolvedParams = use(params);
  return <ApprovePage draftId={resolvedParams.draftId} />;
}

function ApprovePage({ draftId }: { draftId: string }) {
  const [draft, setDraft] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [defaultTemplate, setDefaultTemplate] = useState("");
  const [pastPosts, setPastPosts] = useState<PastPost[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedMediaIds, setUploadedMediaIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // 確認ダイアログの状態
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'post' | 'skip' | null>(null);

  // 完了メッセージの状態
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [completionType, setCompletionType] = useState<'posted' | 'skipped' | null>(null);

  // @メンション予測機能の状態
  const [following, setFollowing] = useState<XUser[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchDraftData() {
      let response: Response | null = null;
      try {
        setLoading(true);

        response = await fetch(`/api/drafts/${draftId}`);

        if (!response.ok) {
          const errorData = await response.json();
          const error = new Error(errorData.error || "Failed to fetch draft");
          (error as any).status = response.status;
          throw error;
        }

        const data = await response.json();

        setDraft(data.draft);
        setDefaultTemplate(data.defaultTemplate);
        setMessage(data.defaultTemplate);
        setPastPosts(data.pastPosts || []);
        console.log('[approve] Past posts:', data.pastPosts);
      } catch (err: any) {
        console.error("Error fetching draft data:", err);

        // より詳細なエラーメッセージを表示
        let errorMessage = "下書きの読み込みに失敗しました";
        const status = err.status || response?.status;

        if (err.message.includes("Draft not found") || status === 404) {
          errorMessage = "この投稿は既に処理されたか、存在しません";
        } else if (err.message.includes("Unauthorized") || status === 401) {
          errorMessage = "認証が必要です。ログインしてください。";
        } else if (err.message.includes("Forbidden") || status === 403) {
          errorMessage = "この下書きにアクセスする権限がありません。";
        }

        setError({ message: errorMessage, status });
      } finally {
        setLoading(false);
      }
    }

    fetchDraftData();
  }, [draftId]);

  // フォローリストを取得（localStorageキャッシュあり、1時間有効）
  useEffect(() => {
    async function fetchFollowing() {
      const CACHE_KEY = "x_following_cache";
      const CACHE_DURATION = 60 * 60 * 1000; // 1時間

      // キャッシュチェック
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setFollowing(data);
            return;
          }
        } catch (e) {
          // キャッシュが壊れている場合は無視
        }
      }

      // API から取得
      try {
        const response = await fetch("/api/x/following");
        if (response.ok) {
          const data = await response.json();
          setFollowing(data.following);

          // キャッシュに保存
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              data: data.following,
              timestamp: Date.now(),
            })
          );
        }
      } catch (err) {
        console.error("Failed to fetch following list:", err);
        // エラーは無視（メンション機能が使えないだけ）
      }
    }

    fetchFollowing();
  }, []);

  // Cleanup redirect timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルタイプチェック
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("サポートされていない画像形式です。JPEG、PNG、GIF、WEBPのみ対応しています。");
      return;
    }

    // ファイルサイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert("ファイルサイズが大きすぎます。5MB以下の画像を選択してください。");
      return;
    }

    setSelectedImage(file);

    // プレビュー生成
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 画像をアップロード
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload image");
      }

      const data = await response.json();
      setUploadedMediaIds([data.media_id]);
      console.log("Image uploaded:", data.media_id);
    } catch (err: any) {
      console.error("Error uploading image:", err);
      alert(`画像のアップロードに失敗しました: ${err.message}`);
      setSelectedImage(null);
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setUploadedMediaIds([]);
  };

  const handlePostClick = () => {
    setConfirmAction('post');
    setShowConfirmDialog(true);
  };

  const handleSkipClick = () => {
    setConfirmAction('skip');
    setShowConfirmDialog(true);
  };

  const handleConfirm = async () => {
    setShowConfirmDialog(false);

    if (confirmAction === 'post') {
      try {
        const response = await fetch(`/api/drafts/${draftId}/post`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            body: message,
            media_ids: uploadedMediaIds.length > 0 ? uploadedMediaIds : undefined,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to post");
        }

        // 投稿完了メッセージを表示
        setCompletionType('posted');
        setShowCompletionMessage(true);

        // 2秒後にダッシュボードへ遷移
        redirectTimerRef.current = setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
      } catch (err: any) {
        console.error("Error posting:", err);
        alert(`投稿に失敗しました: ${err.message}`);
      }
    } else if (confirmAction === 'skip') {
      try {
        const response = await fetch("/api/drafts/skip", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ draft_id: draftId }),
        });

        if (!response.ok) {
          throw new Error("Failed to skip");
        }

        // 投稿スキップ完了メッセージを表示
        setCompletionType('skipped');
        setShowCompletionMessage(true);

        // 2秒後にダッシュボードへ遷移
        redirectTimerRef.current = setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
      } catch (err: any) {
        console.error("Error skipping:", err);
        alert("投稿しないの処理に失敗しました");
      }
    }

    setConfirmAction(null);
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  // テキスト変更ハンドラ（@メンション検知を含む）
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newValue.slice(0, cursorPos);

    // 最後の @ を探す
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex >= 0) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

      // @ の後にスペースや改行がない場合のみメンション候補を表示
      if (!/[\s\n]/.test(textAfterAt)) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);
        setSelectedMentionIndex(0);
        return;
      }
    }

    setShowMentions(false);
  }, []);

  // メンション挿入
  const insertMention = useCallback((user: XUser) => {
    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = message.slice(0, cursorPos);
    const textAfterCursor = message.slice(cursorPos);

    // 最後の @ を探して置き換え
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtIndex >= 0) {
      const newText =
        textBeforeCursor.slice(0, lastAtIndex) +
        `@${user.username} ` +
        textAfterCursor;

      setMessage(newText);
      setShowMentions(false);

      // カーソル位置を調整
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = lastAtIndex + user.username.length + 2; // @ + username + space
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
          textareaRef.current.focus();
        }
      }, 0);
    }
  }, [message]);

  // キーボードナビゲーション
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // メンション候補のフィルタリング
    const filteredMentions = mentionQuery
      ? following.filter((user) =>
          user.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
          user.name.toLowerCase().includes(mentionQuery.toLowerCase())
        )
      : [];

    if (!showMentions || filteredMentions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedMentionIndex((prev) =>
        prev < filteredMentions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedMentionIndex((prev) =>
        prev > 0 ? prev - 1 : filteredMentions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      insertMention(filteredMentions[selectedMentionIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowMentions(false);
    }
  }, [showMentions, mentionQuery, following, selectedMentionIndex, insertMention]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-bg dark:bg-gray-900">
        <p className="text-body text-neutral-sub dark:text-gray-400">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-bg dark:bg-gray-900 p-4">
        <div className="max-w-md w-full">
          <div className="bg-neutral-surface dark:bg-gray-800 rounded-2xl p-8 border border-neutral-border dark:border-gray-700 shadow-xl text-center">
            <div className="mb-6">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl text-red-600 dark:text-red-400">×</span>
              </div>
              <h2 className="text-xl font-bold text-neutral-ink dark:text-gray-100 mb-2">
                投稿が見つかりません
              </h2>
              <p className="text-body text-neutral-sub dark:text-gray-400 leading-relaxed">
                {error.message}
              </p>
            </div>
            <Button
              onClick={() => window.location.href = "/dashboard"}
              className="w-full"
            >
              ダッシュボードに戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const charCount = message.length;
  const charLimit = 280;
  const isOverLimit = charCount > charLimit;

  // 過去の投稿を使用
  const handleUsePastPost = (post: PastPost) => {
    if (!draft) return;

    // 過去の投稿本文のタイトルとURLを現在の配信情報に置き換え
    let updatedBody = post.body;

    // 簡易的な置き換え（実際のタイトルとURLに置換）
    const lines = updatedBody.split('\n');
    if (lines.length >= 2) {
      lines[1] = draft.title;
    }
    if (lines.length >= 3) {
      lines[2] = draft.twitch_url;
    }

    setMessage(lines.join('\n'));
  };

  // メンション候補のフィルタリング
  const filteredMentions = mentionQuery
    ? following.filter((user) =>
        user.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        user.name.toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen bg-neutral-bg dark:bg-gray-900">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="border-b border-neutral-border dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">CastCue</span>
            <span className="text-neutral-sub dark:text-gray-500">|</span>
            <h1 className="text-base font-medium text-neutral-ink dark:text-gray-100">Xへの投稿</h1>
          </div>
        </div>

        {/* Post Editor */}
        <div className="p-4">
          <div className="space-y-3">
            {/* Textarea */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleMessageChange}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-neutral-ink dark:text-gray-100 text-base resize-none focus:outline-none placeholder:text-neutral-sub dark:placeholder:text-gray-500"
                rows={8}
                placeholder="いまどうしてる？"
              />

              {/* @メンション オートコンプリート */}
              {showMentions && filteredMentions.length > 0 && (
                <div className="absolute bottom-full left-0 w-full mb-1 bg-neutral-surface dark:bg-gray-800 border border-neutral-border dark:border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto z-10">
                  {filteredMentions.map((user, index) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => insertMention(user)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-neutral-bg dark:hover:bg-gray-700 ${
                        index === selectedMentionIndex ? "bg-neutral-bg dark:bg-gray-700" : ""
                      }`}
                    >
                      {user.profile_image_url && (
                        <Image
                          src={user.profile_image_url}
                          alt={user.username}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-ink dark:text-gray-100 truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-neutral-sub dark:text-gray-400 truncate">
                          @{user.username}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative rounded-lg overflow-hidden border border-neutral-border dark:border-gray-700">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={800}
                  height={800}
                  className="w-full max-h-96 object-cover"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white text-xl"
                >
                  ×
                </button>
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <p className="text-white text-sm">アップロード中...</p>
                  </div>
                )}
              </div>
            )}

            {/* Past Effective Posts */}
            <div className="border-t border-neutral-border dark:border-gray-700 pt-3">
              <p className="text-xs text-neutral-sub dark:text-gray-400 mb-2">過去の効果的な投稿</p>
              {pastPosts.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {pastPosts.map((post, index) => (
                    <button
                      key={post.id}
                      onClick={() => handleUsePastPost(post)}
                      className="flex-shrink-0 w-48 p-2.5 rounded border border-neutral-border dark:border-gray-700 hover:border-primary dark:hover:border-primary bg-neutral-surface dark:bg-gray-800 hover:bg-neutral-bg dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5 text-xs text-neutral-sub dark:text-gray-400">
                        <span className="font-medium">#{index + 1}</span>
                        <span>+{post.lift}人</span>
                        <span>{post.clicks}クリック</span>
                      </div>
                      <p className="text-xs text-neutral-ink dark:text-gray-200 line-clamp-2 leading-relaxed">
                        {post.body}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-sub dark:text-gray-400 py-2">過去の投稿データがありません</p>
              )}
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-border dark:border-gray-700">
              <div className="flex items-center gap-2">
                <label htmlFor="image-upload">
                  <div className="w-9 h-9 rounded-full hover:bg-primary/10 dark:hover:bg-primary/20 flex items-center justify-center cursor-pointer transition-colors">
                    <ImageIcon className="h-5 w-5 text-primary" />
                  </div>
                </label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-sm ${isOverLimit ? 'text-danger font-medium' : 'text-neutral-sub dark:text-gray-400'}`}>
                  {charLimit - charCount}
                </span>
                <Button
                  onClick={handleSkipClick}
                  variant="outline"
                  size="sm"
                  className="h-9"
                >
                  投稿しない
                </Button>
                <Button
                  onClick={handlePostClick}
                  size="sm"
                  disabled={isOverLimit || message.length === 0}
                  className="h-9 px-4"
                >
                  投稿
                </Button>
              </div>
            </div>

            {/* 確認ダイアログ */}
            {showConfirmDialog && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-neutral-surface dark:bg-gray-800 rounded-2xl p-8 w-80 border border-neutral-border dark:border-gray-700 shadow-xl">
                  <h3 className="text-xl font-bold text-neutral-ink dark:text-gray-100 mb-2 text-center">
                    {confirmAction === 'post' ? '投稿の確認' : '投稿しない確認'}
                  </h3>
                  <p className="text-sm text-neutral-sub dark:text-gray-400 mb-8 text-center leading-relaxed">
                    {confirmAction === 'post'
                      ? 'この内容でXに投稿しますか？'
                      : '投稿せずにダッシュボードに戻りますか？'
                    }
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={handleConfirm}
                      size="sm"
                      className="w-full h-11"
                    >
                      {confirmAction === 'post' ? '投稿する' : '投稿しない'}
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      size="sm"
                      className="w-full h-11"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 完了メッセージ */}
            {showCompletionMessage && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-neutral-surface dark:bg-gray-800 rounded-2xl p-10 w-80 border border-neutral-border dark:border-gray-700 shadow-xl">
                  <div className="text-center">
                    <div className="mb-4 flex justify-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        completionType === 'posted'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        <span className={`text-4xl font-bold ${
                          completionType === 'posted'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {completionType === 'posted' ? '✓' : '×'}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-neutral-ink dark:text-gray-100 mb-2">
                      {completionType === 'posted' ? 'Xに投稿しました' : '投稿をスキップしました'}
                    </h3>
                    <p className="text-sm text-neutral-sub dark:text-gray-400">
                      {completionType === 'posted'
                        ? 'ダッシュボードに戻ります...'
                        : 'ダッシュボードに戻ります...'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
