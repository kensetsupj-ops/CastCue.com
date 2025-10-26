"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { requireClientAuth, checkClientAuth } from "@/lib/client-auth";

interface Template {
  id: string;
  name: string;
  category: string;
  usageCount: number;
  avgCalledViewers: number;
  body: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [lastStreamTitle, setLastStreamTitle] = useState<string>("");
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDefaultPrompt, setShowDefaultPrompt] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [pendingTemplateName, setPendingTemplateName] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      document.title = "テンプレート | CastCue";
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchLastStreamTitle();
    fetchDefaultTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchLastStreamTitle() {
    try {
      const authStatus = await checkClientAuth();
      if (!authStatus.isAuthenticated) return;

      // 最新の配信を取得
      const response = await fetch("/api/streams");
      if (!response.ok) return;

      const data = await response.json();
      if (data.streams && data.streams.length > 0) {
        // 最新の配信のタイトルを取得（仮にstreamsにtitleフィールドがある場合）
        // もしtitleがない場合は、draftsから取得する
        const latestStream = data.streams[0];

        // draftsから最新のタイトルを取得
        const { data: drafts } = await supabase
          .from("drafts")
          .select("title")
          .eq("stream_id", latestStream.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (drafts && drafts.length > 0) {
          setLastStreamTitle(drafts[0].title);
        }
      }
    } catch (err) {
      console.error("Error fetching last stream title:", err);
    }
  }

  async function fetchDefaultTemplate() {
    try {
      const response = await fetch("/api/settings/default-template");
      if (!response.ok) return;

      const data = await response.json();
      setDefaultTemplateId(data.default_template_id);
    } catch (err) {
      console.error("Error fetching default template:", err);
    }
  }

  async function fetchTemplates() {
    try {
      setLoading(true);
      setError(null);

      // 認証チェック（Supabaseセッションまたはカスタムセッション）
      const authStatus = await requireClientAuth(router);
      if (!authStatus) {
        return; // リダイレクト処理はrequireClientAuthが行う
      }

      const response = await fetch("/api/templates");

      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err: any) {
      console.error("Error fetching templates:", err);
      setError("テンプレートの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (template: Template) => {
    // メッセージをクリア
    setSuccessMessage(null);
    setError(null);
    setEditingTemplate(template);
    setIsEditing(true);
  };

  const handleNew = () => {
    // メッセージをクリア
    setSuccessMessage(null);
    setError(null);
    setEditingTemplate({
      id: "",
      name: "",
      category: "",
      usageCount: 0,
      avgCalledViewers: 0,
      body: "",
    });
    setIsEditing(true);
  };

  const setDefaultTemplate = async (templateId: string, templateName?: string) => {
    try {
      setError(null);
      setSuccessMessage(null);

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!templateId || !uuidRegex.test(templateId)) {
        console.error("Invalid template ID:", templateId);
        setError("無効なテンプレートIDです");
        return;
      }

      const response = await fetch("/api/settings/default-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to set default template");
      }

      // Update local state
      setDefaultTemplateId(templateId);

      // ページトップにスクロール（メッセージが見えるように）
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Show success message with template name
      const message = templateName
        ? `${templateName}がデフォルトに設定されました`
        : "デフォルトテンプレートを設定しました";
      setSuccessMessage(message);
    } catch (err: any) {
      console.error("Error setting default template:", err);
      setError(`デフォルトテンプレートの設定に失敗しました: ${err.message}`);
    }
  };

  const handleSave = async () => {
    if (!editingTemplate) return;

    // クライアント側バリデーション
    if (!editingTemplate.name || editingTemplate.name.trim() === "") {
      setError("テンプレート名を入力してください");
      return;
    }
    if (editingTemplate.name.length > 100) {
      setError("テンプレート名は100文字以内で入力してください");
      return;
    }
    if (!editingTemplate.body || editingTemplate.body.trim() === "") {
      setError("本文を入力してください");
      return;
    }
    if (editingTemplate.body.length > 500) {
      setError("本文は500文字以内で入力してください");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      const payload = {
        name: editingTemplate.name,
        body: editingTemplate.body,
        category: editingTemplate.category,
      };

      // テンプレート名を保存（後で使用）
      const templateName = editingTemplate.name;

      let response;
      let savedTemplateId = editingTemplate.id;

      if (editingTemplate.id) {
        // 更新
        response = await fetch(`/api/templates/${editingTemplate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // 新規作成
        response = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save template");
      }

      // Get saved template ID for new templates
      if (!editingTemplate.id) {
        const data = await response.json();
        savedTemplateId = data.template.id;
      }

      // 保存成功後、すぐにローディング状態を解除して編集画面を閉じる
      setSubmitting(false);
      setIsEditing(false);
      setEditingTemplate(null);

      // ページトップにスクロール（メッセージが見えるように）
      window.scrollTo({ top: 0, behavior: "smooth" });

      // データ再取得
      fetchTemplates().catch(err => {
        console.error("Error fetching templates:", err);
      });

      // デフォルト設定のプロンプトを表示（新規作成・編集の両方）
      if (savedTemplateId) {
        setPendingTemplateId(savedTemplateId);
        setPendingTemplateName(templateName);
        setShowDefaultPrompt(true);
      }
    } catch (err: any) {
      console.error("Error saving template:", err);
      setError(`保存に失敗しました: ${err.message}`);
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (templateId: string) => {
    setDeletingTemplateId(templateId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTemplateId) return;

    try {
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(`/api/templates/${deletingTemplateId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete template");
      }

      // 再取得
      await fetchTemplates();

      // ページトップにスクロール（メッセージが見えるように）
      window.scrollTo({ top: 0, behavior: "smooth" });

      setSuccessMessage("テンプレートを削除しました");
      setDeletingTemplateId(null);
    } catch (err: any) {
      console.error("Error deleting template:", err);
      setError("削除に失敗しました");
      setDeletingTemplateId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingTemplateId(null);
  };

  const handleSetDefaultConfirm = () => {
    if (pendingTemplateId && pendingTemplateName) {
      setDefaultTemplate(pendingTemplateId, pendingTemplateName);
    }
    setShowDefaultPrompt(false);
    setPendingTemplateId(null);
    setPendingTemplateName(null);
  };

  const handleSetDefaultSkip = () => {
    setShowDefaultPrompt(false);
    setPendingTemplateId(null);
    setPendingTemplateName(null);

    // スキップした場合は保存完了メッセージを表示（自動消去しない）
    setSuccessMessage("テンプレートを保存しました");
  };

  const insertStreamTitle = () => {
    if (!textareaRef.current || !editingTemplate) return;

    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = editingTemplate.body.slice(0, cursorPos);
    const textAfterCursor = editingTemplate.body.slice(cursorPos);

    // プレースホルダー {配信タイトル} を挿入
    const placeholder = "{配信タイトル}";
    const newText = textBeforeCursor + placeholder + textAfterCursor;

    setEditingTemplate({
      ...editingTemplate,
      body: newText,
    });

    // カーソル位置を調整（挿入したプレースホルダーの後ろに移動）
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = cursorPos + placeholder.length;
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-ink dark:text-gray-100">テンプレート</h1>
          <p className="text-neutral-sub dark:text-gray-400">投稿文を設定して自動投稿</p>
        </div>
        <Button onClick={handleNew} data-tutorial-target="create-template-button">
          <Plus className="h-4 w-4 mr-2" />
          新規テンプレート
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-danger/10 dark:bg-danger/20 border border-danger/20 dark:border-danger/30 text-danger px-4 py-3 rounded flex items-start justify-between gap-4">
          <span className="flex-1">{error}</span>
          <button
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
            onClick={() => setError(null)}
          >
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-success/10 dark:bg-success/20 border border-success/20 dark:border-success/30 text-success px-4 py-3 rounded flex items-start justify-between gap-4">
          <span className="flex-1">{successMessage}</span>
          <button
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
            onClick={() => setSuccessMessage(null)}
          >
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>
      )}

      {/* Default Template Prompt */}
      {showDefaultPrompt && pendingTemplateName && (
        <Card className="border-primary dark:border-primary/50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <p className="text-neutral-ink dark:text-gray-100 font-medium">
                {pendingTemplateName}をデフォルトテンプレートに設定しますか？
              </p>
              <div className="flex gap-2">
                <Button onClick={handleSetDefaultConfirm} variant="default" data-tutorial-target="set-default-confirm">
                  デフォルトに設定
                </Button>
                <Button onClick={handleSetDefaultSkip} variant="outline">
                  スキップ
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      {deletingTemplateId && (
        <Card className="border-danger dark:border-danger/50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <p className="text-neutral-ink dark:text-gray-100 font-medium">
                このテンプレートを削除してもよろしいですか？
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleDeleteConfirm}
                  className="bg-danger hover:bg-danger/90 text-white"
                >
                  削除
                </Button>
                <Button onClick={handleDeleteCancel} variant="outline">
                  キャンセル
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-neutral-sub dark:text-gray-400">読み込み中...</p>
          </div>
        </div>
      ) : !isEditing ? (
        <>
          {/* Template List */}
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={defaultTemplateId === template.id ? "border-primary dark:border-primary/50 border-2" : ""}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg dark:text-gray-100">{template.name}</CardTitle>
                        {defaultTemplateId === template.id && (
                          <span className="inline-flex items-center bg-success/10 dark:bg-success/20 px-2 py-1 text-xs font-medium text-success">
                            適用中
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {template.category && (
                          <span className="inline-flex items-center bg-primary/10 dark:bg-primary/20 px-2 py-1 text-xs font-medium text-primary">
                            {template.category}
                          </span>
                        )}
                        <span className="text-xs text-neutral-sub dark:text-gray-400">
                          使用回数: {template.usageCount}回
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                        disabled={template.id.startsWith('template-dummy-')}
                        title={template.id.startsWith('template-dummy-') ? 'ダミーテンプレートは編集できません' : ''}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(template.id)}
                        disabled={template.id.startsWith('template-dummy-')}
                        title={template.id.startsWith('template-dummy-') ? 'ダミーテンプレートは削除できません' : ''}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-neutral-sub dark:text-gray-400 mb-1">本文</p>
                      <p className="text-sm text-neutral-ink dark:text-gray-100 bg-neutral-bg dark:bg-gray-700 p-3 rounded">
                        {template.body}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-sub dark:text-gray-400 mb-1">平均効果</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-success">
                          +{template.avgCalledViewers}
                        </span>
                        <span className="text-sm text-neutral-sub dark:text-gray-400">人</span>
                      </div>
                      <p className="text-xs text-neutral-sub dark:text-gray-400 mt-1">
                        このテンプレートで平均して呼べた人数
                      </p>
                    </div>
                    {defaultTemplateId !== template.id && !template.id.startsWith('template-dummy-') && (
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setDefaultTemplate(template.id, template.name)}
                        >
                          このテンプレートを使用
                        </Button>
                      </div>
                    )}
                    {template.id.startsWith('template-dummy-') && (
                      <div className="pt-2">
                        <p className="text-xs text-neutral-sub dark:text-gray-400 text-center">
                          実際のテンプレートを作成してから設定できます
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {templates.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-neutral-sub dark:text-gray-400">テンプレートがまだありません</p>
                <p className="text-sm text-neutral-sub dark:text-gray-400 mt-2">
                  新規テンプレートボタンから作成してください
                </p>
              </CardContent>
            </Card>
          )}

          {/* テンプレート使い方の説明 */}
          <Card className="border-primary/20 dark:border-primary/30 bg-gradient-to-br from-primary/5 to-success/5 dark:from-primary/10 dark:to-success/10">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">テンプレートの使い方</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-neutral-ink dark:text-gray-100">
                複数のテンプレートを作成し、配信内容に合わせて使い分けることで、どの文面が効果的かを比較できます。
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-primary/10 dark:bg-primary/20 rounded flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-sm text-neutral-sub dark:text-gray-400">
                    配信通知が来たら、使いたいテンプレートを選択
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-primary/10 dark:bg-primary/20 rounded flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-sm text-neutral-sub dark:text-gray-400">
                    必要に応じて文面を編集してから投稿
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-primary/10 dark:bg-primary/20 rounded flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-sm text-neutral-sub dark:text-gray-400">
                    レポート画面で各テンプレートの効果を比較
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="dark:text-gray-100">
              {editingTemplate?.id ? "テンプレートを編集" : "新規テンプレート"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-neutral-ink dark:text-gray-100">
                    テンプレート名
                  </label>
                  <span className={`text-xs ${(editingTemplate?.name?.length || 0) > 100 ? "text-danger" : "text-neutral-sub dark:text-gray-400"}`}>
                    {editingTemplate?.name?.length || 0} / 100
                  </span>
                </div>
                <input
                  type="text"
                  value={editingTemplate?.name || ""}
                  onChange={(e) =>
                    setEditingTemplate(
                      editingTemplate
                        ? { ...editingTemplate, name: e.target.value }
                        : null
                    )
                  }
                  className="w-full px-3 py-2 border border-neutral-border dark:border-gray-700 text-sm bg-neutral-surface dark:bg-gray-800 text-neutral-ink dark:text-gray-100 placeholder:text-neutral-sub dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-focus"
                  placeholder="例: テンプレートA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-ink dark:text-gray-100 mb-2">
                  カテゴリタグ（任意）
                </label>
                <input
                  type="text"
                  value={editingTemplate?.category || ""}
                  onChange={(e) =>
                    setEditingTemplate(
                      editingTemplate
                        ? { ...editingTemplate, category: e.target.value }
                        : null
                    )
                  }
                  className="w-full px-3 py-2 border border-neutral-border dark:border-gray-700 text-sm bg-neutral-surface dark:bg-gray-800 text-neutral-ink dark:text-gray-100 placeholder:text-neutral-sub dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-focus"
                  placeholder="例: ランクマ、雑談、初見歓迎"
                />
                <p className="text-xs text-neutral-sub dark:text-gray-400 mt-2">
                  テンプレートを分類するためのタグを設定できます（例: ランクマ、カジュアル、コラボ）
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-neutral-ink dark:text-gray-100">
                    本文
                  </label>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${(editingTemplate?.body?.length || 0) > 500 ? "text-danger" : "text-neutral-sub dark:text-gray-400"}`}>
                      {editingTemplate?.body?.length || 0} / 500
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={insertStreamTitle}
                      className="text-xs"
                    >
                      配信タイトルを挿入
                    </Button>
                  </div>
                </div>
                <textarea
                  ref={textareaRef}
                  value={editingTemplate?.body || ""}
                  onChange={(e) =>
                    setEditingTemplate(
                      editingTemplate
                        ? { ...editingTemplate, body: e.target.value }
                        : null
                    )
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-neutral-border dark:border-gray-700 text-sm bg-neutral-surface dark:bg-gray-800 text-neutral-ink dark:text-gray-100 placeholder:text-neutral-sub dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-focus"
                  placeholder="例: 配信開始！やります！"
                />
                <p className="text-xs text-neutral-sub dark:text-gray-400 mt-2">
                  「配信タイトルを挿入」ボタンをクリックすると、{"{配信タイトル}"} プレースホルダーが挿入されます
                </p>
                <p className="text-xs text-neutral-sub dark:text-gray-400 mt-1">
                  ※ 実際の投稿時には、リアルタイムの配信タイトルに自動で置き換わります
                  {lastStreamTitle && (
                    <span className="text-primary"> (参考: 前回は「{lastStreamTitle}」)</span>
                  )}
                </p>
                <p className="text-xs text-primary mt-1">
                  ※ Twitch配信URLは自動的に投稿の最後に追加されます
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-ink dark:text-gray-100 mb-2">
                  プレビュー
                </label>
                <div className="p-3 bg-neutral-bg dark:bg-gray-700 rounded text-sm text-neutral-ink dark:text-gray-100 whitespace-pre-wrap">
                  {editingTemplate?.body
                    ? (() => {
                        // {配信タイトル} を前回タイトルで置換してプレビュー
                        const previewText = editingTemplate.body.replace(
                          /\{配信タイトル\}/g,
                          lastStreamTitle || "配信タイトル"
                        );
                        return previewText + "\nhttps://twitch.tv/yourname";
                      })()
                    : "プレビューがここに表示されます"}
                </div>
                <p className="text-xs text-neutral-sub dark:text-gray-400 mt-1">
                  ※ プレビューでは {"{配信タイトル}"} が前回の配信タイトルに置き換わります
                  {lastStreamTitle && (
                    <span className="text-primary"> (前回: {lastStreamTitle})</span>
                  )}
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={submitting} variant="default">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    "保存"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // メッセージをクリア
                    setSuccessMessage(null);
                    setError(null);
                    setIsEditing(false);
                    setEditingTemplate(null);
                  }}
                  disabled={submitting}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
