import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'GALXAI — AI Engineering & Routing Knowledge Glossary';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 70px',
          background: 'linear-gradient(135deg, #07080d 0%, #0c1020 50%, #15182e 100%)',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '28px', fontWeight: 900 }}>
                GALX<span style={{ color: '#a78bfa' }}>AI</span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', letterSpacing: '2px', fontWeight: 600 }}>
                AI ENGINEERING GLOSSARY
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '999px',
              padding: '6px 16px',
              fontSize: '14px',
              color: '#a78bfa',
              fontWeight: 700,
            }}
          >
            <span>Schema.org DefinedTermSet</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '950px' }}>
          <div
            style={{
              fontSize: '52px',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-1px',
              background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            AI Routing, Caching &amp; Inference Knowledge Base
          </div>
          <div style={{ fontSize: '20px', color: '#94a3b8', lineHeight: 1.4 }}>
            Authoritative definitions and architectural explanations for prompt caching rebates, Time-To-First-Token (TTFT), Zero Data Retention, distributed edge proxies, and token economics.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          {['Prompt Caching Rebates', 'TTFT Acceleration', 'Zero Data Retention', 'Continuous Token Governor'].map((t) => (
            <div
              key={t}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '10px 18px',
                fontSize: '15px',
                color: '#e2e8f0',
                fontWeight: 600,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
