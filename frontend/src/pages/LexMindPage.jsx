import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiConfig } from '../hooks/useApiConfig';
import Header from '../components/app/Header';
import { resetLexMind, submitLexMind } from '../utils/api';
import { runLexMindMonitor } from '../utils/lexmindAgent';
import './LexMindPage.css';

// ── Demo Data ──
const DEMO_SEQUENCE = [
  { event_id:'event_01',round:1,round_label:'Initial Draft',authored_by:'Drafter',action:'add',clause_id:'clause_01',clause_title:'Parties',clause_text:'This NDA is entered into between Apex Dynamics Inc., a Delaware corporation ("Disclosing Party"), and Coastal Research Labs LLC, a California LLC ("Receiving Party").' },
  { event_id:'event_02',round:1,round_label:'Initial Draft',authored_by:'Drafter',action:'add',clause_id:'clause_02',clause_title:'Definition of Confidential Information',clause_text:'Confidential Information means all technical data, trade secrets, business plans, financial projections, customer lists, and any other proprietary information disclosed by the Disclosing Party.' },
  { event_id:'event_03',round:1,round_label:'Initial Draft',authored_by:'Drafter',action:'add',clause_id:'clause_03',clause_title:'Confidentiality Obligations',clause_text:'The Receiving Party shall hold all Confidential Information in strict confidence and shall not disclose such information to any third party without prior written consent.' },
  { event_id:'event_04',round:1,round_label:'Initial Draft',authored_by:'Drafter',action:'add',clause_id:'clause_04',clause_title:'Duration of Confidentiality',clause_text:'All obligations of confidentiality shall remain in effect for a period of five (5) years from the date of disclosure, after which obligations shall terminate.' },
  { event_id:'event_05',round:1,round_label:'Initial Draft',authored_by:'Drafter',action:'add',clause_id:'clause_05',clause_title:'Return of Materials',clause_text:'Upon termination, the Receiving Party shall promptly return or destroy all documents containing Confidential Information and certify in writing within ten (10) business days.' },
  { event_id:'event_06',round:1,round_label:'Initial Draft',authored_by:'Drafter',action:'add',clause_id:'clause_06',clause_title:'Exclusions',clause_text:'Confidential Information shall not include information that is publicly available, was already in possession, independently developed, or received from a third party without restriction.' },
  { event_id:'event_07',round:1,round_label:'Initial Draft',authored_by:'Drafter',action:'add',clause_id:'clause_07',clause_title:'Surviving Obligations',clause_text:'Notwithstanding any termination, all confidentiality obligations shall survive in perpetuity. The Receiving Party shall maintain confidentiality indefinitely without time limitation.' },
  { event_id:'event_08',round:1,round_label:'Initial Draft',authored_by:'Drafter',action:'add',clause_id:'clause_08',clause_title:'Governing Law',clause_text:'This Agreement shall be governed by the laws of the State of Delaware without regard to conflict of laws principles.' },
];

const DEMO_GROUND_TRUTH = {
  event_01: { introduces_contradiction: false },
  event_02: { introduces_contradiction: false },
  event_03: { introduces_contradiction: false },
  event_04: { introduces_contradiction: false },
  event_05: { introduces_contradiction: false },
  event_06: { introduces_contradiction: false },
  event_07: { introduces_contradiction: true, contradicts_clause_id: 'clause_04', contradiction_type: 'temporal', contradiction_description: 'Clause 04 states confidentiality expires after 5 years. Clause 07 states obligations survive in perpetuity. Incompatible durations.' },
  event_08: { introduces_contradiction: false },
};

const DEMO_STEPS = [
  { event_id:'event_01',introduces_contradiction:false,contradicts_clause_id:null,explanation:'First clause — no prior clauses to conflict with.' },
  { event_id:'event_02',introduces_contradiction:false,contradicts_clause_id:null,explanation:'Defines confidential information. No conflict with existing parties clause.' },
  { event_id:'event_03',introduces_contradiction:false,contradicts_clause_id:null,explanation:'Standard confidentiality obligations. Compatible with definitions above.' },
  { event_id:'event_04',introduces_contradiction:false,contradicts_clause_id:null,explanation:'Sets 5-year confidentiality period. No prior duration clause to conflict with.' },
  { event_id:'event_05',introduces_contradiction:false,contradicts_clause_id:null,explanation:'Return of materials procedure. Independent obligation, no conflict.' },
  { event_id:'event_06',introduces_contradiction:false,contradicts_clause_id:null,explanation:'Standard exclusions. Carves out specific situations — complementary scope.' },
  { event_id:'event_07',introduces_contradiction:true,contradicts_clause_id:'clause_04',explanation:'CONTRADICTION: Clause 04 sets 5-year confidentiality. This clause demands perpetual/indefinite obligations. Directly incompatible temporal scope.' },
  { event_id:'event_08',introduces_contradiction:false,contradicts_clause_id:null,explanation:'Governing law provision. Covers different subject matter, no conflict.' },
];


export default function LexMindPage() {
  const navigate = useNavigate();

  // ── State ──
  const [taskId, setTaskId] = useState('lexmind_easy');
  const [observation, setObservation] = useState(null);
  const [sequence, setSequence] = useState([]);
  const [groundTruth, setGroundTruth] = useState({});
  const [agentSteps, setAgentSteps] = useState([]);
  const [visibleClauses, setVisibleClauses] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [apiConfig] = useApiConfig();
  const [contractTitle, setContractTitle] = useState('');

  const feedRef = useRef(null);
  const playIntervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  // ── Initialize ──
  const handleInit = useCallback(async () => {
    setIsLoading(true);
    setAgentSteps([]);
    setVisibleClauses([]);
    setSelectedEvent(null);
    setScore(null);
    setFeedback(null);
    setGroundTruth({});
    try {
      const obs = await resetLexMind(taskId);
      setObservation(obs);
      setSequence(obs.drafting_sequence || []);
      setContractTitle(obs.contract_title || '');
      setVisibleClauses(obs.drafting_sequence || []);
    } catch(e) {
      console.error('Init failed:', e);
    }
    setIsLoading(false);
  }, [taskId]);

  // Auto-initialize when task changes
  useEffect(() => {
    if (taskId) {
      handleInit();
    }
  }, [taskId, handleInit]);

  // ── Playback ──
  const playWarningTone = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch(e) { /* audio not supported */ }
  }, []);

  const handlePlay = () => {
    if (sequence.length === 0) return;
    setVisibleClauses([]);
    setSelectedEvent(null);
    setIsPlaying(true);

    let idx = 0;
    playIntervalRef.current = setInterval(() => {
      if (idx >= sequence.length) {
        clearInterval(playIntervalRef.current);
        setIsPlaying(false);
        return;
      }
      const event = sequence[idx];
      setVisibleClauses(prev => [...prev, event]);
      setSelectedEvent(event.event_id);

      // Check if this event has a contradiction (from ground truth or agent results)
      const gt = groundTruth[event.event_id];
      const step = agentSteps.find(s => s.event_id === event.event_id);
      if ((gt && gt.introduces_contradiction) || (step && step.introduces_contradiction)) {
        playWarningTone();
      }

      idx++;
      if (feedRef.current) {
        feedRef.current.scrollTop = feedRef.current.scrollHeight;
      }
    }, 600);
  };

  useEffect(() => {
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, []);

  // ── Run Monitor ──
  const handleRunMonitor = async () => {
    if (!observation || !apiConfig) return;
    setIsRunning(true);
    try {
      const steps = await runLexMindMonitor(observation, apiConfig);
      setAgentSteps(steps);
      // Submit to backend for grading
      const result = await submitLexMind(steps, taskId);
      setScore(result.score);
      setFeedback(result.feedback);
      // Save patterns to localStorage
      savePatterns(steps, sequence, contractTitle, taskId);
    } catch(e) {
      console.error('Monitor failed:', e);
    }
    setIsRunning(false);
  };

  // ── Demo Mode ──
  const handleLoadDemo = () => {
    setSequence(DEMO_SEQUENCE);
    setVisibleClauses(DEMO_SEQUENCE);
    setAgentSteps(DEMO_STEPS);
    setGroundTruth(DEMO_GROUND_TRUTH);
    setScore(0.925);
    setFeedback('Correctly detected: 1/1 contradictions. False alarms: 0. Missed: 0. Score: 0.93');
    setContractTitle('Non-Disclosure Agreement — Apex Dynamics v. Coastal Research Labs');
    setObservation({
      episode_id: 'demo',
      task_id: 'lexmind_easy',
      step_number: 1,
      total_steps: 8,
      instructions: '',
      done: true,
      drafting_sequence: DEMO_SEQUENCE,
      contract_title: 'Non-Disclosure Agreement — Apex Dynamics v. Coastal Research Labs',
    });
    setSelectedEvent('event_07');
    savePatterns(DEMO_STEPS, DEMO_SEQUENCE, 'Demo NDA', 'lexmind_easy');
  };

  // ── Pattern Memory ──
  const savePatterns = (steps, seq, title, task) => {
    try {
      const existing = JSON.parse(localStorage.getItem('lexmind_patterns') || '[]');
      const contradictions = steps.filter(s => s.introduces_contradiction);
      for (const c of contradictions) {
        const event = seq.find(e => e.event_id === c.event_id);
        if (!event) continue;
        existing.push({
          contradiction_type: DEMO_GROUND_TRUTH[c.event_id]?.contradiction_type || 'unknown',
          clause_title: event.clause_title,
          conflicts_with: c.contradicts_clause_id,
          contract_title: title,
          task_id: task,
          round: event.round,
          authored_by: event.authored_by,
          date: new Date().toISOString().split('T')[0],
        });
      }
      localStorage.setItem('lexmind_patterns', JSON.stringify(existing));
    } catch(e) { /* noop */ }
  };

  const getPatterns = () => {
    try {
      return JSON.parse(localStorage.getItem('lexmind_patterns') || '[]');
    } catch { return []; }
  };

  const findPatternMatches = () => {
    const patterns = getPatterns();
    if (patterns.length === 0 || agentSteps.length === 0) return [];
    const currentContradictions = agentSteps.filter(s => s.introduces_contradiction);
    const matches = [];
    for (const c of currentContradictions) {
      const event = sequence.find(e => e.event_id === c.event_id);
      if (!event) continue;
      const historical = patterns.filter(p =>
        p.clause_title !== event.clause_title && // Don't match self
        (p.contradiction_type === (DEMO_GROUND_TRUTH[c.event_id]?.contradiction_type || 'unknown') ||
         p.conflicts_with === c.contradicts_clause_id)
      );
      if (historical.length > 0) {
        matches.push({ current: event, historical });
      }
    }
    return matches;
  };

  // ── Computed ──
  const roundGroups = {};
  sequence.forEach(e => {
    const key = e.round + ':' + e.round_label;
    if (!roundGroups[key]) roundGroups[key] = { label: e.round_label, events: [] };
    roundGroups[key].events.push(e);
  });

  const getStepForEvent = (eventId) => agentSteps.find(s => s.event_id === eventId);
  const getGtForEvent = (eventId) => groundTruth[eventId];

  const isContradiction = (eventId) => {
    const step = getStepForEvent(eventId);
    const gt = getGtForEvent(eventId);
    return (step && step.introduces_contradiction) || (gt && gt.introduces_contradiction);
  };

  const isResolved = (eventId) => {
    const gt = getGtForEvent(eventId);
    return gt && gt.resolves_contradiction;
  };

  // Risk stats
  const contradictionsByRound = {};
  const partyRisk = { Drafter: 0, Counterparty: 0 };
  sequence.forEach(e => {
    if (isContradiction(e.event_id)) {
      contradictionsByRound[e.round] = (contradictionsByRound[e.round] || 0) + 1;
      partyRisk[e.authored_by] = (partyRisk[e.authored_by] || 0) + 1;
    }
  });

  const totalContradictions = Object.values(contradictionsByRound).reduce((a, b) => a + b, 0);
  const patternMatches = findPatternMatches();

  // ── Selected event detail ──
  const selectedEventData = sequence.find(e => e.event_id === selectedEvent);
  const selectedStep = selectedEvent ? getStepForEvent(selectedEvent) : null;
  const selectedGt = selectedEvent ? getGtForEvent(selectedEvent) : null;

  const getAssessment = () => {
    if (!selectedStep && !selectedGt) return null;
    const hasTruth = !!selectedGt;
    const stepPred = selectedStep?.introduces_contradiction;
    const gtPred = selectedGt?.introduces_contradiction;

    if (hasTruth && gtPred && stepPred) return { type: 'correct', label: '✓ Correctly Detected', color: 'var(--green)' };
    if (hasTruth && gtPred && !stepPred) return { type: 'miss', label: '✗ Missed Contradiction', color: 'var(--red)' };
    if (hasTruth && !gtPred && stepPred) return { type: 'false', label: '⚠ False Alarm', color: 'var(--amber)' };
    if (hasTruth && !gtPred && !stepPred) return { type: 'correct', label: '✓ Correctly Clean', color: 'var(--green)' };
    if (!hasTruth && stepPred) return { type: 'detection', label: '⚡ Contradiction Detected', color: 'var(--red)' };
    if (!hasTruth && !stepPred) return { type: 'clean', label: '✓ Clean', color: 'var(--green)' };
    return null;
  };

  const assessment = getAssessment();

  return (
    <div className="lexmind-page">
      <Header 
        apiConfig={apiConfig}
      />
      {/* Zone 1: Control Bar */}
      <div className="lm-control-bar">
        <button className="lm-back-btn" onClick={() => navigate('/app')}>← Back</button>
        <div className="lm-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B7FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L3 9l2 11h14l2-11L12 2z"/>
          </svg>
          LexMind — Clausr Negotiation Co-Pilot
          <span className="lm-title-pulse"/>
        </div>

        <select className="lm-task-select" value={taskId} onChange={e => setTaskId(e.target.value)}>
          <option value="lexmind_easy">Easy (8 events · 1 round)</option>
          <option value="lexmind_medium">Medium (20 events · 2 rounds)</option>
          <option value="lexmind_hard">Hard (40 events · 3 rounds)</option>
        </select>

        <button className="lm-btn lm-btn-init" onClick={handleInit} disabled={isLoading}>
          {isLoading ? <><span className="lm-spinner"/>Loading...</> : 'Initialize'}
        </button>

        <button className="lm-btn lm-btn-play" onClick={handlePlay} disabled={sequence.length === 0 || isPlaying}>
          ▶ Play
        </button>

        <button className="lm-btn lm-btn-run" onClick={handleRunMonitor} disabled={!observation || isRunning || !apiConfig}>
          {isRunning ? <><span className="lm-spinner"/>Analyzing...</> : '🔍 Run Monitor'}
        </button>

        <button className="lm-btn lm-btn-demo" onClick={handleLoadDemo}>
          🔥 Demo
        </button>

        {score !== null && (
          <div className="lm-score-display">
            <span style={{color:'var(--text-muted)', fontSize:'12px'}}>Score:</span>
            <span className="lm-score-value">{score.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Zone 2: Timeline Strip */}
      {sequence.length > 0 && (
        <div className="lm-timeline">
          {Object.entries(roundGroups).map(([key, group]) => (
            <div className="lm-timeline-round" key={key}>
              <span className="lm-round-label">{group.label}</span>
              <div className="lm-timeline-pills">
                {group.events.map(e => {
                  const isVisible = visibleClauses.some(v => v.event_id === e.event_id);
                  let pillClass = 'lm-pill';
                  pillClass += e.authored_by === 'Counterparty' ? ' lm-pill-counterparty' : ' lm-pill-drafter';
                  if (isVisible && isContradiction(e.event_id)) pillClass += ' lm-pill-contradiction';
                  if (isVisible && isResolved(e.event_id)) pillClass += ' lm-pill-resolved';
                  if (selectedEvent === e.event_id) pillClass += ' lm-pill-selected';

                  return (
                    <div
                      key={e.event_id}
                      className={pillClass}
                      onClick={() => setSelectedEvent(e.event_id)}
                      style={{ opacity: isVisible ? 1 : 0.25 }}
                      title={e.clause_title}
                    >
                      {e.event_id.replace('event_', '')}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zones 3-5: Main Content */}
      <div className="lm-main">
        {/* Zone 3: Live Draft Feed */}
        <div className="lm-panel" ref={feedRef}>
          <div className="lm-panel-header">
            <span>📋</span> Live Draft Feed
            <span style={{marginLeft:'auto', color:'var(--text-muted)', fontStyle:'italic', fontSize:'10px', textTransform:'none', letterSpacing: 0}}>
              {visibleClauses.length} / {sequence.length} clauses
            </span>
          </div>

          {visibleClauses.length === 0 && sequence.length === 0 && (
            <div className="lm-empty-state">
              <div className="lm-empty-icon">📜</div>
              <div>Select a task and click Initialize<br/>or click 🔥 Demo to see LexMind in action</div>
            </div>
          )}

          {visibleClauses.length === 0 && sequence.length > 0 && (
            <div className="lm-empty-state">
              <div className="lm-empty-icon">▶</div>
              <div>Click Play to watch clauses arrive<br/>in real-time drafting order</div>
            </div>
          )}

          {visibleClauses.map(e => {
            let cardClass = 'lm-clause-card';
            if (isContradiction(e.event_id)) cardClass += ' lm-clause-card-contradiction';
            if (isResolved(e.event_id)) cardClass += ' lm-clause-card-resolved';
            if (selectedEvent === e.event_id) cardClass += ' lm-clause-card-selected';
            return (
              <div key={e.event_id} className={cardClass} onClick={() => setSelectedEvent(e.event_id)}>
                <div className="lm-clause-header">
                  <span className="lm-clause-id">{e.clause_id}</span>
                  <span className="lm-clause-title">{e.clause_title}</span>
                  <span className={'lm-badge lm-badge-round'}>R{e.round}</span>
                  <span className={'lm-badge ' + (e.authored_by === 'Counterparty' ? 'lm-badge-counterparty' : 'lm-badge-drafter')}>
                    {e.authored_by}
                  </span>
                  {isContradiction(e.event_id) && <span className="lm-badge lm-badge-contradiction">⚡ Contradiction</span>}
                  {isResolved(e.event_id) && <span className="lm-badge lm-badge-resolved">✓ Resolved</span>}
                </div>
                <div className="lm-clause-text">{e.clause_text.length > 200 ? e.clause_text.slice(0, 200) + '...' : e.clause_text}</div>
              </div>
            );
          })}
        </div>

        {/* Zone 4: Event Inspector */}
        <div className="lm-panel">
          <div className="lm-panel-header"><span>🔎</span> Event Inspector</div>

          {!selectedEventData && (
            <div className="lm-inspector-empty">Click any clause or timeline pill<br/>to inspect that drafting event</div>
          )}

          {selectedEventData && (
            <>
              <div className="lm-inspector-event">
                <div className="lm-inspector-meta">
                  <span className="lm-badge lm-badge-round">Event {selectedEventData.event_id.replace('event_', '')}</span>
                  <span className="lm-badge lm-badge-round">Round {selectedEventData.round} — {selectedEventData.round_label}</span>
                  <span className={'lm-badge ' + (selectedEventData.authored_by === 'Counterparty' ? 'lm-badge-counterparty' : 'lm-badge-drafter')}>
                    By {selectedEventData.authored_by}
                  </span>
                  <span className="lm-badge lm-badge-round">{selectedEventData.action.toUpperCase()}</span>
                </div>

                <div style={{fontSize:'15px', fontWeight:'600', marginBottom:'8px', color:'var(--text-primary)'}}>
                  [{selectedEventData.clause_id}] {selectedEventData.clause_title}
                </div>

                <div className="lm-inspector-clause-text">{selectedEventData.clause_text}</div>

                {/* Assessment */}
                {assessment && (
                  <div className={'lm-assessment ' + (
                    assessment.type === 'correct' || assessment.type === 'clean' ? 'lm-assessment-correct' :
                    assessment.type === 'miss' ? 'lm-assessment-miss' :
                    assessment.type === 'false' ? 'lm-assessment-false' :
                    assessment.type === 'detection' ? 'lm-assessment-miss' : 'lm-assessment-partial'
                  )}>
                    <div className="lm-assessment-label" style={{color: assessment.color}}>
                      {assessment.label}
                    </div>
                    {selectedStep && <div style={{fontSize:'12px', color:'var(--text-secondary)', marginTop:'4px'}}>{selectedStep.explanation}</div>}
                  </div>
                )}

                {/* Conflict pair display */}
                {(selectedStep?.introduces_contradiction || selectedGt?.introduces_contradiction) && (
                  <div style={{marginTop:'12px'}}>
                    <div style={{fontSize:'11px', color:'var(--text-muted)', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'1px'}}>Conflicting Clauses</div>
                    <div className="lm-conflict-pair">
                      <div className="lm-conflict-clause">
                        <div style={{fontSize:'10px', color:'var(--purple-light)', marginBottom:'4px', fontWeight:'600'}}>
                          {selectedEventData.clause_id} (New)
                        </div>
                        {selectedEventData.clause_text.slice(0, 150)}...
                      </div>
                      <div className="lm-conflict-clause">
                        <div style={{fontSize:'10px', color:'var(--red)', marginBottom:'4px', fontWeight:'600'}}>
                          {selectedStep?.contradicts_clause_id || selectedGt?.contradicts_clause_id || '?'} (Existing)
                        </div>
                        {(() => {
                          const cid = selectedStep?.contradicts_clause_id || selectedGt?.contradicts_clause_id;
                          const existing = sequence.find(e => e.clause_id === cid);
                          return existing ? existing.clause_text.slice(0, 150) + '...' : 'Clause not found in sequence';
                        })()}
                      </div>
                    </div>
                    {selectedGt?.contradiction_description && (
                      <div style={{fontSize:'11px', color:'var(--text-secondary)', marginTop:'8px', padding:'8px', background:'rgba(255,60,60,0.05)', borderRadius:'6px', borderLeft:'2px solid var(--red)'}}>
                        {selectedGt.contradiction_description}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Zone 5: Risk Intelligence */}
        <div className="lm-panel">
          <div className="lm-panel-header"><span>📊</span> Risk Intelligence</div>

          {/* Score */}
          {score !== null && (
            <div className="lm-stat-card" style={{textAlign:'center'}}>
              <div className="lm-stat-label">Final Score</div>
              <div className="lm-stat-value" style={{fontSize:'32px', color: score >= 0.8 ? 'var(--green)' : score >= 0.5 ? 'var(--amber)' : 'var(--red)'}}>
                {score.toFixed(2)}
              </div>
              {feedback && <div style={{fontSize:'11px', color:'var(--text-secondary)', marginTop:'4px'}}>{feedback}</div>}
            </div>
          )}

          {/* Contradictions by Round */}
          {totalContradictions > 0 && (
            <div className="lm-stat-card">
              <div className="lm-stat-label">Contradictions by Round</div>
              <div className="lm-bar-chart">
                {Object.entries(contradictionsByRound).map(([round, count]) => (
                  <div className="lm-bar-row" key={round}>
                    <span className="lm-bar-label">Round {round}</span>
                    <div className="lm-bar" style={{
                      width: (count / Math.max(...Object.values(contradictionsByRound)) * 100) + '%',
                      background: 'linear-gradient(90deg, var(--red), rgba(255,60,60,0.3))',
                      minWidth: '20px'
                    }}/>
                    <span style={{fontSize:'11px', color:'var(--text-secondary)', marginLeft:'4px'}}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Party Risk */}
          {totalContradictions > 0 && (
            <div className="lm-stat-card">
              <div className="lm-stat-label">Risk by Party</div>
              <div className="lm-party-stats">
                <div className="lm-party-stat lm-party-drafter">
                  <div style={{fontSize:'20px', fontWeight:'700', color:'var(--blue)'}}>{partyRisk.Drafter || 0}</div>
                  <div style={{fontSize:'10px', color:'var(--text-secondary)'}}>Drafter</div>
                </div>
                <div className="lm-party-stat lm-party-counterparty">
                  <div style={{fontSize:'20px', fontWeight:'700', color:'var(--amber)'}}>{partyRisk.Counterparty || 0}</div>
                  <div style={{fontSize:'10px', color:'var(--text-secondary)'}}>Counterparty</div>
                </div>
              </div>
            </div>
          )}

          {/* Score Breakdown */}
          {agentSteps.length > 0 && (
            <div className="lm-stat-card">
              <div className="lm-stat-label">Detection Breakdown</div>
              <div className="lm-score-breakdown">
                <div className="lm-score-row">
                  <span className="lm-score-category">Contradictions Detected</span>
                  <span className="lm-score-points" style={{color:'var(--green)'}}>{agentSteps.filter(s => s.introduces_contradiction).length}</span>
                </div>
                <div className="lm-score-row">
                  <span className="lm-score-category">Clean Events</span>
                  <span className="lm-score-points" style={{color:'var(--text-secondary)'}}>{agentSteps.filter(s => !s.introduces_contradiction).length}</span>
                </div>
                <div className="lm-score-row">
                  <span className="lm-score-category">Total Events</span>
                  <span className="lm-score-points">{sequence.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* Pattern Memory */}
          <div className="lm-pattern-section">
            <div className="lm-stat-card">
              <div className="lm-stat-label">🧠 Pattern Memory</div>
              {getPatterns().length === 0 && (
                <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'6px'}}>
                  No patterns saved yet. Run LexMind episodes to build institutional memory.
                </div>
              )}
              {getPatterns().length > 0 && patternMatches.length === 0 && (
                <div style={{fontSize:'11px', color:'var(--text-muted)', marginTop:'6px'}}>
                  {getPatterns().length} pattern(s) in memory. No matches with current analysis.
                </div>
              )}
              {patternMatches.map((match, i) => (
                <div className="lm-pattern-card" key={i}>
                  <div className="lm-pattern-match-badge">⚠ Historical Match</div>
                  <div style={{color:'var(--text-primary)', fontSize:'12px'}}>
                    This <strong>{match.current.clause_title}</strong> conflict has appeared {match.historical.length} time(s) before.
                  </div>
                  {match.historical.slice(0, 3).map((h, j) => (
                    <div key={j} style={{fontSize:'10px', color:'var(--text-secondary)', marginTop:'3px'}}>
                      → {h.contract_title} ({h.date})
                    </div>
                  ))}
                </div>
              ))}
              {getPatterns().length > 0 && (
                <div style={{fontSize:'10px', color:'var(--text-muted)', marginTop:'6px'}}>
                  {getPatterns().length} total patterns saved across sessions
                </div>
              )}
            </div>
          </div>

          {/* Empty state */}
          {sequence.length === 0 && (
            <div className="lm-empty-state" style={{marginTop: '40px'}}>
              <div className="lm-empty-icon">🛡️</div>
              <div>Initialize a task or load the demo<br/>to see risk analysis</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
