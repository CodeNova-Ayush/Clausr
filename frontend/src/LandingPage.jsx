import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showNav, setShowNav] = useState(false);
  const [heroMounted, setHeroMounted] = useState(false);

  useEffect(() => {
    setHeroMounted(true);
    const handleScroll = () => {
      setShowNav(window.scrollY > window.innerHeight * 0.8);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const sProblem = useReveal();
  const sHowItWorks = useReveal();
  const sEnvs = useReveal();
  const sTypes = useReveal();
  const sTraps = useReveal();
  const sGrader = useReveal();
  const sOracle = useReveal();
  const sLexMind = useReveal();
  const sDNA = useReveal();
  const sLeaderboard = useReveal();

  useEffect(() => {
    const bars = document.querySelectorAll('.dna-bar-track');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const fill = entry.target.querySelector('.dna-bar-fill');
          if (fill) fill.style.width = fill.getAttribute('data-target');
        }
      });
    }, { threshold: 0.5 });
    bars.forEach(b => observer.observe(b));
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ background: 'var(--brand-bg)', color: 'var(--brand-text)', width: '100%', overflowX: 'hidden' }}>
      
      {/* STICKY NAV */}
      <div className={`landing-nav ${showNav ? 'nav-visible' : ''}`} style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'rgba(7, 7, 15, 0.85)', backdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(30, 30, 53, 0.8)', height: '56px', padding: '0 40px',
        display: showNav ? 'flex' : 'none', alignItems: 'center', justifyContent: 'space-between',
        maxHeight: showNav ? '56px' : '0', opacity: showNav ? 1 : 0, transition: 'max-height 0.3s ease, opacity 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="20" height="22" viewBox="0 0 24 28" fill="none" stroke="var(--brand-purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 8px rgba(127,119,221,0.5))' }}>
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span style={{ fontSize: '16px', fontWeight: 900, color: 'white', letterSpacing: '-0.02em', marginLeft: '2px' }}>Clausr</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-ghost" onClick={() => scrollTo('problem')}>Problem</button>
          <button className="btn-ghost" onClick={() => scrollTo('how-it-works')}>How It Works</button>
          <button className="btn-ghost" onClick={() => scrollTo('environments')}>Environments</button>
          <button className="btn-ghost" onClick={() => scrollTo('grader')}>Grader</button>
          <button className="btn-ghost" onClick={() => scrollTo('contradiction-types')}>Features</button>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/app')}>Enter Clausr →</button>
      </div>

      {/* SECTION 1 - HERO */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '80px 24px 40px', position: 'relative', overflow: 'hidden'
      }}>
        {/* Layer 1 — Radial purple glow behind the logo and title */}
        <div style={{
          position: 'absolute', pointerEvents: 'none', inset: 0, zIndex: 0,
          background: 'radial-gradient(ellipse 70% 55% at 50% 38%, rgba(127,119,221,0.13) 0%, rgba(127,119,221,0.04) 45%, transparent 70%)'
        }} />
        {/* Layer 2 — Subtle noise texture overlay */}
        <div style={{
          position: 'absolute', pointerEvents: 'none', inset: 0, zIndex: 0,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'repeat', backgroundSize: '200px 200px', opacity: 0.4, mixBlendMode: 'overlay'
        }} />
        {/* Layer 3 — Very subtle grid lines */}
        <div style={{
          position: 'absolute', pointerEvents: 'none', inset: 0, zIndex: 0,
          backgroundImage: 'linear-gradient(rgba(127,119,221,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(127,119,221,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 70%)'
        }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', position: 'relative', zIndex: 1 }}>
          
          <div className={`hero-item ${heroMounted ? 'hero-visible' : ''}`} style={{
            animationDelay: '0s', display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(127,119,221,0.07)', border: '1px solid rgba(127,119,221,0.25)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: '22px', 
            padding: '7px 18px 7px 12px', boxShadow: '0 0 0 1px rgba(127,119,221,0.1)',
            fontSize: '12px', fontWeight: 500, color: 'rgba(168,159,240,0.9)', letterSpacing: '0.01em'
          }}>
            <div style={{ width: '7px', height: '7px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 0 0 rgba(34,197,94,0.4)', animation: 'dotPing 2s infinite' }} />
            Meta PyTorch OpenEnv Hackathon 2025
          </div>
          
          {/* Hexagon Logo */}
          <div className={`hero-item ${heroMounted ? 'hero-visible' : ''}`} style={{ position: 'relative', animationDelay: '0.1s', filter: 'drop-shadow(0 0 24px rgba(127,119,221,0.35)) drop-shadow(0 0 60px rgba(127,119,221,0.12))', animation: 'logoFloat 4s ease-in-out infinite' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(127,119,221,0.25) 0%, transparent 70%)', zIndex: -1, animation: 'glowPulse 3s ease-in-out infinite' }} />
            <svg width="48" height="54" viewBox="0 0 24 28" fill="none" stroke="var(--brand-purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>

          <h1 className={`hero-item ${heroMounted ? 'hero-visible' : ''}`} style={{ animationDelay: '0.2s', fontSize: 'clamp(60px, 10vw, 96px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.0, color: 'var(--brand-text)', textShadow: '0 0 80px rgba(127,119,221,0.2)', margin: 0 }}>
            Claus<span className="brand-r">r</span>
          </h1>

          <p className={`hero-item ${heroMounted ? 'hero-visible' : ''}`} style={{ animationDelay: '0.3s', fontSize: 'clamp(18px, 3vw, 26px)', fontWeight: 600, color: 'rgba(241,240,248,0.9)', letterSpacing: '-0.01em', maxWidth: '520px', lineHeight: 1.4, margin: 0 }}>
            Neutralize Contract Risks Before They Materialize.
          </p>

          <p className={`hero-item ${heroMounted ? 'hero-visible' : ''}`} style={{ animationDelay: '0.35s', fontSize: '15px', color: 'rgba(157,157,184,0.85)', maxWidth: '520px', lineHeight: 1.75, margin: 0 }}>
            AI agents that detect hidden contradictions in legal contracts — before they cost you millions.
          </p>

          <div className={`hero-item ${heroMounted ? 'hero-visible' : ''}`} style={{ 
            animationDelay: '0.45s', display: 'flex', borderRadius: '14px', overflow: 'hidden', 
            background: 'rgba(17,17,39,0.7)', backdropFilter: 'blur(12px) saturate(150%)', 
            WebkitBackdropFilter: 'blur(12px) saturate(150%)', border: '1px solid rgba(46,46,80,0.8)', 
            boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.3)', position: 'relative' 
          }}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(90deg, transparent, rgba(127,119,221,0.15), transparent)', animation: 'shimmer 3s infinite 4s' }} />
            
            <div style={{ padding: '14px 28px', textAlign: 'left', position: 'relative' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(168,159,240,1)' }}>3 Environments</div>
              <div style={{ fontSize: '10px', color: 'rgba(90,90,120,1)', marginTop: '2px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Detection · Execution · Negotiation</div>
            </div>
            <div style={{ width: '1px', background: 'rgba(46,46,80,0.8)' }} />
            <div style={{ padding: '14px 28px', textAlign: 'left', position: 'relative' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(168,159,240,1)' }}>5 Types</div>
              <div style={{ fontSize: '10px', color: 'rgba(90,90,120,1)', marginTop: '2px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Temporal · Scope · Party · Renewal · Definition</div>
            </div>
            <div style={{ width: '1px', background: 'rgba(46,46,80,0.8)' }} />
            <div style={{ padding: '14px 28px', textAlign: 'left', position: 'relative' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(168,159,240,1)' }}>0.85 Score</div>
              <div style={{ fontSize: '10px', color: 'rgba(90,90,120,1)', marginTop: '2px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Mistral-small baseline mean</div>
            </div>
          </div>

          <button className={`enter-btn hero-item ${heroMounted ? 'hero-visible' : ''}`} onClick={() => navigate('/app')} style={{ animationDelay: '0.55s' }}>
            Enter Clausr <span>→</span>
          </button>

          <div className={`hero-item ${heroMounted ? 'hero-visible' : ''}`} style={{ animationDelay: '0.6s', fontSize: '12px', color: 'var(--brand-text-3)', marginTop: '8px' }}>
            Powered by OpenEnv · Meta PyTorch · Hugging Face
          </div>
        </div>

        <div className={`hero-item ${heroMounted ? 'hero-visible' : ''}`} style={{ animationDelay: '0.8s', position: 'absolute', bottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '1px', height: '28px', background: 'linear-gradient(to bottom, transparent, rgba(90,90,120,0.5))', animation: 'lineGrow 0.8s ease 1s forwards', transformOrigin: 'top', transform: 'scaleY(0)', opacity: 0 }} />
          <svg style={{ animation: 'scrollBounce 2s infinite ease-in-out' }} width="20" height="12" viewBox="0 0 20 12" fill="none" stroke="rgba(90,90,120,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 2 L10 10 L18 2" />
          </svg>
        </div>
      </section>

      {/* SECTION 2 - PROBLEM */}
      <section id="problem" ref={sProblem} className="yc-reveal" style={{ background: 'var(--brand-surface)', padding: '120px 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', flexWrap: 'wrap', gap: '80px', alignItems: 'center' }}>
          <div style={{ flex: '1 1 45%' }}>
            <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 500, color: 'var(--brand-purple)', letterSpacing: '0.1em', marginBottom: '16px' }}>The Problem</div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1.2, maxWidth: '480px', color: 'var(--brand-text)', margin: '0 0 20px 0', letterSpacing: '-0.03em' }}>
              No legal team reads 60 clauses with cross-referencing in mind.
            </h2>
            <p style={{ fontSize: '16px', lineHeight: 1.75, color: 'var(--brand-text-2)', maxWidth: '460px', margin: 0 }}>
              Every enterprise contract has hidden contradictions. A clause promising payment in 30 days and another triggering penalties after 45 days create dangerous ambiguity that neither side notices until a dispute costs millions. Clausr is the first system that trains AI agents to find these conflicts — automatically, deterministically, and in real time.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '3px', height: '36px', background: 'var(--brand-green)', borderRadius: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--brand-text)' }}>$860B</div>
                <div style={{ fontSize: '13px', color: 'var(--brand-text-3)', marginLeft: '4px' }}>global annual cost of contract disputes</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '3px', height: '36px', background: 'var(--brand-amber)', borderRadius: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--brand-text)' }}>9%</div>
                <div style={{ fontSize: '13px', color: 'var(--brand-text-3)', marginLeft: '4px' }}>revenue lost per year to poor contract management</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '3px', height: '36px', background: 'var(--brand-red)', borderRadius: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--brand-text)' }}>60%</div>
                <div style={{ fontSize: '13px', color: 'var(--brand-text-3)', marginLeft: '4px' }}>of all disputes caused by internal contradictions</div>
              </div>
            </div>
          </div>
          
          <div style={{ flex: '1 1 45%' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '240px' }}>
              <div style={{ width: 'calc(50% - 28px)', background: 'var(--brand-card)', border: '1px solid var(--brand-border)', borderLeft: '3px solid var(--brand-amber)', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 0 0 1px rgba(245,158,11,0.1), 0 8px 32px rgba(0,0,0,0.3)', zIndex: 1 }}>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--brand-amber)', background: 'rgba(245,158,11,0.08)', padding: '2px 8px', borderRadius: '4px' }}>CLAUSE_03</span>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-text)', marginTop: '8px' }}>Confidentiality Period</div>
                <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--brand-text-2)', marginTop: '6px' }}>
                  shall maintain confidentiality for <span style={{ fontWeight: 800, color: 'var(--brand-amber)' }}>2 years</span> from the date of disclosure.
                </div>
              </div>
              
              <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: '40px', height: '40px', borderRadius: '50%', background: 'var(--brand-red)', color: 'white', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 3px var(--brand-bg), 0 0 20px rgba(239,68,68,0.4)', zIndex: 10 }}>VS</div>
              
              <div style={{ width: 'calc(50% - 28px)', background: 'var(--brand-card)', border: '1px solid var(--brand-border)', borderLeft: '3px solid var(--brand-amber)', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 0 0 1px rgba(245,158,11,0.1), 0 8px 32px rgba(0,0,0,0.3)', zIndex: 1 }}>
                <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--brand-amber)', background: 'rgba(245,158,11,0.08)', padding: '2px 8px', borderRadius: '4px' }}>CLAUSE_17</span>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-text)', marginTop: '8px' }}>Obligations Upon Termination</div>
                <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--brand-text-2)', marginTop: '6px' }}>
                  survival of obligations for <span style={{ fontWeight: 800, color: 'var(--brand-amber)' }}>36 months</span> after termination.
                </div>
              </div>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--brand-red)' }} />
              <div style={{ fontSize: '12px', color: 'var(--brand-red)', fontStyle: 'italic' }}>Conflict detected: 24 months ≠ 36 months — same obligation, different duration</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 - HOW IT WORKS */}
      <section id="how-it-works" ref={sHowItWorks} className="yc-reveal" style={{ background: 'var(--brand-bg)', padding: '120px 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: '560px', margin: '0 auto 60px' }}>
            <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 500, color: 'var(--brand-purple)', letterSpacing: '0.1em', marginBottom: '16px' }}>Process</div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--brand-text)', margin: '0 0 12px 0' }}>How Clausr Works</h2>
            <p style={{ fontSize: '16px', color: 'var(--brand-text-2)', margin: 0 }}>Three steps. One score. Fully deterministic.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', alignItems: 'center', gap: '16px' }}>
            <div className="yc-card" style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '48px', fontWeight: 800, color: 'var(--brand-purple)', lineHeight: 1 }}>1</div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--brand-text)', marginTop: '12px', letterSpacing: '-0.03em' }}>Contract Loaded</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--brand-text-2)', marginTop: '8px' }}>The environment loads a pre-generated business contract with planted contradictions. The agent receives the full text, structured clause list, and the exact contradiction count — but not which ones.</p>
            </div>
            
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-border-hi)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            
            <div className="yc-card" style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '48px', fontWeight: 800, color: 'var(--brand-purple)', lineHeight: 1 }}>2</div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--brand-text)', marginTop: '12px', letterSpacing: '-0.03em' }}>Agent Analyzes</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--brand-text-2)', marginTop: '8px' }}>An LLM reads all clauses and outputs (clause_a_id, clause_b_id) pairs with explanations. The agent reasons through the full document to find the planted conflicts.</p>
            </div>
            
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-border-hi)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            
            <div className="yc-card" style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '48px', fontWeight: 800, color: 'var(--brand-purple)', lineHeight: 1 }}>3</div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--brand-text)', marginTop: '12px', letterSpacing: '-0.03em' }}>Score Returned</h3>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--brand-text-2)', marginTop: '8px' }}>The grader compares clause ID pairs against ground truth using pure set intersection. No LLM. No string matching. Score = tp/total minus 0.1 times false positives. 100% deterministic.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 - ENVIRONMENTS */}
      <section id="environments" ref={sEnvs} className="yc-reveal" style={{ background: 'var(--brand-surface)', padding: '120px 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 500, color: 'var(--brand-purple)', letterSpacing: '0.1em', marginBottom: '16px' }}>Architecture</div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--brand-text)', margin: '0 0 12px 0' }}>Three Training Environments</h2>
            <p style={{ fontSize: '16px', color: 'var(--brand-text-2)', margin: '0 auto', maxWidth: '600px' }}>Each environment trains a different legal reasoning skill — from static analysis to real-time negotiation monitoring.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '20px' }}>
            <div className="yc-card" style={{ flex: 1, padding: '28px 32px' }}>
              <div style={{ height: '3px', background: 'var(--brand-green)', borderRadius: '2px 2px 0 0', margin: '-28px -32px 24px', width: 'calc(100% + 64px)' }} />
              <span style={{ display: 'inline-block', background: 'rgba(34,197,94,0.1)', color: 'var(--brand-green)', border: '1px solid rgba(34,197,94,0.2)', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', marginBottom: '12px' }}>ENV 1</span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>Contradiction Detection</h3>
              <div style={{ fontSize: '12px', color: 'var(--brand-text-3)', marginTop: '2px' }}>Static document analysis</div>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--brand-text-2)', marginTop: '16px' }}>The foundational environment. Agent reads a complete contract and identifies all contradicting clause pairs across five contradiction types. The Hard task includes three near-contradiction traps that penalize overconfident agents with score deductions.</p>
              <div style={{ fontSize: '12px', color: 'var(--brand-text-3)', marginTop: '12px' }}>8–60 clauses · 1–8 contradictions · 3 task levels</div>
              <div style={{ fontSize: '12px', color: 'var(--brand-green)', fontWeight: 600, marginTop: '4px' }}>Mistral baseline: 0.85 mean</div>
              <pre style={{ background: 'var(--brand-bg)', borderLeft: '2px solid var(--brand-green)', borderRadius: '6px', padding: '10px 14px', marginTop: '16px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--brand-text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
{`{ clause_a_id: "clause_03",
  clause_b_id: "clause_07",
  confidence: 0.95 }`}
              </pre>
            </div>
            
            <div className="yc-card" style={{ flex: 1, padding: '28px 32px' }}>
              <div style={{ height: '3px', background: 'var(--brand-amber)', borderRadius: '2px 2px 0 0', margin: '-28px -32px 24px', width: 'calc(100% + 64px)' }} />
              <span style={{ display: 'inline-block', background: 'rgba(245,158,11,0.1)', color: 'var(--brand-amber)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', marginBottom: '12px' }}>ENV 2</span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>The Oracle</h3>
              <div style={{ fontSize: '12px', color: 'var(--brand-text-3)', marginTop: '2px' }}>Contract execution simulation</div>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--brand-text-2)', marginTop: '16px' }}>The world's first contract execution simulator. The agent traces realistic business scenarios through the contract and identifies the exact employee action that causes two contradicting clauses to fire simultaneously — crashing the contract into an undefined legal state.</p>
              <div style={{ fontSize: '12px', color: 'var(--brand-text-3)', marginTop: '12px' }}>3–14 scenarios · Multi-agent orchestration</div>
              <div style={{ fontSize: '12px', color: 'var(--brand-amber)', fontWeight: 600, marginTop: '4px' }}>Novel — no prior benchmark</div>
              <pre style={{ background: 'var(--brand-bg)', borderLeft: '2px solid var(--brand-amber)', borderRadius: '6px', padding: '10px 14px', marginTop: '16px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--brand-text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
{`{ scenario: "Invoice sent Day 32",
  crashes: true,
  crash_pair: ["clause_04","clause_14"] }`}
              </pre>
            </div>

            <div className="yc-card" style={{ flex: 1, padding: '28px 32px' }}>
              <div style={{ height: '3px', background: 'var(--brand-purple)', borderRadius: '2px 2px 0 0', margin: '-28px -32px 24px', width: 'calc(100% + 64px)' }} />
              <span style={{ display: 'inline-block', background: 'rgba(127,119,221,0.1)', color: 'var(--brand-purple)', border: '1px solid rgba(127,119,221,0.2)', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', marginBottom: '12px' }}>ENV 3</span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>LexMind</h3>
              <div style={{ fontSize: '12px', color: 'var(--brand-text-3)', marginTop: '2px' }}>Negotiation co-pilot</div>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--brand-text-2)', marginTop: '16px' }}>The first incremental observation environment in the OpenEnv catalog. As clauses arrive one by one across negotiation rounds, the agent must detect the exact moment a new clause introduces a contradiction with any previously accepted clause.</p>
              <div style={{ fontSize: '12px', color: 'var(--brand-text-3)', marginTop: '12px' }}>8–40 events · 1–3 rounds · Institutional memory</div>
              <div style={{ fontSize: '12px', color: 'var(--brand-purple)', fontWeight: 600, marginTop: '4px' }}>First of its kind in OpenEnv</div>
              <pre style={{ background: 'var(--brand-bg)', borderLeft: '2px solid var(--brand-purple)', borderRadius: '6px', padding: '10px 14px', marginTop: '16px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--brand-text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
{`{ event_id: "event_07",
  introduces_contradiction: true,
  contradicts: "clause_03" }`}
              </pre>
            </div>
          </div>
        </div>
      </section>
      {/* SECTION 5 - CONTRADICTION TYPES */}
      <section id="contradiction-types" ref={sTypes} className="yc-reveal" style={{ background: 'var(--brand-bg)', padding: '120px 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ marginBottom: '60px' }}>
            <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 500, color: 'var(--brand-purple)', letterSpacing: '0.1em', marginBottom: '16px' }}>Taxonomy</div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--brand-text)', margin: 0 }}>5 Contradiction Types</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { id: 1, name: 'Numeric / Temporal', desc: 'Same obligation, different numbers', color: 'var(--brand-green)', code: 'clause_03: "...confidentiality for 2 years..."\nclause_17: "...obligations for 36 months..."\n            ↑ 24 months ≠ 36 months' },
              { id: 2, name: 'Scope Conflict', desc: 'One clause grants a right, another removes it', color: 'var(--brand-blue)', code: 'clause_06: "...license for any commercial use including resale"\nclause_11: "...resale is expressly prohibited"' },
              { id: 3, name: 'Party Obligation', desc: 'Same duty, different parties', color: 'var(--brand-amber)', code: 'clause_08: "Vendor shall maintain daily backups"\nclause_13: "Customer solely responsible for backups"' },
              { id: 4, name: 'Termination / Renewal', desc: 'Notice windows that logically overlap', color: 'var(--brand-orange)', code: 'clause_12: "terminate with 30 days notice"\nclause_15: "cancel 90 days before auto-renewal"' },
              { id: 5, name: 'Definition Conflict', desc: 'Same term, different meanings — Hard task only', color: 'var(--brand-red)', code: 'clause_02: "Business Day = Monday–Friday"\nclause_16: "...respond within 1 Business Day including Saturdays"' }
            ].map((t, idx) => (
              <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '48px', alignItems: 'center', padding: '28px 0', borderBottom: idx === 4 ? 'none' : '1px solid var(--brand-border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.color, marginTop: '6px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--brand-text-3)', fontWeight: 500 }}>TYPE {t.id}</div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--brand-text)', marginTop: '2px', letterSpacing: '-0.03em' }}>{t.name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--brand-text-2)', marginTop: '4px', lineHeight: 1.5 }}>{t.desc}</div>
                  </div>
                </div>
                <div style={{ background: 'var(--brand-card)', borderLeft: `3px solid ${t.color}`, borderRadius: '8px', padding: '14px 18px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--brand-text-2)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {t.code}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 - TRAPS */}
      <section id="traps" ref={sTraps} className="yc-reveal" style={{ background: 'var(--brand-surface)', padding: '120px 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 500, color: 'var(--brand-purple)', letterSpacing: '0.1em', marginBottom: '16px' }}>Advanced Design</div>
          <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--brand-text)', margin: '0 0 12px 0' }}>Near-Contradiction Traps</h2>
          <p style={{ fontSize: '16px', color: 'var(--brand-text-2)', margin: '0 0 60px 0', maxWidth: '720px', lineHeight: 1.6 }}>The Hard task plants clause pairs that look contradictory but are legally consistent. Flagging a trap deducts 0.1 from the score. This forces the agent to reason precisely rather than guess.</p>
          
          <div style={{ display: 'flex', gap: '20px' }}>
            {[
              { id: 1, title: 'Different Contexts', body: '30 days notice for termination for convenience. 5 days for termination for cause. Two clauses, two numbers, one seems like a conflict — but each applies to a completely different scenario. A precise agent reads the context, not just the number.', ex: '[for convenience: 30 days] vs [for cause: 5 days] → Not a contradiction' },
              { id: 2, title: 'Explicit Override', body: "'Notwithstanding clause 8, enterprise clients may request Net 90 terms.' The word notwithstanding is a legal signal — this clause intentionally supersedes another. Agents that miss it get penalized for flagging an intentional hierarchy as a conflict.", ex: 'clause_08: "Net 45 days"\nclause_22: "Notwithstanding clause_08, Net 90 approved in writing" → Intentional override' },
              { id: 3, title: 'Complementary Scope', body: 'License valid in the Territory. Resale rights apply outside the Territory. Two clauses covering different geographic domains — together they cover the entire world with no gap. Partners, not adversaries.', ex: 'clause_06: "License valid within Territory"\nclause_19: "Resale rights outside Territory" → Complementary' }
            ].map(t => (
              <div key={t.id} className="yc-card" style={{ flex: 1, padding: '28px 32px', background: 'linear-gradient(to bottom right, var(--brand-card), rgba(59,130,246,0.03))', border: '1px solid rgba(59,130,246,0.15)' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.15)'}>
                <span style={{ display: 'inline-block', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', marginBottom: '16px' }}>TRAP {t.id}</span>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>{t.title}</h3>
                <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--brand-text-2)', marginTop: '8px' }}>{t.body}</p>
                <div style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-border)', borderRadius: '8px', padding: '12px 14px', marginTop: '16px', fontFamily: 'monospace', fontSize: '11px', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--brand-text-2)' }}>{t.ex}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7 - GRADER */}
      <section id="grader" ref={sGrader} className="yc-reveal" style={{ background: 'var(--brand-bg)', padding: '120px 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 500, color: 'var(--brand-purple)', letterSpacing: '0.1em', marginBottom: '16px' }}>Scoring</div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--brand-text)', margin: '0 0 12px 0' }}>Bulletproof Deterministic Grader</h2>
            <p style={{ fontSize: '16px', color: 'var(--brand-text-2)', margin: '0 auto', maxWidth: '600px', lineHeight: 1.6 }}>No LLM. No fuzzy matching. Pure set math. Results are identical on every machine, every run.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '60px', alignItems: 'flex-start' }}>
            <div style={{ flex: '0 0 45%' }}>
              <div style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-purple-lo)', borderRadius: '12px', padding: '24px 28px', fontFamily: 'monospace', fontSize: '14px', lineHeight: 2, color: 'var(--brand-purple-hi)', whiteSpace: 'pre-wrap' }}>
                {`score = (true_positives / total)\n      − (0.1 × false_positives)\nscore = clamp(score, 0.0, 1.0)`}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                {[
                  'Sorted (clause_a_id, clause_b_id) tuples — order irrelevant',
                  'Set intersection on ground truth — no string matching',
                  'Partial credit supported — 3/4 correct scores 0.75',
                  'False positive penalty calibrated to always reward precision'
                ].map((txt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '6px', height: '6px', background: 'var(--brand-purple)', borderRadius: '2px', flexShrink: 0, marginTop: '6px' }} />
                    <div style={{ fontSize: '13px', color: 'var(--brand-text-2)', lineHeight: 1.5 }}>{txt}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ flex: '1 1 auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--brand-purple)', color: 'white', fontWeight: 700, letterSpacing: '0.05em' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Scenario</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>TP</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>FP</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { s: 'Found all 4 — zero false positives', tp: 4, fp: 0, sc: '1.00', color: 'var(--brand-green)' },
                    { s: 'Found 3 of 4 — zero false positives', tp: 3, fp: 0, sc: '0.75', color: 'var(--brand-green)' },
                    { s: 'Found 3 of 4 — flagged 2 traps', tp: 3, fp: 2, sc: '0.55', color: 'var(--brand-amber)' },
                    { s: 'Found 2 of 4 — flagged 1 trap', tp: 2, fp: 1, sc: '0.40', color: 'var(--brand-amber)' },
                    { s: 'Found nothing', tp: 0, fp: 0, sc: '0.00', color: 'var(--brand-red)' }
                  ].map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'var(--brand-card)' : 'var(--brand-surface)', borderBottom: '1px solid var(--brand-border)' }}>
                      <td style={{ padding: '10px 14px', color: 'var(--brand-text)' }}>{row.s}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--brand-text-2)' }}>{row.tp}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--brand-text-2)' }}>{row.fp}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: row.color }}>{row.sc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontStyle: 'italic', color: 'var(--brand-text-3)', fontSize: '12px', marginTop: '12px', lineHeight: 1.5 }}>
                The 0.1 false positive penalty ensures guessing is always better than silence — but flooding the output with every clause pair scores near zero.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8 - ORACLE */}
      <section id="oracle" ref={sOracle} className="yc-reveal" style={{ background: 'var(--brand-surface)', padding: '120px 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '72px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 50%' }}>
            <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 500, color: 'var(--brand-amber)', letterSpacing: '0.1em', marginBottom: '16px' }}>Environment 2</div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--brand-text)', margin: '0 0 12px 0' }}>The Oracle</h2>
            <p style={{ fontSize: '16px', color: 'var(--brand-text-2)', margin: '0 0 20px 0' }}>The world's first contract execution simulator</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px', lineHeight: 1.7, color: 'var(--brand-text-3)' }}>
              <p style={{ margin: 0 }}>Every existing legal AI tool reads contracts. The Oracle executes them.</p>
              <p style={{ margin: 0 }}>It generates realistic business scenarios — the actual employee actions that test a contract in the real world. For each scenario it traces which clauses activate in sequence, and identifies the exact moment two contradicting clauses fire simultaneously.</p>
              <p style={{ margin: 0 }}>That moment is the crash. The contract enters an undefined legal state. The company loses in court. The Oracle finds it before it happens.</p>
              <p style={{ margin: 0 }}>This is multi-agent orchestration inside a single OpenEnv episode — a Scenario Generator alongside an Execution Tracer. The first such design in the OpenEnv catalog.</p>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '28px' }}>
              {['Multi-agent orchestration', 'Realistic business scenarios', 'Crash point identification'].map(pill => (
                <div key={pill} style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border-hi)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 500, color: 'var(--brand-text-2)' }}>{pill}</div>
              ))}
            </div>
          </div>
          
          <div style={{ flex: '1 1 35%' }}>
            <div style={{ background: 'var(--brand-card)', border: '1px solid var(--brand-border)', borderRadius: '16px', padding: '24px', maxWidth: '360px', width: '100%' }}>
              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--brand-text-3)', letterSpacing: '0.1em', marginBottom: '16px' }}>SCENARIO: Invoice sent on Day 32</div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: '8px', padding: '10px 14px', borderLeft: '2px solid var(--brand-text-3)' }}>
                  <div style={{ fontSize: '9px', color: 'var(--brand-text-3)' }}>Employee action</div>
                  <div style={{ fontSize: '13px', color: 'var(--brand-text)' }}>Customer submits invoice — Day 32</div>
                </div>
                
                <div style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '10px' }}>
                  <div style={{ width: '1px', height: '16px', background: 'var(--brand-border)' }} />
                  <div style={{ fontSize: '10px', color: 'var(--brand-border)', lineHeight: 0, marginTop: '-2px' }}>▼</div>
                </div>
                
                <div style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: '8px', padding: '10px 14px', borderLeft: '2px solid var(--brand-amber)' }}>
                  <div style={{ fontSize: '9px', color: 'var(--brand-text-3)' }}>Clause activated</div>
                  <div style={{ fontSize: '13px', color: 'var(--brand-text)' }}><span style={{color: 'var(--brand-amber)'}}>CLAUSE_04</span> fires — Net 30 payment due</div>
                </div>
                
                <div style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '10px' }}>
                  <div style={{ width: '1px', height: '16px', background: 'var(--brand-border)' }} />
                  <div style={{ fontSize: '10px', color: 'var(--brand-border)', lineHeight: 0, marginTop: '-2px' }}>▼</div>
                </div>
                
                <div style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderRadius: '8px', padding: '10px 14px', borderLeft: '2px solid var(--brand-amber)' }}>
                  <div style={{ fontSize: '9px', color: 'var(--brand-text-3)' }}>Clause activated</div>
                  <div style={{ fontSize: '13px', color: 'var(--brand-text)' }}><span style={{color: 'var(--brand-amber)'}}>CLAUSE_14</span> fires — 45-day late payment trigger</div>
                </div>
                
                <div style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '10px' }}>
                  <div style={{ width: '1px', height: '16px', background: 'var(--brand-border)' }} />
                  <div style={{ fontSize: '10px', color: 'var(--brand-border)', lineHeight: 0, marginTop: '-2px' }}>▼</div>
                </div>
                
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1.5px solid var(--brand-red)', borderRadius: '10px', padding: '16px', animation: 'crashPulse 1.2s infinite alternate' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-red)', letterSpacing: '0.1em' }}>EXECUTION CRASH</div>
                  <div style={{ fontSize: '12px', color: 'var(--brand-text-2)', marginTop: '6px', lineHeight: 1.6 }}>Clause 04 demands payment at Day 30. Clause 14 has not yet triggered. Both clauses are simultaneously active with incompatible demands on the same obligation.</div>
                  <div style={{ fontSize: '11px', color: 'var(--brand-text-3)', marginTop: '10px' }}>Financial exposure: <span style={{color: 'var(--brand-red)'}}>Disputed invoice — payment obligation void</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* SECTION 9 - LEXMIND */}
      <section id="lexmind" ref={sLexMind} className="yc-reveal" style={{ background: 'var(--brand-bg)', padding: '120px 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '72px', flexWrap: 'wrap-reverse', alignItems: 'center' }}>
          <div style={{ flex: '1 1 35%' }}>
            <div style={{ background: 'var(--brand-card)', border: '1px solid var(--brand-border)', borderRadius: '16px', padding: '24px', maxWidth: '360px', width: '100%' }}>
              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--brand-text-3)', letterSpacing: '0.1em', marginBottom: '16px' }}>NEGOTIATION FEED</div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'inline-block', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', alignSelf: 'flex-start' }}>Round 1 · Drafter</div>
                <div style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderLeft: '3px solid var(--brand-green)', borderRadius: '8px', padding: '10px 14px', marginTop: '6px' }}>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--brand-text-3)' }}>CLAUSE_01</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-text)' }}>Parties</div>
                  <div style={{ fontSize: '12px', color: 'var(--brand-text-2)', marginTop: '4px' }}>This Agreement is entered into by...</div>
                  <div style={{ fontSize: '11px', color: 'var(--brand-green)', marginTop: '6px' }}>Clean — no contradiction</div>
                </div>
                
                <div style={{ height: '20px', marginLeft: '12px', borderLeft: '1px dashed var(--brand-border)' }} />
                
                <div style={{ display: 'inline-block', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', alignSelf: 'flex-start' }}>Round 1 · Drafter</div>
                <div style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border)', borderLeft: '3px solid var(--brand-green)', borderRadius: '8px', padding: '10px 14px', marginTop: '6px' }}>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--brand-text-3)' }}>CLAUSE_03</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-text)' }}>Confidentiality Period</div>
                  <div style={{ fontSize: '11px', color: 'var(--brand-green)', marginTop: '6px' }}>Clean — no contradiction</div>
                </div>
                
                <div style={{ height: '20px', marginLeft: '12px', borderLeft: '1px dashed var(--brand-border)' }} />
                
                <div style={{ display: 'inline-block', background: 'rgba(245,158,11,0.1)', color: 'var(--brand-amber)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', alignSelf: 'flex-start' }}>Round 2 · Counterparty</div>
                <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid var(--brand-red)', borderLeft: '3px solid var(--brand-red)', borderRadius: '8px', padding: '10px 14px', marginTop: '6px', animation: 'clausePulse 1.5s infinite alternate' }}>
                  <div style={{ display: 'inline-block', background: 'rgba(239,68,68,0.1)', color: 'var(--brand-red)', fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px', marginBottom: '8px' }}>CONTRADICTION INTRODUCED</div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--brand-text-3)' }}>CLAUSE_17</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-text)' }}>Obligations Upon Termination</div>
                  <div style={{ fontSize: '11px', color: 'var(--brand-text-3)', marginTop: '4px' }}>Conflicts with CLAUSE_03 — 36 months vs 2 years</div>
                  <div style={{ fontSize: '11px', color: 'var(--brand-red)', marginTop: '6px' }}>Fired at event 3 of 8</div>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ flex: '1 1 50%' }}>
            <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 500, color: 'var(--brand-purple)', letterSpacing: '0.1em', marginBottom: '16px' }}>Environment 3</div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--brand-text)', margin: '0 0 12px 0' }}>LexMind</h2>
            <p style={{ fontSize: '16px', color: 'var(--brand-text-2)', margin: '0 0 20px 0' }}>The first incremental observation environment in OpenEnv</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px', lineHeight: 1.7, color: 'var(--brand-text-3)' }}>
              <p style={{ margin: 0 }}>Every other OpenEnv environment gives the agent a complete document. LexMind gives the agent a document that grows.</p>
              <p style={{ margin: 0 }}>As clauses arrive one by one — in the order they were negotiated across multiple rounds — the agent must determine whether each new clause introduces a contradiction with any clause already accepted into the draft.</p>
              <p style={{ margin: 0 }}>The moment a contradiction enters the negotiation, LexMind fires. Not after the document is finished. During its creation. This is legal risk prevention, not analysis.</p>
              <p style={{ margin: 0 }}>The institutional memory layer stores contradiction patterns across sessions. The more contracts analyzed, the richer the warning system becomes.</p>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '28px' }}>
              {['Clause-by-clause monitoring', 'Multi-round negotiation', 'Institutional memory'].map(pill => (
                <div key={pill} style={{ background: 'var(--brand-surface)', border: '1px solid var(--brand-border-hi)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 500, color: 'var(--brand-text-2)' }}>{pill}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10 - DNA */}
      <section id="dna" ref={sDNA} className="yc-reveal" style={{ background: 'var(--brand-surface)', padding: '120px 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '72px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 50%' }}>
            <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 500, color: 'var(--brand-purple)', letterSpacing: '0.1em', marginBottom: '16px' }}>Pre-Agent Intelligence</div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--brand-text)', margin: '0 0 12px 0' }}>Contract DNA Fingerprint</h2>
            <p style={{ fontSize: '16px', color: 'var(--brand-text-2)', margin: '0 0 20px 0' }}>Linguistic risk analysis before the agent runs a single inference call.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px', lineHeight: 1.7, color: 'var(--brand-text-3)' }}>
              <p style={{ margin: 0 }}>Before the agent analyzes a single clause, Clausr scans the full contract text for linguistic patterns and generates a risk profile across all five contradiction types.</p>
              <p style={{ margin: 0 }}>Numbers appearing in multiple clauses suggest Type 1 risk. Grant language alongside restriction language suggests Type 2. Multiple party names with obligation verbs suggests Type 3. Termination and renewal language together suggests Type 4. Defined terms with inconsistent usage suggests Type 5.</p>
              <p style={{ margin: 0 }}>The Contract DNA Fingerprint gives an instant visual of where the agent should focus — and warns before you spend the LLM call.</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '28px' }}>
              {[
                { name: 'Numeric', color: 'var(--brand-green)', val: '85%' },
                { name: 'Scope', color: 'var(--brand-blue)', val: '70%' },
                { name: 'Party', color: 'var(--brand-amber)', val: '60%' },
                { name: 'Renewal', color: 'var(--brand-orange)', val: '75%' },
                { name: 'Definition', color: 'var(--brand-red)', val: '40%' }
              ].map(bar => (
                <div key={bar.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ minWidth: '80px', fontSize: '12px', color: 'var(--brand-text-2)' }}>{bar.name}</div>
                  <div className="dna-bar-track" style={{ flex: 1, height: '5px', background: 'var(--brand-border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div className="dna-bar-fill" data-target={bar.val} style={{ height: '100%', background: bar.color, borderRadius: '3px', width: '0', transition: 'width 0.8s ease' }} />
                  </div>
                  <div style={{ width: '40px', fontSize: '12px', color: 'var(--brand-text-3)', textAlign: 'right' }}>{bar.val}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ flex: '1 1 35%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--brand-card)', border: '1px solid var(--brand-border)', borderRadius: '16px', padding: '24px', textAlign: 'center', width: '100%', maxWidth: '360px' }}>
              <svg viewBox="0 0 300 280" width="100%" style={{ overflow: 'visible' }}>
                <polygon points="150,40 245.1,109.1 208.8,220.9 91.2,220.9 54.9,109.1" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <polygon points="150,65 221.3,116.8 194.1,200.7 105.9,200.7 78.7,116.8" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <polygon points="150,90 197.6,124.6 179.4,180.5 120.6,180.5 102.4,124.6" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <polygon points="150,115 173.8,132.3 164.7,160.2 135.3,160.2 126.2,132.3" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                
                <line x1="150" y1="140" x2="150" y2="40" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <line x1="150" y1="140" x2="245.1" y2="109.1" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <line x1="150" y1="140" x2="208.8" y2="220.9" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <line x1="150" y1="140" x2="91.2" y2="220.9" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <line x1="150" y1="140" x2="54.9" y2="109.1" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                
                <polygon points="150,55 216.57,118.37 185.26,188.54 105.92,200.67 111.96,127.64" fill="rgba(127,119,221,0.18)" stroke="rgba(127,119,221,0.8)" strokeWidth="2" strokeLinejoin="round" />
                
                <circle cx="150" cy="55" r="5" fill="var(--brand-green)" stroke="var(--brand-card)" strokeWidth="2" />
                <circle cx="216.57" cy="118.37" r="5" fill="var(--brand-blue)" stroke="var(--brand-card)" strokeWidth="2" />
                <circle cx="185.26" cy="188.54" r="5" fill="var(--brand-amber)" stroke="var(--brand-card)" strokeWidth="2" />
                <circle cx="105.92" cy="200.67" r="5" fill="var(--brand-orange)" stroke="var(--brand-card)" strokeWidth="2" />
                <circle cx="111.96" cy="127.64" r="5" fill="var(--brand-red)" stroke="var(--brand-card)" strokeWidth="2" />
                
                <text x="150" y="25" fontSize="10" fill="var(--brand-text-2)" textAnchor="middle">Numeric</text>
                <text x="150" y="38" fontSize="11" fontWeight="700" fill="var(--brand-green)" textAnchor="middle">85%</text>
                
                <text x="260" y="105" fontSize="10" fill="var(--brand-text-2)" textAnchor="middle">Scope</text>
                <text x="260" y="118" fontSize="11" fontWeight="700" fill="var(--brand-blue)" textAnchor="middle">70%</text>
                
                <text x="225" y="240" fontSize="10" fill="var(--brand-text-2)" textAnchor="middle">Party</text>
                <text x="225" y="253" fontSize="11" fontWeight="700" fill="var(--brand-amber)" textAnchor="middle">60%</text>
                
                <text x="75" y="240" fontSize="10" fill="var(--brand-text-2)" textAnchor="middle">Renewal</text>
                <text x="75" y="253" fontSize="11" fontWeight="700" fill="var(--brand-orange)" textAnchor="middle">75%</text>
                
                <text x="40" y="105" fontSize="10" fill="var(--brand-text-2)" textAnchor="middle">Definition</text>
                <text x="40" y="118" fontSize="11" fontWeight="700" fill="var(--brand-red)" textAnchor="middle">40%</text>
              </svg>
              
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-red)', marginTop: '8px' }}>Overall Risk: HIGH (73%)</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 11 - LEADERBOARD */}
      <section id="leaderboard" ref={sLeaderboard} className="yc-reveal" style={{ background: 'var(--brand-bg)', padding: '120px 0' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 500, color: 'var(--brand-purple)', letterSpacing: '0.1em', marginBottom: '16px' }}>Community</div>
          <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--brand-text)', margin: '0 0 12px 0' }}>Built for Competition</h2>
          <p style={{ fontSize: '16px', color: 'var(--brand-text-2)', margin: '0 auto', maxWidth: '600px' }}>Every run is scored, ranked, and remembered across sessions.</p>
          
          <div style={{ width: '100%', border: '1px solid var(--brand-border)', borderRadius: '14px', overflow: 'hidden', fontSize: '13px', marginTop: '40px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--brand-purple)', color: 'white', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 20px' }}>#</th>
                  <th style={{ padding: '12px 20px' }}>Name</th>
                  <th style={{ padding: '12px 20px' }}>Task</th>
                  <th style={{ padding: '12px 20px' }}>Score</th>
                  <th style={{ padding: '12px 20px' }}>Model</th>
                  <th style={{ padding: '12px 20px' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { r: '1', n: 'Alex K.', t: 'Hard', tc: 'var(--brand-red)', s: '0.88', sc: 'var(--brand-green)', m: 'claude-sonnet', time: '2h ago', rc: '#f59e0b', i: '🥇' },
                  { r: '2', n: 'Priya M.', t: 'Hard', tc: 'var(--brand-red)', s: '0.81', sc: 'var(--brand-green)', m: 'gpt-4o', time: '3h ago', rc: '#94a3b8', i: '🥈' },
                  { r: '3', n: 'Jordan T.', t: 'Medium', tc: 'var(--brand-amber)', s: '1.00', sc: 'var(--brand-green)', m: 'claude-haiku', time: '5h ago', rc: '#cd7f32', i: '🥉' },
                  { r: '4', n: 'Anonymous', t: 'Easy', tc: 'var(--brand-green)', s: '1.00', sc: 'var(--brand-green)', m: 'mistral-small', time: '1d ago', rc: 'var(--brand-text)', i: '' },
                  { r: '5', n: 'Wei L.', t: 'Hard', tc: 'var(--brand-red)', s: '0.55', sc: 'var(--brand-amber)', m: 'claude-haiku', time: '1d ago', rc: 'var(--brand-text)', i: '' },
                ].map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'var(--brand-card)' : 'var(--brand-surface)', borderBottom: i === 4 ? 'none' : '1px solid var(--brand-border)' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 800, color: row.rc }}>{row.i} {row.r}</td>
                    <td style={{ padding: '14px 20px', color: 'var(--brand-text)' }}>{row.n}</td>
                    <td style={{ padding: '14px 20px' }}><span style={{ background: `color-mix(in srgb, ${row.tc} 15%, transparent)`, color: row.tc, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{row.t}</span></td>
                    <td style={{ padding: '14px 20px', fontWeight: 800, color: row.sc }}>{row.s}</td>
                    <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--brand-text-3)' }}>{row.m}</td>
                    <td style={{ padding: '14px 20px', color: 'var(--brand-text-3)' }}>{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '24px', textAlign: 'left' }}>
            <div style={{ background: 'var(--brand-card)', border: '1px solid var(--brand-border)', borderRadius: '12px', padding: '18px 20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand-text)', marginBottom: '4px' }}>Cross-Session Scores</div>
              <div style={{ fontSize: '12px', color: 'var(--brand-text-3)', lineHeight: 1.5 }}>Every result is saved to localStorage and persists across browser sessions.</div>
            </div>
            <div style={{ background: 'var(--brand-card)', border: '1px solid var(--brand-border)', borderRadius: '12px', padding: '18px 20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand-text)', marginBottom: '4px' }}>Filter by Task Level</div>
              <div style={{ fontSize: '12px', color: 'var(--brand-text-3)', lineHeight: 1.5 }}>View Easy, Medium, or Hard rankings independently with one click.</div>
            </div>
            <div style={{ background: 'var(--brand-card)', border: '1px solid var(--brand-border)', borderRadius: '12px', padding: '18px 20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand-text)', marginBottom: '4px' }}>Institutional Memory</div>
              <div style={{ fontSize: '12px', color: 'var(--brand-text-3)', lineHeight: 1.5 }}>LexMind stores contradiction patterns across episodes — the app learns with you.</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 12 - FINAL CTA */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '80px 24px', position: 'relative', background: 'var(--brand-bg)',
        background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(127,119,221,0.10) 0%, transparent 65%)'
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(127,119,221,0.4)',
          background: 'rgba(127,119,221,0.06)', borderRadius: '20px', padding: '6px 16px',
          fontSize: '12px', color: 'var(--brand-purple)', fontWeight: 500, marginBottom: '24px'
        }}>
          <div style={{ width: '7px', height: '7px', background: 'var(--brand-green)', borderRadius: '50%', animation: 'livePulse 2s infinite' }} />
          Ready to begin
        </div>
        
        <h2 style={{ fontSize: 'clamp(48px, 8vw, 80px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05, color: 'var(--brand-text)', margin: 0 }}>
          Find the conflict<br/>before it finds you.
        </h2>
        
        <p style={{ fontSize: '18px', color: 'var(--brand-text-2)', marginTop: '16px', marginBottom: '32px' }}>
          Load a contract. Run the agent. See where it breaks.
        </p>
        
        <button className="btn-primary" onClick={() => navigate('/app')} style={{ animation: 'heroPulse 2.5s infinite alternate' }}>
          Enter Clausr →
        </button>
        
        
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--brand-text-3)' }}>
          {/* Banner removed as requested */}
        </div>
      </section>

    </div>
  );
}
