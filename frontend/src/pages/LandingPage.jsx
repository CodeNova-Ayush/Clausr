import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showNav] = useState(true);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const s1 = useReveal();
  const s2 = useReveal();
  const s3 = useReveal();
  const s4 = useReveal();
  const s5 = useReveal();
  const s6 = useReveal();
  const s7 = useReveal();
  const s8 = useReveal();
  const s9 = useReveal();
  const s10 = useReveal();
  const s11 = useReveal();
  const s12 = useReveal();

  const styles = {
    sectionBase: {
      padding: '100px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      borderBottom: '1px solid var(--border)',
    },
    bgMain: { background: 'var(--bg-main)' },
    bgSurface: { background: 'var(--bg-surface)' },
    label: {
      color: 'var(--purple)',
      textTransform: 'uppercase',
      fontSize: '11px',
      letterSpacing: '1.5px',
      fontWeight: 'bold',
      marginBottom: '16px'
    },
    heading: {
      fontSize: 'clamp(32px, 5vw, 48px)',
      fontWeight: 800,
      color: '#1a1a2e',
      marginBottom: '16px',
      textAlign: 'center'
    },
    subheading: {
      fontSize: '18px',
      color: 'var(--text-secondary)',
      marginBottom: '48px',
      textAlign: 'center',
      maxWidth: '600px'
    },
    card: {
      background: '#FFFFFF',
      border: 'none',
      borderRadius: '20px',
      padding: '24px',
      boxShadow: '0 2px 16px rgba(108, 99, 255, 0.07)',
      transition: 'transform 0.2s',
      cursor: 'default'
    }
  };

  return (
    <div className="animated-mesh-bg" style={{ color: '#1a1a2e', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', width: '100vw', overflowX: 'hidden' }}>
      
      {showNav && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(108,99,255,0.1)', zIndex: 1000,
          padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 2px 16px rgba(108,99,255,0.05)'
        }}>
          <div style={{ color: '#6C63FF', fontWeight: '900', fontSize: '16px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="20" height="22" viewBox="0 0 24 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(108,99,255,0.4))' }}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            Clausr
          </div>
          <div style={{ display: 'flex', gap: '24px', fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => scrollTo('problem')}>Problem</span>
            <span style={{ cursor: 'pointer' }} onClick={() => scrollTo('how-it-works')}>How It Works</span>
            <span style={{ cursor: 'pointer' }} onClick={() => scrollTo('environments')}>Environments</span>
            <span style={{ cursor: 'pointer' }} onClick={() => scrollTo('contradiction-types')}>Features</span>
            <span style={{ cursor: 'pointer' }} onClick={() => scrollTo('enter')}>Enter</span>
          </div>
          <button onClick={() => navigate('/app')} style={{
            background: 'transparent', border: '1px solid var(--purple)', color: 'var(--purple)',
            padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
          }}>Enter Clausr →</button>
        </div>
      )}

      {/* 1 - HERO */}
      <section ref={s1} className="reveal" style={{...styles.sectionBase, borderBottom: 'none', background: '#E8EAFB', minHeight: '100vh', justifyContent: 'center', position: 'relative', paddingTop: '120px'}}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 60%)', pointerEvents: 'none' }} />

        <div style={{ zIndex: 2, border: '1px solid rgba(108,99,255,0.25)', background: '#F5F4FF', color: '#6C63FF', borderRadius: '20px', padding: '8px 20px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', animation: 'liveDot 1.5s infinite', boxShadow: '0 0 10px var(--green)' }} />
          Meta PyTorch OpenEnv Hackathon 2025
        </div>

        {/* MASSIVE BRAND NEW SVG LOGO */}
        <svg width="140" height="140" viewBox="0 0 200 200" fill="none" style={{ zIndex: 2, marginBottom: '24px', filter: 'drop-shadow(0 10px 30px rgba(108,99,255,0.3))', animation: 'float 6s ease-in-out infinite' }}>
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff" />
              <stop offset="50%" stopColor="var(--purple-light)" />
              <stop offset="100%" stopColor="var(--purple)" />
            </linearGradient>
            <linearGradient id="logoGradDark" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(22, 22, 35, 0.9)" />
              <stop offset="100%" stopColor="rgba(139, 127, 255, 0.4)" />
            </linearGradient>
          </defs>
          <path d="M100 10 L180 45 L180 125 L100 190 L20 125 L20 45 Z" fill="url(#logoGradDark)" stroke="url(#logoGrad)" strokeWidth="4" strokeLinejoin="round" />
          <path d="M100 45 L145 65 L145 110 L100 145 L55 110 L55 65 Z" fill="url(#logoGrad)" opacity="0.9" />
          <circle cx="100" cy="95" r="15" fill="#fff" filter="blur(1px)" />
        </svg>

        <h1 style={{ zIndex: 2, fontSize: 'clamp(64px, 10vw, 100px)', fontWeight: 900, background: 'linear-gradient(to right, #1a1a2e, #6C63FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.04em', marginBottom: '20px', lineHeight: 1 }}>
          Clausr
        </h1>

        <p style={{ zIndex: 2, fontSize: 'clamp(20px, 3.5vw, 28px)', color: '#1a1a2e', fontWeight: '600', maxWidth: '700px', textAlign: 'center', marginBottom: '16px', letterSpacing: '-0.01em' }}>
          Neutralize Contract Risks Before They Materialize.
        </p>
        <p style={{ zIndex: 2, fontSize: '16px', color: '#4a4a68', maxWidth: '680px', textAlign: 'center', marginBottom: '56px', lineHeight: 1.6 }}>
          Deploy autonomous AI orchestration to instantly detect, trace, and neutralize multi-million dollar contractual contradictions with deterministic precision.
        </p>

        <div style={{ zIndex: 2, display: 'flex', flexWrap: 'wrap', background: '#FFFFFF', backdropFilter: 'blur(20px)', border: 'none', borderRadius: '20px', marginBottom: '56px', alignItems: 'center', boxShadow: '0 2px 16px rgba(108,99,255,0.07)' }}>
          <div style={{ padding: '20px 40px', borderRight: '1px solid rgba(108,99,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#1a1a2e', fontSize: '20px', fontWeight: '900', marginBottom: '4px' }}>3 <span style={{color:'#6C63FF'}}>Environments</span></span>
            <span style={{ color: '#8888a8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Detection · Execution · Negotiation</span>
          </div>
          <div style={{ padding: '20px 40px', borderRight: '1px solid rgba(108,99,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#1a1a2e', fontSize: '20px', fontWeight: '900', marginBottom: '4px' }}>5 <span style={{color:'#6C63FF'}}>Conflict Vectors</span></span>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Temporal · Scope · Party · Renewal</span>
          </div>
          <div style={{ padding: '20px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#1a1a2e', fontSize: '20px', fontWeight: '900', marginBottom: '4px' }}>0.85 <span style={{color:'var(--green)'}}>Alpha Score</span></span>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Mistral-small zero-shot baseline</span>
          </div>
        </div>

        <button onClick={() => navigate('/app')} style={{
          zIndex: 2, background: '#6C63FF', color: '#fff', padding: '18px 56px', borderRadius: '12px', fontWeight: 800, fontSize: '18px', border: 'none', cursor: 'pointer', animation: 'none', transition: 'all 150ms ease', marginBottom: '24px', boxShadow: 'none'
        }} onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.background = '#5A52E0'; }} onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#6C63FF'; }}>
          Initialize Clausr Engine →
        </button>

        <p style={{ zIndex: 2, fontSize: '12px', color: 'var(--text-muted)' }}>Powered by OpenEnv · Meta PyTorch · Hugging Face</p>

        <div style={{ position: 'absolute', bottom: '32px', color: 'var(--text-muted)', fontSize: '24px', animation: 'bounce 1.6s infinite', zIndex: 2 }}>↓</div>
      </section>

      {/* 2 - PROBLEM */}
      <section id="problem" ref={s2} className="reveal" style={{...styles.sectionBase, ...styles.bgSurface}}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '80px', maxWidth: '1100px', width: '100%', alignItems: 'center' }}>
          <div style={{ flex: '1 1 400px' }}>
            <div style={styles.label}>The Multi-Million Dollar Blind Spot</div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: '900', background: 'linear-gradient(to right, #1a1a2e, #6C63FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '24px', lineHeight: 1.2 }}>"No legal team reads 60 clauses with multi-layer cross-referencing in mind."</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '17px', lineHeight: 1.7, marginBottom: '32px' }}>
              Every enterprise contract has hidden contradictions. A clause promising payment in 30 days and another triggering penalties after 45 days create a dangerous ambiguity that neither side notices until a dispute costs millions. Clausr is the first system that trains AI agents to find these conflicts — automatically, deterministically, and in real time.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ borderLeft: '3px solid var(--green)', paddingLeft: '16px' }}>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>$860 Billion</div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>global annual cost of contract disputes</div>
              </div>
              <div style={{ borderLeft: '3px solid var(--amber)', paddingLeft: '16px' }}>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>9%</div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>revenue lost per year to poor contract management</div>
              </div>
              <div style={{ borderLeft: '3px solid var(--red)', paddingLeft: '16px' }}>
                <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>60%</div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>of disputes caused by internal contradictions</div>
              </div>
            </div>
          </div>
          
          <div style={{ flex: '1 1 400px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '24px', zIndex: 1 }}>
            <div className="interactive-hover-box" style={{ ...styles.card, borderLeft: '4px solid var(--amber)', position: 'relative' }}>
              <div style={{ fontFamily: 'monospace', color: 'var(--amber)', fontSize: '13px', marginBottom: '10px', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', fontWeight: 'bold' }}>CLAUSE_03</div>
              <div style={{ fontWeight: '900', color: '#1a1a2e', marginBottom: '16px', fontSize: '18px' }}>Confidentiality Period</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6 }}>The Receiving Party shall maintain confidentiality for a period of <b style={{color:'var(--amber)'}}>2 years</b> from the date of disclosure.</div>
            </div>
            
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '56px', height: '56px', background: 'linear-gradient(135deg, #ff6b6b, #ef4444)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '16px', zIndex: 3, boxShadow: '0 0 0 6px #F0F1FC, 0 10px 20px rgba(239, 68, 68, 0.4)' }}>VS</div>

            <div className="interactive-hover-box" style={{ ...styles.card, borderLeft: '4px solid var(--amber)', position: 'relative' }}>
              <div style={{ fontFamily: 'monospace', color: 'var(--amber)', fontSize: '13px', marginBottom: '10px', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', fontWeight: 'bold' }}>CLAUSE_07</div>
              <div style={{ fontWeight: '900', color: '#1a1a2e', marginBottom: '16px', fontSize: '18px' }}>Obligations Upon Termination</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6 }}>Upon termination, all confidentiality obligations shall remain in force for <b style={{color:'var(--amber)'}}>36 months</b> from the date of termination.</div>
            </div>
            <div style={{ width: '100%', textAlign: 'center', color: 'var(--red)', fontSize: '12px', fontStyle: 'italic', marginTop: '16px' }}>Conflict detected: 24 months ≠ 36 months — same obligation, different duration</div>
          </div>
        </div>
      </section>

      {/* 3 - PROCESS */}
      <section id="how-it-works" ref={s3} className="reveal" style={{...styles.sectionBase, ...styles.bgMain}}>
        <div style={styles.label}>Execution Pipeline</div>
        <h2 style={{...styles.heading, background: 'linear-gradient(to right, #1a1a2e, #6C63FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Deterministic AI Orchestration</h2>
        <p style={styles.subheading}>Three autonomous phases. One objective score. Fully strictly deterministic.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', maxWidth: '1200px', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...styles.card, flex: '1 1 280px', transition: 'all 0.3s' }} onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.05) translateY(-8px)'; e.currentTarget.style.boxShadow='0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px var(--purple-dim)';}} onMouseLeave={e=>{e.currentTarget.style.transform='scale(1) translateY(0)'; e.currentTarget.style.boxShadow='none';}}>
            <div style={{ fontSize: '44px', fontWeight: '900', color: 'var(--purple)', marginBottom: '16px', lineHeight: 1, textShadow: '0 0 20px rgba(139,127,255,0.4)' }}>1</div>
            <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '12px', color: '#1a1a2e' }}>Contract Loaded</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>The environment loads a pre-generated business contract with planted contradictions. The agent receives the full text, a structured clause list with IDs, and the exact count of contradictions — shielding which ones are flawed.</div>
            <div style={{ width: '40px', height: '50px', border: '2px solid var(--border-light)', borderRadius: '4px', borderTopRightRadius: '12px', position: 'relative' }}>
              <div style={{ position:'absolute', top: '12px', left: '8px', right: '8px', height: '2px', background: 'var(--border)' }}/>
              <div style={{ position:'absolute', top: '20px', left: '8px', right: '8px', height: '2px', background: 'var(--border)' }}/>
              <div style={{ position:'absolute', top: '28px', left: '8px', width: '16px', height: '2px', background: 'var(--border)' }}/>
            </div>
          </div>
          <div style={{ fontSize: '28px', color: 'var(--purple-dim)', flexShrink: 0, textShadow: '0 0 10px rgba(139,127,255,0.5)' }}>→</div>
          <div style={{ ...styles.card, flex: '1 1 280px', transition: 'all 0.3s' }} onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.05) translateY(-8px)'; e.currentTarget.style.boxShadow='0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px var(--purple-dim)';}} onMouseLeave={e=>{e.currentTarget.style.transform='scale(1) translateY(0)'; e.currentTarget.style.boxShadow='none';}}>
            <div style={{ fontSize: '44px', fontWeight: '900', color: 'var(--purple)', marginBottom: '16px', lineHeight: 1, textShadow: '0 0 20px rgba(139,127,255,0.4)' }}>2</div>
            <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '12px', color: '#1a1a2e' }}>Agent Analyzes</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>An LLM actively reasons through all document clauses, outputting deterministic (clause_a_id, clause_b_id) pairs with robust explanations tracking the logic matrix.</div>
          </div>
          <div style={{ fontSize: '28px', color: 'var(--purple-dim)', flexShrink: 0, textShadow: '0 0 10px rgba(139,127,255,0.5)' }}>→</div>
          <div style={{ ...styles.card, flex: '1 1 280px', transition: 'all 0.3s' }} onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.05) translateY(-8px)'; e.currentTarget.style.boxShadow='0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px var(--purple-dim)';}} onMouseLeave={e=>{e.currentTarget.style.transform='scale(1) translateY(0)'; e.currentTarget.style.boxShadow='none';}}>
            <div style={{ fontSize: '44px', fontWeight: '900', color: 'var(--purple)', marginBottom: '16px', lineHeight: 1, textShadow: '0 0 20px rgba(139,127,255,0.4)' }}>3</div>
            <div style={{ fontWeight: '800', fontSize: '18px', marginBottom: '12px', color: '#1a1a2e' }}>Score Returned</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>The execution grader cross-checks clause ID pairs against the ground truth using strict mathematical set intersection. Zero LLMs involved in grading. 100% reproducible execution.</div>
          </div>
        </div>
      </section>

      {/* 4 - ENVIRONMENTS */}
      <section id="environments" ref={s4} className="reveal" style={{...styles.sectionBase, ...styles.bgSurface}}>
        <div style={{...styles.label, textShadow: '0 0 10px rgba(139,127,255,0.4)'}}>Architecture</div>
        <h2 style={{...styles.heading, fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: '900', background: 'linear-gradient(to right, #1a1a2e, #6C63FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Triple-Threat Legal Architectures</h2>
        <p style={{...styles.subheading, fontSize: '17px'}}>Three distinctly engineered environments. Each isolating a specific layer of advanced reasoning.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', maxWidth: '1200px', width: '100%' }}>
          <div style={{ ...styles.card, flex: '1 1 300px', borderTop: '3px solid var(--green)', position: 'relative', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }} onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.03) translateY(-4px)'; e.currentTarget.style.boxShadow='0 20px 40px rgba(0,214,143,0.15), 0 0 0 1px rgba(0,214,143,0.3)';}} onMouseLeave={e=>{e.currentTarget.style.transform='scale(1) translateY(0)'; e.currentTarget.style.boxShadow='none';}}>
            <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--green-dim)', color: 'var(--green)', fontSize: '10px', fontWeight: 900, padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(0,214,143,0.3)' }}>ENVIRONMENT 1</div>
            <h3 style={{ fontSize: '20px', color: '#1a1a2e', marginBottom: '6px', marginTop: '14px', fontWeight: 800 }}>Contradiction Detection</h3>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px', fontWeight: 600 }}>Static document analysis</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>The foundational orchestration environment. The agent executes full-text context capture to identify all contradicting clause pairs. Incorporates five contradiction frameworks and three hyper-realistic legal decoys.</p>
            <div style={{ fontSize: '12px', color: 'var(--green)', marginBottom: '8px', fontWeight: 600 }}>8–60 clauses · 1–8 contradictions · 3 task levels</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>Baseline: <span style={{color:'#1a1a2e', fontWeight: 'bold'}}>Mistral zero-shot: 0.85 mean</span></div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', background: '#F0F1FC', borderLeft: '3px solid var(--green)', padding: '12px 14px', borderRadius: '6px', color: '#4a4a68' }}>
              {`{\n  "finding_id": "c1_c2",\n  "clause_a": "CLAUSE_03",\n  "clause_b": "CLAUSE_07"\n}`}
            </div>
          </div>
          <div style={{ ...styles.card, flex: '1 1 300px', borderTop: '3px solid var(--amber)', position: 'relative', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }} onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.03) translateY(-4px)'; e.currentTarget.style.boxShadow='0 20px 40px rgba(255,184,61,0.15), 0 0 0 1px rgba(255,184,61,0.3)';}} onMouseLeave={e=>{e.currentTarget.style.transform='scale(1) translateY(0)'; e.currentTarget.style.boxShadow='none';}}>
            <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--amber-dim)', color: 'var(--amber)', fontSize: '10px', fontWeight: 900, padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(255,184,61,0.3)' }}>ENVIRONMENT 2</div>
            <h3 style={{ fontSize: '20px', color: '#1a1a2e', marginBottom: '6px', marginTop: '14px', fontWeight: 800 }}>The Oracle</h3>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px', fontWeight: 600 }}>Contract execution simulation</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>The world's first contract execution simulator. The agent traces realistic business scenarios through the contract logic matrix to isolate the exact business operation that plunges the agreement into an undefined legal state.</p>
            <div style={{ fontSize: '12px', color: 'var(--amber)', marginBottom: '8px', fontWeight: 600 }}>3–14 sequential scenarios · Multi-agent core</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>Baseline: <span style={{color:'#1a1a2e', fontWeight: 'bold'}}>Novel architecture — no prior benchmark</span></div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', background: '#F0F1FC', borderLeft: '3px solid var(--amber)', padding: '12px 14px', borderRadius: '6px', color: '#4a4a68' }}>
              {`{\n  "scenario_trace": [ ... ],\n  "crashes": true,\n  "crash_clauses": ["CLAUSE_04", "CLAUSE_14"]\n}`}
            </div>
          </div>
          <div style={{ ...styles.card, flex: '1 1 300px', borderTop: '3px solid var(--purple)', position: 'relative', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }} onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.03) translateY(-4px)'; e.currentTarget.style.boxShadow='0 20px 40px rgba(139,127,255,0.15), 0 0 0 1px rgba(139,127,255,0.3)';}} onMouseLeave={e=>{e.currentTarget.style.transform='scale(1) translateY(0)'; e.currentTarget.style.boxShadow='none';}}>
            <div style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--purple-dim)', color: 'var(--purple-light)', fontSize: '10px', fontWeight: 900, padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(139,127,255,0.3)' }}>ENVIRONMENT 3</div>
            <h3 style={{ fontSize: '20px', color: '#1a1a2e', marginBottom: '6px', marginTop: '14px', fontWeight: 800 }}>LexMind</h3>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px', fontWeight: 600 }}>Negotiation intelligence co-pilot</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>The first incremental observation framework in the OpenEnv catalog. The agent monitors the contract growing clause by clause during live negotiation and triggers the exact millisecond a vulnerability is embedded.</p>
            <div style={{ fontSize: '12px', color: 'var(--purple-light)', marginBottom: '8px', fontWeight: 600 }}>8–40 live events · Institutional memory engine</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>Baseline: <span style={{color:'#1a1a2e', fontWeight: 'bold'}}>First of its kind globally</span></div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', background: '#F0F1FC', borderLeft: '3px solid var(--purple)', padding: '12px 14px', borderRadius: '6px', color: '#4a4a68' }}>
              {`{\n  "event_type": "CLAUSE_INSERTION",\n  "party": "COUNTERPARTY",\n  "contradiction_flag": true,\n  "conflicts_with": "CLAUSE_03"\n}`}
            </div>
          </div>
        </div>
      </section>

      {/* 5 - CONTRADICTION TYPES */}
      <section id="contradiction-types" ref={s5} className="reveal" style={{...styles.sectionBase, ...styles.bgMain}}>
        <div style={{...styles.label, textShadow: '0 0 10px rgba(139,127,255,0.4)'}}>Taxonomy</div>
        <h2 style={{...styles.heading, background: 'linear-gradient(to right, #1a1a2e, #6C63FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>The Five Vectors of Contractual Failure</h2>
        <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '0' }}>
          {[
            { n: 1, c: 'var(--green)', title: 'Numeric / Temporal', desc: 'Same obligation, different numbers', c1: 'clause_03: "...confidentiality for 2 years..."', c2: 'clause_07: "...obligations for 36 months..."' },
            { n: 2, c: 'var(--blue)', title: 'Scope Conflict', desc: 'One clause grants a right, another removes it', c1: 'clause_06 granting resale rights', c2: 'clause_11 prohibiting resale' },
            { n: 3, c: 'var(--amber)', title: 'Party Obligation', desc: 'Same duty assigned to different parties', c1: 'clause_03 Supplier pays shipping', c2: 'clause_07 Client pays shipping' },
            { n: 4, c: '#FF8C42', title: 'Termination / Renewal', desc: 'Notice windows that logically overlap', c1: 'clause_12 terminate with 30 days notice', c2: 'clause_20 cancel 90 days before auto-renewal' },
            { n: 5, c: 'var(--red)', title: 'Definition Conflict — Hard task only', desc: 'Same term defined differently in two places', c1: 'clause_02 Business Day = Mon-Fri', c2: 'clause_38 Business Day includes Saturdays' },
          ].map(t => (
            <div key={t.n} style={{ display: 'flex', flexWrap: 'wrap', padding: '32px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: '1 1 300px', paddingRight: '24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.c }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Type {t.n}</span>
                  <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#1a1a2e' }}>{t.title}</span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', paddingLeft: '22px', lineHeight: 1.5 }}>{t.desc}</div>
              </div>
              <div style={{ flex: '1 1 500px', background: '#FFFFFF', borderLeft: `4px solid ${t.c}`, padding: '20px', borderRadius: '20px', fontFamily: 'monospace', fontSize: '13px', color: '#4a4a68', boxShadow: '0 2px 16px rgba(108,99,255,0.07)', transition: 'all 0.3s', cursor: 'default' }} onMouseEnter={e=>{e.currentTarget.style.transform='translateX(8px)';}} onMouseLeave={e=>{e.currentTarget.style.transform='translateX(0)';}}>
                <div style={{ marginBottom: '8px' }}>{t.c1}</div>
                <div style={{ color: t.c }}>vs</div>
                <div style={{ marginTop: '8px' }}>{t.c2}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6 - TRAPS */}
      <section id="traps" ref={s6} className="reveal" style={{...styles.sectionBase, ...styles.bgSurface}}>
        <div style={styles.label}>Advanced Design</div>
        <h2 style={{...styles.heading, background: 'linear-gradient(to right, #1a1a2e, #6C63FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Near-Contradiction Traps</h2>
        <p style={styles.subheading}>The Hard task plants clause pairs that LOOK contradictory but are legally consistent. Flagging a trap costs 0.1 score. This tests whether the agent reasons carefully or guesses.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', maxWidth: '1200px', width: '100%' }}>
          {[
            { id: 1, title: 'Different Contexts', body: 'Two clauses state different notice periods — 30 days and 5 days. They look like a conflict but each applies to a different termination scenario: one for convenience, one for cause. A precise agent recognizes the context difference.', ex: '[Convenience] 30 days vs [Cause] 5 days' },
            { id: 2, title: 'Explicit Override', body: "One clause explicitly says 'Notwithstanding clause X'. This is an intentional legal override — the drafter deliberately made one clause supersede another. It is not a contradiction, it is a hierarchy. Agents that miss the notwithstanding language get penalized.", ex: "'Notwithstanding clause 4, liability is capped...'" },
            { id: 3, title: 'Complementary Scope', body: 'One clause applies within the Territory. Another applies outside the Territory. Together they cover the entire world with no gap or overlap. They are not in conflict — they are partners. Agents that flag complementary clauses as contradictions lose 0.1 points.', ex: 'Inside Territory vs Outside Territory' }
          ].map(t => (
            <div key={t.id} style={{ background: 'var(--bg-card)', border: '1px solid rgba(77, 166, 255, 0.15)', borderRadius: '12px', padding: '24px', flex: '1 1 300px', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }} onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.05) translateY(-4px)'; e.currentTarget.style.boxShadow='0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(77, 166, 255, 0.3)';}} onMouseLeave={e=>{e.currentTarget.style.transform='scale(1) translateY(0)'; e.currentTarget.style.boxShadow='none';}}>
              <div style={{ background: 'var(--blue-dim)', color: 'var(--blue)', fontSize: '10px', fontWeight: 900, padding: '4px 10px', borderRadius: '12px', display: 'inline-block', marginBottom: '16px', border: '1px solid rgba(77,166,255,0.3)' }}>TRAP {t.id}</div>
              <h3 style={{ fontSize: '18px', color: '#1a1a2e', marginBottom: '12px', fontWeight: 800 }}>{t.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>{t.body}</p>
              <div style={{ background: 'rgba(77,166,255,0.05)', border: '1px solid rgba(77,166,255,0.2)', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--blue)' }}>{t.ex}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 7 - GRADER */}
      <section id="grader" ref={s7} className="reveal" style={{...styles.sectionBase, ...styles.bgMain}}>
        <div style={{...styles.label, textShadow: '0 0 10px rgba(0,214,143,0.4)', color: 'var(--green)'}}>The Source of Truth</div>
        <h2 style={{...styles.heading, background: 'linear-gradient(to right, #1a1a2e, var(--green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: 'clamp(32px, 4vw, 44px)'}}>Zero-Hallucination Deterministic Engine</h2>
        <p style={{...styles.subheading, fontSize: '17px'}}>No "LLM-as-a-judge". Scoring is purely mathematical, ensuring 100% reproducible metrics.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '48px', maxWidth: '1100px', width: '100%', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 45%' }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--purple)', borderRadius: '8px', padding: '20px 24px', fontFamily: 'monospace', color: 'var(--purple-light)', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
              score = (true_positives / total)<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;− (0.1 × false_positives)<br/><br/>
              score = clamp(score, 0.0, 1.0)
            </div>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>The grader compares sorted (clause_a_id, clause_b_id) tuples via set intersection</li>
              <li style={{ marginBottom: '8px' }}>Order is irrelevant: (clause_03, clause_07) equals (clause_07, clause_03)</li>
              <li style={{ marginBottom: '8px' }}>The explanation text is never read — only clause IDs matter</li>
              <li>Results are 100% identical on every machine, every run</li>
            </ul>
          </div>
          <div style={{ flex: '1 1 50%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--purple-dim)', borderBottom: '1px solid var(--purple)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--purple-light)' }}>Scenario</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--purple-light)' }}>TP</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--purple-light)' }}>FP</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--purple-light)' }}>Score</th>
                </tr>
              </thead>
              <tbody style={{ color: 'var(--text-primary)' }}>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>Found all 4, zero false positives</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>4</td><td style={{ padding: '12px 16px', textAlign: 'center' }}>0</td><td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--green)', fontWeight: 'bold' }}>1.00</td>
                </tr>
                <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>Found 3 of 4, zero false positives</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>3</td><td style={{ padding: '12px 16px', textAlign: 'center' }}>0</td><td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--green)', fontWeight: 'bold' }}>0.75</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>Found 3 of 4, flagged 2 traps</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>3</td><td style={{ padding: '12px 16px', textAlign: 'center' }}>2</td><td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--amber)', fontWeight: 'bold' }}>0.55</td>
                </tr>
                <tr style={{ background: 'var(--bg-card)' }}>
                  <td style={{ padding: '12px 16px' }}>Found nothing</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>0</td><td style={{ padding: '12px 16px', textAlign: 'center' }}>0</td><td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--red)', fontWeight: 'bold' }}>0.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '32px', fontStyle: 'italic' }}>
          The penalty of 0.1 per false positive is calibrated so that guessing is always better than silence — but flooding the output with every possible clause pair scores near zero.
        </div>
      </section>

      {/* 8 - ORACLE */}
      <section id="oracle" ref={s8} className="reveal" style={{...styles.sectionBase, ...styles.bgSurface}}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '80px', maxWidth: '1100px', width: '100%', alignItems: 'center' }}>
          <div style={{ flex: '1 1 45%' }}>
            <div style={{ ...styles.label, color: 'var(--amber)', textShadow: '0 0 10px rgba(255,184,61,0.4)', border: '1px solid rgba(255,184,61,0.3)', padding: '4px 12px', borderRadius: '12px', display: 'inline-block' }}>Environment 2</div>
            <h2 style={{ fontSize: 'clamp(36px, 5vw, 48px)', fontWeight: '900', background: 'linear-gradient(135deg, #1a1a2e, var(--amber))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '12px' }}>The Oracle</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>The world's first contract execution simulator</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
              Every existing legal AI tool reads contracts. The Oracle executes them.<br/><br/>
              It generates realistic business scenarios — the employee actions that actually test a contract in the real world. For each scenario it traces which clauses activate, in sequence, and detects the exact moment two contradicting clauses fire simultaneously.<br/><br/>
              That moment is the crash. The contract enters an undefined legal state. The company loses in court. The Oracle finds it before it happens.<br/><br/>
              This is multi-agent orchestration inside a single OpenEnv episode — a Scenario Generator working alongside an Execution Tracer. The first such design in the OpenEnv catalog.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '24px' }}>
              {['Multi-agent orchestration', 'Realistic business scenarios', 'Crash point identification'].map(p => (
                <div key={p} style={{ background: 'var(--amber-dim)', color: 'var(--amber)', fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(255, 184, 61, 0.2)' }}>{p}</div>
              ))}
            </div>
          </div>
          <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', zIndex: 1 }}>
            <div className="interactive-hover-box" style={{ background: '#FFFFFF', border: '1px solid rgba(108,99,255,0.1)', borderRadius: '12px', padding: '20px 24px', fontSize: '15px', color: '#1a1a2e', width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', fontWeight: '600' }}>Customer sends invoice on Day 32</div>
            <div style={{ color: 'var(--purple)', opacity: 0.4, fontSize: '24px', lineHeight: 0, animation: 'bounce 2s infinite' }}>↓</div>
            <div className="interactive-hover-box" style={{ background: '#FFFFFF', border: '1px solid rgba(108,99,255,0.1)', borderRadius: '12px', padding: '20px 24px', fontSize: '15px', color: '#1a1a2e', width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', fontWeight: '600' }}>CLAUSE_04 activates — Net 30 payment terms</div>
            <div style={{ color: 'var(--purple)', opacity: 0.4, fontSize: '24px', lineHeight: 0, animation: 'bounce 2s infinite', animationDelay: '0.2s' }}>↓</div>
            <div className="interactive-hover-box" style={{ background: '#FFFFFF', border: '1px solid rgba(108,99,255,0.1)', borderRadius: '12px', padding: '20px 24px', fontSize: '15px', color: '#1a1a2e', width: '100%', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', fontWeight: '600' }}>CLAUSE_14 activates — 45-day late payment trigger</div>
            <div style={{ color: 'var(--red)', opacity: 0.6, fontSize: '24px', lineHeight: 0, animation: 'bounce 2s infinite', animationDelay: '0.4s' }}>↓</div>
            <div className="interactive-hover-box" style={{ background: 'linear-gradient(145deg, rgba(255,92,92,0.1), rgba(255,40,40,0.02))', border: '2px solid var(--red)', borderRadius: '16px', padding: '28px', width: '100%', textAlign: 'center', animation: 'crashPulse 1s infinite alternate', boxShadow: '0 10px 30px rgba(239, 68, 68, 0.2)' }}>
              <div style={{ color: 'var(--red)', fontWeight: '900', fontSize: '18px', marginBottom: '12px', letterSpacing: '1px' }}>EXECUTION CRASH</div>
              <div style={{ color: '#1a1a2e', fontSize: '14px', marginBottom: '16px', lineHeight: 1.6, fontWeight: '500' }}>Clause 04 demands payment. Clause 14 has not yet defined late payment. Both clauses are simultaneously active with incompatible demands.</div>
              <div style={{ color: 'var(--red)', fontSize: '13px', fontStyle: 'italic', fontWeight: 'bold' }}>Financial exposure: Disputed invoice — payment obligation void</div>
            </div>
          </div>
        </div>
      </section>

      {/* 9 - LEXMIND */}
      <section id="lexmind" ref={s9} className="reveal" style={{...styles.sectionBase, ...styles.bgMain}}>
        <div style={{ display: 'flex', flexWrap: 'wrap-reverse', gap: '80px', maxWidth: '1100px', width: '100%', alignItems: 'center' }}>
          <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', gap: '24px', borderLeft: '1px solid var(--border)', paddingLeft: '24px' }}>
            <div>
              <div style={{ background: 'var(--blue-dim)', color: 'var(--blue)', fontSize: '9px', fontWeight: 'bold', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', marginBottom: '8px' }}>Round 1 · Drafter</div>
              <div style={{ background: 'var(--bg-card)', borderLeft: '3px solid var(--green)', padding: '12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#1a1a2e', fontWeight: 'bold', marginBottom: '4px' }}>CLAUSE_01 · Parties</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Clean — no contradiction</div>
              </div>
            </div>
            <div style={{ animation: 'liveDot 2s infinite alternate' }}>
              <div style={{ background: 'var(--blue-dim)', color: 'var(--blue)', fontSize: '9px', fontWeight: 'bold', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', marginBottom: '8px' }}>Round 1 · Drafter</div>
              <div style={{ background: 'var(--bg-card)', borderLeft: '3px solid var(--green)', padding: '12px', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#1a1a2e', fontWeight: 'bold', marginBottom: '4px' }}>CLAUSE_03 · Confidentiality Period</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Clean — no contradiction</div>
              </div>
            </div>
            <div style={{ animation: 'counterpartySlide 0.4s ease forwards' }}>
              <div style={{ background: 'rgba(139,127,255,0.1)', color: 'var(--purple-light)', fontSize: '10px', fontWeight: 'bold', display: 'inline-block', padding: '4px 10px', borderRadius: '12px', marginBottom: '8px', border: '1px solid rgba(139,127,255,0.4)' }}>Round 2 · Counterparty</div>
              <div style={{ background: 'rgba(255,92,92,0.06)', border: '1px solid rgba(255,92,92,0.4)', borderLeft: '4px solid var(--red)', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '14px', color: '#1a1a2e', fontWeight: '900', marginBottom: '8px' }}>CLAUSE_07 · Obligations Upon Termination</div>
                <div style={{ background: 'rgba(255,92,92,0.2)', color: 'var(--red)', fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', marginBottom: '12px', display: 'inline-block' }}>CONTRADICTION DETECTED</div>
                <div style={{ fontSize: '12px', color: '#4a4a68', marginBottom: '8px', lineHeight: 1.5 }}>Conflicts with CLAUSE_03 — <span style={{color:'#1a1a2e', fontWeight:'bold'}}>36 months vs 2 years</span> for same obligation</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Fired at event 3 of 8 <span style={{color:'var(--purple)'}}>· 0.4ms latency</span></div>
              </div>
            </div>
          </div>
          <div style={{ flex: '1 1 45%' }}>
            <div style={{ ...styles.label, color: 'var(--purple-light)', textShadow: '0 0 10px rgba(139,127,255,0.4)', border: '1px solid rgba(139,127,255,0.3)', padding: '4px 12px', borderRadius: '12px', display: 'inline-block' }}>Environment 3</div>
            <h2 style={{ fontSize: 'clamp(36px, 5vw, 48px)', fontWeight: '900', background: 'linear-gradient(135deg, #1a1a2e, #6C63FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '12px' }}>LexMind</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>The first incremental observation environment in OpenEnv</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
              Every other OpenEnv environment gives the agent a complete document.<br/>LexMind gives the agent a document that grows.<br/><br/>
              As clauses arrive one by one — in the order they were negotiated across multiple rounds — the agent must determine whether each new clause introduces a contradiction with any clause already accepted into the draft.<br/><br/>
              The moment a contradiction enters the negotiation, LexMind fires. Not after the document is finished. During its creation. This is legal risk prevention, not analysis.<br/><br/>
              The institutional memory layer stores contradiction patterns across sessions. The more contracts the user analyzes, the richer the warning system becomes.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '24px' }}>
              {['Clause-by-clause monitoring', 'Multi-round negotiation tracking', 'Institutional memory'].map(p => (
                <div key={p} style={{ background: 'var(--purple-dim)', color: 'var(--purple-light)', fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(139, 127, 255, 0.2)' }}>{p}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 10 - DNA */}
      <section id="dna" ref={s10} className="reveal" style={{...styles.sectionBase, ...styles.bgSurface}}>
        <div style={styles.label}>Pre-Agent Intelligence</div>
        <h2 style={styles.heading}>Contract DNA Fingerprint</h2>
        <p style={styles.subheading}>Linguistic risk analysis before the agent runs</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '80px', maxWidth: '1100px', width: '100%', alignItems: 'center' }}>
          <div style={{ flex: '1 1 45%', color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6 }}>
            Before the agent analyzes a single clause, Clausr scans the contract text for linguistic patterns and generates a risk profile across all five contradiction types.<br/><br/>
            Numbers appearing in multiple clauses suggest Type 1 risk. Grant language alongside restriction language suggests Type 2. Multiple party names with obligation verbs suggests Type 3. Termination and renewal language together suggests Type 4. Defined terms with multiple definitions suggest Type 5.<br/><br/>
            The Contract DNA Fingerprint gives an instant visual of where the agent should focus — and warns you before you run the expensive LLM call.
          </div>
          <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg width="240" height="240" viewBox="0 0 200 200" style={{ marginBottom: '24px' }}>
              <polygon points="100,20 176,75 147,165 53,165 24,75" fill="none" stroke="var(--border)" strokeWidth="1"/>
              <polygon points="100,40 157,81 135,149 65,149 43,81" fill="none" stroke="var(--border)" strokeWidth="1"/>
              <polygon points="100,60 138,88 123,132 77,132 62,88" fill="none" stroke="var(--border)" strokeWidth="1"/>
              <polygon points="100,80 119,94 112,116 88,116 81,94" fill="none" stroke="var(--border)" strokeWidth="1"/>
              <line x1="100" y1="100" x2="100" y2="20" stroke="var(--border)" />
              <line x1="100" y1="100" x2="176" y2="75" stroke="var(--border)" />
              <line x1="100" y1="100" x2="147" y2="165" stroke="var(--border)" />
              <line x1="100" y1="100" x2="53" y2="165" stroke="var(--border)" />
              <line x1="100" y1="100" x2="24" y2="75" stroke="var(--border)" />
              <polygon points="100,30 140,85 110,120 70,165 40,80" fill="rgba(139,127,255,0.3)" stroke="var(--purple)" strokeWidth="2" />
              <circle cx="100" cy="30" r="4" fill="var(--green)" />
              <circle cx="140" cy="85" r="4" fill="var(--blue)" />
              <circle cx="110" cy="120" r="4" fill="var(--amber)" />
              <circle cx="70" cy="165" r="4" fill="#FF8C42" />
              <circle cx="40" cy="80" r="4" fill="var(--red)" />
              <text x="100" y="10" fill="var(--text-muted)" fontSize="8" textAnchor="middle">Type 1</text>
              <text x="185" y="75" fill="var(--text-muted)" fontSize="8" textAnchor="start">Type 2</text>
              <text x="155" y="175" fill="var(--text-muted)" fontSize="8" textAnchor="start">Type 3</text>
              <text x="45" y="175" fill="var(--text-muted)" fontSize="8" textAnchor="end">Type 4</text>
              <text x="15" y="75" fill="var(--text-muted)" fontSize="8" textAnchor="end">Type 5</text>
            </svg>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { name: 'Numeric/Temporal', color: 'var(--green)', v: '80%' },
                { name: 'Scope Conflict', color: 'var(--blue)', v: '45%' },
                { name: 'Party Obligation', color: 'var(--amber)', v: '30%' },
                { name: 'Termination/Renewal', color: '#FF8C42', v: '90%' },
                { name: 'Definition Conflict', color: 'var(--red)', v: '60%' }
              ].map(b => (
                <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px' }}>
                  <div style={{ width: '120px', color: 'var(--text-secondary)' }}>{b.name}</div>
                  <div style={{ flex: 1, background: 'var(--bg-main)', height: '6px', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                    <div className="animate-bar-grow" style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: b.color, '--bar-target': b.v, borderRadius: '3px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 11 - LEADERBOARD */}
      <section id="leaderboard" ref={s11} className="reveal" style={{...styles.sectionBase, ...styles.bgMain}}>
        <div style={styles.label}>Community</div>
        <h2 style={styles.heading}>Built for Competition</h2>
        <p style={styles.subheading}>Every run is scored, ranked, and remembered.</p>
        <div style={{ maxWidth: '900px', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead style={{ background: 'var(--purple-dim)', borderBottom: '1px solid var(--purple)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', color: 'var(--purple-light)', textAlign: 'center' }}>Rank</th>
                  <th style={{ padding: '12px 16px', color: 'var(--purple-light)' }}>Name</th>
                  <th style={{ padding: '12px 16px', color: 'var(--purple-light)' }}>Task</th>
                  <th style={{ padding: '12px 16px', color: 'var(--purple-light)' }}>Score</th>
                  <th style={{ padding: '12px 16px', color: 'var(--purple-light)' }}>Model</th>
                  <th style={{ padding: '12px 16px', color: 'var(--purple-light)' }}>Time</th>
                </tr>
              </thead>
              <tbody style={{ color: 'var(--text-primary)' }}>
                <tr style={{ background: 'var(--bg-card)' }}>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#FFD700', fontWeight: 'bold' }}>1</td>
                  <td style={{ padding: '12px 16px' }}>Alex K.</td>
                  <td style={{ padding: '12px 16px', color: 'var(--red)' }}>Hard</td>
                  <td style={{ padding: '12px 16px', color: 'var(--green)', fontWeight: 'bold' }}>0.88</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>claude-sonnet</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>2h ago</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#C0C0C0', fontWeight: 'bold' }}>2</td>
                  <td style={{ padding: '12px 16px' }}>Priya M.</td>
                  <td style={{ padding: '12px 16px', color: 'var(--red)' }}>Hard</td>
                  <td style={{ padding: '12px 16px', color: 'var(--green)', fontWeight: 'bold' }}>0.81</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>gpt-4o</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>3h ago</td>
                </tr>
                <tr style={{ background: 'var(--bg-card)' }}>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#CD7F32', fontWeight: 'bold' }}>3</td>
                  <td style={{ padding: '12px 16px' }}>Jordan T.</td>
                  <td style={{ padding: '12px 16px', color: 'var(--amber)' }}>Medium</td>
                  <td style={{ padding: '12px 16px', color: 'var(--green)', fontWeight: 'bold' }}>1.00</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>claude-haiku</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>5h ago</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>4</td>
                  <td style={{ padding: '12px 16px' }}>Anonymous</td>
                  <td style={{ padding: '12px 16px', color: 'var(--green)' }}>Easy</td>
                  <td style={{ padding: '12px 16px', color: 'var(--green)', fontWeight: 'bold' }}>1.00</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>mistral-small</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>1d ago</td>
                </tr>
                <tr style={{ background: 'var(--bg-card)' }}>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>5</td>
                  <td style={{ padding: '12px 16px' }}>Wei L.</td>
                  <td style={{ padding: '12px 16px', color: 'var(--red)' }}>Hard</td>
                  <td style={{ padding: '12px 16px', color: 'var(--amber)', fontWeight: 'bold' }}>0.55</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>claude-haiku</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>1d ago</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '16px', borderRadius: '8px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: 'var(--purple-light)' }}>Cross-session persistence</div>
            <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '16px', borderRadius: '8px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: 'var(--purple-light)' }}>Filter by task level</div>
            <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '16px', borderRadius: '8px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: 'var(--purple-light)' }}>Institutional memory</div>
          </div>
        </div>
      </section>

      {/* 12 - FINAL CTA */}
      <section id="enter" ref={s12} className="reveal" style={{...styles.sectionBase, ...styles.bgMain, minHeight: '100vh', justifyContent: 'center', borderBottom: 'none', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(108,99,255,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
        
        <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ border: '1px solid rgba(0, 214, 143, 0.4)', color: 'var(--green)', borderRadius: '20px', padding: '6px 18px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', animation: 'liveDot 1.5s infinite' }} />
            Ready to begin
          </div>

          <h2 style={{ fontSize: 'clamp(56px, 8vw, 88px)', fontWeight: 800, background: 'linear-gradient(to right, #1a1a2e, #6C63FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'center', lineHeight: 1.1, marginBottom: '24px' }}>
            Find the conflict<br/>before it finds you.
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px', textAlign: 'center', marginBottom: '40px' }}>Load a contract. Run the agent. See where it breaks.</p>

          <button onClick={() => navigate('/app')} style={{
            background: 'var(--purple)', color: '#fff', padding: '16px 44px', borderRadius: '10px', fontWeight: 700, fontSize: '16px', border: 'none', cursor: 'pointer', animation: 'pulseGlow 2.5s infinite', transition: 'all 0.2s', marginBottom: '24px'
          }} onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.03)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
            Enter Clausr →
          </button>

          <div style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* Banner removed as requested */}
          </div>
        </div>
      </section>

    </div>
  );
}
