import { useNavigate } from 'react-router-dom';

export default function FinalCTA() {
  const navigate = useNavigate();

  return (
    <section className="final-cta section-dark">
      <h2 className="final-cta-title">Ready to find contradictions?</h2>
      <p className="final-cta-sub">Load a contract. Run the agent. See the score.</p>
      <button className="hero-cta" onClick={() => navigate('/app')}>
        Enter Clausr →
      </button>
      <div className="final-stats">
        <span>🏆 $30,000 Prize Pool</span>
        <span>🤖 Meta × HuggingFace</span>
        <span>⚡ OpenEnv Standard</span>
      </div>
    </section>
  );
}
