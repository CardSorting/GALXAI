'use client';
import { MessageSquare } from 'lucide-react';
import type { SiteDocument } from '@/lib/sites/workspace-contract';

export function SiteContentPanel({document,current,version,onEdit,disabled}:{document:SiteDocument;current?:SiteDocument|null;version?:number;onEdit:(label:string)=>void;disabled:boolean}) {
  const rows=[{heading:document.title,body:document.summary,label:'Introduction'},...document.sections.map((s,i)=>({...s,label:`Section ${i+1}`}))];
  const comparison=current?[{heading:current.title,body:current.summary},...current.sections]:undefined;
  const changes=comparison?Array.from({length:Math.max(rows.length,comparison.length)},(_,i)=>i).filter(i=>rows[i]?.heading!==comparison[i]?.heading||rows[i]?.body!==comparison[i]?.body):[];
  return <div className="sites-content-panel" tabIndex={0} aria-label={version?`Version ${version} content`:'Page content'}>
    <div className="sites-content-intro"><h2>{version?`Version ${version}`:'Page content'}</h2><p>{version?'Read this saved version and compare it with your current draft.':'Review your whole page, then bring a section into chat to refine it.'}</p></div>
    {comparison && <details className="sites-content-diff" open><summary>{changes.length?`${changes.length} ${changes.length===1?'part differs':'parts differ'} from your current draft`:'Matches your current draft'}</summary>
      {changes.map(i=><div className="sites-diff-row" key={i}><h3>{i===0?'Introduction':`Section ${i}`}</h3><div><div><h4>Version {version}</h4><strong>{rows[i]?.heading || 'Not in this version'}</strong><p>{rows[i]?.body}</p></div><div><h4>Current draft</h4><strong>{comparison[i]?.heading || 'Not in the current draft'}</strong><p>{comparison[i]?.body}</p></div></div></div>)}</details>}
    <nav className="sites-content-outline" aria-label="Page sections">{rows.map((row,i)=><a key={i} href={`#site-content-${i}`}>{i===0?'Introduction':row.heading}</a>)}</nav>
    {rows.map((row,i)=><section className="sites-content-section" id={`site-content-${i}`} key={i}><div><h3>{row.heading}</h3>{!version && <button className="sites-text-button" disabled={disabled} onClick={()=>onEdit(i===0?'the introduction':`the section “${row.heading}”`)}><MessageSquare aria-hidden="true"/>Edit in chat</button>}</div><p>{row.body}</p></section>)}
    <a className="sites-text-button sites-content-top" href="#site-content-0">Back to introduction</a>
  </div>;
}
