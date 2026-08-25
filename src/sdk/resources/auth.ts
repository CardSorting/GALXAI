import type { GalxAIClientCore } from '../client';
import type { OAuthUrlDetails } from '../../core/contracts/GalxContracts';

/**
 * Universal Developer SDK: Authentication & OAuth Token Lifecycle Resource.
 */
export class AuthResource {
  constructor(private readonly core: GalxAIClientCore) {}

  /**
   * Generates an RFC 7636 PKCE Authorization URL with S256 code challenge.
   */
  async getOAuthUrl(provider: 'openai' | 'xai-grok' = 'openai', redirectUri?: string): Promise<OAuthUrlDetails> {
    const params = new URLSearchParams({ provider });
    if (redirectUri) params.set('redirectUri', redirectUri);
    return this.core.request<OAuthUrlDetails>(`/api/auth/oauth/url?${params.toString()}`);
  }

  /**
   * Exchanges an OAuth authorization code and PKCE verifier for a vaulted session.
   */
  async exchangeOAuthCode(options: {
    code: string;
    codeVerifier: string;
    state?: string;
    provider?: 'openai' | 'xai-grok';
    redirectUri?: string;
    mode?: 'pooled' | 'private';
  }): Promise<any> {
    return this.core.request('/api/auth/oauth/callback', {
      method: 'POST',
      body: options
    });
  }

  /**
   * Triggers single-flight token refresh for the active provider connection.
   */
  async refreshOAuthToken(shardId?: string): Promise<{ success: boolean; refreshed?: boolean; shardId?: string }> {
    return this.core.request('/api/auth/oauth/refresh', {
      method: 'POST',
      body: { shardId }
    });
  }

  /**
   * Introspects and validates the current active session.
   */
  async getSession(): Promise<{ valid: boolean; user?: any; error?: string }> {
    return this.core.request('/api/auth/session', { method: 'GET' });
  }

  /**
   * Introspects an active Bearer or OAuth token according to RFC 7662.
   */
  async introspectToken(token: string): Promise<any> {
    return this.core.request('/api/auth/oauth/introspect', {
      method: 'POST',
      body: { token }
    });
  }

  /**
   * Revokes an active OAuth token or session token according to RFC 7009.
   */
  async revokeToken(options: { token: string; tokenTypeHint?: 'access_token' | 'refresh_token' }): Promise<void> {
    return this.core.request('/api/auth/oauth/revoke', {
      method: 'POST',
      body: { token: options.token, token_type_hint: options.tokenTypeHint }
    });
  }

  /**
   * Revokes the active session token across all caches and databases.
   */
  async logout(): Promise<{ success: boolean; message: string }> {
    return this.core.request('/api/auth/session', { method: 'DELETE' });
  }

  /**
   * Lists all connected provider identities (OpenAI, xAI Grok) linked to the user account.
   */
  async listIdentities(): Promise<{ success: boolean; identities: any[] }> {
    return this.core.request('/api/auth/identities', { method: 'GET' });
  }

  /**
   * Unlinks / disconnects a specific provider account from the user profile.
   */
  async unlinkProvider(provider: 'openai' | 'xai-grok'): Promise<{ success: boolean; message: string }> {
    return this.core.request(`/api/auth/identities?provider=${provider}`, { method: 'DELETE' });
  }

  /**
   * Pushes an authorization request directly according to RFC 9126 (PAR).
   */
  async pushAuthorization(params: {
    provider?: 'openai' | 'xai-grok';
    clientId: string;
    redirectUri: string;
    scope?: string;
    codeChallenge?: string;
    state?: string;
  }): Promise<{ request_uri: string; expires_in: number }> {
    return this.core.request('/api/auth/oauth/par', {
      method: 'POST',
      body: params
    });
  }

  /**
   * Initiates an RFC 8628 Device Authorization Grant (Device Flow) for headless terminals / SSH sessions.
   */
  async requestDeviceCode(provider: 'openai' | 'xai-grok' = 'openai'): Promise<{
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete: string;
    expires_in: number;
    interval: number;
  }> {
    return this.core.request('/api/auth/oauth/device/code', {
      method: 'POST',
      body: { provider }
    });
  }

  /**
   * Polls for completion of an RFC 8628 Device Authorization Grant.
   */
  async pollDeviceToken(deviceCode: string): Promise<any> {
    return this.core.request('/api/auth/oauth/device/token', {
      method: 'POST',
      body: { device_code: deviceCode }
    });
  }

  /**
   * Executes complete end-to-end Device Flow login with polling loop.
   */
  async deviceLogin(options?: {
    provider?: 'openai' | 'xai-grok';
    onPrompt?: (details: { userCode: string; verificationUri: string; verificationUriComplete: string }) => void;
  }): Promise<{ access_token: string; user?: any }> {
    const details = await this.requestDeviceCode(options?.provider || 'openai');

    if (options?.onPrompt) {
      options.onPrompt({
        userCode: details.user_code,
        verificationUri: details.verification_uri,
        verificationUriComplete: details.verification_uri_complete
      });
    }

    let intervalSec = details.interval || 5;
    const expiresAt = Date.now() + details.expires_in * 1000;

    while (Date.now() < expiresAt) {
      await new Promise((r) => setTimeout(r, intervalSec * 1000));
      try {
        const res = await this.pollDeviceToken(details.device_code);
        if (res && (res.access_token || res.token)) {
          return res;
        }
      } catch (err: any) {
        if (err.status === 400 || err.message?.includes('authorization_pending')) {
          continue;
        }
        if (err.message?.includes('slow_down')) {
          intervalSec += 5;
          continue;
        }
        throw err;
      }
    }

    throw new Error('Device login timed out.');
  }

  /**
   * Spawns a local ephemeral HTTP server and executes interactive browser OAuth login.
   * Tailored for CLI tools, autonomous agents, and developer workstations.
   */
  async interactiveLogin(options?: {
    provider?: 'openai' | 'xai-grok';
    port?: number;
    timeoutMs?: number;
    openBrowser?: boolean;
  }): Promise<{ success: boolean; token: string; user: any }> {
    const provider = options?.provider || 'openai';
    const port = options?.port || 54321;
    const timeoutMs = options?.timeoutMs || 120_000;
    const redirectUri = `http://127.0.0.1:${port}/callback`;

    const authDetails = await this.getOAuthUrl(provider, redirectUri);

    if (typeof window === 'undefined') {
      const http = await import('node:http');

      return new Promise((resolve, reject) => {
        const timeoutTimer = setTimeout(() => {
          server.close();
          reject(new Error('Interactive OAuth login timed out (exceeded 2 minutes).'));
        }, timeoutMs);

        const server = http.createServer(async (req, res) => {
          const reqUrl = new URL(req.url || '/', `http://127.0.0.1:${port}`);
          if (reqUrl.pathname === '/callback') {
            const code = reqUrl.searchParams.get('code');
            const state = reqUrl.searchParams.get('state');
            const error = reqUrl.searchParams.get('error');

            if (error || !code) {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(`<html><body style="font-family:sans-serif;padding:40px;background:#07080d;color:#f43f5e;"><h2>Authentication Failed</h2><p style="color:#9ca3af;">${error || 'Missing authorization code'}</p></body></html>`);
              clearTimeout(timeoutTimer);
              server.close();
              reject(new Error(error || 'Missing code in callback'));
              return;
            }

            try {
              const exchangeResult = await this.exchangeOAuthCode({
                code,
                codeVerifier: authDetails.codeVerifier,
                state: state || authDetails.state,
                provider,
                redirectUri
              });

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`<html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#07080d;color:#10b981;"><h2>Authenticated with GALXAI</h2><p style="color:#9ca3af;">You may close this tab and return to your terminal.</p></body></html>`);

              clearTimeout(timeoutTimer);
              server.close();

              resolve({
                success: true,
                token: exchangeResult.user?.token || exchangeResult.token,
                user: exchangeResult.user
              });
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'text/html' });
              res.end(`<html><body style="font-family:sans-serif;padding:40px;background:#07080d;color:#f43f5e;"><h2>Exchange Failed</h2><p style="color:#9ca3af;">${err.message}</p></body></html>`);
              clearTimeout(timeoutTimer);
              server.close();
              reject(err);
            }
          } else {
            res.writeHead(404);
            res.end();
          }
        });

        server.listen(port, () => {
          if (options?.openBrowser !== false) {
            import('node:child_process').then(({ exec }) => {
              const cmd = process.platform === 'darwin' ? `open "${authDetails.url}"` : process.platform === 'win32' ? `start "" "${authDetails.url}"` : `xdg-open "${authDetails.url}"`;
              exec(cmd, () => {});
            }).catch(() => {});
          }
        });

        server.on('error', (err) => {
          clearTimeout(timeoutTimer);
          reject(err);
        });
      });
    }

    throw new Error('interactiveLogin is designed for Node.js / CLI environments.');
  }
}
