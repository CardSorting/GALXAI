import type { GalxTaskQueueEngine } from '../../core/queue/GalxTaskQueueEngine';
import { normalizeImageOutput } from './normalize-image-output';

type Task = NonNullable<ReturnType<GalxTaskQueueEngine['getTask']>>;
export function publicTaskStatus(status: string): string {
  if (status === 'COMPLETED') return 'completed';
  if (['DEAD_LETTERED', 'EXPIRED', 'FAILED'].includes(status)) return 'failed';
  if (status === 'CANCELLED') return 'cancelled';
  return status === 'RUNNING' || status === 'LEASED' ? 'generating' : 'queued';
}
export async function publicTaskResponse(task: Task) {
  const data = task.result?.data;
  let publicData = data && typeof data === 'object' && Array.isArray(data.data)
    ? await (await normalizeImageOutput(data, { requestId: crypto.randomUUID(), userId: task.userId, responseFormat: 'b64_json' })).json()
    : undefined;
  if (!publicData && data && typeof data === 'object' && Array.isArray(data.choices)) {
    publicData = { choices: data.choices.map((choice: any, index: number) => ({ index,
      message: { role: 'assistant', content: typeof choice.message?.content === 'string' ? choice.message.content : '' },
      finish_reason: ['stop', 'length', 'tool_calls', 'content_filter'].includes(choice.finish_reason) ? choice.finish_reason : 'stop',
    })) };
  }
  return { id: task.id, status: publicTaskStatus(task.status),
    ...(publicData ? { result: { data: publicData } } : {}),
  };
}
