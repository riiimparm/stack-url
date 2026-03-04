# Stack URL

<img width="382" height="386" alt="スクリーンショット 2026-03-05 1 40 12" src="https://github.com/user-attachments/assets/e2ba4bcd-859f-4cf9-a20f-51d9bb0b126d" />


「あとで読む」が、ちゃんと読まれるようになる Chrome 拡張機能。

気になったページを GitHub Issue として積んでおき、放置しすぎたら Discord やブラウザ通知で督促してくれます。

<img height="200" src="https://github.com/user-attachments/assets/44f4e2fe-8209-4de2-855d-192682fbf75f" />


ブログ[【僕がClaude Codeを従えるまで】1日目 CLAUDE.md](https://www.rowicy.com/blog/master-claude-code-day1/)内で作成

---

## どんなもの？

- 気になったページを開いたまま、拡張機能アイコンをクリック → 即 Issue 登録
- 優先度（high / mid / low）を付けてポップアップにリスト表示
- 「読んだ」ボタンを押すと Issue が Close される（= 既読）
- 3日以上放置したものは Discord や Chrome 通知でお知らせ

既存の GitHub リポジトリをそのままリーディングリストとして使うので、余計なサービス登録は不要です。

---

## セットアップ

### 1. リポジトリを用意する

専用でも既存でも OK。Issue が使えるリポジトリならなんでも。

### 2. GitHub PAT を発行する

[GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens) からissueアクションが許可されたトークンを発行

### 3. 拡張機能をインストールする

1. `git clone https://github.com/riiimparm/stack-url.git`
2. Chrome で `chrome://extensions` を開く
3. 右上の「デベロッパーモード」を ON
4. 「パッケージ化されていない拡張機能を読み込む」でフォルダを選択

### 4. 設定する

拡張機能アイコンを右クリック →「オプション」から設定ページへ。

| 項目 | 内容 |
|------|------|
| GitHub Token | 発行した PAT |
| GitHub Owner | リポジトリのオーナー名（自分の username など） |
| GitHub Repo | 使うリポジトリ名 |
| エスカレーション閾値 | 何日放置したら通知するか（デフォルト: 3日） |
| Discord Webhook URL | 任意。通知先の Webhook URL |
| ブラウザ通知 | Chrome の通知を使うかどうか |

---

## 使い方

1. 積みたいページを開く
2. 拡張機能アイコンをクリック
3. 優先度を選んで「登録」
4. ポップアップのリストから読んだものは「読んだ」ボタンで消化

---

## セキュリティについて

GitHub PAT は **AES-GCM で暗号化**してからローカルストレージに保存

暗号化キーは拡張機能 ID を素材に PBKDF2 で導出
