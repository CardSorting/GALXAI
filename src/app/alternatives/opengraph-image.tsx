import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'GALXAI — AI Gateway Competitor Alternatives & Comparisons';
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
            background: 'radial-gradient(circle, rgba(147, 51, 234, 0.3) 0%, transparent 70%)',
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
                background: 'linear-gradient(135deg, #9333ea 0%, #6366f1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '28px', fontWeight: 900 }}>
                GALX<span style={{ color: '#a855f7' }}>AI</span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', letterSpacing: '2px', fontWeight: 600 }}>
                COMPETITOR COMPARISONS
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '999px',
              padding: '6px 16px',
              fontSize: '14px',
              color: '#a855f7',
              fontWeight: 700,
            }}
          >
            <span>Wholesale vs Retail Pricing</span>
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
            Compare GALXAI vs OpenRouter, Portkey &amp; Together AI
          </div>
          <div style={{ fontSize: '20px', color: '#94a3b8', lineHeight: 1.4 }}>
            Direct feature-by-feature and pricing matrix breakdowns. See why engineering teams switch to GALXAI for 25%–40% wholesale savings and 75% prompt caching pass-through.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          {['OpenRouter Alternative', 'Portkey Alternative', 'Together AI Alternative', 'LiteLLM Proxy Alternative'].map((t) => (
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
