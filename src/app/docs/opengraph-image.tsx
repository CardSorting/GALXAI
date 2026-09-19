import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'GALX Developer documentation — Build with GALX Nova.';
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
          background: 'linear-gradient(135deg, #07080d 0%, #111827 50%, #1e1b4b 100%)',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Glow Spheres */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 70%)',
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
                background: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#000000">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900 }}>
              GALX<span style={{ color: '#f59e0b' }}> Nova</span> Docs
            </div>
          </div>

          <div
            style={{
              padding: '8px 18px',
              borderRadius: '999px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              fontSize: '14px',
              fontWeight: 700,
              color: '#fbbf24',
            }}
          >
            Supported API guidance
          </div>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1000px' }}>
          <div style={{ fontSize: '50px', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1px' }}>
            Developer guides and API reference
          </div>
          <div style={{ fontSize: '22px', color: '#cbd5e1', lineHeight: 1.4 }}>
            Build with supported GALX Nova reasoning and generation capabilities through the API.
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div style={{ display: 'flex', gap: '14px' }}>
          {['Quickstart', 'API reference', 'SDK guidance', 'Capability contracts', 'Secret hygiene'].map((item, i) => (
            <div
              key={i}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontSize: '15px',
                fontWeight: 700,
                color: '#e2e8f0',
              }}
            >
              {item}
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
