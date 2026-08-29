import type {
  ChatCompletionRequest,
  ImageGenerationRequest,
  ImageGenerationResponse,
  DecryptedGalxSecret,
  ModelSpecItem
} from '../../contracts/GalxContracts';

export class OpenAIAdapter {
  private static readonly BASE_URL = 'https://api.openai.com/v1';

  /**
   * Pre-warms DNS and HTTP keep-alive socket connection to OpenAI endpoints in background.
   */
  static prewarmConnection(): void {
    try {
      fetch(`${this.BASE_URL}/models`, {
        method: 'HEAD',
        headers: { 'Connection': 'keep-alive' }
      }).catch(() => {});
    } catch {}
  }

  /**
   * Executes synchronous or streaming chat completion against OpenAI endpoint.
   */
  static async executeChatCompletion(
    req: ChatCompletionRequest,
    secret: DecryptedGalxSecret,
    modelSpec: ModelSpecItem
  ): Promise<{ response: Response; headers: Record<string, string> }> {
    const token = secret.apiKey || secret.accessToken;
    if (!token) {
      throw new Error('Missing OpenAI API key or OAuth access token in shard secret');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Zero-Data-Retention': 'true',
      'X-No-Storage': 'true',
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=60, max=1000'
    };

    if (secret.accountId) {
      headers['OpenAI-Account'] = secret.accountId;
      headers['ChatGPT-Account-Id'] = secret.accountId;
    }

    const body: Record<string, any> = {
      model: modelSpec.upstreamId,
      messages: req.messages,
      stream: !!req.stream,
      temperature: req.temperature ?? 0.7,
      store: false // Zero Data Retention: Prevents OpenAI from persisting or training on completions
    };

    if (req.max_tokens !== undefined) body.max_tokens = req.max_tokens;
    if (req.max_completion_tokens !== undefined) body.max_completion_tokens = req.max_completion_tokens;
    if (req.top_p !== undefined) body.top_p = req.top_p;
    if (req.presence_penalty !== undefined) body.presence_penalty = req.presence_penalty;
    if (req.frequency_penalty !== undefined) body.frequency_penalty = req.frequency_penalty;
    if (req.prompt_cache_key !== undefined) body.prompt_cache_key = req.prompt_cache_key;
    if (req.prompt_cache_options !== undefined) body.prompt_cache_options = req.prompt_cache_options;
    if (req.safety_identifier !== undefined) body.safety_identifier = req.safety_identifier;

    const response = await fetch(`${this.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => {
      responseHeaders[k.toLowerCase()] = v;
    });

    return { response, headers: responseHeaders };
  }

  /**
   * Executes visual synthesis / image generation against OpenAI endpoint.
   */
  static async executeImageGeneration(
    req: ImageGenerationRequest,
    secret: DecryptedGalxSecret,
    modelSpec: ModelSpecItem,
    shardId: string
  ): Promise<ImageGenerationResponse> {
    const token = secret.apiKey || secret.accessToken;
    if (!token) {
      throw new Error('Missing OpenAI API key or OAuth access token');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    if (secret.accountId) {
      headers['OpenAI-Account'] = secret.accountId;
      headers['ChatGPT-Account-Id'] = secret.accountId;
    }

    const body: Record<string, any> = {
      model: modelSpec.upstreamId,
      prompt: req.prompt.trim(),
      n: req.n || 1,
      size: req.size || '1024x1024',
      quality: req.quality || 'standard',
      response_format: req.response_format || 'url'
    };

    const response = await fetch(`${this.BASE_URL}/images/generations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI Image Generation error (${response.status}): ${errText}`);
    }

    const result = await response.json() as any;

    return {
      created: result.created || Math.floor(Date.now() / 1000),
      data: result.data || [],
      modelUsed: modelSpec.id,
      shardId
    };
  }
}
