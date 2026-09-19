import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'GALX Developer — build with GALX Nova';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 72, background: '#07080d', color: '#fff', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', color: '#67e8f9', fontSize: 24, fontWeight: 700, marginBottom: 28 }}>GALX DEVELOPER</div>
      <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>Build with GALX Nova.</div>
      <div style={{ display: 'flex', color: '#a1a1aa', fontSize: 28, marginTop: 26 }}>Managed intelligence for supported reasoning and generation capabilities.</div>
      <div style={{ display: 'flex', color: '#fbbf24', fontSize: 24, marginTop: 44 }}>$50/month recurring API access · usage billed separately</div>
    </div>,
    { ...size },
  );
}
