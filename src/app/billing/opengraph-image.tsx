import { ImageResponse } from 'next/og';
export const runtime = 'edge';
export const alt = 'GALX Billing — Manage your plan, credit, and payments.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#090b10', color: '#f4f4f5', fontFamily: 'sans-serif' }}><div style={{ fontSize: 28, marginBottom: 40 }}>GALX</div><div style={{ fontSize: 68, fontWeight: 600 }}>Billing</div><div style={{ fontSize: 28, color: '#a1a1aa', marginTop: 32 }}>Manage your plan, credit, and payments.</div></div>, size);
}
