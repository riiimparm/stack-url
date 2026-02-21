// 設定ページのロジック

const LOCAL_KEYS = [
  'github_token_enc',
  'github_owner',
  'github_repo',
  'escalation_enabled',
  'escalation_threshold_days',
  'discord_enabled',
  'discord_webhook_url_enc',
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
  const data = await new Promise((resolve) => {
    chrome.storage.local.get(LOCAL_KEYS, resolve);
  });

  // 暗号化済みトークンを復号してフィールドに表示
  let token = '';
  if (data.github_token_enc) {
    try {
      token = await CryptoUtils.decrypt(data.github_token_enc);
    } catch (err) {
      console.error('GitHubトークン復号エラー:', err);
    }
  }

  let webhookUrl = '';
  if (data.discord_webhook_url_enc) {
    try {
      webhookUrl = await CryptoUtils.decrypt(data.discord_webhook_url_enc);
    } catch (err) {
      console.error('Discord Webhook URL復号エラー:', err);
    }
  }

  document.getElementById('github-token').value = token;
  document.getElementById('github-owner').value = data.github_owner || '';
  document.getElementById('github-repo').value = data.github_repo || '';
  document.getElementById('escalation-enabled').checked = data.escalation_enabled !== false;
  document.getElementById('threshold-days').value = data.escalation_threshold_days || 3;
  document.getElementById('discord-enabled').checked = !!data.discord_enabled;
  document.getElementById('discord-webhook-url').value = webhookUrl;
  document.getElementById('browser-notification-enabled').checked = data.browser_notification_enabled !== false;
}

// 設定を保存
async function saveSettings() {
  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = '保存中...';

  try {
    const rawToken = document.getElementById('github-token').value.trim();
    const rawWebhookUrl = document.getElementById('discord-webhook-url').value.trim();

    // 機密情報を暗号化
    const github_token_enc = rawToken ? await CryptoUtils.encrypt(rawToken) : '';
    const discord_webhook_url_enc = rawWebhookUrl ? await CryptoUtils.encrypt(rawWebhookUrl) : '';

    const data = {
      github_token_enc,
      github_owner: document.getElementById('github-owner').value.trim(),
      github_repo: document.getElementById('github-repo').value.trim(),
      escalation_enabled: document.getElementById('escalation-enabled').checked,
      escalation_threshold_days: parseInt(document.getElementById('threshold-days').value, 10) || 3,
      discord_enabled: document.getElementById('discord-enabled').checked,
      discord_webhook_url_enc,
      browser_notification_enabled: document.getElementById('browser-notification-enabled').checked
    };

    await new Promise((resolve, reject) => {
      chrome.storage.local.set(data, () => {
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
