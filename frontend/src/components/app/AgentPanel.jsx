import ReasoningTrace from './ReasoningTrace';
import { TYPE_COLORS, TYPE_SHORT } from '../../utils/classifier';

export default function AgentPanel({ 
  observation, findings, setFindings, onRunAgent, onSubmit, 
  loading, submitting, gradedResult, apiConfig, error,
  reasoningTrace, classifier
}) {
  const hasKey = !!(apiConfig && apiConfig.keys[apiConfig.provider]);
  const canRun = observation && hasKey && !loading && !gradedResult && findings.length === 0;
  
  const providerNames = {
    anthropic: 'Anthropic',
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    mistral: 'Mistral',
    nvidia: 'NVIDIA'
  };
  const currentProviderName = providerNames[apiConfig?.provider] || 'AI';

  const typeCounts = {};
  if (findings.length > 0 && classifier && observation) {
    findings.forEach(f => {
      const type = classifier(f, observation.clauses);
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
  }

  return (
    <div className="app-panel agent-panel">
      <div className="panel-top">
        <span className="panel-label">Agent</span>
        <button className="btn-run" onClick={onRunAgent} disabled={!canRun}>
          {loading ? (
            <><span className="spin" /> Analyzing...</>
          ) : '▶ Run Agent'}
        </button>
      </div>
      <div className="panel-body">
        {/* Error state */}
        {error && (
          <div className="agent-error">
            <p className="agent-error-title">⚠ Agent Error</p>
            <p className="agent-error-msg">{error}</p>
            {(error.includes('API key') || error.includes('401') || error.includes('403') || error.includes('Key')) && (
              <p className="agent-error-hint">Check your {currentProviderName} API key in Settings (top right ⚙)</p>
            )}
          </div>
        )}

        {/* Empty — no observation */}
        {!observation && !error ? (
          <div className="empty">
            <div className="empty-icon">🤖</div>
            <p>Initialize an episode to begin</p>
          </div>

        /* Loading — agent running */
        ) : loading ? (
          <div className="empty">
            <div className="spin large" />
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '16px' }}>
              {currentProviderName} reading {observation?.clauses?.length} clauses...
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
              Finding {observation?.num_contradictions} contradiction(s)
            </p>
            <div style={{ marginTop: '20px', width: '100%' }}>
              <ReasoningTrace trace={reasoningTrace} />
            </div>
          </div>

        /* Has findings — show them */
        ) : findings.length > 0 ? (
          <>
            {/* Type Distribution Summary */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {Object.entries(typeCounts).map(([type, count]) => (
                <span key={type} style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '3px',
                  background: TYPE_COLORS[type] + '20', color: TYPE_COLORS[type]
                }}>
                  {TYPE_SHORT[type]} ×{count}
                </span>
              ))}
            </div>

            <ReasoningTrace trace={reasoningTrace} />

            <div style={{ padding: '0 16px' }}>
              {findings.map((f, i) => {
                let status = 'pending';
                if (gradedResult) {
                  status = gradedResult.score >= 1.0 ? 'correct' : gradedResult.score <= 0 ? 'wrong' : 'mixed';
                }
                const detectedType = classifier ? classifier(f, observation?.clauses) : null;
                const conf = f.confidence !== undefined ? f.confidence : 0.7;
                const confColor = conf >= 0.9 ? 'var(--green)' : conf >= 0.7 ? 'var(--amber)' : 'var(--red)';
                const confLabel = conf >= 0.9 ? 'High confidence' : conf >= 0.7 ? 'Likely' : 'Uncertain';

                return (
                  <div key={i} className={`finding finding-${status}`} style={{ animationDelay: `${i * 0.08}s`, marginBottom: '12px' }}>
                    <div className="finding-top">
                      <span className="f-clause">{f.clause_a_id}</span>
                      <span className="f-vs">VS</span>
                      <span className="f-clause">{f.clause_b_id}</span>
                      {gradedResult && (
                        <span className={`f-badge ${status === 'correct' ? 'f-badge-ok' : status === 'wrong' ? 'f-badge-fail' : ''}`}>
                          {status === 'correct' ? '✓ Correct' : status === 'wrong' ? '✗ Wrong' : '~ Mixed'}
                        </span>
                      )}
                    </div>
                    <p className="f-explanation" style={{ marginBottom: '8px' }}>{f.explanation}</p>
                    
                    {detectedType && (
                      <span style={{
                        fontSize: '10px', padding: '2px 7px', borderRadius: '3px',
                        background: TYPE_COLORS[detectedType] + '20',
                        color: TYPE_COLORS[detectedType], display: 'inline-block'
                      }}>
                        {TYPE_SHORT[detectedType]}
                      </span>
                    )}

                    <div style={{ marginTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Confidence</span>
                        <span style={{ fontSize: '10px', color: confColor, fontWeight: '600' }}>
                          {Math.round(conf * 100)}% — {confLabel}
                        </span>
                      </div>
                      <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${conf * 100}%`, background: confColor,
                                      borderRadius: '2px', transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Submit button — only before grading */}
              {!gradedResult && (
                <div className="submit-bar">
                  <button className="btn-submit" onClick={onSubmit} disabled={submitting}>
                    {submitting ? (
                      <><span className="spin" /> Submitting...</>
                    ) : 'Submit to Grader →'}
                  </button>
                  <p className="submit-hint">
                    {findings.length} finding(s) · calls POST /step
                  </p>
                </div>
              )}
            </div>
          </>

        /* Ready but no findings yet */
        ) : observation && !error ? (
          <div className="empty">
            <div className="empty-icon">🔍</div>
            <p>{hasKey ? `Click "▶ Run Agent" to analyze with ${currentProviderName}` : `Set ${currentProviderName} API key in ⚙ Settings first`}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
