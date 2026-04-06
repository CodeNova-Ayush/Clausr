import useScrollReveal from '../../utils/useScrollReveal';

export default function TaskCards() {
  const ref = useScrollReveal();

  return (
    <section className="section-surface section-full" ref={ref}>
      <div className="section-inner section">
        <h2 className="section-heading">Three Levels of Difficulty</h2>
        <p className="section-sub">Each level adds clauses, contradictions, and traps.</p>

        <div className="task-cards-row">
          <div className="task-card easy">
            <span className="task-card-badge">Easy</span>
            <h3 className="task-card-type">Non-Disclosure Agreement</h3>
            <p className="task-card-stats">8 clauses · 1 contradiction · 0 traps</p>
            <p className="task-card-info">
              A clean NDA with one clear temporal conflict. The contradiction type is
              numeric/temporal — &ldquo;2 years&rdquo; vs &ldquo;36 months&rdquo; for
              the same confidentiality obligation.
            </p>
            <p className="task-card-baseline">
              Baseline: <strong>~1.00</strong> with GPT-4o
            </p>
          </div>

          <div className="task-card medium">
            <span className="task-card-badge">Medium</span>
            <h3 className="task-card-type">SaaS Subscription Agreement</h3>
            <p className="task-card-stats">25 clauses · 4 contradictions · 0 traps</p>
            <p className="task-card-info">
              All 4 main contradiction types spread across a 25-clause document.
              Contradicting clauses are NOT adjacent — requires full document tracking.
            </p>
            <p className="task-card-baseline">
              Baseline: <strong>~0.65</strong> with GPT-4o
            </p>
          </div>

          <div className="task-card hard">
            <span className="task-card-badge">Hard</span>
            <h3 className="task-card-type">Enterprise Master Service Agreement</h3>
            <p className="task-card-stats">60 clauses · 8 contradictions · 3 traps</p>
            <p className="task-card-info">
              Near-contradictions that penalize overconfident agents. Definition conflicts
              requiring full document tracking. Traps include intentional overrides and
              complementary scopes.
            </p>
            <p className="task-card-baseline">
              Baseline: <strong>~0.35</strong> with GPT-4o
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
