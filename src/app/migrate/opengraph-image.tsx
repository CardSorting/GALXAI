import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'GALX — Supported product experiences';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ background: '#07080d', color: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', height: '100%', justifyContent: 'center', padding: '72px', width: '100%' }}>
        <div style={{ color: '#8be28b', fontSize: 30 }}>GALX</div>
        <div style={{ fontSize: 64, fontWeight: 700, marginTop: 24 }}>Supported product experiences</div>
        <div style={{ color: '#a8b0c0', fontSize: 30, marginTop: 28 }}>Private access is provided by decision.</div>
      </div>
    ),
    size,
  );
}
