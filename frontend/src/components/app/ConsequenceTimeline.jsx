import { useState, useEffect } from 'react';
import { TYPE_COLORS, TYPE_SHORT } from '../../utils/classifier';
import './ConsequenceTimeline.css';

export default function ConsequenceTimeline({ events, loading }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const getPositionForLabel = (label) => {
    const l = (label || '').toLowerCase();
    if (l.includes('signing') || l.includes('day 1')) return '10%';
    if (l.includes('month 1')) return '25%';
    if (l.includes('month 6') || l.includes('mid')) return '45%';
    if (l.includes('90 days') || l.includes('before')) return '70%';
    if (l.includes('renew') || l.includes('terminat') || l.includes('expir')) return '90%';
    return '50%'; // default center
  };

  const getSeverityStyle = (severity) => {
    const s = (severity || 'low').toLowerCase();
    if (s === 'high') return { bg: 'var(--red)', glow: '0 0 10px var(--red)' };
    if (s === 'medium') return { bg: 'var(--amber)', glow: 'none' };
    return { bg: 'var(--blue)', glow: 'none' };
  };

  const severityCounts = { high: 0, medium: 0, low: 0 };
  events.forEach(e => {
    const s = (e.severity || 'low').toLowerCase();
    if (s === 'high') severityCounts.high++;
    else if (s === 'medium') severityCounts.medium++;
    else severityCounts.low++;
  });

  return (
    <div className="consequence-timeline">
      <div className="ctl-header">
        <h3>Risk Lifecycle Timeline</h3>
        <div className="ctl-legend">
           <span className="ctl-key type-high"><span className="key-dot"></span> High</span>
           <span className="ctl-key type-medium"><span className="key-dot"></span> Medium</span>
           <span className="ctl-key type-low"><span className="key-dot"></span> Low</span>
        </div>
      </div>
      
      <div className="ctl-track-container">
        <div className="ctl-track-line"></div>
        
        {/* Milestones */}
        <div className="ctl-milestone" style={{left: '10%'}}>Signing</div>
        <div className="ctl-milestone" style={{left: '30%'}}>Early Term</div>
        <div className="ctl-milestone" style={{left: '50%'}}>Mid-Term</div>
        <div className="ctl-milestone" style={{left: '70%'}}>Late Term</div>
        <div className="ctl-milestone" style={{left: '90%'}}>Expiry / Renewal</div>

        {/* Loading state */}
        {loading && (
           <div className="ctl-loading-overlay">
             <div className="spin small"></div>
             <span>Simulating contract execution consequences...</span>
           </div>
        )}

        {/* Generated Events */}
        {!loading && events.length === 0 && (
           <div className="ctl-empty">No consequence timeline generated yet.</div>
        )}

        {events.map((ev, i) => {
          const pos = getPositionForLabel(ev.time_label);
          const s = getSeverityStyle(ev.severity);
          const type = TYPE_SHORT[ev.finding?.type || 'unknown'] || 'Unknown';
          const tColor = TYPE_COLORS[ev.finding?.type || 'unknown'] || '#fff';
          
          return (
            <div 
              key={i} 
              className={`ctl-marker ${mounted ? 'reveal' : ''} ${ev.severity === 'high' ? 'pulse-danger' : ''}`}
              style={{
                left: pos, 
                animationDelay: `${i * 0.25}s`,
                marginTop: `${(i % 3) * -30}px` 
              }}
            >
              <div className="ctl-marker-circle" style={{background: s.bg, boxShadow: s.glow}}></div>
              <div className="ctl-marker-line"></div>
              
              <div className="ctl-event-card">
                <div className="ctl-event-type" style={{background: tColor + '30', color: tColor}}>
                  {type}
                </div>
                <div className="ctl-event-clauses">
                  {ev.finding?.clause_a_id} vs {ev.finding?.clause_b_id}
                </div>
                <div className="ctl-event-time">{ev.time_label}</div>
                <div className="ctl-event-summary">
                  {ev.financial_exposure || 'Financial risk identified'}
                </div>
                
                {/* Tooltip */}
                <div className="ctl-event-tooltip">
                  <strong>Consequence: </strong>{ev.consequence}
                  <br/><br/>
                  <strong>Exposed: </strong>{ev.affected_party}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {events.length > 0 && !loading && (
        <div className="ctl-summary-strip">
          <span className="ctl-sum-badge type-high">{severityCounts.high} High</span>
          <span className="ctl-sum-badge type-medium">{severityCounts.medium} Medium</span>
          <span className="ctl-sum-badge type-low">{severityCounts.low} Low</span>
        </div>
      )}
    </div>
  );
}
