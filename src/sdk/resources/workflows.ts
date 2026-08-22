/**
 * GALXAI Developer SDK: DAG Workflows & Pipeline Builder Resource
 */

import type {
  GalxTask,
  TaskPipelineStep
} from '../../core/contracts/GalxContracts';
import type {
  WorkflowCreateParams,
  AsyncTaskHandle
} from '../types';
import type { GalxAIClientCore } from '../client';

export class WorkflowsResource {
  private readonly client: GalxAIClientCore;

  constructor(client: GalxAIClientCore) {
    this.client = client;
  }

  /**
   * Creates a multi-step sequential DAG pipeline where intermediate outputs are automatically piped downstream.
   */
  public async create(params: WorkflowCreateParams): Promise<AsyncTaskHandle<any>> {
    const queue = params.queueId || 'agent-swarms';

    const pipelineSteps: TaskPipelineStep[] = params.steps.map(s => {
      if (s.tool === 'image_generation' || (!s.tool && s.prompt && !s.messages)) {
        return {
          name: s.name,
          required: s.required ?? true,
          target: {
            type: 'INTERNAL_MODEL',
            taskKind: 'image_generation',
            imagePayload: {
              prompt: s.prompt || 'Generate image from context',
              model: s.model || 'openai-gpt-image-2'
            }
          }
        };
      }

      if (s.tool === 'webhook' && s.url) {
        return {
          name: s.name,
          required: s.required ?? true,
          target: {
            type: 'HTTP_PUSH',
            url: s.url,
            headers: s.headers,
            body: s.body
          }
        };
      }

      return {
        name: s.name,
        required: s.required ?? true,
        target: {
          type: 'INTERNAL_MODEL',
          taskKind: 'chat_completion',
          chatPayload: {
            model: s.model || 'gpt-5.6-sol',
            messages: s.messages || [{ role: 'user', content: s.prompt || 'Process step' }]
          }
        }
      };
    });

    const initialTarget = pipelineSteps[0].target;

    const res = await this.client.request<{
      task: GalxTask;
      deduplicated: boolean;
    }>(`/api/queues/${queue}/tasks`, {
      method: 'POST',
      body: {
        queueId: queue,
        userId: params.userId,
        groupId: params.groupId,
        tag: params.tag,
        priority: params.priority ?? 70,
        delayMs: params.delayMs,
        idempotencyKey: params.idempotencyKey,
        target: initialTarget,
        pipelineSteps
      }
    });

    const client = this.client;
    const taskId = res.task.id;

    return {
      taskId,
      queueId: queue,
      status: res.task.status,
      taskUrl: `/api/queues/${queue}/tasks/${taskId}`,

      async result(options = {}) {
        const timeoutMs = options.timeoutMs ?? 300000;
        const intervalMs = options.intervalMs ?? 1000;
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
          const snapshot = await client.request<{ task: GalxTask }>(`/api/queues/${queue}/tasks/${taskId}`);
          const task = snapshot.task;

          if (task.status === 'COMPLETED') {
            return task.pipelineStepResults || task.result?.data;
          }

          if (task.status === 'DEAD_LETTERED' || task.status === 'CANCELLED' || task.status === 'EXPIRED') {
            throw new Error(`Workflow '${taskId}' failed in state ${task.status}: ${task.lastError?.message || ''}`);
          }

          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

        throw new Error(`Workflow '${taskId}' polling timed out after ${timeoutMs}ms`);
      },

      async *streamProgress() {
        const stream = client.requestEventStream(`/api/queues/${queue}/tasks/${taskId}/stream`);
        for await (const evt of stream) {
          if (evt.type === 'TASK_PROGRESS' && evt.data) {
            yield evt.data;
          }
        }
      },

      async cancel(): Promise<boolean> {
        const cancelRes = await client.request<{ cancelled: boolean }>(`/api/queues/${queue}/tasks/${taskId}`, {
          method: 'DELETE'
        });
        return cancelRes.cancelled;
      },

      async getSnapshot(): Promise<GalxTask> {
        const snapshot = await client.request<{ task: GalxTask }>(`/api/queues/${queue}/tasks/${taskId}`);
        return snapshot.task;
      }
    };
  }
}
