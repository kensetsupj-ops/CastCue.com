# 目的
CastCue のLPから“AIっぽさ”を薄め、実務的で落ち着いた見た目に調整する。
**現状のデザインをベースにしつつ**（レイアウトや情報構造は維持）、装飾の過多と誇張表現を削る。

# スタック前提
Next.js(App Router, TS) + Tailwind CSS

# 変更方針（UI）
- 背景: すべてのグラデーション/ガラス(blur, backdrop-blur, bg-opacityでの擬似ガラス)を削除し、`bg-white` or `bg-gray-50` に統一。
- 角丸/影: `rounded-2xl/3xl/full` → `rounded-md`、`shadow-lg/xl` → `shadow-sm`。内側グロー/発光は削除。
- カード: `border border-gray-200 bg-white` を基本に、余白は `p-6 md:p-8`。不要な ring/outline/blur を除去。
- ボタン: 
  - primary → `bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-md`
  - secondary → `text-blue-700 underline underline-offset-4 bg-transparent`
  - グロー/虹色/ガラス風ボタンは禁止。
- アイコン箱グリッド: 装飾アイコン依存を減らし、説明テキストを1段落追加。列数は既存のままでOK（**現状をベース**）。
- メトリクス: 根拠希薄な「99.9%」「500+」等の単独数字は非表示にし、代わりに“ダッシュボードの小さなスクショ”の差込枠を用意（`/public/screenshots/*.png` プレースホルダを参照、実ファイルが無ければ空divでOK）。
- セクション余白: セクション上下 `py-20`、コンテナ `max-w-6xl mx-auto px-4`。

# 文言（コピー）— 誇張排除・具体化
- CTA: 「今すぐ無料で始める」→「X/Discordとつないで1回だけ流す」
- 「完全自動化ツール」→「手動告知の手間をゼロにする告知自動化」
- 「99.9%成功」→「手動の貼り忘れがなくなる設計」
- 「セキュア」→「トークンは暗号化保存。不要な権限は要求しません」
- デモ数値が残る場合は「※表示の数字はデモです」を同ブロック内に小さく表示。

# スコープ
- `app/**` と `components/**` のLP該当コンポーネントのみ（マーケページ）。機能ページの挙動は触らない。
- 既存の配色/余白/順序は大枠維持（= **現状のデザインをベースに** 軽量化）。

# 実装ルール
- Tailwindユーティリティの置換で実施（再設計・大幅レイアウト変更をしない）。
- 既存クラスの機械置換例:
  - /gradient|from-|to-|via-|backdrop-blur\S*/ → 削除
  - rounded-(2xl|3xl|full) → rounded-md
  - shadow-(lg|xl|2xl) → shadow-sm
- 影響のないファイルのフォーマット変更は避ける（差分最小）。

# 出力形式
- 変更点は「unified diff (patch)」で出力。
- 併せて `CHANGELOG.md` を生成し、変更要約（UI/コピー/ファイル一覧）を箇条書きで追記。

# 受入基準
- ビルド/型エラーなし。
- 主要セクションでグラデ・ガラス・発光が残っていない。
- CTAと主要コピーが指定の文言に差し替わっている。
- レイアウト崩れが出ていない（カード間の余白とボタンサイズは既存±1ステップ以内）。
