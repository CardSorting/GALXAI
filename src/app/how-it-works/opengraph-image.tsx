import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'How GALXAI Works — Sub-15ms AI Model Routing Architecture';
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
          background: 'linear-gradient(135deg, #07080d 0%, #1e1b4b 50%, #064e3b 100%)',
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
                background: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#ffffff">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" stroke="#ffffff" strokeWidth="2" fill="none" />
                <polyline points="2 12 12 17 22 12" stroke="#ffffff" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '28px', fontWeight: 900 }}>
              <span>GALX</span>
              <span style={{ color: '#22d3ee' }}>AI</span>
              <span style={{ color: '#94a3b8', fontSize: '20px', marginLeft: '10px', fontWeight: 500 }}>Architecture</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 20px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              fontSize: '15px',
              fontWeight: 800,
              color: '#34d399',
            }}
          >
            <span>Sub-15ms Routing Engine</span>
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
            How GALXAI Works: Architecture &amp; Mechanics
          </div>
          <div style={{ display: 'flex', fontSize: '22px', color: '#cbd5e1', lineHeight: 1.4 }}>
            Explore continuous token-bucket calculus, multi-account routing pools, automatic circuit breaker failover, and zero-retention RAM transit.
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '14px' }}>
          {['Token Pool Governor', 'Circuit Breaker Failover', 'Zero Memory Retention', 'Smooth Weighted Round-Robin'].map((item, i) => (
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
