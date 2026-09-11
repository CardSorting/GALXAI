import { createHash } from 'node:crypto';
import { parseBrief, type SiteBrief } from '../workflow';

export const WORKFLOW_VERSION = 'sites-static-v2';
export class JobError extends Error {
  constructor(readonly code: string) { super(code); this.name = 'JobError'; }
}
export function requireThat(value: unknown, code: string): asserts value {
  if (!value) throw new JobError(code);
}
export function digest(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}
export function identifier(value: unknown): asserts value is string {
  requireThat(typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:~-]{0,119}$/.test(value), 'invalid_identifier');
}
export function amount(value: unknown): asserts value is number {
  requireThat(Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= 1_000_000_000, 'invalid_amount');
}
export function exact(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  requireThat(value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === [...keys].sort().join(','), 'invalid_fields');
}
export interface DraftRequest {
  schemaVersion: 1;
  template: typeof WORKFLOW_VERSION;
  brief: string;
  requestedModel: string;
}
export function parseRequest(input: unknown): DraftRequest {
  exact(input, ['schemaVersion', 'template', 'brief', 'requestedModel']);
  requireThat(input.schemaVersion === 1 && input.template === WORKFLOW_VERSION, 'unsupported_workflow');
  requireThat(typeof input.brief === 'string' && input.brief.trim().length > 0 &&
    Buffer.byteLength(input.brief) <= 2000 && !/[\u0000-\u001f\u007f]/.test(input.brief), 'invalid_brief');
  identifier(input.requestedModel);
  return { schemaVersion: 1, template: WORKFLOW_VERSION, brief: input.brief, requestedModel: input.requestedModel };
}
export type Phase = 'queued' | 'generating' | 'generated' | 'packaging' | 'ready' |
  'publishing' | 'published' | 'needs_reconciliation' | 'cancelled' | 'failed';
export interface Lease { holder: string; fence: number; expiresAt: number; }
export interface Attempt {
  id: string;
  state: 'started' | 'valid' | 'invalid' | 'unknown' | 'not_accepted';
  reservation: number;
  charge: number | null;
  settled: boolean;
  receipt: string | null;
}
export interface Artifact { hash: string; bytes: number; htmlHash: string; template: string; }
export interface PublishIntent {
  // Only a trusted host adapter may resolve these values; never model output.
  connectionId: string;
  projectId: string;
  commitSha: string;
  versionId: string;
  audience: 'owner';
  artifactHash: string;
}
export function parseIntent(value: unknown): PublishIntent {
  exact(value, ['connectionId', 'projectId', 'commitSha', 'versionId', 'audience', 'artifactHash']);
  identifier(value.connectionId); identifier(value.projectId); identifier(value.versionId);
  requireThat(value.audience === 'owner', 'unsupported_audience');
  requireThat(typeof value.commitSha === 'string' && /^[0-9a-f]{40}$/.test(value.commitSha), 'invalid_commit');
  requireThat(typeof value.artifactHash === 'string' && /^[0-9a-f]{64}$/.test(value.artifactHash), 'invalid_digest');
  return { connectionId: value.connectionId, projectId: value.projectId, commitSha: value.commitSha,
    versionId: value.versionId, audience: 'owner', artifactHash: value.artifactHash };
}
export interface Publication {
  id: string;
  intent: PublishIntent;
  intentHash: string;
  state: 'started' | 'unknown' | 'succeeded' | 'not_applied';
  receipt: string | null;
  deploymentId?: string;
  url?: string;
}
export interface Job {
  schemaVersion: 1;
  id: string;
  owner: string;
  requestKey: string;
  fingerprint: string;
  request: DraftRequest;
  phase: Phase;
  revision: number;
  fence: number;
  lease: Lease | null;
  cancellationRequested: boolean;
  attempts: Attempt[];
  brief: SiteBrief | null;
  artifact: Artifact | null;
  publication: Publication | null;
  target: { connectionId: string; projectId: string } | null;
  savedVersion?: { operationId: string; commitSha: string; artifactHash: string; state: 'started' | 'saved';
    transport?: 'cli' | 'hosted';
    versionId?: string; remoteHash?: string; remoteBytes?: number; archiveFormat?: string };
  createdAt: number;
  updatedAt: number;
}
export function validBrief(input: SiteBrief): SiteBrief { return parseBrief(JSON.stringify(input)); }
export interface Policy {
  accountLimit: number;
  reservationPerCall: number;
  maxCalls: 1 | 2;
  maxConcurrentGenerations: number;
  leaseMs: number;
}
export const DEFAULT_POLICY: Policy = {
  accountLimit: 2000, reservationPerCall: 1000, maxCalls: 2,
  maxConcurrentGenerations: 1, leaseMs: 90_000,
};
export function policy(input: Policy): Policy {
  exact(input, ['accountLimit', 'reservationPerCall', 'maxCalls', 'maxConcurrentGenerations', 'leaseMs']);
  for (const value of Object.values(input)) amount(value);
  requireThat(input.accountLimit > 0 && input.reservationPerCall > 0 &&
    [1, 2].includes(input.maxCalls) && input.maxConcurrentGenerations >= 1 &&
    input.maxConcurrentGenerations <= 8 && input.leaseMs >= 1000 && input.leaseMs <= 300_000, 'invalid_policy');
  return { accountLimit: input.accountLimit, reservationPerCall: input.reservationPerCall,
    maxCalls: input.maxCalls, maxConcurrentGenerations: input.maxConcurrentGenerations, leaseMs: input.leaseMs };
}
export interface PublicJob {
  id: string;
  status: 'queued' | 'working' | 'ready' | 'published' | 'attention_required' | 'cancelled' | 'failed';
}
export function publicJob(job: Job): PublicJob {
  const statuses: Record<Phase, PublicJob['status']> = { queued: 'queued', generating: 'working', generated: 'working',
    packaging: 'working', ready: 'ready', publishing: 'working', published: 'published',
    needs_reconciliation: 'attention_required', cancelled: 'cancelled', failed: 'failed' };
  const status = Object.hasOwn(statuses, job.phase) ? statuses[job.phase] : 'attention_required';
  return { id: job.id, status };
}
