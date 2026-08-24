import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'GALXAI AI Model Comparison Matrix';
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
          background: 'linear-gradient(135deg, #07080d 0%, #111827 50%, #0369a1 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.35) 0%, transparent 70%)',
          }}
        />

        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: '#0ea5e9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#ffffff">
                <line x1="18" y1="20" x2="18" y2="10" stroke="#ffffff" strokeWidth="2" />
                <line x1="12" y1="20" x2="12" y2="4" stroke="#ffffff" strokeWidth="2" />
                <line x1="6" y1="20" x2="6" y2="14" stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '28px', fontWeight: 900 }}>
              <span>GALX</span>
              <span style={{ color: '#38bdf8' }}>AI</span>
              <span style={{ color: '#94a3b8', fontSize: '20px', marginLeft: '10px', fontWeight: 500 }}>Model Matrix</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 20px',
              borderRadius: '999px',
              background: 'rgba(14, 165, 233, 0.15)',
              border: '1px solid rgba(14, 165, 233, 0.4)',
              fontSize: '15px',
              fontWeight: 800,
              color: '#38bdf8',
            }}
          >
            <span>Benchmark &amp; Pricing Matrix</span>
          </div>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '1000px' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '52px',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-1px',
              color: '#ffffff',
            }}
          >
            Compare AI Models: Specs, Pricing &amp; Benchmarks
          </div>
          <div style={{ display: 'flex', fontSize: '22px', color: '#cbd5e1', lineHeight: 1.4 }}>
            Side-by-side comparison across GPT-5.6 Sol/Terra/Luna, Grok 4.5, context lengths up to 2M tokens, and wholesale discounts.
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '14px' }}>
          {['Context Window Depth', 'Input/Output Pricing Delta', 'Reasoning vs Speed Index', 'Prompt Caching Multiplier'].map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                padding: '12px 20px',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontSize: '15px',
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  );
}
