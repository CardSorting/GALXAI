import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'GALXAI — Universal AI Model Router';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function TwitterImage() {
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
          background: 'linear-gradient(135deg, #07080d 0%, #0f172a 60%, #1e1b4b 100%)',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Glow Spheres */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.3) 0%, transparent 70%)',
          }}
        />

        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(34, 211, 238, 0.3)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#ffffff">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div style={{ fontSize: '30px', fontWeight: 900 }}>
              GALX<span style={{ color: '#22d3ee' }}>AI</span>
            </div>
          </div>

          <div
            style={{
              padding: '8px 18px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: '14px',
              fontWeight: 700,
              color: '#38bdf8',
            }}
          >
            Universal API Gateway
          </div>
        </div>

        {/* Main Title & Subtitle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              fontSize: '52px',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-1px',
            }}
          >
            Sub-15ms AI Model Routing with Wholesale Savings
          </div>
          <div style={{ fontSize: '24px', color: '#94a3b8' }}>
            Drop-in OpenAI SDK replacement for GPT-5.6 Sol, Grok 4.5, and frontier AI models.
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            paddingTop: '24px',
          }}
        >
          <div style={{ fontSize: '18px', color: '#34d399', fontWeight: 700 }}>
            ★ Save 25%–40% on Every AI Token
          </div>
          <div style={{ fontSize: '18px', color: '#94a3b8', fontWeight: 600 }}>
            galx.ai
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
