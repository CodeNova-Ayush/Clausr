const highlightNumbers = (text) => {
  if (!text) return { __html: '' };
  const regex = /(\$[\d,]+(?:\.\d+)?|\d+(?:\.\d+)?(?:\s*(?:days?|months?|years?|%|hours?))?)/gi;
  const highlighted = text.replace(regex, '<span style="color:#EF9F27;font-weight:600">$1</span>');
  return { __html: highlighted };
};

export default function ComparisonDrawer({ clauses, selectedIds, onAddFinding, onClose }) {
  if (selectedIds.length !== 2) return null;
  const c1 = clauses.find(c => c.id === selectedIds[0]);
  const c2 = clauses.find(c => c.id === selectedIds[1]);
  if (!c1 || !c2) return null;

  return (
    <div className="comp-drawer">
      <div className="comp-header">
        <span>Clause Comparison</span>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="comp-body">
        <div className="comp-col">
          <div className="comp-tag">{c1.id}</div>
          <div className="comp-title">{c1.title}</div>
          <div className="comp-text" dangerouslySetInnerHTML={highlightNumbers(c1.text)} />
        </div>
        <div className="comp-col">
          <div className="comp-tag">{c2.id}</div>
          <div className="comp-title">{c2.title}</div>
          <div className="comp-text" dangerouslySetInnerHTML={highlightNumbers(c2.text)} />
        </div>
      </div>
      <div className="comp-footer">
        <span style={{color: '#9898b8', fontSize: '13px'}}>Potential conflict identified?</span>
        <div style={{display: 'flex', gap: '8px'}}>
          <button className="btn-dismiss" onClick={onClose}>Dismiss</button>
          <button className="btn-add-comp" onClick={() => onAddFinding({
            clause_a_id: c1.id,
            clause_b_id: c2.id,
            explanation: `Selected via side-by-side comparison`
          })}>
            Add as Finding
          </button>
        </div>
      </div>
    </div>
  );
}
