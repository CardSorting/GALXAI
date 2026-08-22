# ⚡ Server-Sent Events (SSE) Streaming Protocol

GALXAI implements high-performance, zero-allocation Server-Sent Events (SSE) streaming compliant with the OpenAI API protocol and RFC 8895.

---

## 1. Protocol Specification

### HTTP Ingress Request
```http
POST /v1/chat/completions HTTP/1.1
Host: api.galx.ai
Authorization: Bearer galx_live_...
Content-Type: application/json

{
  "model": "gpt-5.6-sol",
  "messages": [{"role": "user", "content": "Hello"}],
  "stream": true
}
```

### HTTP Egress Response Headers
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

### Event Stream Frame Format
```text
data: {"id":"chatcmpl-01","object":"chat.completion.chunk","created":1700000000,"model":"gpt-5.6-sol","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-01","object":"chat.completion.chunk","created":1700000000,"model":"gpt-5.6-sol","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-01","object":"chat.completion.chunk","created":1700000000,"model":"gpt-5.6-sol","choices":[{"index":0,"delta":{"content":" world!"},"finish_reason":null}]}

data: {"id":"chatcmpl-01","object":"chat.completion.chunk","created":1700000000,"model":"gpt-5.6-sol","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]

```

---

## 2. Client Abort & Stream Cancellation Safety

When a client closes the network connection or calls `abortController.abort()`:

```mermaid
sequenceDiagram
    autonumber
    Client->>Gateway: POST /v1/chat/completions (stream=true)
    Gateway->>Pool: Acquire Shard Lease (Phase 1 Token Reservation)
    Gateway->>Upstream: Forward Request to OpenAI/xAI
    Upstream-->>Gateway: SSE Stream Chunks
    Gateway-->>Client: Forward Chunks
    Client--xGateway: Client Closes Tab / Aborts Connection
    Gateway->>Gateway: ReadableStream.cancel() Triggered
    Gateway->>Upstream: Abort Upstream Fetch Connection
    Gateway->>Pool: Release Lease & Commit only tokens read so far
    Gateway->>Metrics: Log HTTP 499 Disconnect Sample
```

### Key Guarantees
1. **Zero Leaked Concurrency Slots**: The shard lease is freed immediately upon client disconnect without waiting for upstream generation to finish.
2. **Zero Leaked Token Quota**: The 2-Phase Token Reservation releases unconsumed tokens back into the shard's bucket.
3. **Instant Upstream Cancellation**: Aborts the active fetch stream, preventing upstream token billing for abandoned generations.

---

## 3. Pure JavaScript SSE Parser (Zero Dependencies)

```javascript
async function streamCompletion(prompt) {
  const response = await fetch('http://localhost:3000/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer galx_live_your_key_here'
    },
    body: JSON.stringify({
      model: 'gpt-5.6-sol',
      messages: [{ role: 'user', content: prompt }],
      stream: true
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete chunk in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;
      if (trimmed === 'data: [DONE]') return;

      if (trimmed.startsWith('data: ')) {
        const json = JSON.parse(trimmed.substring(6));
        const token = json.choices[0]?.delta?.content || '';
        process.stdout.write(token);
      }
    }
  }
}
```
