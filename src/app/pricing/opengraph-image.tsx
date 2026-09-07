import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'GALXAI pricing: plans and model rates';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: '#090b10', color: '#f4f4f5' }}>
      <div style={{ fontSize: 28, color: '#a5b4fc' }}>galx.ai</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 64, fontWeight: 600 }}>Pricing and plans</div>
        <div style={{ fontSize: 28, color: '#a1a1aa' }}>Compare plans, seats, and model usage rates.</div>
      </div>
      <div style={{ display: 'flex', gap: 48, borderTop: '1px solid #27272a', paddingTop: 28, fontSize: 24 }}>Solo · Team · Enterprise</div>
    </div>,
    size,
  );
}
