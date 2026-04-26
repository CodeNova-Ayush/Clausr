import useScrollReveal from '../../utils/useScrollReveal';

const types = [
  {
    name: 'Numeric / Temporal',
    color: 'var(--green)',
    desc: 'Same obligation, different numbers or timeframes.',
    example: '"confidentiality for 2 years" vs "obligations for 36 months"',
  },
  {
    name: 'Scope Conflict',
    color: 'var(--blue)',
    desc: 'One clause grants a right another clause prohibits.',
    example: '"license for any commercial use including resale" vs "resale expressly prohibited"',
  },
  {
    name: 'Party Obligation',
    color: 'var(--amber)',
    desc: 'Same duty assigned to different parties.',
    example: '"Supplier responsible for shipping" vs "all shipping costs borne by Client"',
  },
  {
    name: 'Termination / Renewal',
    color: '#e8853a',
    desc: 'Notice windows that logically overlap or are impossible to satisfy.',
    example: '"terminate with 30 days notice" vs "auto-renews unless cancelled 90 days before"',
  },
  {
    name: 'Definition Conflict',
    color: 'var(--red)',
    desc: 'Same term defined differently in two places.',
    example: '"Business Day = Mon–Fri" vs "including Saturdays" in SLA clause',
  },
];

export default function ContraTypes() {
  const ref = useScrollReveal();

  return (
    <section className="section section-dark" ref={ref}>
      <h2 className="section-heading">5 Contradiction Types</h2>
      <p className="section-sub">Each type tests a different analytical skill.</p>

      <div className="contra-list">
        {types.map((t, i) => (
          <div className="contra-row" key={i}>
            <span className="contra-dot" style={{ background: t.color }} />
            <span className="contra-name">{t.name}</span>
            <span className="contra-desc">{t.desc}</span>
            <span className="contra-example">&ldquo;{t.example}&rdquo;</span>
          </div>
        ))}
      </div>
    </section>
  );
}
