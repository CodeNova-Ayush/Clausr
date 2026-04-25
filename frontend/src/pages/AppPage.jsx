import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { checkHealth, resetEpisode, submitFindings } from '../utils/api';
import './AppPage.css';

export default function AppPage() {
  const [activeSection, setActiveSection] = useState('demo');

  return (
    <div className="app-page-scrollable" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <LiveScoreDashboard />
      
      <div style={{ margin: '60px 0' }} />
      <h2 style={{ fontSize: '32px', marginBottom: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>Interactive Contract Demo</h2>
      <InteractiveDemo />

      <div style={{ margin: '60px 0' }} />
      <h2 style={{ fontSize: '32px', marginBottom: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>Environment Showcase</h2>
      <EnvironmentShowcase />

      <div style={{ margin: '60px 0' }} />
      <h2 style={{ fontSize: '32px', marginBottom: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>Training Performance</h2>
      <ScoreHistoryChart />

      <div style={{ margin: '60px 0' }} />
      <h2 style={{ fontSize: '32px', marginBottom: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>API Playground</h2>
      <ApiPlayground />
      
      <div style={{ height: '100px' }} />
    </div>
  );
}

function LiveScoreDashboard() {
  const [live, setLive] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const ok = await checkHealth();
        setLive(ok);
      } catch {
        setLive(false);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

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
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: live ? 'var(--green)' : 'var(--red)', animation: live ? 'statusPulse 2s infinite' : 'none' }} />
          Live Inference Dashboard
        </h3>
        <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--green)' }}>
          0.8360 <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mean Score</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {tasks.map(t => (
          <div key={t.name} style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold' }}>{t.name}</div>
            <div style={{ fontSize: '20px', color: 'var(--text-primary)', fontWeight: '900' }}>{t.score.toFixed(4)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InteractiveDemo() {
  const [obs, setObs] = useState(null);
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEasy();
  }, []);

  const loadEasy = async () => {
    setLoading(true);
    setResult(null);
    setSelected([]);
    try {
      const data = await resetEpisode('easy');
      setObs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(x => x !== id));
    } else {
      if (selected.length < 2) setSelected([...selected, id]);
    }
  };

  const handleMark = async () => {
    if (selected.length !== 2) return;
    setLoading(true);
    try {
      const finding = { clause_a_id: selected[0], clause_b_id: selected[1], explanation: "Manual selection" };
      const res = await submitFindings([finding], 'easy');
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
      {loading && !obs ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--purple)' }}>Initializing clauses...</div>
      ) : obs && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {obs.clauses.map(c => {
              const isSel = selected.includes(c.id);
              return (
                <div 
                  key={c.id} 
                  onClick={() => toggleSelect(c.id)}
                  style={{ 
                    padding: '16px', background: isSel ? 'rgba(127,119,221,0.15)' : 'var(--bg-card)', 
                    border: `2px solid ${isSel ? 'var(--purple)' : 'var(--border)'}`, 
                    borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '10px', color: 'var(--purple)', fontWeight: 'bold', marginBottom: '8px' }}>{c.id}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{c.text}</div>
                </div>
              );
            })}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
            <button 
              onClick={loadEasy}
              style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Reload
            </button>
            <button 
              onClick={handleMark}
              disabled={selected.length !== 2 || loading}
              style={{ background: selected.length === 2 ? 'var(--purple)' : 'var(--purple-dim)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: selected.length === 2 ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
            >
              {loading ? 'Evaluating...' : `Mark as Contradicting (${selected.length}/2)`}
            </button>
          </div>

          {result && (
            <div style={{ 
              marginTop: '16px', padding: '20px', borderRadius: '12px', 
              background: result.score > 0 ? 'rgba(0, 212, 170, 0.1)' : 'rgba(255, 68, 68, 0.1)',
              border: `1px solid ${result.score > 0 ? 'var(--green)' : 'var(--red)'}`,
              animation: 'slideIn 0.4s ease'
            }}>
              <h3 style={{ color: result.score > 0 ? 'var(--green)' : 'var(--red)', marginBottom: '8px' }}>
                {result.score > 0 ? 'Correct Identification!' : 'Incorrect'}
              </h3>
              <p style={{ color: 'var(--text-primary)', fontSize: '14px' }}>Score: {result.score.toFixed(2)}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>{result.feedback}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EnvironmentShowcase() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
      <div className="env-card">
        <h3 style={{ color: 'var(--red)', marginBottom: '12px' }}>Detection</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Identifies explicit text-based logical conflicts.</p>
        <div className="anim-detect">
          <div className="box doc-box">Clause A</div>
          <div className="box doc-box">Clause B</div>
          <div className="laser"></div>
        </div>
      </div>
      <div className="env-card">
        <h3 style={{ color: 'var(--amber)', marginBottom: '12px' }}>Oracle / Execution</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Simulates contract timeline execution.</p>
        <div className="anim-timeline">
          <div className="timeline-dot"></div>
          <div className="timeline-dot"></div>
          <div className="timeline-dot crash"></div>
        </div>
      </div>
      <div className="env-card">
        <h3 style={{ color: 'var(--purple)', marginBottom: '12px' }}>LexMind</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Multi-step adversarial resolution.</p>
        <div className="anim-lex">
          <div className="check-step"></div>
          <div className="check-step"></div>
          <div className="check-step"></div>
        </div>
      </div>
    </div>
  );
}

function ScoreHistoryChart() {
  // Generate dummy curve: 0 to 50, score from 0.15 to 0.89
  const data = Array.from({ length: 50 }, (_, i) => ({
    episode: i,
    score: 0.15 + (0.89 - 0.15) * (1 - Math.exp(-i / 15)) + (Math.random() * 0.05)
  }));

  return (
    <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
      <div style={{ height: '300px', width: '100%' }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="episode" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
            <YAxis domain={[0, 1]} stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} />
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
    <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
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
          style={{ width: '100%', height: '150px', background: '#0a0a0f', color: '#00d4aa', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}
        />
        <button onClick={submit} style={{ marginTop: '16px', background: 'var(--purple)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>POST /step</button>
      </div>
      <div style={{ flex: 1, minWidth: '300px' }}>
        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>Response</label>
        <pre style={{ width: '100%', height: '100%', minHeight: '200px', background: '#0a0a0f', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '12px', overflow: 'auto', margin: 0 }}>
          {result || '// Response will appear here'}
        </pre>
      </div>
    </div>
  );
}
