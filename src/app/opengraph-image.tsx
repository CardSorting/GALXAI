import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'GALXAI — Universal AI Model Router & Gateway';
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
        {/* Glow Spheres */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-120px',
            left: '200px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.25) 0%, transparent 70%)',
          }}
        />

        {/* Top Bar: Brand + Live Status */}
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
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 30px rgba(6, 182, 212, 0.4)',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="#ffffff"
                stroke="#ffffff"
                strokeWidth="1"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '1px' }}>
                GALX<span style={{ color: '#22d3ee' }}>AI</span>
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', letterSpacing: '2px', fontWeight: 600 }}>
                UNIVERSAL MODEL ROUTER
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 20px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              fontSize: '15px',
              fontWeight: 700,
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 10px #10b981',
              }}
            />
            <span>ACTIVE FAILOVER ROUTING</span>
          </div>
        </div>

        {/* Center: Hero Headline & Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '950px' }}>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 900,
              lineHeight: 1.15,
              color: '#ffffff',
              letterSpacing: '-1px',
            }}
          >
            One Universal API for the World&apos;s Best AI Models.
          </div>
          <div
            style={{
              fontSize: '22px',
              color: '#cbd5e1',
              lineHeight: 1.4,
              fontWeight: 400,
            }}
          >
            Access <span style={{ color: '#f59e0b', fontWeight: 700 }}>OpenAI Codex</span> and{' '}
            <span style={{ color: '#22d3ee', fontWeight: 700 }}>xAI Grok</span> with sub-15ms routing,
            automatic failover, and <span style={{ color: '#34d399', fontWeight: 700 }}>25%–40% wholesale savings</span>.
          </div>
        </div>

        {/* Bottom Feature Badges Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            width: '100%',
          }}
        >
          {[
            { label: '⚡ Sub-15ms Routing', color: 'rgba(99, 102, 241, 0.2)', border: '#6366f1' },
            { label: '💰 Wholesale Discounts', color: 'rgba(16, 185, 129, 0.2)', border: '#10b981' },
            { label: '🔄 0-Refactor Drop-in', color: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b' },
            { label: '🔒 Zero Data Retention', color: 'rgba(34, 211, 238, 0.2)', border: '#06b6d4' },
          ].map((pill, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 22px',
                borderRadius: '16px',
                background: pill.color,
                border: `1.5px solid ${pill.border}`,
                fontSize: '16px',
                fontWeight: 800,
                color: '#ffffff',
              }}
            >
              {pill.label}
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
