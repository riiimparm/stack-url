// エスカレーション判定ロジック

// 閾値を超えたIssueを抽出する
function getOverdueIssues(issues, thresholdDays) {
  const now = Date.now();
  const threshold = thresholdDays * 24 * 60 * 60 * 1000;
  return issues.filter(issue => {
    const created = new Date(issue.created_at).getTime();
    return (now - created) >= threshold;
  });
}
