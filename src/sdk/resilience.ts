/**
 * GALXAI Developer SDK: Multi-Model Resilience & Stream Racing
 */

import type { ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk } from '../core/contracts/GalxContracts';
import type { CompletionsResource } from './resources/chat';
import { APIError } from './errors';

export class ModelResilience {
  private readonly completions: CompletionsResource;

  constructor(completions: CompletionsResource) {
    this.completions = completions;
  }

  /**
   * Cascades through a prioritized list of fallback models until one succeeds.
   */
  public async fallbackCascade(
    models: string[],
    params: Omit<ChatCompletionRequest, 'model'>
  ): Promise<ChatCompletionResponse & { successfulModel: string; attemptsMade: number }> {
    if (!models || models.length === 0) {
      throw new APIError('At least one model must be specified in fallbackCascade', 400);
    }

    const errors: Array<{ model: string; error: string }> = [];
    let attempt = 0;

    for (const model of models) {
      attempt++;
      try {
        const response = await this.completions.create({
          ...params,
          model,
          stream: false
        });

        return {
          ...response,
          successfulModel: model,
          attemptsMade: attempt
        };
      } catch (err: any) {
        errors.push({ model, error: err.message || 'Model request failed' });
      }
    }

    throw new APIError(
      `All ${models.length} fallback models in cascade failed: ${JSON.stringify(errors)}`,
      502,
      'all_fallbacks_exhausted',
      { errors }
    );
  }

  /**
   * Races multiple models concurrently and returns the stream from the model with lowest TTFB.
   */
  public async race(
    models: string[],
    params: Omit<ChatCompletionRequest, 'model'>
  ): Promise<AsyncIterable<ChatCompletionChunk> & { winningModel: string }> {
    if (!models || models.length === 0) {
      throw new APIError('At least one model must be specified in race', 400);
    }

    const streamPromises = models.map(async (model) => {
      const stream = await this.completions.create({
        ...params,
        model,
        stream: true
      });
      // Test first chunk availability
      const iterator = stream[Symbol.asyncIterator]();
      const firstResult = await iterator.next();
      return {
        model,
        firstChunk: firstResult,
        iterator
      };
    });

    const winner = await Promise.race(streamPromises);

    async function* combinedStream() {
      if (!winner.firstChunk.done && winner.firstChunk.value) {
        yield winner.firstChunk.value;
      }
      while (true) {
        const next = await winner.iterator.next();
        if (next.done) break;
        yield next.value;
      }
    }

    const resultStream = combinedStream() as any;
    resultStream.winningModel = winner.model;
    return resultStream;
  }
}
