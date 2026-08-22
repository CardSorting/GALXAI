import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'GALXAI Live Router Status & 99.99% Uptime';
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
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900 }}>
              GALX<span style={{ color: '#34d399' }}>AI</span> Status
            </div>
          </div>

          <div
            style={{
              padding: '8px 20px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              fontSize: '15px',
              fontWeight: 800,
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#10b981',
              }}
            />
            <span>ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1000px' }}>
          <div style={{ fontSize: '50px', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1px' }}>
            Real-Time Gateway Uptime &amp; Router Metrics
          </div>
          <div style={{ fontSize: '22px', color: '#cbd5e1', lineHeight: 1.4 }}>
            Sub-millisecond routing overhead, continuous circuit breaker health checks, and 99.99% multi-region SLA.
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div
            style={{
              padding: '14px 22px',
              borderRadius: '16px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span style={{ fontSize: '12px', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 700 }}>
              Gateway Uptime
            </span>
            <span style={{ fontSize: '22px', color: '#ffffff', fontWeight: 900 }}>99.99% SLA</span>
          </div>

          <div
            style={{
              padding: '14px 22px',
              borderRadius: '16px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span style={{ fontSize: '12px', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 700 }}>
              Routing Overhead
            </span>
            <span style={{ fontSize: '22px', color: '#ffffff', fontWeight: 900 }}>&lt; 0.8ms</span>
          </div>

          <div
            style={{
              padding: '14px 22px',
              borderRadius: '16px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span style={{ fontSize: '12px', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 700 }}>
              Failover Latency
            </span>
            <span style={{ fontSize: '22px', color: '#ffffff', fontWeight: 900 }}>&lt; 15ms</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
