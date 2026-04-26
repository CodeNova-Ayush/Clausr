export default function DifficultyMeter({ observation }) {
  if (!observation) return null;

  const clauseCount = observation.clauses?.length || 0;
  const contradictions = observation.num_contradictions || 0;
  const taskId = observation.task_id;

  const taskBase = { easy: 0.2, medium: 0.5, hard: 0.85, custom: 0.5 }[taskId] || 0.5;
  const density = clauseCount > 0 ? contradictions / clauseCount : 0;

  const avgLength = observation.clauses
    ? observation.clauses.reduce((s, c) => s + c.text.length, 0) / clauseCount
    : 0;
  const lengthScore = Math.min(1, avgLength / 500);

  const scoreRaw = taskBase * 0.6 + density * 10 * 0.2 + lengthScore * 0.2;
  const score = Math.min(1, scoreRaw);

  const label = score > 0.7 ? 'HARD' : score > 0.4 ? 'MEDIUM' : 'EASY';
  const color = score > 0.7 ? 'var(--red)' : score > 0.4 ? 'var(--amber)' : 'var(--green)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '11px', fontWeight: '800', color: color, letterSpacing: '0.5px' }}>
          {label}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          {Math.round(score * 100)}%
        </div>
      </div>
      
      <svg width="24" height="60" style={{ overflow: 'visible' }}>
        <rect x="8" y="4" width="8" height="48" rx="4" fill="var(--border)" />
        <rect x="8" y={4 + 48 * (1 - score)} width="8"
          height={48 * score} rx="4" fill={color}
          style={{ transition: 'height 0.8s ease, y 0.8s ease' }} />
        <circle cx="12" cy="52" r="8" fill={color} />
      </svg>
    </div>
  );
}
