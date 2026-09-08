import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'GALXAI — Frontier AI Model Providers & Wholesale Gateways';
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
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)',
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
                background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '28px', fontWeight: 900 }}>
                GALX<span style={{ color: '#34d399' }}>AI</span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', letterSpacing: '2px', fontWeight: 600 }}>
                FRONTIER MODEL PROVIDERS
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '999px',
              padding: '6px 16px',
              fontSize: '14px',
              color: '#34d399',
              fontWeight: 700,
            }}
          >
            <span>Wholesale Routing Channels</span>
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
            Unified Frontier AI Provider Portals &amp; Wholesale Channels
          </div>
          <div style={{ fontSize: '20px', color: '#94a3b8', lineHeight: 1.4 }}>
            Direct access to OpenAI and frontier models with 25%–40% wholesale rate cards, sub-15ms Anycast latency, and automatic failover.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          {['OpenAI Flagships', '75% Prompt Caching', 'Sub-15ms Anycast', 'Zero Rate-Limit Stalls'].map((t) => (
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
