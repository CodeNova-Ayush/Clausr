import useScrollReveal from '../../utils/useScrollReveal';

export default function HowItWorks() {
  const ref = useScrollReveal();

  return (
    <section className="section section-dark" ref={ref}>
      <h2 className="section-heading">How Clausr Works</h2>
      <p className="section-sub">Three steps. One score. Fully deterministic.</p>

      <div className="steps-row">
        <div className="step">
          <span className="step-num">1</span>
          <div className="step-icon">
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="4" width="34" height="44" rx="4" stroke="var(--purple)" strokeWidth="2"/>
              <line x1="16" y1="16" x2="34" y2="16" stroke="var(--purple-light)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="24" x2="30" y2="24" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="32" x2="32" y2="32" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 className="step-title">Contract Loaded</h3>
          <p className="step-desc">
            The environment loads a pre-generated business contract with planted contradictions.
            The agent receives the full text, structured clause list, and the exact number of
            contradictions to find.
          </p>
        </div>

        <div className="step-arrow">→</div>

        <div className="step">
          <span className="step-num">2</span>
          <div className="step-icon">
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="28" cy="28" r="20" stroke="var(--purple)" strokeWidth="2"/>
              <circle cx="28" cy="20" r="4" fill="var(--purple-light)"/>
              <path d="M20 36 L28 28 L36 36" stroke="var(--purple-light)" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="20" cy="36" r="3" fill="var(--text-muted)"/>
              <circle cx="36" cy="36" r="3" fill="var(--text-muted)"/>
            </svg>
          </div>
          <h3 className="step-title">Agent Analyzes</h3>
          <p className="step-desc">
            An LLM reads the contract and outputs a list of contradicting clause pairs.
            Each finding has a clause_a_id, clause_b_id, and explanation. The agent knows
            how many to find but not which ones.
          </p>
        </div>

        <div className="step-arrow">→</div>

        <div className="step">
          <span className="step-num">3</span>
          <div className="step-icon">
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="28" cy="28" r="20" stroke="var(--green)" strokeWidth="2"/>
              <path d="M18 28 L25 35 L38 20" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="step-title">Grader Scores</h3>
          <p className="step-desc">
            The grader compares clause ID pairs against ground truth using pure set intersection.
            No LLM. No fuzzy matching. Score = tp/total − 0.1 × fp.
            Fully deterministic and reproducible.
          </p>
        </div>
      </div>
    </section>
  );
}
