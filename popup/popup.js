// ポップアップのメインロジック

// 設定をchrome.storage.syncから取得
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([
      'github_token',
      'github_owner',
      'github_repo'
    ], resolve);
  });
}

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

// メッセージを非表示
function hideMessages() {
  document.getElementById('error-msg').classList.add('hidden');
  document.getElementById('success-msg').classList.add('hidden');
}

// 優先度ラベルを取得
function getPriorityLabel(labels) {
  if (!labels) return 'mid';
  for (const label of labels) {
    const name = label.name || label;
    if (name === 'priority:high') return 'high';
    if (name === 'priority:low') return 'low';
  }
  return 'mid';
}

// 日付フォーマット
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// HTMLエスケープ
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Issue一覧を描画
function renderIssues(issues) {
  const container = document.getElementById('issues-container');
  if (!issues || issues.length === 0) {
    container.innerHTML = '<div class="empty">登録済みのアイテムはありません</div>';
    return;
  }

  // 優先度順にソート: high → mid → low
  const priorityOrder = { high: 0, mid: 1, low: 2 };
  const sorted = [...issues].sort((a, b) => {
    const pa = priorityOrder[getPriorityLabel(a.labels)];
    const pb = priorityOrder[getPriorityLabel(b.labels)];
    return pa - pb;
  });

  container.innerHTML = '';
  for (const issue of sorted) {
    const priority = getPriorityLabel(issue.labels);
    const item = document.createElement('div');
    item.className = 'issue-item';
    item.innerHTML = `
      <span class="priority-badge priority-${priority}">${priority}</span>
      <div class="issue-content">
        <div class="issue-title">
          <a href="${issue.html_url}" target="_blank" rel="noopener">${escapeHtml(issue.title)}</a>
        </div>
        <div class="issue-meta">登録日: ${formatDate(issue.created_at)}</div>
      </div>
      <div class="issue-actions">
        <button class="btn-read" data-issue-number="${issue.number}">読んだ</button>
      </div>
    `;
    container.appendChild(item);
  }

  // 「読んだ」ボタンのイベント設定
  container.querySelectorAll('.btn-read').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const issueNumber = e.target.dataset.issueNumber;
      e.target.disabled = true;
      e.target.textContent = '...';
      await markAsRead(issueNumber);
    });
  });
}

// Issue一覧を読み込み
async function loadIssues() {
  const container = document.getElementById('issues-container');
  container.innerHTML = '<div class="loading">読み込み中...</div>';

  const settings = await getSettings();
  if (!settings.github_token || !settings.github_owner || !settings.github_repo) {
    container.innerHTML = '<div class="empty">設定ページでGitHubの設定を完了してください</div>';
    return;
  }

  try {
    const issues = await GitHubAPI.listIssues(
      settings.github_token,
      settings.github_owner,
      settings.github_repo
    );
    renderIssues(issues);
  } catch (err) {
    console.error('Issue一覧取得エラー:', err);
    container.innerHTML = `<div class="empty">読み込みエラー: ${escapeHtml(err.message)}</div>`;
  }
}

// 既読にする（Issue Close）
async function markAsRead(issueNumber) {
  hideMessages();
  const settings = await getSettings();
  if (!settings.github_token || !settings.github_owner || !settings.github_repo) {
    showError('GitHubの設定が未完了です');
    return;
  }

  try {
    await GitHubAPI.closeIssue(
      settings.github_token,
      settings.github_owner,
      settings.github_repo,
      issueNumber
    );
    showSuccess('既読にしました！');
    await loadIssues();
  } catch (err) {
    console.error('Issue Close エラー:', err);
    showError(`エラー: ${err.message}`);
    // ボタンを元に戻す
    const btn = document.querySelector(`[data-issue-number="${issueNumber}"]`);
    if (btn) {
      btn.disabled = false;
      btn.textContent = '読んだ';
    }
  }
}

// Issue登録
async function addCurrentPage() {
  hideMessages();
  const settings = await getSettings();
  if (!settings.github_token || !settings.github_owner || !settings.github_repo) {
    showError('設定ページでGitHubの設定を完了してください');
    return;
  }

  const addBtn = document.getElementById('add-btn');
  addBtn.disabled = true;
  addBtn.textContent = '登録中...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const title = tab.title || tab.url;
    const url = tab.url;
    const priority = document.getElementById('priority').value;
    const body = `**URL**: ${url}\n\n登録日時: ${new Date().toLocaleString('ja-JP')}`;
    const labels = ['reading-list', priority];

    await GitHubAPI.createIssue(
      settings.github_token,
      settings.github_owner,
      settings.github_repo,
      title,
      body,
      labels
    );
    showSuccess('登録しました！');
    await loadIssues();
  } catch (err) {
    console.error('Issue登録エラー:', err);
    showError(`登録エラー: ${err.message}`);
  } finally {
    addBtn.disabled = false;
    addBtn.textContent = '登録する';
  }
}

// 初期化
async function init() {
  // 現在のタブ情報を表示
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    document.getElementById('current-title').textContent = tab.title || 'タイトルなし';
    document.getElementById('current-url-text').textContent = tab.url || '';
  } catch (err) {
    console.error('タブ情報取得エラー:', err);
  }

  // Issue一覧を読み込み
  await loadIssues();

  // イベントリスナー設定
  document.getElementById('add-btn').addEventListener('click', addCurrentPage);
  document.getElementById('refresh-btn').addEventListener('click', loadIssues);
  document.getElementById('options-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

document.addEventListener('DOMContentLoaded', init);
