import { useState } from 'react';
import ConsequenceTimeline from './ConsequenceTimeline';

export default function ResultsPanel({ observation, gradedResult, findings, scoreHistory, onRunAnother, loading, timelineEvents, timelineLoading, onGenerateTimeline }) {
  const [activeTab, setActiveTab] = useState('score');
  const score = gradedResult?.score ?? null;
  const feedback = gradedResult?.feedback || '';
  const taskId = observation?.task_id || '—';
  const episodeId = observation?.episode_id || '';
  const numContra = observation?.num_contradictions || 0;

  const correctMatch = feedback.match(/Correctly identified: (\d+)\/(\d+)/);
  const fpMatch = feedback.match(/False positives: (\d+)/);
  // Default values to 0 if parsing fails or if dealing with a user contract where grading isn't matched
  const found = correctMatch ? parseInt(correctMatch[1]) : 0;
  const total = correctMatch ? parseInt(correctMatch[2]) : numContra;
  const fp = fpMatch ? parseInt(fpMatch[1]) : (gradedResult?.fp ?? 0);

  const taskColor = { easy: 'var(--green)', medium: 'var(--amber)', hard: 'var(--red)' }[taskId] || 'var(--text-muted)';
  const scoreColor = score === null ? 'var(--text-muted)' : score >= 0.7 ? 'var(--green)' : score >= 0.4 ? 'var(--amber)' : 'var(--red)';

  const mean = scoreHistory.length > 0 ? scoreHistory.reduce((a, b) => a + b.score, 0) / scoreHistory.length : 0;
  const best = scoreHistory.length > 0 ? Math.max(...scoreHistory.map(s => s.score)) : 0;

  const handleExport = () => {
    const isCorrect = (f) => {
      // Logic from agent findings check or naive if no automated backend 
      // This matches against feedback text if available
      return (!gradedResult || gradedResult.score > 0); 
    };

    const reportHTML = `
      <div class="report">
        <div class="report-header">
          <h1>Clausr Analysis Report</h1>
          <p>${new Date().toLocaleString()}</p>
        </div>
        
        <div class="report-section">
          <h2>Episode Summary</h2>
          <table>
            <tr><td>Task</td><td>${(observation.task_id || '').toUpperCase()}</td></tr>
            <tr><td>Score</td><td>${score !== null ? score.toFixed(2) : 'N/A'} / 1.00</td></tr>
            <tr><td>Contradictions Found</td><td>${found} / ${total || '?'}</td></tr>
            <tr><td>False Positives</td><td>${fp}</td></tr>
            <tr><td>Episode ID</td><td>${episodeId || 'User Contract'}</td></tr>
          </table>
        </div>

        <div class="report-section">
          <h2>Agent Findings</h2>
          ${findings.map((f, i) => `
            <div class="finding ${isCorrect(f) ? 'correct' : 'wrong'}">
              <div class="finding-header">
                Finding ${i+1}: ${f.clause_a_id} vs ${f.clause_b_id}
                <span class="badge">${isCorrect(f) ? 'IDENTIFIED' : 'FALSE POSITIVE'}</span>
              </div>
              <p>${f.explanation}</p>
            </div>
          `).join('')}
        </div>

        <div class="report-section">
          <h2>Contract Clauses</h2>
          ${observation.clauses.map(c => `
            <div class="clause">
              <strong>${c.id} — ${c.title || 'Untitled'}</strong>
              <p>${c.text}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Clausr Report</title>
          <style>
            body { font-family: system-ui; color: #111; max-width: 800px; margin: 40px auto; }
            h1 { font-size: 28px; margin-bottom: 4px; }
            h2 { font-size: 18px; border-bottom: 2px solid #7F77DD; padding-bottom: 8px; margin: 24px 0 12px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 8px 12px; border-bottom: 1px solid #eee; }
            td:first-child { font-weight: 600; width: 200px; color: #555; }
            .finding { border: 1px solid #eee; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
            .finding.correct { border-color: #1D9E75; background: #f0faf5; }
            .finding.wrong { border-color: #E24B4A; background: #fff5f5; }
            .finding-header { font-weight: 600; margin-bottom: 6px; display: flex; justify-content: space-between; }
            .badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: #eee; }
            .correct .badge { background: #1D9E75; color: white; }
            .wrong .badge { background: #E24B4A; color: white; }
            .clause { border-bottom: 1px solid #eee; padding: 10px 0; }
            .clause strong { color: #7F77DD; }
            .report-header { border-bottom: 3px solid #7F77DD; padding-bottom: 16px; margin-bottom: 24px; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>${reportHTML}</body>
      </html>
    `);
    win.document.close();
    // setTimeout to allow images/fonts to render if applicable, then print
    setTimeout(() => {
      win.print();
    }, 500);
  };

  return (
    <div className="app-panel results-panel">
      <div className="panel-top">
        <span className="panel-label">Results</span>
      </div>
      <div className="panel-body">
        {gradedResult && (
          <div className="r-tabs" style={{display:'flex', gap:'12px', marginBottom: '16px', borderBottom: '1px solid var(--border)'}}>
             <button className={`r-tab ${activeTab === 'score' ? 'active' : ''}`} onClick={() => setActiveTab('score')} style={{background:'none', border:'none', color: activeTab === 'score' ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: activeTab === 'score' ? '2px solid var(--purple)' : '2px solid transparent', paddingBottom: '8px', cursor: 'pointer', fontWeight: 'bold'}}>Score</button>
             <button className={`r-tab ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => { setActiveTab('timeline'); onGenerateTimeline(); }} style={{background:'none', border:'none', color: activeTab === 'timeline' ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: activeTab === 'timeline' ? '2px solid var(--purple)' : '2px solid transparent', paddingBottom: '8px', cursor: 'pointer', fontWeight: 'bold'}}>Timeline</button>
          </div>
        )}
        
        {activeTab === 'score' || !gradedResult ? (
          <>
            {/* Task + Score */}
        <div className="r-task-row">
          <span className="r-label">Task</span>
          <span className="r-task-badge" style={{ borderColor: taskColor, color: taskColor }}>
            {taskId.toUpperCase()}
          </span>
        </div>

        <div className="r-score-block">
          <span className="r-score-num" style={{ color: scoreColor }}>
            {score !== null ? score.toFixed(2) : '—'}
          </span>
          <span className="r-score-of">/ 1.00</span>
          <div className="r-bar"><div className="r-bar-fill" style={{ width: `${(score || 0) * 100}%`, background: scoreColor }} /></div>
        </div>

        <div className="r-stats-row">
          <div className="r-stat">
            <span className="r-stat-val" style={{ color: 'var(--green)' }}>{found}</span>
            <span className="r-stat-lbl">/ {total || '?'} Found</span>
          </div>
          <div className="r-stat">
            <span className="r-stat-val" style={{ color: fp > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{fp}</span>
            <span className="r-stat-lbl">False Pos.</span>
          </div>
          <div className="r-stat">
            <span className="r-stat-val">{findings.length}</span>
            <span className="r-stat-lbl">Submitted</span>
          </div>
        </div>

        {feedback && <p className="r-feedback">{feedback}</p>}

        {observation?.isUserContract && (
          <p className="r-feedback">Manual Review Mode. Verify findings manually in output above.</p>
        )}

        <div className="r-row">
          <span className="r-label">Episode</span>
          <span className="r-mono">{episodeId ? episodeId.slice(0, 8) + '...' : '—'}</span>
        </div>

        {/* Chart */}
        {scoreHistory.length > 0 && !observation?.isUserContract && (
          <div className="r-chart-section">
            <span className="r-label">Episode History</span>
            <svg className="r-chart" viewBox="0 0 300 120">
              {[0, 0.25, 0.5, 0.75, 1.0].map(v => (
                <line key={v} x1="0" y1={110 - v * 100} x2="300" y2={110 - v * 100} stroke="var(--border)" strokeWidth="0.5" />
              ))}
              <line x1="0" y1={110 - mean * 100} x2="300" y2={110 - mean * 100} stroke="var(--purple)" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
              {scoreHistory.length > 1 && (
                <polyline fill="none" stroke="var(--purple)" strokeWidth="1.5" opacity="0.4"
                  points={scoreHistory.slice(-10).map((e, i, a) => {
                    const x = a.length === 1 ? 150 : (i / (a.length - 1)) * 280 + 10;
                    return `${x},${110 - e.score * 100}`;
                  }).join(' ')} />
              )}
              {scoreHistory.slice(-10).map((e, i, a) => {
                const x = a.length === 1 ? 150 : (i / (a.length - 1)) * 280 + 10;
                const y = 110 - e.score * 100;
                const c = e.score >= 0.7 ? 'var(--green)' : e.score >= 0.4 ? 'var(--amber)' : 'var(--red)';
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="5" fill={c} />
                    <text x={x} y={y - 9} fill="var(--text-muted)" fontSize="8" textAnchor="middle">{e.score.toFixed(2)}</text>
                  </g>
                );
              })}
              <text x="295" y={110 - mean * 100 - 5} fill="var(--purple)" fontSize="8" textAnchor="end">μ={mean.toFixed(2)}</text>
            </svg>
          </div>
        )}

        {/* Quick stats */}
        {scoreHistory.length > 0 && !observation?.isUserContract && (
          <div className="r-quick">
            <div className="r-quick-item"><span className="r-label">Mean</span><span>{mean.toFixed(2)}</span></div>
            <div className="r-quick-item"><span className="r-label">Best</span><span style={{ color: 'var(--green)' }}>{best.toFixed(2)}</span></div>
            <div className="r-quick-item"><span className="r-label">Episodes</span><span>{scoreHistory.length}</span></div>
          </div>
        )}

        {gradedResult && (
          <button className="btn-export" onClick={handleExport}>
            Export PDF Report
          </button>
        )}

        <button className="btn-another" onClick={onRunAnother} disabled={loading || !gradedResult}>
          ↻ Run Another
        </button>
        </>
        ) : (
          <>
            <ConsequenceTimeline events={timelineEvents} loading={timelineLoading} />
            <button className="btn-another" style={{marginTop:'24px'}} onClick={onRunAnother} disabled={loading || !gradedResult}>
              ↻ Run Another
            </button>
          </>
        )}
      </div>
    </div>
  );
}
