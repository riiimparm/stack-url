# CLAUDE.md

## プロジェクト概要

GitHubのIssueをリーディングリストとして活用するChrome拡張機能。現在のタブのURLとタイトルをGitHub Issueとして登録・管理し、優先度付けや期限切れエスカレーション通知も行う。

詳細仕様: [docs/spec.md](docs/spec.md)

## 技術スタック・制約

- **フロントエンド**: Vanilla JS + HTML + CSS（フレームワークなし）
- **Chrome API**: `chrome.tabs`, `chrome.storage`, `chrome.action`, `chrome.notifications`, `chrome.alarms`
- **外部API**: GitHub REST API v3、Discord Webhook
- **認証**: GitHub Personal Access Token（PAT）
- **ES Modules 不使用**: Manifest V3のservice workerとの互換性のため

## ディレクトリ構成

```
.
├── manifest.json              # Chrome拡張マニフェスト（Manifest V3）
├── popup/
│   ├── popup.html             # ポップアップUI
│   ├── popup.js               # ポップアップロジック
│   └── popup.css              # スタイル
├── options/
│   ├── options.html           # 設定ページ
│   ├── options.js             # 設定ロジック
│   └── options.css
├── background/
│   └── service_worker.js      # バックグラウンド処理・エスカレーション監視
├── lib/
│   ├── github.js              # GitHub API クライアント
│   ├── discord.js             # Discord Webhook クライアント
│   ├── escalation.js          # エスカレーション判定ロジック
│   └── crypto.js              # AES-GCM 暗号化ユーティリティ
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 主要機能

- **Issue登録**: 現在のタブのURL・タイトルをGitHub Issueとして登録。優先度ラベル選択可（デフォルト: `priority:mid`）
- **優先度管理**: `priority:high` / `priority:mid` / `priority:low` の3段階。ポップアップでは high → mid → low 順にソート表示
- **既読管理**: 「読んだ」ボタンでIssueをClose（`state: "closed"`）
- **エスカレーション通知**: 1時間ごとに定期チェック。指定日数（デフォルト3日）超過の未読IssueをDiscord/ブラウザ通知でエスカレーション

## エラーハンドリング方針

- GitHub API 401 → トークン未設定または無効のメッセージをUIに表示
- GitHub API 404 → リポジトリが見つからない旨を表示
- Discord Webhook失敗 → コンソールにエラーログ出力、ブラウザ通知にフォールバック
- `chrome.alarms` はservice worker終了後もアラームが保持されるため、起動時に存在チェックしてから登録

## セキュリティ方針

- **GitHubトークン**: Web Crypto API（AES-GCM）で暗号化してから `chrome.storage.local` に保存（キー名: `github_token_enc`）
- **Discord Webhook URL**: 漏洩リスクが限定的なため平文保存で許容
- **`chrome.storage.sync` 不使用**: クラウド同期でGoogleサーバーに機密情報が送られるリスクを避けるため
- **暗号化キー**: 拡張機能IDを素材にPBKDF2で毎回導出。OSキーチェーン非使用（Chrome拡張向けAPIが未提供のため）
- **最小権限PAT**: `repo` または `public_repo` スコープのみ推奨
- **CSP**: `manifest.json` で明示し、inline scriptを禁止

## コーディング規約

- `async/await` を使用してAPI呼び出しを処理
- エラーはコンソールとUIの両方に出力
- コメントは日本語で記述可
