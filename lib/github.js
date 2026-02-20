// GitHub API クライアント

const GitHubAPI = (() => {
  const BASE_URL = 'https://api.github.com';

  // リクエストヘッダーを構築
  function buildHeaders(token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  // APIレスポンスのエラーハンドリング
  async function handleResponse(response) {
    if (response.status === 401) {
      throw new Error('GitHubトークンが無効または未設定です（401）');
    }
    if (response.status === 404) {
      throw new Error('リポジトリが見つかりません（404）');
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub API エラー ${response.status}: ${text}`);
    }
    return response.json();
  }

  // Issue作成
  async function createIssue(token, owner, repo, title, body, labels) {
    const response = await fetch(
      `${BASE_URL}/repos/${owner}/${repo}/issues`,
      {
        method: 'POST',
        headers: buildHeaders(token),
        body: JSON.stringify({ title, body, labels })
      }
    );
    return handleResponse(response);
  }

  // Issue一覧取得（reading-listラベル、open状態）
  async function listIssues(token, owner, repo) {
    const response = await fetch(
      `${BASE_URL}/repos/${owner}/${repo}/issues?labels=reading-list&state=open&per_page=100`,
      {
        method: 'GET',
        headers: buildHeaders(token)
      }
    );
    return handleResponse(response);
  }

  // Issue Close
  async function closeIssue(token, owner, repo, issueNumber) {
    const response = await fetch(
      `${BASE_URL}/repos/${owner}/${repo}/issues/${issueNumber}`,
      {
        method: 'PATCH',
        headers: buildHeaders(token),
        body: JSON.stringify({ state: 'closed' })
      }
    );
    return handleResponse(response);
  }

  // ラベル更新
  async function updateIssueLabels(token, owner, repo, issueNumber, labels) {
    const response = await fetch(
      `${BASE_URL}/repos/${owner}/${repo}/issues/${issueNumber}`,
      {
        method: 'PATCH',
        headers: buildHeaders(token),
        body: JSON.stringify({ labels })
      }
    );
    return handleResponse(response);
  }

  return { createIssue, listIssues, closeIssue, updateIssueLabels };
})();
