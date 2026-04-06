import { useState, useEffect } from 'react';
import DNAFingerprint from './DNAFingerprint';
import DifficultyMeter from './DifficultyMeter';

const parseUserContract = (text) => {
  const lines = text.split('\n').filter(l => l.trim());
  const clauses = [];
  let currentClause = null;
  let clauseNum = 1;

  for (const line of lines) {
    const isHeader = /^(clause|section|\d+\.)\s/i.test(line.trim()) || 
                     (line.trim().length < 60 && line.trim() === line.trim().toUpperCase());
    
    if (isHeader && line.trim().length > 3) {
      if (currentClause) clauses.push(currentClause);
      currentClause = {
        id: `clause_${String(clauseNum).padStart(2, '0')}`,
        title: line.trim(),
        text: ''
      };
      clauseNum++;
    } else if (currentClause) {
      currentClause.text += (currentClause.text ? ' ' : '') + line.trim();
    }
  }
  if (currentClause) clauses.push(currentClause);

  if (clauses.length < 2) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20);
    return paragraphs.map((p, i) => ({
      id: `clause_${String(i+1).padStart(2, '0')}`,
      title: `Clause ${i+1}`,
      text: p.trim()
    }));
  }
  return clauses;
};

function highlightMatch(text, query) {
  if (!query || !query.trim()) return text;
  const regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + ')', 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i}>{part}</mark>
      : part
  );
}

export default function ContractPanel({ 
  taskId, setTaskId, observation, onReset, loading, 
  findings, gradedResult, selectedClauses, onClauseClick,
  agentMode, setAgentMode, uploadMode, setUploadMode, setObservation,
  showDNA, showDifficulty, onLoadDemo
}) {
  const [pastedText, setPastedText] = useState('');
  const [manualExplanation, setManualExplanation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedFindings, setRevealedFindings] = useState([]);

  useEffect(() => {
    if (!findings || findings.length === 0) {
      setRevealedFindings([]);
      return;
    }
    // Reveal findings one at a time with 400ms delay
    findings.forEach((f, i) => {
      setTimeout(() => {
        setRevealedFindings(prev => {
          if (!prev.find(x => x.clause_a_id === f.clause_a_id && x.clause_b_id === f.clause_b_id)) {
            return [...prev, f];
          }
          return prev;
        });
      }, i * 400);
    });
  }, [findings]);

  const clauseStatus = {};
  if (revealedFindings.length > 0) {
    revealedFindings.forEach(f => {
      clauseStatus[f.clause_a_id] = 'flagged';
      clauseStatus[f.clause_b_id] = 'flagged';
    });
    if (gradedResult && gradedResult.score >= 1.0) {
      findings.forEach(f => {
        clauseStatus[f.clause_a_id] = 'correct';
        clauseStatus[f.clause_b_id] = 'correct';
      });
    }
    if (gradedResult && gradedResult.score <= 0) {
      findings.forEach(f => {
        clauseStatus[f.clause_a_id] = 'wrong';
        clauseStatus[f.clause_b_id] = 'wrong';
      });
    }
  }

  const handleFileUpload = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
    if (!file) return;

    if (file.type === 'text/plain') {
      const text = await file.text();
      setPastedText(text);
    } else if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(' ') + '\n\n';
      }
      setPastedText(fullText);
    }
  };

  const handleParse = () => {
    if (!pastedText.trim()) return;
    const parsedClauses = parseUserContract(pastedText);
    const userObs = {
      contract_text: pastedText,
      clauses: parsedClauses,
      task_id: 'custom',
      num_contradictions: null,
      instructions: "Read this contract carefully and identify all pairs of clauses that directly contradict each other. For each contradiction, provide the two clause IDs and a brief explanation.",
      done: false,
      score: null,
      feedback: null,
      isUserContract: true
    };
    setObservation(userObs);
  };

  const handleManualFindingSubmit = () => {
    onClauseClick('__add__', manualExplanation);
    setManualExplanation('');
  };

  const filteredClauses = searchQuery.trim() && observation
    ? observation.clauses.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : (observation?.clauses || []);

  return (
    <div className="app-panel contract-panel">
      <div className="panel-top">
        <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
          <span className="panel-label">Contract</span>
          <div className="panel-tabs">
            <button className={`panel-tab ${!uploadMode ? 'active' : ''}`} onClick={() => setUploadMode(false)}>Preloaded</button>
            <button className={`panel-tab ${uploadMode ? 'active' : ''}`} onClick={() => setUploadMode(true)}>Upload Your Own</button>
            {onLoadDemo && (
              <button 
                className="panel-tab demo-btn" 
                style={{ border: '1px solid rgba(255,100,50,0.4)', color: '#ff7755', padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={onLoadDemo}
              >
                🔥 Load Live Demo
              </button>
            )}
          </div>
        </div>
        
        {observation && !uploadMode && (
          <div className="panel-tabs">
            <button className={`panel-tab ${agentMode ? 'active' : ''}`} onClick={() => setAgentMode(true)}>Agent Mode</button>
            <button className={`panel-tab ${!agentMode ? 'active' : ''}`} onClick={() => setAgentMode(false)}>Manual Mode</button>
          </div>
        )}

        {showDifficulty && observation && (
          <DifficultyMeter observation={observation} />
        )}
      </div>

      <div className="panel-body" style={{ position: 'relative' }}>
        {loading && <div className="scan-line" />}

        {uploadMode && !observation ? (
          <div>
            <div 
              className="upload-area"
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileUpload}
            >
              <p>Drag & drop a .txt or .pdf file<br/>or click to browse</p>
              <input type="file" style={{display:'none'}} id="f_upload" onChange={handleFileUpload} accept=".txt,.pdf" />
              <label htmlFor="f_upload" style={{cursor:'pointer', color:'var(--purple)', marginTop:'8px', display:'inline-block'}}>Browse File</label>
            </div>
            <p style={{textAlign:'center', color:'#5e5e78', marginBottom:'16px'}}>— or paste text directly —</p>
            <textarea 
              className="upload-textarea" 
              placeholder="paste contract text here..."
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
            />
            <button className="upload-btn" onClick={handleParse}>Parse Contract →</button>
          </div>
        ) : !observation ? (
          <div className="empty">
            <div className="empty-icon">📄</div>
            <p>Select a task and click Initialize to load a contract.</p>
            <div className="panel-controls" style={{marginTop:'16px'}}>
              <select className="task-select" value={taskId} onChange={e => setTaskId(e.target.value)} disabled={loading}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <button className="btn-init" onClick={onReset} disabled={loading}>
                {loading ? '...' : 'Initialize'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {showDNA && <DNAFingerprint clauses={observation.clauses} />}

            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px' }}>⌕</span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search clauses..."
                style={{ width: '100%', padding: '8px 12px 8px 30px', background: 'var(--bg-glass)', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}>×</button>
              )}
            </div>

            {searchQuery && (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {filteredClauses.length} of {observation.clauses.length} clauses match
              </p>
            )}

            {filteredClauses.length === 0 && (
              <div className="empty" style={{ padding: '20px' }}>
                <p>No clauses match your search.</p>
              </div>
            )}

            {filteredClauses.map(c => {
              const isSelected = selectedClauses.includes(c.id);
              const st = isSelected ? 'selected' : (clauseStatus[c.id] || 'default');
              const cn = `clause clause-${st} ${st === 'flagged' ? 'clause-revealed' : ''}`;
              return (
                <div
                  key={c.id}
                  className={cn}
                  onClick={() => onClauseClick(c.id)}
                  style={{ cursor: !agentMode || selectedClauses.length > 0 ? 'pointer' : 'default' }}
                >
                  <div className="clause-top">
                    {!agentMode && (
                      <div className="clause-checkbox" />
                    )}
                    <span className="c-id">{highlightMatch(c.id, searchQuery)}</span>
                    <span className="c-title">{highlightMatch(c.title, searchQuery)}</span>
                    {isSelected && <span className="c-selected-badge">Selected</span>}
                  </div>
                  <p className="c-text">{highlightMatch(c.text, searchQuery)}</p>
                </div>
              );
            })}

            {/* Manual Mode Floating Finding Bar */}
            {!agentMode && selectedClauses.length === 2 && (
              <div className="manual-finding-extended">
                <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                  <span className="f-clause">{selectedClauses[0]}</span>
                  <span className="f-vs">VS</span>
                  <span className="f-clause">{selectedClauses[1]}</span>
                </div>
                <input 
                  className="manual-input"
                  placeholder="Explanation input: why do these conflict?..."
                  value={manualExplanation}
                  onChange={e => setManualExplanation(e.target.value)}
                />
                <div style={{display:'flex', gap:'8px'}}>
                  <button className="btn-add-comp" style={{flex:1}} onClick={handleManualFindingSubmit}>
                    Add Finding
                  </button>
                  <button className="btn-dismiss" onClick={() => onClauseClick('__clear__')}>
                    Clear
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
