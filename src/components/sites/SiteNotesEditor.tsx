'use client';
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

export function SiteNotesEditor({storageKey,saved,disabled,onSave}:{storageKey:string;saved:string;disabled:boolean;onSave:(notes:string)=>Promise<boolean>}) {
  const [draft,setDraft]=useState({text:saved,base:saved}),[ready,setReady]=useState(false);
  useEffect(()=>{let next:{text:string;base:string}|undefined;try{const value=JSON.parse(sessionStorage.getItem(storageKey)||'null');
    if(typeof value?.text==='string' && typeof value?.base==='string' && value.text.length<=1800 && value.base.length<=2000)next=value;}catch{}
    if(next)setDraft(next);setReady(true);
  },[storageKey]); // Parent keys this editor by account and Site.
  useEffect(()=>{if(ready)setDraft(current=>current.text===current.base?{text:saved,base:saved}:current);},[saved,ready]);
  useEffect(()=>{if(ready)try{sessionStorage.setItem(storageKey,JSON.stringify(draft));}catch{}},[draft,ready,storageKey]);
  const dirty=draft.text.trim()!==saved,conflict=draft.base!==saved&&dirty,tooLong=new TextEncoder().encode(draft.text).length>2000;
  return <form className="sites-notes-form" onSubmit={async e=>{e.preventDefault();if(disabled||conflict||tooLong||!ready)return;
    const text=draft.text;if(await onSave(text))setDraft(current=>({text:current.text===text?text.trim():current.text,base:text.trim()}));}}>
    <label htmlFor="site-notes">Project notes</label>
    <textarea id="site-notes" rows={7} maxLength={1800} value={draft.text} disabled={!ready} onChange={e=>setDraft(current=>({...current,text:e.target.value}))}
      placeholder="Your audience, tone of voice, key facts, and things to preserve…" aria-describedby="site-notes-help"/>
    <p id="site-notes-help" className="sites-help">These notes stay until you edit them. Your chat and notes are private.</p>
    {conflict && <div className="sites-notes-conflict" role="status"><p>Project notes changed elsewhere. Your edits are still here.</p><details><summary>Review saved notes</summary><p>{saved || 'No saved notes.'}</p></details>
      <div><button type="button" className="sites-text-button" onClick={()=>setDraft({text:saved,base:saved})}>Use saved notes</button><button type="button" className="sites-text-button" onClick={()=>setDraft(current=>({...current,base:saved}))}>Keep my edits</button></div></div>}
    <div className="sites-notes-actions"><button className="sites-button" disabled={disabled||!ready||!dirty||conflict||tooLong}>Save notes<Check aria-hidden="true"/></button>
      {dirty && <span className="sites-help">Unsaved edits · kept in this tab</span>}</div>
    {tooLong && <p className="sites-help" role="alert">Shorten your notes to save them.</p>}
  </form>;
}
