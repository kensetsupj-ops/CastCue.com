"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Template {
  id: string;
  name: string;
  variant: "A" | "B";
  usageCount: number;
  winRate: number;
  body: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      setLoading(true);

      // 認証チェック
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const response = await fetch("/api/templates");

      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err: any) {
      console.error("Error fetching templates:", err);
      alert("テンプレートの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setIsEditing(true);
  };

  const handleNew = () => {
    setEditingTemplate({
      id: "",
      name: "",
      variant: "A",
      usageCount: 0,
      winRate: 0,
      body: "",
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editingTemplate) return;

    try {
      setSubmitting(true);

      const payload = {
        name: editingTemplate.name,
        body: editingTemplate.body,
        variant: editingTemplate.variant,
      };

      let response;
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

      // 再取得
      await fetchTemplates();
      setIsEditing(false);
      setEditingTemplate(null);
    } catch (err: any) {
      console.error("Error saving template:", err);
      alert(`保存に失敗しました: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("本当に削除しますか？")) return;

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete template");
      }

      // 再取得
      await fetchTemplates();
    } catch (err: any) {
      console.error("Error deleting template:", err);
      alert("削除に失敗しました");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-ink">テンプレート</h1>
          <p className="text-neutral-sub">告知文面の管理とA/B運用</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          新規テンプレート
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-neutral-sub">読み込み中...</p>
          </div>
        </div>
      ) : !isEditing ? (
        <>
          {/* Template List */}
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          バリアント {template.variant}
                        </span>
                        <span className="text-xs text-neutral-sub">
                          使用回数: {template.usageCount}回
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-neutral-sub mb-1">本文</p>
                      <p className="text-sm text-neutral-ink bg-neutral-bg p-3">
                        {template.body}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-sub mb-1">直近30日の勝率</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-neutral-border h-2">
                          <div
                            className="bg-primary h-2"
                            style={{ width: `${template.winRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-neutral-ink">
                          {template.winRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {templates.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-neutral-sub">テンプレートがまだありません</p>
                <p className="text-sm text-neutral-sub mt-2">
                  新規テンプレートボタンから作成してください
                </p>
              </CardContent>
            </Card>
          )}

          {/* A/B Info */}
          <Card>
            <CardHeader>
              <CardTitle>A/Bテスト設定</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-ink mb-4">
                A/Bの配分は <span className="font-bold">50/50固定</span> で運用されます（MVP）
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                    A
                  </div>
                  <span className="text-sm text-neutral-ink">50%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                    B
                  </div>
                  <span className="text-sm text-neutral-ink">50%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingTemplate?.id ? "テンプレートを編集" : "新規テンプレート"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-ink mb-2">
                  テンプレート名
                </label>
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
                  className="w-full px-3 py-2 border border-neutral-border text-sm bg-neutral-surface text-neutral-ink focus:outline-none focus:ring-2 focus:ring-focus"
                  placeholder="例: テンプレートA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-ink mb-2">
                  バリアント
                </label>
                <select
                  value={editingTemplate?.variant || "A"}
                  onChange={(e) =>
                    setEditingTemplate(
                      editingTemplate
                        ? { ...editingTemplate, variant: e.target.value }
                        : null
                    )
                  }
                  className="px-3 py-2 border border-neutral-border text-sm bg-neutral-surface text-neutral-ink focus:outline-none focus:ring-2 focus:ring-focus"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-ink mb-2">
                  本文
                </label>
                <textarea
                  value={editingTemplate?.body || ""}
                  onChange={(e) =>
                    setEditingTemplate(
                      editingTemplate
                        ? { ...editingTemplate, body: e.target.value }
                        : null
                    )
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-neutral-border text-sm bg-neutral-surface text-neutral-ink focus:outline-none focus:ring-2 focus:ring-focus"
                  placeholder="例: 配信開始！{title} やります！ {twitch_url}"
                />
                <p className="text-xs text-neutral-sub mt-2">
                  使用可能な変数: {"{title}"} {"{category}"} {"{twitch_url}"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-ink mb-2">
                  プレビュー
                </label>
                <div className="p-3 bg-neutral-bg text-sm text-neutral-ink">
                  {editingTemplate?.body
                    .replace("{title}", "配信タイトル")
                    .replace("{category}", "ゲームカテゴリ")
                    .replace(
                      "{twitch_url}",
                      "https://twitch.tv/yourname"
                    ) || "プレビューがここに表示されます"}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} disabled={submitting}>
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
