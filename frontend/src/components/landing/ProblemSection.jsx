import useScrollReveal from '../../utils/useScrollReveal';

export default function ProblemSection() {
  const ref = useScrollReveal();

  return (
    <section className="section-surface section-full" ref={ref}>
      <div className="section-inner section">
        <h2 className="section-heading">Why This Matters</h2>
        <div className="problem-grid">
          <blockquote className="problem-quote">
            Every enterprise contract has contradictions. A clause saying
            &ldquo;payment due in 30 days&rdquo; and another saying
            &ldquo;invoices unpaid after 45 days incur penalties&rdquo; create
            dangerous ambiguity. Legal teams miss these because no single person
            reads 60 clauses with cross-referencing in mind.
            <br /><br />
            Clausr trains AI agents to catch these automatically &mdash;
            with deterministic scoring and no LLM in the grading loop.
          </blockquote>

          <div className="clash-demo">
            <div className="clash-card left">
              <span className="clause-tag">clause_03</span>
              <div className="clause-label">Confidentiality Period</div>
              <div className="clause-value">
                &ldquo;...for a period of <strong>two (2) years</strong> from the date of disclosure...&rdquo;
              </div>
            </div>
            <div className="clash-vs">VS</div>
            <div className="clash-card right">
              <span className="clause-tag">clause_07</span>
              <div className="clause-label">Obligations Upon Termination</div>
              <div className="clause-value">
                &ldquo;...shall remain in full force for <strong>thirty-six (36) months</strong>...&rdquo;
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
