import { ImageResponse } from 'next/og';
export const runtime = 'edge';
export const alt = 'GALX Sites — Your idea, ready to share. Very early public beta.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',padding:80,background:'#07090e',color:'#ffffff',fontFamily:'sans-serif'}}><div style={{fontSize:28,marginBottom:40}}>GALX Sites</div><div style={{fontSize:68,fontWeight:700}}>Your idea,</div><div style={{fontSize:68,fontWeight:700}}>ready to share.</div><div style={{fontSize:26,color:'#c5c7cf',marginTop:36}}>Very early public beta</div></div>, size);
}
