import { useNavigate } from 'react-router-dom';

export default function Hero() {
  const navigate = useNavigate();

  const particles = Array.from({ length: 20 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 5}s`,
    duration: `${4 + Math.random() * 4}s`,
    size: `${2 + Math.random() * 3}px`,
    opacity: 0.15 + Math.random() * 0.25,
  }));

  return (
    <section className="hero">
      <div className="hero-glow" />
      <div className="hero-particles">
        {particles.map((p, i) => (
          <span
            key={i}
            className="particle"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
              opacity: p.opacity,
            }}
          />
        ))}
      </div>

      <span className="hero-badge">Meta PyTorch OpenEnv Hackathon 2025</span>

      <h1 className="hero-title">
        Clausr
      </h1>

      <p className="hero-subtitle">
        Find the conflict before it finds you.
      </p>
      <p style={{ color: '#9898b8', fontSize: '18px', marginTop: '-10px', marginBottom: '30px' }}>
        AI agents that detect hidden contradictions in legal contracts — before they cost you millions.
      </p>

      <div className="hero-stats">
        <div className="hero-stat">
          <strong>3 Tasks</strong> — Easy · Medium · Hard
        </div>
        <div className="hero-stat">
          <strong>5 Types</strong> — Temporal · Scope · Party · Renewal · Definition
        </div>
        <div className="hero-stat">
          <strong>0 LLM in Grader</strong> — Pure deterministic set math
        </div>
      </div>

      <button className="hero-cta" onClick={() => navigate('/app')}>
        Enter Clausr →
      </button>

      <p className="hero-powered">
        Powered by OpenEnv · Meta PyTorch · Hugging Face
      </p>

      <div className="scroll-indicator">↓</div>
    </section>
  );
}
