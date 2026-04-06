import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiConfig } from '../hooks/useApiConfig';
import Header from '../components/app/Header';
import { resetExecution, submitExecution } from '../utils/api';
import { runExecutionAgent } from '../utils/executionAgent';
import './OraclePage.css';

const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic', icon: '🟣', placeholder: 'sk-ant-api03-...' },
  { id: 'openai',    name: 'OpenAI',    icon: '🟢', placeholder: 'sk-...' },
  { id: 'gemini',    name: 'Google Gemini', icon: '🔵', placeholder: 'AIza...' },
  { id: 'mistral',   name: 'Mistral AI',   icon: '🟠', placeholder: 'mis-...' },
  { id: 'nvidia',    name: 'NVIDIA NIM',    icon: '🟡', placeholder: 'nvapi-...' },
];

export default function OraclePage() {
  const navigate = useNavigate();
  const [apiConfig, setApiConfig] = useApiConfig();

  const [taskId, setTaskId] = useState('execution_easy');
  const [observation, setObservation] = useState(null);
  const [traces, setTraces] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [revealedCount, setRevealedCount] = useState(0);
  const [score, setScore] = useState(null);
  const [error, setError] = useState(null);

  // ── API Connect State ──
  const [connectOpen, setConnectOpen] = useState(false);
  const [tempProvider, setTempProvider] = useState(apiConfig.provider || '');
  const [tempKey, setTempKey] = useState('');

  const isConnected = !!(apiConfig.provider && apiConfig.keys[apiConfig.provider]);

  const openConnect = () => {
    setTempProvider(apiConfig.provider || '');
    setTempKey(apiConfig.keys[apiConfig.provider] || '');
    setConnectOpen(true);
  };

  const handleProviderSelect = (pid) => {
    setTempProvider(pid);
    setTempKey(apiConfig.keys[pid] || '');
  };

  const handleSaveApi = () => {
    const cleaned = (tempKey || '').replace(/[^\x20-\x7E]/g, '').trim();
    if (!tempProvider || !cleaned) return;
    const newConfig = {
      provider: tempProvider,
      keys: { ...apiConfig.keys, [tempProvider]: cleaned },
    };
    setApiConfig(newConfig);
    setConnectOpen(false);
  };

  const handleDisconnect = () => {
    const newConfig = { provider: '', keys: {} };
    setApiConfig(newConfig);
    setConnectOpen(false);
  };

  const handleInit = useCallback(async () => {
    setError(null);
    setPhase('loading');
    setTraces([]);
    setSelectedIdx(null);
    setScore(null);
    setRevealedCount(0);
    try {
      const obs = await resetExecution(taskId);
      setObservation(obs);
      setPhase('idle');
    } catch (e) {
      setError('Failed to initialize: ' + e.message);
      setPhase('idle');
    }
  }, [taskId]);

  const handleRun = useCallback(async () => {
    if (!observation) return;
    if (!isConnected) {
      setError('Connect an API provider first.');
      return;
    }
    setError(null);
    setPhase('executing');
    setTraces([]);
    setRevealedCount(0);
    setSelectedIdx(null);
    setScore(null);

    try {
      const agentTraces = await runExecutionAgent(observation, apiConfig);

      for (let i = 0; i < agentTraces.length; i++) {
        await new Promise(r => setTimeout(r, 200));
        setTraces(prev => [...prev, agentTraces[i]]);
        setRevealedCount(i + 1);
        setSelectedIdx(i); // Auto-select to show trace
      }

      const result = await submitExecution(agentTraces, taskId);
      setScore({
        overall: result.score,
        feedback: result.feedback,
      });

      // Find first crash if any, or default to 0
      const firstCrashIdx = agentTraces.findIndex(t => t.crashes);
      if (firstCrashIdx >= 0) {
        setSelectedIdx(firstCrashIdx);
      } else {
        setSelectedIdx(0);
      }
      setPhase('done');
    } catch (e) {
      setError('Simulation failed: ' + e.message);
      setPhase('idle');
    }
  }, [observation, taskId, apiConfig, isConnected]);

  const scenarios = observation?.scenarios || [];
  const clauses = observation?.clauses || [];
  const getTrace = (scenarioId) => traces.find(t => t.scenario_id === scenarioId);
  const selectedScenario = selectedIdx !== null ? scenarios[selectedIdx] : null;
  const selectedTrace = selectedScenario ? getTrace(selectedScenario.scenario_id) : null;
  const crashCount = traces.filter(t => t.crashes).length;
  const cleanCount = traces.filter(t => !t.crashes).length;
  const findClause = (id) => clauses.find(c => c.id === id);

  const connectedProvider = PROVIDERS.find(p => p.id === apiConfig.provider);

  return (
    <div className="oracle-page">
      <Header apiConfig={apiConfig} />
      {/* ── Control Bar ──────────────────────────────────── */}
      <div className="oracle-control-bar">
        <button className="oracle-back-btn" onClick={() => navigate('/app')}>
          ← Back
        </button>
        <div className="oracle-title">
          ◉ The Oracle — Clausr Execution Simulator
        </div>

        {/* Connect API button */}
        <button
          className={'oracle-btn connect' + (isConnected ? ' connected' : '')}
          onClick={openConnect}
        >
          {isConnected
            ? (connectedProvider?.icon || '🔗') + ' ' + (connectedProvider?.name || 'Connected')
            : '🔗 Connect API'}
        </button>

        <select
          className="oracle-task-select"
          value={taskId}
          onChange={e => setTaskId(e.target.value)}
        >
          <option value="execution_easy">Easy (3 scenarios)</option>
          <option value="execution_medium">Medium (8 scenarios)</option>
          <option value="execution_hard">Hard (14 scenarios)</option>
        </select>
        <button
          className="oracle-btn init"
          onClick={handleInit}
          disabled={phase === 'executing' || phase === 'loading'}
        >
          ⚡ Initialize
        </button>
        <button
          className="oracle-btn run"
          onClick={handleRun}
          disabled={!observation || phase === 'executing' || phase === 'loading' || !isConnected}
        >
          ▶ Run Simulation
        </button>

        {score && (
          <div className="oracle-scores">
            <div className="oracle-score-item">
              <div className="label">Crashes Caught</div>
              <div className="value">{crashCount}</div>
            </div>
            <div className="oracle-score-item">
              <div className="label">Clean Confirmed</div>
              <div className="value green">{cleanCount}</div>
            </div>
            <div className="oracle-score-item">
              <div className="label">Score</div>
              <div className="value">{score.overall?.toFixed(2) || '—'}</div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="oracle-summary-banner crash">⚠ {error}</div>
      )}

      {phase === 'done' && (
        <div className={'oracle-summary-banner ' + (crashCount > 0 ? 'crash' : 'clean')}>
          {crashCount > 0
            ? 'Simulation Complete — ' + crashCount + ' of ' + scenarios.length + ' scenarios caused contract crashes.'
            : 'No execution crashes detected.'}
        </div>
      )}

      {/* ── Connect API Modal ────────────────────────────── */}
      {connectOpen && (
        <div className="api-modal-overlay" onClick={() => setConnectOpen(false)}>
          <div className="api-modal" onClick={e => e.stopPropagation()}>
            <div className="api-modal-header">
              <span className="api-modal-title">🔗 Connect API</span>
              <button className="api-modal-close" onClick={() => setConnectOpen(false)}>✕</button>
            </div>
            <div className="api-modal-body">
              <div className="api-provider-label">Select Provider</div>
              <div className="api-provider-grid">
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    className={'api-provider-card' + (tempProvider === p.id ? ' active' : '')}
                    onClick={() => handleProviderSelect(p.id)}
                  >
                    <span className="api-provider-icon">{p.icon}</span>
                    <span className="api-provider-name">{p.name}</span>
                    {apiConfig.keys[p.id] && (
                      <span className="api-provider-check">✓</span>
                    )}
                  </button>
                ))}
              </div>

              {tempProvider && (
                <div className="api-key-section">
                  <label className="api-key-label">
                    API Key for {PROVIDERS.find(p => p.id === tempProvider)?.name}
                  </label>
                  <input
                    className="api-key-input"
                    type="password"
                    value={tempKey}
                    onChange={e => setTempKey(e.target.value)}
                    placeholder={PROVIDERS.find(p => p.id === tempProvider)?.placeholder}
                    autoComplete="off"
                  />
                  <div className="api-key-hint">
                    Your key is stored locally in your browser. It never leaves your device.
                  </div>
                </div>
              )}
            </div>
            <div className="api-modal-footer">
              {isConnected && (
                <button className="api-disconnect-btn" onClick={handleDisconnect}>
                  Disconnect
                </button>
              )}
              <button
                className="api-save-btn"
                onClick={handleSaveApi}
                disabled={!tempProvider || !tempKey.trim()}
              >
                Connect & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main 3-Panel Layout ──────────────────────────── */}
      <div className="oracle-main" style={{ position: 'relative' }}>
        {phase === 'loading' && (
          <div className="oracle-loading-overlay">
            <div className="oracle-loading-text">Initializing execution environment...</div>
          </div>
        )}

        {/* ── Scenario Queue ─────────────────────────────── */}
        <div className="oracle-scenarios">
          <div className="oracle-scenarios-title">Scenario Queue</div>
          {scenarios.length === 0 && (
            <div className="trace-empty">
              Select a task level and click Initialize to load scenarios.
            </div>
          )}
          {scenarios.map((s, i) => {
            const trace = getTrace(s.scenario_id);
            const isRevealed = i < revealedCount;
            const isExecuting = phase === 'executing' && i === revealedCount;
            let statusClass = '';
            let statusIcon = '○';
            if (trace && isRevealed) {
              statusClass = trace.crashes ? 'crash' : 'clean';
              statusIcon = trace.crashes ? '✕' : '✓';
            } else if (isExecuting) {
              statusClass = 'executing';
            }

            return (
              <div
                key={s.scenario_id}
                className={'scenario-card ' + statusClass + (selectedIdx === i ? ' selected' : '')}
                onClick={() => setSelectedIdx(i)}
              >
                <div className="sc-header">
                  <span className="sc-num">#{String(i + 1).padStart(2, '0')}</span>
                  <span className="sc-status">
                    {isExecuting ? <span className="scenario-spinner" /> : statusIcon}
                  </span>
                </div>
                <div className="sc-title">{s.title}</div>
                <div className="sc-actor">{s.actor}</div>
                <div className="sc-action">{s.action_taken}</div>
              </div>
            );
          })}
        </div>

        {/* ── Execution Trace ────────────────────────────── */}
        <div className="oracle-trace">
          <div className="trace-title">Execution Trace</div>
          {!selectedTrace && (
            <div className="trace-empty">
              {scenarios.length > 0
                ? 'Click a scenario to view its execution trace.'
                : 'Initialize the environment to begin.'}
            </div>
          )}
          {selectedTrace && (
            <>
              {(selectedTrace.triggered_clauses || []).map((clauseId, stepIdx) => {
                const clause = findClause(clauseId);
                const isCrashClause = selectedTrace.crashes && selectedTrace.crash_pair &&
                  (clauseId === selectedTrace.crash_pair.clause_a_id || clauseId === selectedTrace.crash_pair.clause_b_id);

                return (
                  <div className="trace-step" key={stepIdx}>
                    <div className="step-num">{stepIdx + 1}</div>
                    <div className="step-conn">
                      <div className="step-dot" style={isCrashClause ? { background: '#ff4444' } : {}} />
                      {stepIdx < selectedTrace.triggered_clauses.length - 1 && <div className="step-line" />}
                    </div>
                    <div className="step-card" style={isCrashClause ? { borderColor: 'rgba(255,50,50,0.3)', background: 'rgba(255,40,40,0.05)' } : {}}>
                      <span className="clause-tag" style={isCrashClause ? { color: '#ff6655', background: 'rgba(255,60,60,0.15)' } : {}}>{clauseId}</span>
                      <span className="clause-title">{clause?.title || clauseId}</span>
                      <div className="clause-excerpt">
                        {clause ? clause.text.substring(0, 120) + '...' : ''}
                      </div>
                    </div>
                  </div>
                );
              })}

              {selectedTrace.crashes && selectedTrace.crash_pair && (
                <div className="trace-crash-zone">
                  <div className="crash-split">
                    <div className="crash-clause">
                      <div className="clause-tag">{selectedTrace.crash_pair.clause_a_id}</div>
                      <div className="clause-title">{findClause(selectedTrace.crash_pair.clause_a_id)?.title || ''}</div>
                      <div className="clause-text">{findClause(selectedTrace.crash_pair.clause_a_id)?.text.substring(0, 200) || ''}</div>
                    </div>
                    <div className="crash-x">✕</div>
                    <div className="crash-clause">
                      <div className="clause-tag">{selectedTrace.crash_pair.clause_b_id}</div>
                      <div className="clause-title">{findClause(selectedTrace.crash_pair.clause_b_id)?.title || ''}</div>
                      <div className="clause-text">{findClause(selectedTrace.crash_pair.clause_b_id)?.text.substring(0, 200) || ''}</div>
                    </div>
                  </div>
                  <div className="crash-banner">
                    <div className="crash-label">⚠ EXECUTION CRASH</div>
                    <div className="crash-desc">{selectedTrace.explanation}</div>
                  </div>
                </div>
              )}

              {!selectedTrace.crashes && (
                <div className="trace-resolved">
                  <div className="resolved-icon">✓</div>
                  <div className="resolved-text">Scenario Resolved — No Contradiction Triggered</div>
                  <div className="resolved-detail">{selectedTrace.explanation}</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Blast Radius ───────────────────────────────── */}
        <div className="oracle-blast">
          <div className="blast-title">Blast Radius</div>
          {!selectedTrace && (
            <div className="blast-empty">
              Select a scenario to view its impact analysis.
            </div>
          )}
          {selectedTrace && selectedTrace.crashes && (
            <>
              <div className="blast-exposure">
                {selectedTrace.explanation || 'Contract enters undefined state at crash point.'}
              </div>
              <div className="blast-section">
                <div className="blast-label">Affected Clauses</div>
                <div className="blast-value">
                  {selectedTrace.crash_pair?.clause_a_id} vs {selectedTrace.crash_pair?.clause_b_id}
                </div>
              </div>
              <div className="blast-section">
                <div className="blast-label">Triggered Clauses</div>
                <div className="blast-value">
                  {(selectedTrace.triggered_clauses || []).join(' → ')}
                </div>
              </div>
              <div className="blast-section">
                <div className="blast-label">Recommendation</div>
                <div className="blast-value">
                  The employee should consult legal counsel before taking this action. The contract contains irreconcilable obligations that create legal ambiguity.
                </div>
              </div>
            </>
          )}
          {selectedTrace && !selectedTrace.crashes && (
            <div className="blast-clean">
              <div className="clean-icon">🟢</div>
              <div className="clean-text">No Contradiction Triggered</div>
              <div className="clean-detail">
                {selectedTrace.explanation || 'This scenario executes cleanly through all relevant clauses without conflict.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
