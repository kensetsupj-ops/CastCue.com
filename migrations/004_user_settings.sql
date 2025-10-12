-- 004_user_settings.sql
-- ユーザー設定テーブル作成

-- auto_action ENUM型を作成
CREATE TYPE auto_action AS ENUM ('post', 'skip');

-- user_settingsテーブル作成
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  default_template_id UUID REFERENCES templates ON DELETE SET NULL,
  grace_timer INTEGER NOT NULL DEFAULT 90 CHECK (grace_timer >= 30 AND grace_timer <= 300),
  auto_action auto_action NOT NULL DEFAULT 'skip',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_user_settings_default_template ON user_settings(default_template_id);

-- RLS有効化
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: ユーザーは自分の設定のみ参照可能
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

-- RLSポリシー: Service roleは全設定を管理可能
CREATE POLICY "Service role can manage all settings"
  ON user_settings FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- コメント
COMMENT ON TABLE user_settings IS 'ユーザーごとの設定（デフォルトテンプレート、猶予タイマーなど）';
COMMENT ON COLUMN user_settings.default_template_id IS '通知の「テンプレートで投稿」ボタンで使用されるデフォルトテンプレート';
COMMENT ON COLUMN user_settings.grace_timer IS '編集ページでの自動処理までの待機時間（秒）、30〜300の範囲';
COMMENT ON COLUMN user_settings.auto_action IS 'タイムアウト時の動作（post: 自動投稿、skip: スキップ）';
