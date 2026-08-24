import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'GALXAI API Key & Workload Manager';
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
          background: 'linear-gradient(135deg, #07080d 0%, #1e1b4b 50%, #0f172a 100%)',
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
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
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
                background: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#ffffff">
                <circle cx="7.5" cy="15.5" r="5.5" stroke="#ffffff" strokeWidth="2" fill="none" />
                <path d="m21 2-9.6 9.6" stroke="#ffffff" strokeWidth="2" />
                <path d="m15.5 7.5 3 3" stroke="#ffffff" strokeWidth="2" />
                <path d="M18.5 4.5 20 6" stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '28px', fontWeight: 900 }}>
              <span>GALX</span>
              <span style={{ color: '#818cf8' }}>AI</span>
              <span style={{ color: '#94a3b8', fontSize: '20px', marginLeft: '10px', fontWeight: 500 }}>API Keys</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 20px',
              borderRadius: '999px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              fontSize: '15px',
              fontWeight: 800,
              color: '#a5b4fc',
            }}
          >
            <span>Workload-Scoped Access</span>
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
            Universal Developer API Keys &amp; Workload Tokens
          </div>
          <div style={{ display: 'flex', fontSize: '22px', color: '#cbd5e1', lineHeight: 1.4 }}>
            Mint granular API keys with automated IP whitelisting, model-specific restrictions, rate-limit governance, and real-time telemetry.
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '14px' }}>
          {['1-Click Cursor IDE Preset', 'Per-Key Budget Quotas', 'Model Isolation Scopes', 'Real-time Ingestion Metrics'].map((item, i) => (
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
