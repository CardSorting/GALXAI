/** Private proof: relay text -> bounded data -> deterministic static artifact. */
export interface SiteBrief {
  schema_version: 1;
  title: string;
  summary: string;
  sections: Array<{ heading: string; body: string }>;
}
export class WorkflowError extends Error {
  constructor(readonly code: string) { super(code); }
}
function exact(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) throw new WorkflowError('invalid_fields');
}
function text(value: unknown, max: number): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) throw new WorkflowError('invalid_text');
}
export function parseBrief(raw: string): SiteBrief {
  if (Buffer.byteLength(raw) > 12000) throw new WorkflowError('output_too_large');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new WorkflowError('invalid_json'); }
  exact(value, ['schema_version', 'title', 'summary', 'sections']);
  if (value.schema_version !== 1) throw new WorkflowError('unsupported_schema');
  text(value.title, 90); text(value.summary, 350);
  if (!Array.isArray(value.sections) || value.sections.length < 1 || value.sections.length > 3) throw new WorkflowError('invalid_sections');
  for (const section of value.sections) {
    exact(section, ['heading', 'body']); text(section.heading, 90); text(section.body, 650);
  }
  return value as unknown as SiteBrief;
}
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function renderBrief(value: SiteBrief): string {
  const brief = parseBrief(JSON.stringify(value));
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${escape(brief.title)}</title>
<style>body{font-family:system-ui,sans-serif;line-height:1.6}main{max-width:780px;margin:auto;padding:24px}p{overflow-wrap:anywhere}</style></head>
<body><main><h1>${escape(brief.title)}</h1><p>${escape(brief.summary)}</p>${brief.sections.map(section => `<section><h2>${escape(section.heading)}</h2><p>${escape(section.body)}</p></section>`).join('')}</main></body></html>\n`;
}

export interface TextReply { text: string; usage?: { total_tokens?: number }; }
export interface GenerationResult { brief: SiteBrief; calls: number; usage_tokens: number | null; }
export async function generateBrief(infer: (messages: Array<{ role: string; content: string }>) => Promise<TextReply>,
  signal?: AbortSignal): Promise<GenerationResult> {
  const messages = [{ role: 'system', content: 'Return one JSON object only, without Markdown. Exact schema: {"schema_version":1,"title":"text","summary":"text","sections":[{"heading":"text","body":"text"}]}. Use 1 to 3 sections. Title and headings <=90 characters, summary <=350, bodies <=650. Text is displayed literally. Do not include commands, paths, HTML, links, tools, deployment actions, or additional properties.' },
    { role: 'user', content: 'Prepare a short synthetic onboarding portal for a fictional design studio. Explain kickoff, weekly review, and project handover. No real people, credentials, integrations, or customer data.' }];
  let total = 0; let usageKnown = true;
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (signal?.aborted) throw new WorkflowError('cancelled');
    const reply = await infer(messages);
    if (signal?.aborted) throw new WorkflowError('cancelled');
    if (Number.isSafeInteger(reply.usage?.total_tokens) && reply.usage!.total_tokens! >= 0) total += reply.usage!.total_tokens!;
    else usageKnown = false;
    try { return { brief: parseBrief(reply.text), calls: attempt, usage_tokens: usageKnown ? total : null }; }
    catch (error) {
      if (!(error instanceof WorkflowError) || attempt === 2) throw error;
      // Retry only invalid completed text, never a network/admission failure.
      // Invalid content is not echoed back into the next model instruction.
      messages.push({ role: 'user', content: `The previous response failed validation (${error.code}). Return only the exact JSON schema above.` });
    }
  }
  throw new WorkflowError('generation_exhausted');
}
