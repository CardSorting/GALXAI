import { ImageResponse } from 'next/og';
import { FRONTEND_VISIBLE_MODELS } from '@/core/router/PublicModelCatalog';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return FRONTEND_VISIBLE_MODELS.map((m) => ({
    id: m.id.replace('/', '-'),
  }));
}

export default async function Image({ params }: Props) {
  const { id } = await params;
  const model = FRONTEND_VISIBLE_MODELS.find(
    (m) => m.id === id || m.id.replace('/', '-') === id || m.id === id
  ) || FRONTEND_VISIBLE_MODELS[0];

  const accentColor = '#f59e0b';
  const providerLabel = 'OpenAI';

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
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Glow Sphere */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '450px',
            height: '450px',
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
                background: accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#07080d">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '26px', fontWeight: 900 }}>
                <span>GALX</span>
                <span style={{ color: '#22d3ee' }}>AI</span>
                <span style={{ color: '#94a3b8', fontSize: '20px', marginLeft: '10px', fontWeight: 500 }}>Model Profile</span>
              </div>
              <div style={{ display: 'flex', fontSize: '13px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 600 }}>
                <span>{providerLabel} Architecture</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 20px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              fontSize: '15px',
              fontWeight: 800,
              color: '#34d399',
            }}
          >
            <span>Save {model.discountPercentage || 30}% Wholesale</span>
          </div>
        </div>

        {/* Center: Model Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '1000px' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '54px',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-1px',
              color: '#ffffff',
            }}
          >
            {model.name}
          </div>
          <div style={{ display: 'flex', fontSize: '22px', color: '#cbd5e1', lineHeight: 1.4 }}>
            {model.description || 'Frontier AI model accessible via 1-line drop-in OpenAI SDK replacement.'}
          </div>
        </div>

        {/* Bottom Specs Grid */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '14px 22px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Context Window
            </span>
            <span style={{ fontSize: '20px', color: '#ffffff', fontWeight: 900, marginTop: '4px' }}>
              {(model.contextWindowTokens / 1000).toLocaleString()}K Tokens
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '14px 22px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Input Pricing
            </span>
            <span style={{ fontSize: '20px', color: '#34d399', fontWeight: 900, marginTop: '4px' }}>
              ${model.inputPricePer1M.toFixed(2)} / 1M
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '14px 22px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Output Pricing
            </span>
            <span style={{ fontSize: '20px', color: '#38bdf8', fontWeight: 900, marginTop: '4px' }}>
              ${model.outputPricePer1M.toFixed(2)} / 1M
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '14px 22px',
              borderRadius: '16px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
            }}
          >
            <span style={{ fontSize: '12px', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 700 }}>
              API Access
            </span>
            <span style={{ fontSize: '20px', color: '#ffffff', fontWeight: 900, marginTop: '4px' }}>
              HTTPS
            </span>
          </div>
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
