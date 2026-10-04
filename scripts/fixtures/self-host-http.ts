/** Test-only raw HTTP transport. Node fetch intentionally ignores a custom Host;
 * this adapter sends the actual virtual host and never redirects or retries. */
import { request } from 'node:http';
import { Readable } from 'node:stream';
export const fixtureFetch: typeof fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') throw new Error('Fixture transport is loopback-only.');
  return new Promise<Response>((resolve, reject) => {
    const req = request(url, { method: init.method || 'GET', headers: Object.fromEntries(new Headers(init.headers)), signal: init.signal || undefined }, incoming => {
      const headers = new Headers();
      for (let i = 0; i < incoming.rawHeaders.length; i += 2) headers.append(incoming.rawHeaders[i], incoming.rawHeaders[i + 1]);
      const empty = init.method === 'HEAD' || [204, 304].includes(incoming.statusCode!);
      if (empty) incoming.resume();
      resolve(new Response(empty ? null : Readable.toWeb(incoming) as ReadableStream<Uint8Array>, { status: incoming.statusCode, headers }));
    });
    req.on('error', reject);
    if (init.body != null) {
      if (typeof init.body !== 'string' && !(init.body instanceof URLSearchParams)) { req.destroy(); reject(new Error('Unsupported fixture body.')); return; }
      req.write(String(init.body));
    }
    req.end();
  });
};
