import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'GALXAI Model Battle Arena';
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
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, transparent 70%)',
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
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#ffffff">
                <polygon points="14.5 17.5 3 6 6 3 17.5 14.5" />
                <line x1="13" y1="19" x2="19" y2="13" stroke="#ffffff" strokeWidth="2" />
                <line x1="16" y1="16" x2="20" y2="20" stroke="#ffffff" strokeWidth="2" />
                <line x1="19" y1="21" x2="21" y2="19" stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '28px', fontWeight: 900 }}>
              <span>GALX</span>
              <span style={{ color: '#818cf8' }}>AI</span>
              <span style={{ color: '#94a3b8', fontSize: '20px', marginLeft: '10px', fontWeight: 500 }}>Battle Arena</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 20px',
              borderRadius: '999px',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.5)',
              fontSize: '15px',
              fontWeight: 800,
              color: '#a5b4fc',
            }}
          >
            <span>Dual Concurrent Stream Arena</span>
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
            Side-by-Side Live AI Model Battle Arena
          </div>
          <div style={{ display: 'flex', fontSize: '22px', color: '#cbd5e1', lineHeight: 1.4 }}>
            Benchmark GPT-5.6 Sol against Grok 4.5 concurrently in real-time. Measure tokens/sec, time-to-first-token, and output precision.
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '14px' }}>
          {['Side-by-Side Streaming', 'Live Token Speed Counter', 'Latency Delta Metrics', '100% Blind & Direct Tests'].map((item, i) => (
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
