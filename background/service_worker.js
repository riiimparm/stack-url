// バックグラウンド処理・エスカレーション監視

importScripts('../lib/github.js', '../lib/discord.js', '../lib/escalation.js');

const ALARM_NAME = 'escalation-check';

// 設定を取得
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([
      'github_token',
      'github_owner',
      'github_repo',
      'escalation_enabled',
      'escalation_threshold_days',
      'discord_enabled',
      'discord_webhook_url',
      'browser_notification_enabled'
    ], resolve);
  });
}

// 通知済みIssue番号を取得
async function getNotifiedIssueNumbers() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['notified_issue_numbers'], (data) => {
      resolve(data.notified_issue_numbers || []);
    });
  });
}

// 通知済みIssue番号を保存
async function saveNotifiedIssueNumbers(numbers) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ notified_issue_numbers: numbers }, resolve);
  });
}

// エスカレーション処理
async function runEscalation() {
  console.log('エスカレーションチェック開始');
  const settings = await getSettings();

  if (!settings.escalation_enabled) {
    console.log('エスカレーション無効');
    return;
  }

  if (!settings.github_token || !settings.github_owner || !settings.github_repo) {
    console.log('GitHub設定未完了');
    return;
  }

  const thresholdDays = settings.escalation_threshold_days || 3;

  try {
    const issues = await GitHubAPI.listIssues(
      settings.github_token,
      settings.github_owner,
      settings.github_repo
    );

    const overdueIssues = getOverdueIssues(issues, thresholdDays);
    if (overdueIssues.length === 0) {
      console.log('期限切れIssueなし');
      return;
    }

    // 通知済みを除外
    const notifiedNumbers = await getNotifiedIssueNumbers();
    const newOverdueIssues = overdueIssues.filter(
      issue => !notifiedNumbers.includes(issue.number)
    );

    if (newOverdueIssues.length === 0) {
      console.log('新規の期限切れIssueなし');
      return;
    }

    console.log(`新規期限切れIssue: ${newOverdueIssues.length}件`);

    // Discord通知
    if (settings.discord_enabled && settings.discord_webhook_url) {
      try {
        await DiscordClient.sendEscalationNotification(
          settings.discord_webhook_url,
          newOverdueIssues,
          thresholdDays
        );
        console.log('Discord通知送信完了');
      } catch (err) {
        console.error('Discord通知エラー:', err);
        // ブラウザ通知にフォールバック（後続で処理）
      }
    }

    // ブラウザ通知
    if (settings.browser_notification_enabled) {
      chrome.notifications.create(`escalation-${Date.now()}`, {
        type: 'basic',
        iconUrl: '/icons/icon128.png',
        title: '📚 未読アイテムあり',
        message: `${thresholdDays}日以上未読の記事が ${newOverdueIssues.length} 件あります。`
      });
      console.log('ブラウザ通知送信完了');
    }

    // 通知済みリストを更新
    const updatedNumbers = [
      ...new Set([...notifiedNumbers, ...newOverdueIssues.map(i => i.number)])
    ];
    await saveNotifiedIssueNumbers(updatedNumbers);
  } catch (err) {
    console.error('エスカレーション処理エラー:', err);
  }
}

// アラームを設定（未登録の場合のみ）
async function setupAlarm() {
  const alarm = await chrome.alarms.get(ALARM_NAME);
  if (!alarm) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 60 });
    console.log('エスカレーションアラームを設定しました');
  }
}

// Service Worker起動時にアラームを設定
setupAlarm();

// アラームイベントリスナー
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    runEscalation();
  }
});

// インストール時のイベント
chrome.runtime.onInstalled.addListener(() => {
  console.log('Stack URL 拡張機能がインストールされました');
  setupAlarm();
});
