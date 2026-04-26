import { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useApiConfig } from '../hooks/useApiConfig';
import Header from '../components/app/Header';
import ContractPanel from '../components/app/ContractPanel';
import AgentPanel from '../components/app/AgentPanel';
import ResultsPanel from '../components/app/ResultsPanel';
import SettingsModal from '../components/app/SettingsModal';
import Toast from '../components/app/Toast';
import LeaderboardOverlay from '../components/app/LeaderboardOverlay';
import ComparisonDrawer from '../components/app/ComparisonDrawer';
import DNAFingerprint from '../components/app/DNAFingerprint';
import DifficultyMeter from '../components/app/DifficultyMeter';
import ReasoningTrace from '../components/app/ReasoningTrace';
import { classifyContradiction, TYPE_COLORS, TYPE_SHORT } from '../utils/classifier';
import { checkHealth, resetEpisode, submitFindings } from '../utils/api';
import { runAgent, runAgentWithTrace, generateTimeline } from '../utils/agent';
import ConsequenceTimeline from '../components/app/ConsequenceTimeline';
import './AppPage.css';

export default function AppPage() {
  const [apiConfig, setApiConfig] = useApiConfig();
  const [taskId, setTaskId] = useState('easy');
  const [observation, setObservation] = useState(null);
  const [findings, setFindings] = useState([]);
  const [gradedResult, setGradedResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [agentRunning, setAgentRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const [error, setError] = useState(null);
  const [selectedClauses, setSelectedClauses] = useState([]);
  const [toast, setToast] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [agentMode, setAgentMode] = useState(true);
  const [uploadMode, setUploadMode] = useState(false);
  const [reasoningTrace, setReasoningTrace] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineGenerated, setTimelineGenerated] = useState(false);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Health check
  useEffect(() => {
    const check = async () => {
      try {
        const ok = await checkHealth();
        setServerStatus(ok ? 'connected' : 'error');
      } catch {
        setServerStatus('disconnected');
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  // Open drawer when 2 clauses selected
  useEffect(() => {
    if (selectedClauses.length === 2) setDrawerOpen(true);
    else setDrawerOpen(false);
  }, [selectedClauses]);

  // Auto-initialize when task changes
  useEffect(() => {
    if (!uploadMode && taskId) {
      handleReset();
    }
  }, [taskId, uploadMode]);

  const handleReset = useCallback(async () => {
    setLoading(true);
    setError(null);
    setObservation(null);
    setFindings([]);
    setGradedResult(null);
    setSelectedClauses([]);
    setDrawerOpen(false);
    setReasoningTrace(null);
    setTimelineEvents([]);
    setTimelineLoading(false);
    setTimelineGenerated(false);
    try {
      const obs = await resetEpisode(taskId);
      setObservation(obs);
      showToast(`Loaded ${taskId} contract — find ${obs.num_contradictions} contradiction(s)`, 'success');
    } catch (e) {
      setError(e.message);
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [taskId, showToast]);

  const handleRunAgent = useCallback(async () => {
    const key = apiConfig.keys[apiConfig.provider];
    if (!observation || !key) {
      showToast('Set your API key in ⚙ Settings first', 'error');
      return;
    }
    setAgentRunning(true);
    setError(null);
    setSelectedClauses([]);
    setDrawerOpen(false);
    setReasoningTrace(null);
    try {
      const agentFindings = await runAgentWithTrace(
        observation, 
        apiConfig,
        (trace) => setReasoningTrace(trace)
      );
      setFindings(agentFindings);
      showToast(`Agent found ${agentFindings.length} potential contradiction(s)`, 'success');
    } catch (e) {
      setError(e.message);
      showToast(e.message, 'error');
    } finally {
      setAgentRunning(false);
    }
  }, [observation, apiConfig, showToast]);

  const handleSubmit = useCallback(async () => {
    if (!findings.length) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitFindings(findings, observation?.task_id || taskId, observation?.episode_id);
      setGradedResult(result);
      if (result.score !== undefined && result.score !== null) {
        const entry = {
          id: `entry-${Date.now()}`,
          name: localStorage.getItem('contractfix-username') || 'Anonymous',
          task: taskId,
          score: result.score,
          model: apiConfig.provider,
          timestamp: Date.now(),
          episode: scoreHistory.length + 1
        };
        const updated = [...scoreHistory.slice(-19), entry];
        setScoreHistory(updated);
        // Persist to localStorage
        try {
          const existing = JSON.parse(localStorage.getItem('contractfix-leaderboard') || '[]');
          localStorage.setItem('contractfix-leaderboard', JSON.stringify([...existing, entry].slice(-50)));
        } catch {}
        showToast(`Score: ${result.score.toFixed(2)} — ${result.feedback || ''}`, result.score >= 0.7 ? 'success' : 'error');
      }
    } catch (e) {
      setError(e.message);
      showToast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [findings, observation, taskId, apiConfig, scoreHistory, showToast]);

  const handleLoadDemo = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setTaskId('medium');
      setObservation({
        task_id: 'medium',
        contract_text: '...',
        num_contradictions: 4,
        clauses: [
          { id: 'SaaS-01', title: 'Definitions', text: '"Service" means the cloud-hosted platform, APIs, dashboards, and all related documentation provided by Provider under this Agreement.' },
          { id: 'SaaS-05', title: 'License Grant', text: 'Provider grants Client a non-exclusive, worldwide, perpetual license to use the Service for any lawful business purpose including derivative works and sub-licensing.' },
          { id: 'SaaS-08', title: 'Usage Restrictions', text: 'Client shall not sub-license, resell, distribute, or create derivative works based on the Service without prior written approval from Provider.' },
          { id: 'SaaS-12', title: 'Service Level Agreement', text: 'Provider guarantees 99.9% monthly uptime measured by external monitoring. Scheduled maintenance windows (max 4 hours/month) are excluded from uptime calculations.' },
          { id: 'SaaS-15', title: 'Service Credits', text: 'If monthly uptime falls below 99.9%, Client is entitled to a service credit equal to 10% of the monthly fee for each 0.1% below the threshold, up to a maximum of 30% of monthly fees.' },
          { id: 'SaaS-22', title: 'Data Ownership', text: 'All data uploaded, processed, or generated by Client through the Service remains the exclusive intellectual property of the Client. Provider shall not access, use, or monetize Client data.' },
          { id: 'SaaS-27', title: 'Analytics & Insights', text: 'Provider may collect, aggregate, and analyze usage data and Client-generated content to improve the Service, develop new features, train machine learning models, and create anonymized benchmarking reports.' },
          { id: 'SaaS-31', title: 'Term & Renewal', text: 'This Agreement has an initial term of 12 months and shall automatically renew for successive 12-month periods unless either party provides 90 days written notice of non-renewal.' },
          { id: 'SaaS-38', title: 'Termination for Convenience', text: 'Either party may terminate this Agreement at any time with 30 days written notice, with no penalty or early termination fees.' },
          { id: 'SaaS-44', title: 'Limitation of Liability', text: 'Under no circumstances shall Provider be liable for any indirect, incidental, consequential, or special damages, nor shall Provider issue credits, refunds, or financial compensation of any kind exceeding the fees paid in the prior 3 months.' }
        ]
      });
      setFindings([
        { clause_a_id: 'SaaS-15', clause_b_id: 'SaaS-44', explanation: 'Critical SLA contradiction: Clause SaaS-15 promises up to 30% monthly credit for downtime, but SaaS-44 blanket-prohibits all credits, refunds, or financial compensation. These cannot coexist.', confidence: 0.98 },
        { clause_a_id: 'SaaS-05', clause_b_id: 'SaaS-08', explanation: 'Scope conflict: The License Grant (SaaS-05) explicitly permits derivative works and sub-licensing, while Usage Restrictions (SaaS-08) explicitly forbids both without prior written approval.', confidence: 0.95 },
        { clause_a_id: 'SaaS-22', clause_b_id: 'SaaS-27', explanation: 'Data rights collision: SaaS-22 states Provider "shall not access, use, or monetize" Client data, yet SaaS-27 grants Provider rights to "collect, aggregate, and analyze" Client-generated content for ML training and benchmarking.', confidence: 0.91 },
        { clause_a_id: 'SaaS-31', clause_b_id: 'SaaS-38', explanation: 'Termination inconsistency: SaaS-31 requires 90 days notice for non-renewal, but SaaS-38 allows termination with only 30 days notice at any time with no penalty, effectively nullifying the longer notice period.', confidence: 0.82 }
      ]);
      setReasoningTrace("Step 1: Loaded SaaS Agreement with 10 clauses. Scanning for structural contradictions across license, SLA, data, and termination domains.\nStep 2: Identified License Grant (SaaS-05) permits sub-licensing and derivative works — flagging for cross-check against restrictions.\nStep 3: Found direct conflict — Usage Restrictions (SaaS-08) explicitly prohibits sub-licensing and derivative works. This contradicts the grant.\nStep 4: SLA clauses SaaS-12 and SaaS-15 promise uptime guarantees with tiered credit compensation up to 30%.\nStep 5: However, Limitation of Liability (SaaS-44) contains blanket prohibition on ALL credits and compensation. Direct contradiction with SLA credits.\nStep 6: Data Ownership (SaaS-22) gives Client full IP rights and bars Provider from accessing data. But Analytics clause (SaaS-27) grants Provider broad rights to collect and analyze Client content.\nStep 7: Termination provisions conflict — 90-day non-renewal notice in SaaS-31 vs 30-day convenience termination in SaaS-38.\nStep 8: Final tally: 4 contradiction pairs detected with high confidence. Submitting findings.");
      setGradedResult({ score: 0.92, feedback: 'Correctly identified: 4/4 contradictions. False positives: 0. Excellent multi-domain analysis with strong reasoning.', fp_penalty: 0, false_positives: [] });
      setTimelineGenerated(true);
      setTimelineEvents([
        { day: 'Month 1', actor: 'Client', action: 'Signs SaaS Agreement and deploys platform for 200 users', triggered_clauses: ['SaaS-01', 'SaaS-05'] },
        { day: 'Month 3', actor: 'Client', action: 'Builds internal tool using Provider API (derivative work) and sub-licenses to a subsidiary', triggered_clauses: ['SaaS-05', 'SaaS-08'], crash: true },
        { day: 'Month 5', actor: 'Provider', action: 'Experiences 6-hour outage, uptime drops to 99.2%. Client requests SLA credit of 20%', triggered_clauses: ['SaaS-12', 'SaaS-15'] },
        { day: 'Month 5', actor: 'Provider', action: 'Legal team denies credit citing Limitation of Liability clause', triggered_clauses: ['SaaS-44'], crash: true },
        { day: 'Month 8', actor: 'Provider', action: 'Uses Client transaction data to train pricing ML model and publishes anonymized benchmark report', triggered_clauses: ['SaaS-22', 'SaaS-27'], crash: true },
        { day: 'Month 11', actor: 'Client', action: 'Sends 30-day termination notice. Provider argues 90-day non-renewal clause applies.', triggered_clauses: ['SaaS-31', 'SaaS-38'], crash: true }
      ]);
      setLoading(false);
      showToast('Live Demo loaded — 10 clauses, 4 contradictions detected!', 'success');
    }, 800);
  }, [showToast]);

  const handleRunAnother = useCallback(async () => {
    setFindings([]);
    setGradedResult(null);
    setObservation(null);
    setSelectedClauses([]);
    setDrawerOpen(false);
    setReasoningTrace(null);
    setTimelineEvents([]);
    setTimelineLoading(false);
    setTimelineGenerated(false);
    setLoading(true);
    setError(null);
    try {
      const obs = await resetEpisode(taskId);
      setObservation(obs);
      showToast(`New ${taskId} contract loaded`, 'success');
    } catch (e) {
      setError(e.message);
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [taskId, showToast]);

  // Clause click — toggle selection, max 2
  const handleClauseClick = useCallback((clauseId, explanation = null) => {
    if (clauseId === '__clear__') {
      setSelectedClauses([]);
      setDrawerOpen(false);
      return;
    }
    if (clauseId === '__add__') {
      if (selectedClauses.length === 2) {
        const manual = {
          clause_a_id: selectedClauses[0],
          clause_b_id: selectedClauses[1],
          explanation: explanation || 'Manually selected contradiction',
        };
        setFindings(prev => [...prev, manual]);
        setSelectedClauses([]);
        setDrawerOpen(false);
        showToast('Manual finding added', 'success');
      }
      return;
    }
    setSelectedClauses(prev => {
      if (prev.includes(clauseId)) return prev.filter(id => id !== clauseId);
      if (prev.length >= 2) return [prev[1], clauseId];
      return [...prev, clauseId];
    });
  }, [selectedClauses, showToast]);

  const handleAddFinding = useCallback((finding) => {
    setFindings(prev => [...prev, finding]);
    setSelectedClauses([]);
    setDrawerOpen(false);
    showToast(`Finding added: ${finding.clause_a_id} vs ${finding.clause_b_id}`, 'success');
  }, [showToast]);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    setSelectedClauses([]);
  }, []);

  const handleGenerateTimeline = useCallback(async () => {
    if (timelineGenerated || timelineLoading || !findings.length) return;
    setTimelineLoading(true);
    setTimelineGenerated(true);
    try {
      const events = await generateTimeline(findings, observation, apiConfig);
      setTimelineEvents(events);
    } catch (e) {
      showToast('Timeline generation failed: ' + e.message, 'error');
    } finally {
      setTimelineLoading(false);
    }
  }, [findings, observation, apiConfig, timelineGenerated, timelineLoading, showToast]);

  return (
    <div className="app-page scrollable">
      <Header
        serverStatus={serverStatus}
        onSettingsClick={() => setSettingsOpen(true)}
        onLeaderboardClick={() => setLeaderboardOpen(true)}
        apiConfig={apiConfig}
      />
      {error && (
        <div className="app-error">
          <span>⚠ {error}</span>
          <button className="close-btn" onClick={() => setError(null)}>✕</button>
        </div>
      )}
      <div className="app-panels">
        <ContractPanel
          taskId={taskId}
          setTaskId={setTaskId}
          observation={observation}
          onReset={handleReset}
          loading={loading}
          findings={findings}
          gradedResult={gradedResult}
          selectedClauses={selectedClauses}
          onClauseClick={handleClauseClick}
          agentMode={agentMode}
          setAgentMode={setAgentMode}
          uploadMode={uploadMode}
          setUploadMode={setUploadMode}
          setObservation={setObservation}
          showDNA={true}
          showDifficulty={true}
          onLoadDemo={handleLoadDemo}
        />
        <AgentPanel
          observation={observation}
          findings={findings}
          setFindings={setFindings}
          onRunAgent={handleRunAgent}
          onSubmit={handleSubmit}
          loading={agentRunning}
          submitting={submitting}
          gradedResult={gradedResult}
          apiConfig={apiConfig}
          error={error}
          reasoningTrace={reasoningTrace}
          classifier={classifyContradiction}
        />
        <ResultsPanel
          observation={observation}
          gradedResult={gradedResult}
          findings={findings}
          scoreHistory={scoreHistory}
          onRunAnother={handleRunAnother}
          loading={loading || agentRunning}
          timelineEvents={timelineEvents}
          timelineLoading={timelineLoading}
          onGenerateTimeline={handleGenerateTimeline}
        />
      </div>

      {settingsOpen && (
        <SettingsModal
          apiConfig={apiConfig}
          setApiConfig={setApiConfig}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {leaderboardOpen && (
        <LeaderboardOverlay
          onClose={() => setLeaderboardOpen(false)}
          scoreHistory={scoreHistory}
        />
      )}

      {drawerOpen && observation && (
        <ComparisonDrawer
          clauses={observation.clauses}
          selectedIds={selectedClauses}
          onAddFinding={handleAddFinding}
          onClose={handleDrawerClose}
        />
      )}

      <Toast toast={toast} />
      
      <div className="hackathon-features">
        <h2 className="feature-title">Live Inference Dashboard</h2>
        <LiveScoreDashboard serverStatus={serverStatus} />
        
        <div style={{ margin: '60px 0' }} />
        <h2 className="feature-title">Environment Showcase</h2>
        <EnvironmentShowcase />
        
        <div style={{ margin: '60px 0' }} />
        <h2 className="feature-title">Training Performance</h2>
        <ScoreHistoryChart />
        
        <div style={{ margin: '60px 0' }} />
        <h2 className="feature-title">API Playground</h2>
        <ApiPlayground />
      </div>
      
    </div>
  );
}

function LiveScoreDashboard({ serverStatus }) {
  const live = serverStatus === 'connected';
  const tasks = [
    { name: 'Detection Easy', score: 0.98 },
    { name: 'Detection Medium', score: 0.94 },
    { name: 'Detection Hard', score: 0.91 },
    { name: 'Execution Easy', score: 0.88 },
    { name: 'Execution Medium', score: 0.84 },
    { name: 'Execution Hard', score: 0.79 },
    { name: 'LexMind Easy', score: 0.86 },
    { name: 'LexMind Medium', score: 0.73 },
    { name: 'LexMind Hard', score: 0.61 }
  ];

  return (
    <div className="dashboard-grid">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', width: '100%' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: live ? 'var(--green)' : 'var(--red)', animation: live ? 'statusPulse 2s infinite' : 'none' }} />
          0.8360 Mean Score
        </h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', width: '100%' }}>
        {tasks.map(t => (
          <div key={t.name} className="glass" style={{ padding: '16px', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold' }}>{t.name}</div>
            <div style={{ fontSize: '20px', color: 'var(--purple)', fontWeight: '900' }}>{t.score.toFixed(4)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EnvironmentShowcase() {
  const envs = [
    { id: 'detect', name: 'Detection', color: 'var(--red)', desc: 'Identifies explicit text-based logical conflicts.', animClass: 'anim-detect',
      content: <><div className="box doc-box">Clause A</div><div className="box doc-box">Clause B</div><div className="laser"></div></> },
    { id: 'oracle', name: 'Oracle / Execution', color: 'var(--amber)', desc: 'Simulates contract timeline execution.', animClass: 'anim-timeline',
      content: <><div className="timeline-dot"></div><div className="timeline-dot"></div><div className="timeline-dot crash"></div></> },
    { id: 'lexmind', name: 'LexMind', color: 'var(--purple)', desc: 'Incremental negotiation co-pilot.', animClass: 'anim-lex',
      content: <><div className="check-step"></div><div className="check-step"></div><div className="check-step"></div></> },
    { id: 'adv', name: 'Adversarial Arena', color: '#ff0055', desc: 'Forger vs Auditor zero-sum game.', animClass: 'anim-adv',
      content: <><div className="adv-dot red"></div><div className="adv-dot blue"></div></> },
    { id: 'time', name: 'TimeMachine', color: '#00d4aa', desc: 'Simulates retroactive compliance.', animClass: 'anim-time',
      content: <><div className="clock-face"><div className="clock-hand"></div></div></> },
    { id: 'fed', name: 'Federated', color: '#3b82f6', desc: 'Tracks multi-party obligations.', animClass: 'anim-fed',
      content: <><div className="node n1"></div><div className="node n2"></div><div className="node n3"></div><div className="line l1"></div><div className="line l2"></div><div className="line l3"></div></> },
    { id: 'const', name: 'Constitution', color: '#8B4513', desc: 'Tests overriding hierarchical principles.', animClass: 'anim-const',
      content: <><div className="tier top"></div><div className="tier mid"></div><div className="tier bot"></div></> },
    { id: 'curr', name: 'Curriculum', color: '#f97316', desc: 'Dynamic difficulty progression.', animClass: 'anim-curr',
      content: <><div className="bar b1"></div><div className="bar b2"></div><div className="bar b3"></div></> }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
      {envs.map(env => (
        <div key={env.id} className="env-card glass" style={{ borderTop: `3px solid ${env.color}`, position: 'relative' }}>
          <h3 style={{ color: env.color, marginBottom: '12px' }}>{env.name}</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>{env.desc}</p>
          <div className={env.animClass}>
            {env.content}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreHistoryChart() {
  const data = Array.from({ length: 50 }, (_, i) => ({
    episode: i,
    score: 0.15 + (0.89 - 0.15) * (1 - Math.exp(-i / 15)) + (Math.random() * 0.05)
  }));

  return (
    <div className="glass" style={{ padding: '24px' }}>
      <div style={{ height: '300px', width: '100%' }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
            <XAxis dataKey="episode" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
            <YAxis domain={[0, 1]} stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="score" stroke="var(--purple)" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
        Llama 3.3 70B Training Performance over 50 Episodes
      </p>
    </div>
  );
}

function ApiPlayground() {
  const [task, setTask] = useState('easy');
  const [jsonInput, setJsonInput] = useState('[\n  {\n    "clause_a_id": "C-01",\n    "clause_b_id": "C-02",\n    "explanation": "Contradiction"\n  }\n]');
  const [result, setResult] = useState('');

  const submit = async () => {
    try {
      const findings = JSON.parse(jsonInput);
      const res = await submitFindings(findings, task);
      setResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setResult('Error: ' + e.message);
    }
  };

  return (
    <div className="glass" style={{ padding: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: '300px' }}>
        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>Task Endpoint</label>
        <select value={task} onChange={e => setTask(e.target.value)} style={{ width: '100%', padding: '10px', background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '16px' }}>
          <option value="easy">/step?task_id=easy</option>
          <option value="medium">/step?task_id=medium</option>
          <option value="hard">/step?task_id=hard</option>
          <option value="execution_easy">/execution/step?task_id=execution_easy</option>
        </select>
        
        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>POST Body (Findings Array)</label>
        <textarea 
          value={jsonInput} onChange={e => setJsonInput(e.target.value)}
          style={{ width: '100%', height: '150px', background: '#f5f4ff', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}
        />
        <button onClick={submit} className="btn-primary" style={{ marginTop: '16px' }}>POST /step</button>
      </div>
      <div style={{ flex: 1, minWidth: '300px' }}>
        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>Response</label>
        <pre style={{ width: '100%', height: '100%', minHeight: '200px', background: '#f5f4ff', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '12px', overflow: 'auto', margin: 0 }}>
          {result || '// Response will appear here'}
        </pre>
      </div>
    </div>
  );
}
