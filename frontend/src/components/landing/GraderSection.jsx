import useScrollReveal from '../../utils/useScrollReveal';

const examples = [
  { scenario: 'Found all 4, 0 FP', tp: 4, fp: 0, score: '1.00' },
  { scenario: 'Found 3 of 4, 0 FP', tp: 3, fp: 0, score: '0.75' },
  { scenario: 'Found 3 of 4, 2 FP', tp: 3, fp: 2, score: '0.55' },
  { scenario: 'Found 0 of 4', tp: 0, fp: 0, score: '0.00' },
];

export default function GraderSection() {
  const ref = useScrollReveal();

  return (
    <section className="section-surface section-full" ref={ref}>
      <div className="section-inner section">
        <h2 className="section-heading">Bulletproof Deterministic Grader</h2>
        <p className="section-sub">No LLM. No string matching. Pure set math.</p>

        <div className="grader-grid">
          <div className="grader-formula">
            <pre>{`score = (true_positives / total)
      - (0.1 × false_positives)

score = clamp(score, 0.0, 1.0)`}</pre>
            <p className="grader-note">
              The grader compares <code>(clause_a_id, clause_b_id)</code> pairs using set
              intersection. Order doesn&rsquo;t matter. The explanation text is never read.
              Results are identical on every run.
            </p>
          </div>

          <div>
            <table className="grader-table">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>TP</th>
                  <th>FP</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {examples.map((e, i) => (
                  <tr key={i}>
                    <td>{e.scenario}</td>
                    <td>{e.tp}</td>
                    <td>{e.fp}</td>
                    <td className="score-cell">{e.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
