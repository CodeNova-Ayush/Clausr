import { useNavigate } from 'react-router-dom';

export default function Header({ serverStatus, onSettingsClick, onLeaderboardClick, apiConfig }) {
  const navigate = useNavigate();
  const dotColor =
    serverStatus === 'connected' ? 'var(--green)' :
    serverStatus === 'checking' ? 'var(--amber)' : 'var(--red)';

  const isApiConnected = !!(apiConfig && apiConfig.keys && apiConfig.provider && apiConfig.keys[apiConfig.provider]);


  return (
    <div className="app-header">
      <button className="back-link" onClick={() => navigate('/')}>← Back</button>
      <div className="app-header-center" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className="app-logo" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '16px', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--brand-text, #fff)' }}>
          <svg width="18" height="20" viewBox="0 0 24 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand-purple, #7F77DD)' }}>
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          Clausr
        </span>
        <div className="status-indicator" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="app-status-dot" style={{ background: dotColor, boxShadow: `0 0 10px ${dotColor}`, width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' }} title={"Clausr server: " + serverStatus} />
          <span style={{ fontSize: '11px', color: dotColor, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{serverStatus === 'connected' ? 'Live' : serverStatus === 'checking' ? 'Checking' : 'Offline'}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="back-link" onClick={() => navigate('/graph')} style={{ fontSize: '13px' }}>Portfolio Graph</button>
        <button className="back-link" onClick={() => navigate('/oracle')} style={{ fontSize: '13px', color: '#cc3322', background: 'rgba(204, 51, 34, 0.08)' }}>◉ Oracle</button>
        <button className="back-link" onClick={() => navigate('/lexmind')} style={{ fontSize: '13px', color: 'var(--purple)', background: 'rgba(108, 99, 255, 0.08)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '5px', verticalAlign: '-1px'}}>
            <path d="M12 2L3 9l2 11h14l2-11L12 2z"/>
          </svg>
          LexMind
        </button>
        <button className="back-link" onClick={() => navigate('/compare')} style={{ fontSize: '13px' }}>Compare ⇄</button>
        {onLeaderboardClick && (
          <button className="back-link" onClick={onLeaderboardClick} style={{ fontSize: '13px' }}>
            🏆 Leaderboard
          </button>
        )}
        {isApiConnected ? (
          <button onClick={onSettingsClick} style={{
            background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.4)',
            borderRadius: '8px', padding: '6px 14px', color: 'var(--green)',
            fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 10px rgba(34,197,94,0.15)', transition: 'all 0.2s', marginLeft: '4px'
          }} onMouseEnter={e => {e.currentTarget.style.background='rgba(34, 197, 94, 0.2)'; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 15px rgba(34,197,94,0.25)';}} onMouseLeave={e => {e.currentTarget.style.background='rgba(34, 197, 94, 0.1)'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 10px rgba(34,197,94,0.15)';}}>
            <span style={{ fontSize: '10px', verticalAlign: '1px', marginRight: '4px', animation: 'livePulse 2s infinite' }}>🟢</span> API Connected
          </button>
        ) : (
          <button onClick={onSettingsClick} style={{
            background: 'rgba(139, 127, 255, 0.1)', border: '1px solid rgba(139, 127, 255, 0.4)',
            borderRadius: '8px', padding: '6px 14px', color: 'var(--purple-light)',
            fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 10px rgba(139,127,255,0.2)', transition: 'all 0.2s', marginLeft: '4px'
          }} onMouseEnter={e => {e.currentTarget.style.background='rgba(139,127,255,0.2)'; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 15px rgba(139,127,255,0.3)';}} onMouseLeave={e => {e.currentTarget.style.background='rgba(139,127,255,0.1)'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 10px rgba(139,127,255,0.2)';}}>
            ⚙ Connect API
          </button>
        )}
      </div>
    </div>
  );
}
