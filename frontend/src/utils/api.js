const BASE = 'http://127.0.0.1:7860';

export async function checkHealth() {
  const res = await fetch(`${BASE}/health`);
  return res.ok;
}

export async function resetEpisode(taskId) {
  const res = await fetch(`${BASE}/reset?task_id=${encodeURIComponent(taskId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Reset failed: ${res.status}`);
  return res.json();
}

export async function submitFindings(findings, taskId = 'easy') {
  const url = `${BASE}/step?task_id=${encodeURIComponent(taskId)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ findings }),
  });
  if (!res.ok) throw new Error(`Step failed: ${res.status}`);
  return res.json();
}

export async function resetExecution(taskId = 'execution_easy') {
  const res = await fetch(`${BASE}/execution/reset?task_id=${encodeURIComponent(taskId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Execution reset failed: ${res.status}`);
  return res.json();
}

export async function submitExecution(traces, taskId = 'execution_easy') {
  const url = `${BASE}/execution/step?task_id=${encodeURIComponent(taskId)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ traces }),
  });
  if (!res.ok) throw new Error(`Execution step failed: ${res.status}`);
  return res.json();
}

// ── LexMind — Negotiation Co-Pilot ──

export async function resetLexMind(taskId = 'lexmind_easy') {
  const res = await fetch(`${BASE}/lexmind/reset?task_id=${encodeURIComponent(taskId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`LexMind reset failed: ${res.status}`);
  return res.json();
}

export async function submitLexMind(steps, taskId = 'lexmind_easy') {
  const url = `${BASE}/lexmind/step?task_id=${encodeURIComponent(taskId)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steps }),
  });
  if (!res.ok) throw new Error(`LexMind step failed: ${res.status}`);
  return res.json();
}

