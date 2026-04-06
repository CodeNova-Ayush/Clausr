import { useEffect, useState } from 'react';

function analyzeContractDNA(clauses) {
  const text = clauses.map(c => c.text.toLowerCase()).join(' ')
  const allClauses = clauses.map(c => c.text.toLowerCase())

  // Type 1 — Numeric/Temporal
  const type1Score = (() => {
    const numbers = (text.match(/\d+/g) || []).length
    const timeWords = (text.match(/\b(days?|months?|years?|weeks?|hours?)\b/g) || []).length
    const dollars = (text.match(/\$[\d,]+/g) || []).length
    const numSet = {}
    allClauses.forEach(c => {
      const nums = c.match(/\d+/g) || []
      nums.forEach(n => { numSet[n] = (numSet[n] || 0) + 1 })
    })
    const duplicateNums = Object.values(numSet).filter(v => v > 1).length
    return Math.min(1.0, (numbers * 0.02 + timeWords * 0.08 + dollars * 0.1 + duplicateNums * 0.15))
  })()

  // Type 2 — Scope
  const type2Score = (() => {
    const grantWords = (text.match(/\b(grant|permit|allow|authorize|license|right to|may use|entitled)\b/g) || []).length
    const restrictWords = (text.match(/\b(prohibit|restrict|forbidden|not permitted|shall not|limited to|only for)\b/g) || []).length
    const hasBoth = grantWords > 0 && restrictWords > 0
    return Math.min(1.0, hasBoth ? 0.3 + (Math.min(grantWords, restrictWords) * 0.1) : Math.max(grantWords, restrictWords) * 0.05)
  })()

  // Type 3 — Party obligation
  const type3Score = (() => {
    const parties = (text.match(/\b(vendor|supplier|client|buyer|licensee|licensor|provider|customer|party)\b/g) || []).length
    const obligationWords = (text.match(/\b(shall|must|responsible for|liable for|obligated|bears|responsible)\b/g) || []).length
    const partySet = {}
    allClauses.forEach(c => {
      const p = c.match(/\b(vendor|supplier|client|buyer|licensee|licensor|provider|customer)\b/g) || []
      p.forEach(n => { partySet[n] = (partySet[n] || 0) + 1 })
    })
    const multiParty = Object.keys(partySet).length > 1
    return Math.min(1.0, (parties * 0.03 + obligationWords * 0.04 + (multiParty ? 0.3 : 0)))
  })()

  // Type 4 — Termination/Renewal
  const type4Score = (() => {
    const terminationWords = (text.match(/\b(terminat|cancel|expir|end|discontinu)\w*/g) || []).length
    const renewalWords = (text.match(/\b(renew|auto-renew|extend|rollover|successive)\w*/g) || []).length
    const noticeWords = (text.match(/\b(notice|notification|written notice|days? notice)\b/g) || []).length
    const hasBoth = terminationWords > 0 && renewalWords > 0
    return Math.min(1.0, hasBoth ? 0.4 + noticeWords * 0.05 : (terminationWords + renewalWords) * 0.04)
  })()

  // Type 5 — Definition conflict
  const type5Score = (() => {
    const definedTerms = (text.match(/"[A-Z][a-zA-Z\s]+"(?:\s+means|\s+shall mean|\s+is defined)/g) || []).length
    const capitalizedTerms = (text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g) || []).length
    const hasDefinitionsSection = clauses.some(c => c.title.toLowerCase().includes('defin'))
    return Math.min(1.0, (definedTerms * 0.2 + capitalizedTerms * 0.01 + (hasDefinitionsSection ? 0.3 : 0)))
  })()

  return [
    { type: 1, name: 'Numeric', score: type1Score, color: '#1D9E75' },
    { type: 2, name: 'Scope', score: type2Score, color: '#378ADD' },
    { type: 3, name: 'Party', score: type3Score, color: '#EF9F27' },
    { type: 4, name: 'Renewal', score: type4Score, color: '#FF8C42' },
    { type: 5, name: 'Definition', score: type5Score, color: '#E24B4A' },
  ]
}

function PentagonChart({ data }) {
  const cx = 120, cy = 110, r = 80
  const angles = [-90, -18, 54, 126, 198] 
  const toRad = d => d * Math.PI / 180

  const rings = [0.25, 0.5, 0.75, 1.0]

  const getPoint = (angle, radius) => ({
    x: cx + radius * Math.cos(toRad(angle)),
    y: cy + radius * Math.sin(toRad(angle))
  })

  const ringPath = (scale) => {
    const pts = angles.map(a => getPoint(a, r * scale))
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  }

  const dataPath = () => {
    if (!data || data.length === 0) return '';
    const pts = data.map((d, i) => getPoint(angles[i], r * (d.animScore || 0)))
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  }

  const axes = angles.map(a => ({ from: { x: cx, y: cy }, to: getPoint(a, r) }))

  const labelPositions = data.map((d, i) => {
    const pt = getPoint(angles[i], r * 1.3)
    return { ...pt, name: d.name, score: d.score, color: d.color }
  })

  return (
    <svg width="240" height="220" style={{ overflow: 'visible' }}>
      {rings.map((scale, i) => (
        <path key={i} d={ringPath(scale)} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      {axes.map((ax, i) => (
        <line key={i} x1={ax.from.x} y1={ax.from.y} x2={ax.to.x} y2={ax.to.y}
          stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      ))}
      <path d={dataPath()} fill="rgba(127,119,221,0.2)" stroke="#7F77DD"
        strokeWidth="2" strokeLinejoin="round" style={{ transition: 'd 0.8s ease-out' }}>
      </path>
      {data.map((d, i) => {
        const pt = getPoint(angles[i], r * (d.animScore || 0))
        return <circle key={i} cx={pt.x} cy={pt.y} r="4"
          fill={d.color} stroke="var(--bg-main)" strokeWidth="2" 
          style={{ transition: 'cx 0.8s ease-out, cy 0.8s ease-out' }}/>
      })}
      {labelPositions.map((l, i) => (
        <g key={i}>
          <text x={l.x} y={l.y - 4} textAnchor="middle"
            fill={l.color} fontSize="10" fontWeight="600">{l.name}</text>
          <text x={l.x} y={l.y + 8} textAnchor="middle"
            fill="rgba(255,255,255,0.5)" fontSize="9">
            {Math.round(l.score * 100)}%
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function DNAFingerprint({ clauses }) {
  const [data, setData] = useState([])
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    if (!clauses || !clauses.length) return
    const rawData = analyzeContractDNA(clauses)
    setData(rawData.map(d => ({ ...d, animScore: 0 })))
    setAnimated(false)
    setTimeout(() => {
      setData(rawData.map(d => ({ ...d, animScore: d.score })))
      setAnimated(true)
    }, 50)
  }, [clauses])

  if (!clauses || !clauses.length) return null

  const overall = data.length ? data.reduce((sum, d) => sum + d.score, 0) / 5 : 0
  const riskLabel = overall > 0.6 ? 'HIGH RISK' : overall > 0.3 ? 'MEDIUM RISK' : 'LOW RISK'
  const riskColor = overall > 0.6 ? 'var(--red)' : overall > 0.3 ? 'var(--amber)' : 'var(--green)'

  return (
    <div style={{
      background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
      borderRadius: '8px', padding: '20px', marginBottom: '20px',
      display: 'flex', gap: '20px', alignItems: 'center'
    }}>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: '14px', margin: '0 0 4px', color: 'var(--text-primary)' }}>
          Clausr DNA — Risk Profile
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
          Linguistic pattern analysis across 5 contradiction types
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.map(d => (
            <div key={d.type} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '60px', fontSize: '10px', color: 'var(--text-secondary)' }}>{d.name}</span>
              <div style={{ flex: 1, height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                <div className={animated ? "bar-animated" : ""} style={{ 
                  height: '100%', 
                  background: d.color, 
                  width: animated ? `calc(${d.score * 100}%)` : 0, 
                  '--target-width': `${d.score * 100}%` 
                }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '16px', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', borderLeft: `3px solid ${riskColor}` }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>OVERALL RISK</span>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: riskColor }}>{riskLabel} ({(overall * 100).toFixed(0)}%)</span>
        </div>
      </div>
      
      <div style={{ flex: '0 0 240px' }}>
        <PentagonChart data={data} />
      </div>
    </div>
  )
}
