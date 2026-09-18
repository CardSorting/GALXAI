import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get('title') || 'GALX — Images and Sites';
    const subtitle =
      searchParams.get('subtitle') ||
      'Create images and build sites. Developer API access is in private preview.';
    const badge = searchParams.get('badge') || 'IMAGES & SITES';
    const price = searchParams.get('price');
    const category = searchParams.get('category') || 'GALX';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: '#07080d',
            backgroundImage:
              'radial-gradient(circle at 25% 25%, rgba(245, 158, 11, 0.15), transparent 45%), radial-gradient(circle at 75% 75%, rgba(6, 182, 212, 0.15), transparent 45%)',
            padding: '60px 70px',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Top Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '24px',
                  color: '#000000',
                }}
              >
                G
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: 900,
                    color: '#ffffff',
                    letterSpacing: '-0.5px',
                  }}
                >
                  GALXAI
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#71717a',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                  }}
                >
                  {category}
                </span>
              </div>
            </div>

            {/* Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '100px',
                padding: '8px 18px',
                color: '#34d399',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              {badge}
            </div>
          </div>

          {/* Center Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxWidth: '950px',
            }}
          >
            <div
              style={{
                fontSize: title.length > 40 ? '48px' : '58px',
                fontWeight: 900,
                color: '#ffffff',
                lineHeight: 1.15,
                letterSpacing: '-1.5px',
              }}
            >
              {title}
            </div>

            <div
              style={{
                fontSize: '22px',
                color: '#a1a1aa',
                lineHeight: 1.4,
                fontWeight: 400,
              }}
            >
              {subtitle}
            </div>
          </div>

          {/* Bottom Bar / Telemetry */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              paddingTop: '24px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '32px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#d4d4d8',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚡ Sub-15ms Edge TTFT
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                🧠 75% Prompt Caching Rebate
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                🛡️ Zero Data Retention
              </span>
            </div>

            {price && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '20px',
                  fontWeight: 900,
                  color: '#fbbf24',
                }}
              >
                {price}
              </div>
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, immutable, no-transform, max-age=31536000',
        },
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate OpenGraph image: ${e.message}`, { status: 500 });
  }
}
