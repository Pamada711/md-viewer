# MD Viewer

A lightweight desktop Markdown viewer focused on **reading speed**, with no editing features.

[日本語](#日本語)

## Features

- **Fast startup** — Tauri (Rust) based, targeting launch in under 200ms
- **Auto-reload** — Instantly re-renders when the file is updated externally
- **Table of Contents** — Sidebar appears when hovering over the left edge
- **Full-text search** — In-page text search and navigation with `Ctrl+F`
- **Drag & Drop** — Drop a file onto the window to open it
- **Theme switching** — Auto (follows OS) / Light / Dark
- **Always on top** — Pin button in the status bar keeps the window in the foreground
- **XSS sanitization** — Safe rendering via DOMPurify
- **Scroll restoration** — Remembers and restores the last scroll position

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Tauri 2 |
| Frontend | TypeScript |
| Build tool | Vite |
| MD parser | marked |
| Sanitizer | DOMPurify |
| File watcher | notify (Rust crate) |

## Requirements

- Node.js v18+
- Rust (rustup)
- Windows 10/11 (WebView2 is bundled with the OS)

## Setup

```bash
git clone <repo>
cd md-viewer
npm install
```

## Development

```bash
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

Build output:

```
src-tauri/target/release/md-viewer.exe          # Standalone executable
src-tauri/target/release/bundle/nsis/           # Installer
```

## Usage

### Open from CLI

```bash
md-viewer README.md
md-viewer C:\path\to\document.md
```

### Drag & Drop

Drop a `.md`, `.markdown`, or `.txt` file onto the window.

### Keyboard Shortcuts

| Key | Action |
|---|---|
| `Ctrl+F` | Open search bar |
| `Enter` | Next result |
| `Shift+Enter` | Previous result |
| `Esc` | Close search bar |

### Table of Contents

Hover over the left edge of the window to reveal the sidebar. H1–H3 headings are listed and clicking one smooth-scrolls to that section.

### Theme

Cycle through Auto / Light / Dark using the button at the right end of the status bar. The setting is persisted in `localStorage`.

## File Association

After installing via the built installer, `.md` files can be opened by double-clicking.

## License

MIT

---

## 日本語

編集機能を排除し、**閲覧速度**に特化した軽量デスクトップ Markdown ビューワー。

### 特徴

- **高速起動** — Tauri (Rust) ベースで起動 200ms 以内を目標
- **自動リロード** — ファイルが外部で更新されると即座に再描画
- **目次 (TOC)** — 左端にカーソルを当てるとサイドバーが出現
- **全文検索** — `Ctrl+F` でページ内テキスト検索・ナビゲーション
- **ドラッグ&ドロップ** — ウィンドウにファイルを投下して開く
- **テーマ切替** — Auto (OS追従) / Light / Dark
- **最前面固定** — ステータスバーの「固定」ボタンで常に前面表示
- **XSS サニタイズ** — DOMPurify による安全なレンダリング
- **スクロール復元** — 前回閉じた位置を記憶して再開

### 必要環境

- Node.js v18 以上
- Rust (rustup)
- Windows 10/11 (WebView2 は OS 標準搭載)

### セットアップ

```bash
git clone <repo>
cd md-viewer
npm install
```

### 開発サーバー起動

```bash
npm run tauri dev
```

### ビルド

```bash
npm run tauri build
```

### キーボードショートカット

| キー | 動作 |
|---|---|
| `Ctrl+F` | 検索バーを開く |
| `Enter` | 次の検索結果へ |
| `Shift+Enter` | 前の検索結果へ |
| `Esc` | 検索バーを閉じる |

### ライセンス

MIT
