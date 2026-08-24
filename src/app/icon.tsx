import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 32,
  height: 32,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #07080d 0%, #0d1226 100%)',
          borderRadius: '8px',
          border: '1.5px solid rgba(99, 102, 241, 0.6)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow ambient layer */}
        <div
          style={{
            position: 'absolute',
            width: '24px',
            height: '24px',
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.8) 0%, rgba(99, 102, 241, 0) 70%)',
            borderRadius: '50%',
          }}
        />
        {/* High-contrast Lightning Zap SVG */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="#22d3ee"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
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
