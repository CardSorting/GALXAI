import { ImageResponse } from 'next/og';
export const alt = 'GALX service status';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: '#09090b', color: '#fff', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>GALX Service Status</div>, size);
}
