'use client';

import { useId, useState } from 'react';

type Rate = { id: string; inputPricePer1M: number; outputPricePer1M: number };
export function PricingEstimator({ models }: { models: Rate[] }) {
  const modelSelectId = useId();
  const [modelId, setModelId] = useState(models[0]?.id || '');
  const [input, setInput] = useState('1');
  const [output, setOutput] = useState('1');
  const model = models.find(item => item.id === modelId);
  const valid = [input, output].every(value => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0);
  const total = model && valid ? Number(input) * model.inputPricePer1M + Number(output) * model.outputPricePer1M : null;
  const fieldClass = 'mt-2 w-full rounded-md border border-white/15 bg-[#090b10] px-3 py-2 text-sm text-zinc-100 focus-visible:outline-indigo-300';
  return <details id="estimate" className="mt-5 scroll-mt-24 border-y border-white/10 py-4">
    <summary className="cursor-pointer text-sm font-medium hover:text-indigo-200 focus-visible:outline-indigo-300">Estimate usage cost</summary>
    <div className="mt-4 grid gap-4 sm:grid-cols-3">
      <div><label htmlFor={modelSelectId} className="text-sm text-zinc-400">Model</label><select id={modelSelectId} className={fieldClass} value={modelId} onChange={event => setModelId(event.target.value)}>{models.map(item => <option key={item.id} value={item.id}>{item.id}</option>)}</select></div>
      <label className="text-sm text-zinc-400">Input tokens (millions)<input type="number" min="0" step="any" value={input} onChange={event => setInput(event.target.value)} className={fieldClass} /></label>
      <label className="text-sm text-zinc-400">Output tokens (millions)<input type="number" min="0" step="any" value={output} onChange={event => setOutput(event.target.value)} className={fieldClass} /></label>
    </div>
    <p role="status" className="mt-4 text-sm tabular-nums">{total !== null && Number.isFinite(total) ? `Estimated usage: $${total.toFixed(2)}` : 'Enter valid token amounts of zero or more.'}</p>
    <p className="mt-2 text-xs leading-6 text-zinc-400">Usage only. Excludes plan fees and assumes no caching or additional discounts.</p>
  </details>;
}
