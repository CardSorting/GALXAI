import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'GALXAI Shard Vault & Multi-Account Governor';
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
          background: 'linear-gradient(135deg, #07080d 0%, #1e1b4b 50%, #0c1020 100%)',
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
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#ffffff">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#ffffff" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '28px', fontWeight: 900 }}>
              <span>GALX</span>
              <span style={{ color: '#22d3ee' }}>AI</span>
              <span style={{ color: '#94a3b8', fontSize: '20px', marginLeft: '10px', fontWeight: 500 }}>Shard Vault</span>
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
              color: '#818cf8',
            }}
          >
            <span>AES-256-GCM Vault</span>
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
            Encrypted Shard Vault &amp; Rate-Limit Governor
          </div>
          <div style={{ display: 'flex', fontSize: '22px', color: '#cbd5e1', lineHeight: 1.4 }}>
            Multi-account capacity pooling with authenticated data isolation, sub-40ms instant retraction, and zero disk persistence.
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '14px' }}>
          {['AES-256-GCM Cryptographic Isolation', 'Continuous Concurrency Governor', '1-Click Instant Retraction', 'Zero Data Retention'].map((item, i) => (
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
    }
  );
}
