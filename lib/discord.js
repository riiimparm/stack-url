// Discord Webhook クライアント

const DiscordClient = (() => {
  // issueから優先度ラベルを取得
  function getPriorityFromIssue(issue) {
    if (!issue.labels) return 'priority:mid';
    for (const label of issue.labels) {
      const name = label.name || label;
      if (name.startsWith('priority:')) return name;
    }
    return 'priority:mid';
  }

  // 日付フォーマット
  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // エスカレーション通知を送信
  async function sendEscalationNotification(webhookUrl, overdueIssues, thresholdDays) {
    const fields = overdueIssues.map(issue => {
      const priority = getPriorityFromIssue(issue);
      const createdDate = formatDate(issue.created_at);
      return {
        name: `[${priority}] ${issue.title}`,
        value: `${issue.html_url}\n登録日: ${createdDate}`,
        inline: false
      };
    });

    const payload = {
      embeds: [
        {
          title: '📚 リーディングリスト 期限切れ通知',
          description: `以下のアイテムが${thresholdDays}日以上未読のままです。`,
          color: 16711680,
          fields
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Discord Webhook エラー: ${response.status}`);
    }
  }

  return { sendEscalationNotification };
})();
