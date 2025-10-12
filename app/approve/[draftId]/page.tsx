"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Clock, Image as ImageIcon, Trophy, TrendingUp, MousePointerClick } from "lucide-react";

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
  const [timeLeft, setTimeLeft] = useState(90); // 猶予時間90秒
  const [defaultTemplate, setDefaultTemplate] = useState("");
  const [pastPosts, setPastPosts] = useState<PastPost[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedMediaIds, setUploadedMediaIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // @メンション予測機能の状態
  const [following, setFollowing] = useState<XUser[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function fetchDraftData() {
      try {
        setLoading(true);

        const response = await fetch(`/api/drafts/${draftId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch draft");
        }

        const data = await response.json();

        setDraft(data.draft);
        setDefaultTemplate(data.defaultTemplate);
        setMessage(data.defaultTemplate);
        setPastPosts(data.pastPosts || []);
      } catch (err: any) {
        console.error("Error fetching draft data:", err);
        alert("下書きの読み込みに失敗しました");
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

  // カウントダウンタイマー
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // TODO: 自動投稿またはスキップの処理
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

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

  const handlePost = async () => {
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

      alert("投稿しました！");
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Error posting:", err);
      alert(`投稿に失敗しました: ${err.message}`);
    }
  };

  const handleSkip = async () => {
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

      alert("スキップしました");
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Error skipping:", err);
      alert("スキップに失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-bg">
        <p className="text-body text-neutral-sub">読み込み中...</p>
      </div>
    );
  }

  const charCount = message.length;
  const charLimit = 280;
  const isOverLimit = charCount > charLimit;

  // 過去の投稿を編集エリアに反映する
  const handleUsePastPost = (post: PastPost) => {
    if (!draft) return;

    // 過去の投稿本文のタイトルとURLを現在の配信情報に置き換え
    // 簡易的な置き換え（実際はテンプレート変数を使用）
    let updatedBody = post.body;

    // 既存のタイトルを検索して置き換え（簡易版）
    const lines = updatedBody.split('\n');
    if (lines.length >= 2) {
      // 2行目がタイトルと仮定
      lines[1] = draft.title;
    }
    if (lines.length >= 3) {
      // 3行目がURLと仮定
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

  // キーボードナビゲーション
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
  }, [showMentions, filteredMentions, selectedMentionIndex]);

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

  return (
    <div className="min-h-screen bg-neutral-bg p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header with Timer */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-display font-bold text-neutral-ink">告知の確認</h1>
            <p className="mt-2 text-body text-neutral-sub">
              内容を確認して、投稿するかスキップしてください
            </p>
          </div>
          <div className="flex items-center gap-2 bg-warning/10 px-4 py-2 border border-warning/20">
            <Clock className="h-5 w-5 text-warning" />
            <div className="text-center">
              <p className="text-small text-neutral-sub">残り猶予</p>
              <p className="text-h3 font-bold text-neutral-ink">{timeLeft}秒</p>
            </div>
          </div>
        </div>

        {/* Alert if time is running out */}
        {timeLeft <= 30 && timeLeft > 0 && (
          <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20">
            <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
            <div className="flex-1">
              <p className="text-body text-neutral-ink font-medium">まもなく自動処理されます</p>
              <p className="text-small text-neutral-sub mt-1">
                {timeLeft}秒以内に操作しない場合、設定に従って自動投稿またはスキップされます
              </p>
            </div>
          </div>
        )}

        {/* Main Content - 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Editor */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>投稿内容</CardTitle>
                    <CardDescription>デフォルトテンプレートから生成された本文を編集できます</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMessage(defaultTemplate)}
                  >
                    テンプレートに戻す
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Message Input */}
                <div>
                  <label className="mb-2 block text-small font-medium text-neutral-ink">
                    本文
                  </label>
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={handleMessageChange}
                      onKeyDown={handleKeyDown}
                      className="w-full border border-neutral-border bg-neutral-surface px-4 py-3 text-body text-neutral-ink focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent transition-ui"
                      rows={10}
                      placeholder="告知メッセージを入力... (@でメンション候補を表示)"
                    />

                    {/* @メンション オートコンプリート */}
                    {showMentions && filteredMentions.length > 0 && (
                      <div className="absolute bottom-full left-0 w-full mb-1 bg-neutral-surface border border-neutral-border shadow-lg max-h-60 overflow-y-auto z-10">
                        {filteredMentions.map((user, index) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => insertMention(user)}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-neutral-bg transition-colors ${
                              index === selectedMentionIndex ? "bg-primary/10" : ""
                            }`}
                          >
                            {user.profile_image_url && (
                              <img
                                src={user.profile_image_url}
                                alt={user.username}
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-small font-medium text-neutral-ink truncate">
                                {user.name}
                              </p>
                              <p className="text-xs text-neutral-sub truncate">
                                @{user.username}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className={`text-small ${isOverLimit ? 'text-danger font-medium' : 'text-neutral-sub'}`}>
                      残り文字数: {charLimit - charCount}
                    </p>
                    {isOverLimit && (
                      <p className="text-small text-danger">文字数制限を超えています</p>
                    )}
                  </div>
                </div>

                {/* Thumbnail */}
                <div>
                  <label className="mb-2 block text-small font-medium text-neutral-ink">
                    画像（任意）
                  </label>
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Selected Image"
                        className="w-full border border-neutral-border"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2 bg-neutral-surface"
                        onClick={handleRemoveImage}
                      >
                        削除
                      </Button>
                      {uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <p className="text-white text-small">アップロード中...</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 bg-neutral-bg border-2 border-dashed border-neutral-border">
                      <div className="text-center">
                        <ImageIcon className="h-8 w-8 text-neutral-sub mx-auto mb-2" />
                        <p className="text-small text-neutral-ink mb-2">画像を選択してアップロード</p>
                        <p className="text-caption text-neutral-sub mb-4">
                          JPEG、PNG、GIF、WEBP（最大5MB）
                        </p>
                        <label htmlFor="image-upload">
                          <Button variant="outline" size="sm" asChild>
                            <span>画像を選択</span>
                          </Button>
                        </label>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handlePost}
                    className="flex-1"
                    size="lg"
                    disabled={isOverLimit}
                  >
                    投稿
                  </Button>
                  <Button
                    onClick={handleSkip}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    スキップ
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Past Effective Posts */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-success" strokeWidth={1.75} />
                  過去の効果的な投稿
                </CardTitle>
                <CardDescription>クリックして編集エリアに反映</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pastPosts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-small text-neutral-sub">
                      過去の投稿データがありません
                    </p>
                  </div>
                ) : (
                  pastPosts.map((post, index) => (
                    <div
                      key={post.id}
                      className="border border-neutral-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 bg-neutral-surface"
                    >
                      <div className="p-4 space-y-3">
                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            {index === 0 && <Trophy className="h-3 w-3 text-success" strokeWidth={2} />}
                            <span className="font-medium text-neutral-ink">#{index + 1}</span>
                          </div>
                          <div className="flex items-center gap-1 text-success">
                            <TrendingUp className="h-3 w-3" strokeWidth={2} />
                            <span className="font-semibold">+{post.lift}人</span>
                          </div>
                          <div className="flex items-center gap-1 text-primary">
                            <MousePointerClick className="h-3 w-3" strokeWidth={2} />
                            <span>{post.clicks}回</span>
                          </div>
                          <div className="text-neutral-sub">
                            {(post.conversion * 100).toFixed(0)}%
                          </div>
                        </div>

                        {/* Template & Date */}
                        <div className="flex items-center justify-between text-xs text-neutral-sub">
                          <span>{post.template}</span>
                          <span>{post.datetime}</span>
                        </div>

                        {/* Body Preview */}
                        <p className="text-xs text-neutral-ink leading-relaxed line-clamp-3 bg-neutral-bg p-2">
                          {post.body}
                        </p>

                        {/* Use Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => handleUsePastPost(post)}
                        >
                          この投稿を編集する
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-neutral-bg border-neutral-border">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-small font-medium text-neutral-ink">自動処理について</p>
                <p className="text-small text-neutral-sub">
                  猶予時間内に操作しない場合、設定に従って自動投稿またはスキップされます。
                  設定は「設定」ページから変更できます。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
