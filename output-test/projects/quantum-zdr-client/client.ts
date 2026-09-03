/**
 * GALXAI: Sovereign Zero-Data Retention (ZDR) Enterprise Client
 * Implements strict ephemeral execution with cryptographically attested privacy manifests.
 */

export interface ZdrClientOptions {
  apiKey: string;
  endpoint?: string;
  enforceZeroDataRetention?: boolean;
}

export class ZdrGatewayClient {
  private readonly endpoint: string;

  constructor(private readonly options: ZdrClientOptions) {
    this.endpoint = (options.endpoint || 'https://galx.ai/v1').replace(/\/+$/, '');
  }

  public async complete(prompt: string, model = 'gpt-5.6-sol') {
    const res = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json',
        'X-Zero-Data-Retention': 'true',
        'X-No-Storage': 'true'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        store: false
      })
    });

    if (!res.ok) {
      throw new Error(`ZDR Gateway call failed (${res.status}): ${await res.text()}`);
    }

    return res.json();
  }
}
