-- サンプリング実行メトリクスを記録するテーブル
-- Vercel Pro移行の判断材料となるデータを収集

CREATE TABLE IF NOT EXISTS sampling_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 実行結果
  active_streams_count INT NOT NULL, -- サンプリング時のアクティブ配信数
  successful_samples INT NOT NULL, -- 成功したサンプル数
  failed_samples INT NOT NULL, -- 失敗したサンプル数
  execution_time_ms INT NOT NULL, -- 実行時間（ミリ秒）

  -- 詳細情報
  error_message TEXT, -- エラーがあった場合のメッセージ
  source VARCHAR(50) DEFAULT 'github-actions', -- 'github-actions' or 'vercel-cron'

  -- インデックス用
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス: 時系列検索用
CREATE INDEX IF NOT EXISTS idx_sampling_metrics_executed_at
ON sampling_metrics(executed_at DESC);

-- インデックス: 日付範囲検索用
CREATE INDEX IF NOT EXISTS idx_sampling_metrics_created_at
ON sampling_metrics(created_at DESC);

-- RLS無効化（管理者のみがアクセスするため、service roleで直接アクセス）
ALTER TABLE sampling_metrics ENABLE ROW LEVEL SECURITY;

-- コメント
COMMENT ON TABLE sampling_metrics IS 'サンプリングCron実行のメトリクスを記録。Vercel Pro移行判断に使用。';
COMMENT ON COLUMN sampling_metrics.active_streams_count IS '同時配信数（スケール判断の重要指標）';
COMMENT ON COLUMN sampling_metrics.execution_time_ms IS '処理時間（Function制限300秒の監視用）';
COMMENT ON COLUMN sampling_metrics.source IS '実行元（GitHub Actions or Vercel Cron）';
