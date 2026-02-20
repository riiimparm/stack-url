// 設定ページのロジック

const SYNC_KEYS = [
  'github_token',
  'github_owner',
  'github_repo',
  'escalation_enabled',
  'escalation_threshold_days',
  'discord_enabled',
  'discord_webhook_url',
  'browser_notification_enabled'
];

// エラー表示
function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('success-msg').classList.add('hidden');
}

// 成功表示
function showSuccess(msg) {
  const el = document.getElementById('success-msg');
  el.textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('error-msg').classList.add('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

// 設定を読み込み
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(SYNC_KEYS, (data) => {
      document.getElementById('github-token').value = data.github_token || '';
      document.getElementById('github-owner').value = data.github_owner || '';
      document.getElementById('github-repo').value = data.github_repo || '';
      document.getElementById('escalation-enabled').checked = data.escalation_enabled !== false;
      document.getElementById('threshold-days').value = data.escalation_threshold_days || 3;
      document.getElementById('discord-enabled').checked = !!data.discord_enabled;
      document.getElementById('discord-webhook-url').value = data.discord_webhook_url || '';
      document.getElementById('browser-notification-enabled').checked = data.browser_notification_enabled !== false;
      resolve();
    });
  });
}

// 設定を保存
async function saveSettings() {
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = '保存中...';

  try {
    const data = {
      github_token: document.getElementById('github-token').value.trim(),
      github_owner: document.getElementById('github-owner').value.trim(),
      github_repo: document.getElementById('github-repo').value.trim(),
      escalation_enabled: document.getElementById('escalation-enabled').checked,
      escalation_threshold_days: parseInt(document.getElementById('threshold-days').value, 10) || 3,
      discord_enabled: document.getElementById('discord-enabled').checked,
      discord_webhook_url: document.getElementById('discord-webhook-url').value.trim(),
      browser_notification_enabled: document.getElementById('browser-notification-enabled').checked
    };

    await new Promise((resolve, reject) => {
      chrome.storage.sync.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });

    showSuccess('設定を保存しました');
  } catch (err) {
    console.error('設定保存エラー:', err);
    showError(`保存エラー: ${err.message}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '設定を保存';
  }
}

// 初期化
async function init() {
  await loadSettings();
  document.getElementById('save-btn').addEventListener('click', saveSettings);
}

document.addEventListener('DOMContentLoaded', init);
