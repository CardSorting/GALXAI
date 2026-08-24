import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #07080d 0%, #0d1226 50%, #1e1b4b 100%)',
          borderRadius: '40px',
          border: '4px solid rgba(99, 102, 241, 0.4)',
          position: 'relative',
          overflow: 'hidden',
          padding: '20px',
        }}
      >
        {/* Glow ambient background */}
        <div
          style={{
            position: 'absolute',
            width: '140px',
            height: '140px',
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.4) 0%, rgba(99, 102, 241, 0.15) 50%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Central Zap Badge Container */}
        <div
          style={{
            width: '90px',
            height: '90px',
            borderRadius: '26px',
            background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2) 0%, rgba(99, 102, 241, 0.3) 100%)',
            border: '2px solid rgba(34, 211, 238, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(34, 211, 238, 0.3)',
          }}
        >
          <svg
            width="52"
            height="52"
            viewBox="0 0 24 24"
            fill="#22d3ee"
            stroke="#67e8f9"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>

        {/* Brand Text */}
        <div
          style={{
            marginTop: '12px',
            fontSize: '18px',
            fontWeight: 900,
            letterSpacing: '2px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          GALX<span style={{ color: '#22d3ee' }}>AI</span>
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
