/**
 * デフォルトテンプレート
 *
 * ユーザーがテンプレートを作成していない場合に使用される
 * システム管理のテンプレートで、データベースには保存されない
 */

export interface DefaultTemplate {
  id: string;
  name: string;
  body: string;
  category: string | null;
}

/**
 * システムデフォルトテンプレート
 *
 * テンプレート一覧には表示されず、ユーザーテンプレートが存在しない場合のみ使用される
 */
export const DEFAULT_TEMPLATE: DefaultTemplate = {
  id: "system-default",
  name: "デフォルトテンプレート",
  body: "配信開始しました！{配信タイトル}",
  category: null,
};

/**
 * ユーザーがテンプレートを持っているか確認
 */
export function hasUserTemplates(templatesCount: number): boolean {
  return templatesCount > 0;
}

/**
 * デフォルトテンプレートを取得
 *
 * 変数置換は行わない（呼び出し側で行う）
 */
export function getDefaultTemplate(): DefaultTemplate {
  return DEFAULT_TEMPLATE;
}
