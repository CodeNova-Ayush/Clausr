import { useState } from 'react';

export default function LeaderboardOverlay({ onClose, scoreHistory }) {
  const [name, setName] = useState(localStorage.getItem('contractfix-username') || '');

  const handleSaveName = () => {
    localStorage.setItem('contractfix-username', name);
  };

  const stored = JSON.parse(localStorage.getItem('contractfix-leaderboard') || '[]');
  const sorted = [...stored].sort((a, b) => b.score - a.score);

  return (
    <div className="lb-overlay" onClick={onClose}>
      <div className="lb-modal" onClick={e => e.stopPropagation()}>
        <div className="lb-header">
          <h3>🏆 Clausr Leaderboard</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="lb-controls">
          <span>Sort: Score ▼</span>
        </div>
        <div className="lb-table-wrap">
          <table className="lb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Task</th>
                <th>Score</th>
                <th>Model</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign:'center', color:'#5e5e78'}}>No scores yet. Complete an episode!</td></tr>
              ) : (
                sorted.map((row, i) => {
                  let rankColor = '#6b6b80';
                  if (i === 0) rankColor = '#EF9F27'; // Gold
                  else if (i === 1) rankColor = '#9898b8'; // Silver
                  else if (i === 2) rankColor = '#cd7f32'; // Bronze

                  const scoreColor = row.score >= 0.7 ? '#1D9E75' : row.score >= 0.4 ? '#EF9F27' : '#E24B4A';
                  return (
                    <tr key={row.id}>
                      <td style={{color: rankColor, fontWeight: 'bold'}}>{i + 1}</td>
                      <td>{row.name}</td>
                      <td><span className="lb-badge">{row.task.toUpperCase()}</span></td>
                      <td style={{color: scoreColor, fontWeight: 'bold'}}>{row.score.toFixed(2)}</td>
                      <td style={{fontFamily: 'monospace', fontSize: '12px'}}>{row.model}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="lb-footer">
          <span>Your name:</span>
          <input 
            className="lb-input" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="Anonymous"
          />
          <button className="btn-save-name" onClick={handleSaveName}>Save Name</button>
        </div>
      </div>
    </div>
  );
}
