# CastCue アイコン設定ガイド

## 必要なアイコンファイル

Web Push通知で使用するアイコンファイルが必要です：

### 1. icon-192x192.png
- **サイズ**: 192x192 ピクセル
- **用途**: 通知本体のアイコン
- **形式**: PNG（透過背景推奨）
- **配置先**: `public/icon-192x192.png`

### 2. badge-72x72.png
- **サイズ**: 72x72 ピクセル
- **用途**: 通知バッジ（小さいアイコン）
- **形式**: PNG（透過背景推奨）
- **配置先**: `public/badge-72x72.png`

---

## 🎨 簡単な作成方法

### Option A: Canvaを使用（推奨）

1. https://www.canva.com にアクセス
2. "カスタムサイズ" で 192x192 を作成
3. CastCueのロゴまたは "C" のアイコンを配置
4. PNG形式でダウンロード → `public/icon-192x192.png` に保存
5. 同様に 72x72 のバッジを作成 → `public/badge-72x72.png` に保存

### Option B: Figmaを使用

1. Figmaで 192x192 のフレームを作成
2. アイコンをデザイン
3. Export → PNG → 1x → ダウンロード
4. `public/` フォルダに配置

### Option C: オンラインツール

https://favicon.io/ などのツールを使用してファビコンとともに生成

---

## 🔧 一時的な回避策（開発用）

アイコンなしでもWeb Push通知は動作しますが、デフォルトのブラウザアイコンが表示されます。

Service Workerを以下のように変更することで、アイコンなしでも動作します：

```javascript
// public/sw.js の該当部分を変更
const options = {
  body: data.body,
  // icon: data.icon,  // コメントアウト
  // badge: data.badge, // コメントアウト
  tag: data.tag,
  data: data.data,
  vibrate: [200, 100, 200],
  requireInteraction: true,
  actions: [
    // ...
  ],
};
```

---

## 📋 推奨デザイン

### アイコンのデザインガイドライン

1. **色**: ブランドカラー（紫系）
2. **形状**: 円形または角丸正方形
3. **背景**: 透過または無地
4. **内容**:
   - CastCueの "C" ロゴ
   - または Twitch風のストリーミングアイコン
   - または放送波アイコン 📡

### 例：

```
icon-192x192.png:
┌────────────────┐
│                │
│       C        │  ← CastCue の "C" を中央に配置
│                │     紫色のグラデーション背景
└────────────────┘

badge-72x72.png:
┌──────┐
│  C   │  ← シンプルな "C" のみ
└──────┘     白背景に紫色の "C"
```

---

## ✅ 確認

アイコンを配置したら、以下を確認：

```bash
# ファイルの存在確認
ls public/*.png

# 期待される出力:
# public/badge-72x72.png
# public/icon-192x192.png
```

---

## 🚀 次のステップ

1. アイコンファイルを作成
2. `public/` フォルダに配置
3. 開発サーバーを再起動（必要な場合）
4. `/settings` ページで Web Push 通知を有効化してテスト

---

最終更新: 2025-10-12
