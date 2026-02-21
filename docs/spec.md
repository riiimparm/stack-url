# 設計仕様書

## GitHub API 仕様

```
Base URL: https://api.github.com
認証ヘッダー: Authorization: Bearer {token}

Issue作成:  POST  /repos/{owner}/{repo}/issues
            body: { title, body, labels: ["reading-list", "priority:mid"] }

Issue一覧:  GET   /repos/{owner}/{repo}/issues?labels=reading-list&state=open

Issue更新:  PATCH /repos/{owner}/{repo}/issues/{issue_number}
            Close:        { "state": "closed" }
            ラベル更新:   { "labels": ["reading-list", "priority:high"] }
```

## chrome.storage スキーマ

すべて `chrome.storage.local` に保存。機密フィールドは `_enc` サフィックスで暗号化済みを明示。

```json
{
  "github_token_enc": "<AES-GCM暗号化済みBase64>",
  "github_owner": "username",
  "github_repo": "reading-list",

  "discord_webhook_url": "https://discord.com/api/webhooks/xxx/yyy",
  "discord_enabled": true,

  "escalation_enabled": true,
  "escalation_threshold_days": 3,
  "browser_notification_enabled": true,

  "notified_issue_numbers": [1, 2, 3]
}
```

`notified_issue_numbers`: エスカレーション済みIssueの重複通知防止キャッシュ。

## エスカレーションロジック（escalation.js）

```js
// 閾値を超えたIssueを抽出する
function getOverdueIssues(issues, thresholdDays) {
  const now = Date.now();
  const threshold = thresholdDays * 24 * 60 * 60 * 1000;
  return issues.filter(issue => {
    const created = new Date(issue.created_at).getTime();
    return (now - created) >= threshold;
  });
}
```

service_worker.js では `chrome.alarms.create("escalation-check", { periodInMinutes: 60 })` で定期アラームを設定し、`chrome.alarms.onAlarm` リスナーでエスカレーション処理を実行する。

## Discord Webhook ペイロード仕様

```json
{
  "embeds": [
    {
      "title": "📚 リーディングリスト 期限切れ通知",
      "description": "以下のアイテムが3日以上未読のままです。",
      "color": 16711680,
      "fields": [
        {
          "name": "[priority:high] 記事タイトル",
          "value": "https://github.com/owner/repo/issues/1\n登録日: 2024-01-01",
          "inline": false
        }
      ]
    }
  ]
}
```

## ブラウザ通知仕様

```js
chrome.notifications.create(`escalation-${Date.now()}`, {
  type: "basic",
  iconUrl: "/icons/icon128.png",
  title: "📚 未読アイテムあり",
  message: `3日以上未読の記事が ${n} 件あります。`
});
```

`manifest.json` の `permissions` に `"notifications"` が必要。

## manifest.json 必須設定

```json
{
  "manifest_version": 3,
  "permissions": [
    "storage",
    "tabs",
    "notifications",
    "alarms"
  ],
  "host_permissions": [
    "https://api.github.com/*",
    "https://discord.com/api/webhooks/*"
  ],
  "background": {
    "service_worker": "background/service_worker.js"
  }
}
```

## 設定ページ（options）の項目

| 設定項目 | 型 | 説明 |
|----------|----|------|
| GitHub Token | text | PAT（`repo` または `public_repo` スコープ） |
| GitHub Owner | text | リポジトリオーナー名 |
| GitHub Repo | text | リポジトリ名 |
| エスカレーション有効 | toggle | ON/OFF |
| 閾値（日数） | number | デフォルト3日 |
| Discord通知 | toggle | ON/OFF |
| Discord Webhook URL | text | DiscordのWebhook URL |
| ブラウザ通知 | toggle | ON/OFF |

## セキュリティ実装詳細

### 暗号化キーの導出（lib/crypto.js）

端末・拡張機能固有の文字列（拡張機能ID）を素材として `PBKDF2` でCryptoKeyを導出する。キー自体は保存せず、毎回導出する。

```js
const SALT = new TextEncoder().encode("reading-list-extension-salt");
const IV_LENGTH = 12; // AES-GCM推奨

async function deriveKey() {
  const raw = new TextEncoder().encode(chrome.runtime.id); // 拡張機能ID
  const keyMaterial = await crypto.subtle.importKey(
    "raw", raw, "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: SALT, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(plaintext) {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array([...iv, ...new Uint8Array(ciphertext)]);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(base64) {
  const key = await deriveKey();
  const combined = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}
```

### 保存・読み出しフロー

```js
// 保存時（options.js）
const encryptedToken = await encrypt(rawToken);
await chrome.storage.local.set({ github_token_enc: encryptedToken });

// 読み出し時（github.js など）
const { github_token_enc } = await chrome.storage.local.get("github_token_enc");
const token = await decrypt(github_token_enc);
```

### 限界と注意事項

この方式はOSネイティブのキーチェーン（macOS Keychain、Windows Credential Manager）ではなく、拡張機能IDを素材とするソフトウェアキーである。OSの管理者権限を持つ攻撃者やChromeプロファイルへの物理アクセスがある場合は完全ではない。Chrome拡張向けのOS keychain統合APIは2025年時点では未提供のため、現状のベストプラクティスとして採用する。
