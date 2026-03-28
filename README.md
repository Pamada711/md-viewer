# MD Viewer

編集機能を排除し、**閲覧速度**に特化した軽量デスクトップ Markdown ビューワー。

## 特徴

- **高速起動** — Tauri (Rust) ベースで起動 200ms 以内を目標
- **自動リロード** — ファイルが外部で更新されると即座に再描画
- **目次 (TOC)** — 左端にカーソルを当てるとサイドバーが出現
- **全文検索** — `Ctrl+F` でページ内テキスト検索・ナビゲーション
- **ドラッグ&ドロップ** — ウィンドウにファイルを投下して開く
- **テーマ切替** — Auto (OS追従) / Light / Dark
- **最前面固定** — ステータスバーの「固定」ボタンで常に前面表示
- **XSS サニタイズ** — DOMPurify による安全なレンダリング
- **スクロール復元** — 前回閉じた位置を記憶して再開

## 技術スタック

| 層 | 技術 |
|---|---|
| フレームワーク | Tauri 2 |
| フロントエンド言語 | TypeScript |
| ビルドツール | Vite |
| MD パーサー | marked |
| サニタイザー | DOMPurify |
| ファイル監視 | notify (Rust crate) |

## 必要環境

- Node.js v18 以上
- Rust (rustup)
- Windows 10/11 (WebView2 は OS 標準搭載)

## セットアップ

```bash
git clone <repo>
cd md-viewer
npm install
```

## 開発サーバー起動

```bash
npm run tauri dev
```

## ビルド

```bash
npm run tauri build
```

ビルド成果物:

```
src-tauri/target/release/md-viewer.exe          # 実行ファイル単体
src-tauri/target/release/bundle/nsis/           # インストーラー
```

## 使い方

### CLI から開く

```bash
md-viewer README.md
md-viewer C:\path\to\document.md
```

### ドラッグ&ドロップ

`.md` / `.markdown` / `.txt` ファイルをウィンドウに投下。

### キーボードショートカット

| キー | 動作 |
|---|---|
| `Ctrl+F` | 検索バーを開く |
| `Enter` | 次の検索結果へ |
| `Shift+Enter` | 前の検索結果へ |
| `Esc` | 検索バーを閉じる |

### 目次

ウィンドウ左端にカーソルを当てるとサイドバーが表示される。H1〜H3 の見出しが一覧表示され、クリックでスムーズスクロール。

### テーマ

ステータスバー右端の「Auto / Light / Dark」ボタンでサイクル切替。設定は `localStorage` に永続化される。

## ファイル関連付け

ビルド後のインストーラーを使ってインストールすると、`.md` ファイルをダブルクリックで開けるようになる。

## ライセンス

MIT
