import React, { useState } from 'react'

export default function ReasoningTrace({ trace }) {
  const [expanded, setExpanded] = useState(false)
  if (!trace) return null

  // Parse trace into steps by looking for patterns like "Step 1:", "First,", "Then,"
  const lines = trace.split('\n').filter(l => l.trim().length > 0)

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: '8px',
      margin: '10px 16px', overflow: 'hidden'
    }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', padding: '10px 14px',
          background: 'rgba(127,119,221,0.08)',
          border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px' }}>🧠</span>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--purple-light)' }}>
            Agent Reasoning Trace
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {lines.length} lines
          </span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
          {expanded ? '▲ collapse' : '▼ expand'}
        </span>
      </button>

      {expanded && (
        <div style={{
          maxHeight: '240px', overflowY: 'auto',
          padding: '12px 14px',
          background: 'var(--bg-main)',
          borderTop: '1px solid var(--border)'
        }}>
          {lines.map((line, i) => {
            const isStep = /^(step \d+|first|then|next|finally|however|also|note)/i.test(line.trim())
            return (
              <div key={i} style={{
                fontSize: '12px', lineHeight: '1.7',
                color: isStep ? 'var(--purple-light)' : 'var(--text-secondary)',
                fontWeight: isStep ? '500' : '400',
                marginBottom: isStep ? '6px' : '2px',
                paddingLeft: isStep ? '0' : '12px',
                borderLeft: isStep ? '2px solid var(--purple)' : 'none',
                paddingLeft: isStep ? '8px' : '12px',
              }}>
                {line}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
