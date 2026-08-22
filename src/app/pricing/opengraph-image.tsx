import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'GALXAI Transparent Wholesale Pricing & Token Rates';
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
          background: 'linear-gradient(135deg, #07080d 0%, #064e3b 40%, #0f172a 100%)',
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
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)',
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
                background: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#07080d">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900 }}>
              GALX<span style={{ color: '#34d399' }}>AI</span> Pricing
            </div>
          </div>

          <div
            style={{
              padding: '8px 18px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              fontSize: '14px',
              fontWeight: 700,
              color: '#34d399',
            }}
          >
            25%–40% Wholesale Rates
          </div>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1000px' }}>
          <div style={{ fontSize: '50px', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1px' }}>
            Wholesale AI Pricing Without Commitments
          </div>
          <div style={{ fontSize: '22px', color: '#cbd5e1', lineHeight: 1.4 }}>
            Pay-as-you-go token pricing with automatic volume discounts, 75% prompt caching discounts, and zero minimum spend.
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '14px' }}>
          {['Free $5 Starter Credit', '75% Prompt Caching', 'Sub-Cent Billing', 'Crypto & Card Top-ups'].map((item, i) => (
            <div
              key={i}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '15px',
                fontWeight: 700,
                color: '#ffffff',
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
    }
  );
}
