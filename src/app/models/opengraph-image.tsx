import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'GALXAI Frontier AI Model Catalog & Benchmarks';
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
          background: 'linear-gradient(135deg, #07080d 0%, #0d1226 50%, #1e1b4b 100%)',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
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
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.3) 0%, transparent 70%)',
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
                background: 'linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(34, 211, 238, 0.4)',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#ffffff">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900 }}>
              GALX<span style={{ color: '#22d3ee' }}>AI</span> Models
            </div>
          </div>

          <div
            style={{
              padding: '8px 18px',
              borderRadius: '999px',
              background: 'rgba(34, 211, 238, 0.15)',
              border: '1px solid rgba(34, 211, 238, 0.4)',
              fontSize: '14px',
              fontWeight: 700,
              color: '#38bdf8',
            }}
          >
            6 Frontier AI Models
          </div>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1000px' }}>
          <div style={{ fontSize: '50px', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1px' }}>
            Frontier AI Model Catalog &amp; Live Benchmarks
          </div>
          <div style={{ fontSize: '22px', color: '#cbd5e1', lineHeight: 1.4 }}>
            Compare OpenAI GPT-5.6 Sol, Terra, Luna, and GPT-Image specs, token rates, and latency side-by-side.
          </div>
        </div>

        {/* Model tags */}
        <div style={{ display: 'flex', gap: '14px' }}>
          {['gpt-5.6-sol (900K Context)', 'gpt-5.6-terra (Balanced)', 'gpt-5.6-luna (Fast)', 'openai-gpt-image-2 (Vision)'].map((m, i) => (
            <div
              key={i}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1.5px solid rgba(99, 102, 241, 0.4)',
                fontSize: '15px',
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              {m}
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
