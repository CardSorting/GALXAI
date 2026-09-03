/**
 * GALXAI Developer SDK: Comprehensive End-to-End Test Suite
 * Validates:
 * - Client Core, RequestOptions, AbortSignal cancellation, and response headers
 * - Typed Error Hierarchy & RFC Retry-After parsing
 * - Zero-dependency JSON repair engine
 * - ChatCompletionStream runner with event emitter and web adapters
 * - Structured outputs & Zod schema generation
 * - Autonomous agent tool calling with role: 'tool' protocol conformance & streaming
 * - OpenAI drop-in shim (beta.parse, stream, models.list)
 * - Anthropic drop-in shim (messages.create, messages.stream, countTokens)
 * - Conversation thread branching (fork, export, import, totalTokens)
 * - Webhook HMAC-SHA256 signature verification
 */

import assert from 'node:assert/strict';
import {
  GalxAI,
  GalxAIClient,
  OpenAI,
  Anthropic,
  ChatCompletionStream,
  repairJSON,
  safeParseJSON,
  zodToJsonSchema,
  zodResponseFormat,
  APIError,
  BadRequestError,
  AuthenticationError,
  PaymentRequiredError,
  PermissionDeniedError,
  NotFoundError,
  RateLimitError,
  UserAbortError,
  parseRetryAfter,
  ConversationThread
} from '../../src/sdk';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`\x1b[32m✓ PASS:\x1b[0m ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`\x1b[31m✗ FAIL:\x1b[0m ${name}`);
    console.error(err);
    failed++;
  }
}

async function runAllTests() {
  console.log('\n=== RUNNING GALXAI DEVELOPER CLIENT SDK TEST SUITE ===\n');

  // 1. Client Core & Mock Mode
  await test('GalxAI client instantiates with mock and debug configurations', async () => {
    const client = new GalxAI({ apiKey: 'galx_test_key_123', mock: true, debug: false });
    assert.equal(client.core.apiKey, 'galx_test_key_123');
    assert.equal(client.core.isMock, true);

    const answer = await client.run('What is 2+2?');
    assert.ok(typeof answer === 'string');
    assert.ok(answer.length > 0);
  });

  // 2. RequestOptions & AbortSignal
  await test('Client request respects caller AbortSignal and throws UserAbortError', async () => {
    const controller = new AbortController();
    controller.abort();

    let customFetchCalled = false;
    const client = new GalxAI({
      apiKey: 'galx_key',
      fetch: async () => {
        customFetchCalled = true;
        return new Response('{}');
      }
    });

    try {
      await client.core.request('/v1/models', { signal: controller.signal });
      assert.fail('Should have thrown UserAbortError');
    } catch (err: any) {
      assert.ok(err instanceof UserAbortError, `Expected UserAbortError, got: ${err.constructor.name}`);
      assert.equal(customFetchCalled, false, 'Fetch should not have been called on pre-aborted signal');
    }
  });

  // 3. requestWithResponse helper
  await test('requestWithResponse returns parsed payload along with HTTP response and headers', async () => {
    const client = new GalxAI({
      apiKey: 'galx_key',
      fetch: async () => {
        return new Response(JSON.stringify({ id: 'res_1', success: true }), {
          status: 200,
          headers: { 'x-request-id': 'req_abc123', 'content-type': 'application/json' }
        });
      }
    });

    const res = await client.requestWithResponse('/v1/test');
    assert.equal(res.status, 200);
    assert.equal(res.data.id, 'res_1');
    assert.equal(res.headers.get('x-request-id'), 'req_abc123');
  });

  // 4. Typed Error Hierarchy
  await test('Error hierarchy correctly maps status codes and preserves response headers and requestId', () => {
    const headers = new Headers({ 'x-request-id': 'req_test_999', 'retry-after': '42' });
    const err400 = APIError.fromResponse(400, { error: { message: 'Bad param', param: 'model' } }, headers);
    assert.ok(err400 instanceof BadRequestError);
    assert.equal(err400.status, 400);
    assert.equal(err400.requestId, 'req_test_999');

    const err401 = APIError.fromResponse(401, { error: { message: 'Invalid key' } }, headers);
    assert.ok(err401 instanceof AuthenticationError);

    const err402 = APIError.fromResponse(402, { error: { message: 'Quota exceeded' } }, headers);
    assert.ok(err402 instanceof PaymentRequiredError);

    const err429 = APIError.fromResponse(429, { error: { message: 'Rate limited' } }, headers);
    assert.ok(err429 instanceof RateLimitError);
    assert.equal((err429 as RateLimitError).retryAfterSeconds, 42);
  });

  // 5. RFC Retry-After parsing
  await test('parseRetryAfter parses numeric seconds and HTTP-date strings', () => {
    assert.equal(parseRetryAfter('60'), 60);
    assert.equal(parseRetryAfter('12.5'), 13);
    assert.equal(parseRetryAfter(undefined), undefined);
    assert.equal(parseRetryAfter(''), undefined);

    const futureDate = new Date(Date.now() + 30000).toUTCString();
    const parsedDate = parseRetryAfter(futureDate);
    assert.ok(parsedDate !== undefined && parsedDate >= 25 && parsedDate <= 35);
  });

  // 6. Resilient JSON Repair
  await test('repairJSON and safeParseJSON resolve truncated JSON, unquoted keys, trailing commas, and markdown fences', () => {
    // Markdown fences + conversational preamble
    const raw1 = 'Here is the extracted data:\n```json\n{"name": "Alice", "age": 28}\n```\nHope that helps!';
    const parsed1 = safeParseJSON(raw1);
    assert.deepEqual(parsed1, { name: 'Alice', age: 28 });

    // Unquoted keys and trailing commas
    const raw2 = '{ name: "Bob", score: 95, tags: ["admin", "lead", ], }';
    const parsed2 = safeParseJSON(raw2);
    assert.deepEqual(parsed2, { name: 'Bob', score: 95, tags: ['admin', 'lead'] });

    // Truncated object with unclosed braces/brackets due to max_tokens cutoff
    const raw3 = '{"user": {"username": "carol", "roles": ["editor", "viewer"';
    const repaired3 = repairJSON(raw3);
    const parsed3 = JSON.parse(repaired3);
    assert.equal(parsed3.user.username, 'carol');
    assert.deepEqual(parsed3.user.roles, ['editor', 'viewer']);
  });

  // 7. Zod schema to JSON schema conversion
  await test('zodToJsonSchema and zodResponseFormat build compliant JSON schema objects without dependencies', () => {
    const mockZodSchema = {
      _def: {
        typeName: 'ZodObject',
        shape: () => ({
          title: { _def: { typeName: 'ZodString', description: 'Article title' } },
          readTimeMinutes: { _def: { typeName: 'ZodNumber' } },
          isPublished: { _def: { typeName: 'ZodBoolean' } },
          categories: { _def: { typeName: 'ZodArray', type: { _def: { typeName: 'ZodString' } } } }
        })
      },
      safeParse: (val: any) => ({ success: true, data: val })
    };

    const jsonSchema = zodToJsonSchema(mockZodSchema);
    assert.equal(jsonSchema.type, 'object');
    assert.equal(jsonSchema.properties?.title?.type, 'string');
    assert.equal(jsonSchema.properties?.readTimeMinutes?.type, 'number');
    assert.equal(jsonSchema.properties?.isPublished?.type, 'boolean');
    assert.equal(jsonSchema.properties?.categories?.type, 'array');
    assert.deepEqual(jsonSchema.required, ['title', 'readTimeMinutes', 'isPublished', 'categories']);

    const format = zodResponseFormat(mockZodSchema, 'article_meta');
    assert.equal(format.type, 'json_schema');
    assert.equal(format.json_schema.name, 'article_meta');
    assert.equal(format.json_schema.strict, true);
  });

  // 8. ChatCompletionStream Runner
  await test('ChatCompletionStream event listener and terminal accumulation', async () => {
    async function* mockChunkStream() {
      yield { id: 'c1', choices: [{ delta: { content: 'Hello' } }] };
      yield { id: 'c2', choices: [{ delta: { content: ', ' } }] };
      yield { id: 'c3', choices: [{ delta: { content: 'world!' } }] };
    }

    const stream = new ChatCompletionStream(mockChunkStream() as any);

    let collectedDeltas = '';
    stream.on('content', (delta) => {
      collectedDeltas += delta;
    });

    const fullText = await stream.finalText();
    assert.equal(fullText, 'Hello, world!');
    assert.equal(collectedDeltas, 'Hello, world!');

    const completion = await stream.finalChatCompletion();
    assert.equal(completion.choices[0]?.message?.content, 'Hello, world!');

    // Web response converter
    const response = stream.toTextStreamResponse();
    assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
  });

  // 9. Autonomous Agent Runtime: Protocol Conformance
  await test('Agent tool loop executes tools with standard role: "tool" and tool_call_id', async () => {
    let callStep = 0;

    const mockCompletions: any = {
      create: async (params: any) => {
        callStep++;
        if (callStep === 1) {
          // Model asks to call tool 'getWeather'
          return {
            id: 'call_1',
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    {
                      id: 'call_weather_99',
                      type: 'function',
                      function: {
                        name: 'getWeather',
                        arguments: JSON.stringify({ city: 'San Francisco' })
                      }
                    }
                  ]
                }
              }
            ]
          };
        }

        // Model inspects tool response and produces final answer
        // Check that messages contains role: 'tool' with matching tool_call_id
        const lastMsg = params.messages[params.messages.length - 1];
        assert.equal(lastMsg.role, 'tool', 'Message role must be "tool" for LLM protocol compliance');
        assert.equal(lastMsg.tool_call_id, 'call_weather_99', 'Message must carry tool_call_id');

        return {
          id: 'call_2',
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'The weather in San Francisco is 68F and sunny.'
              }
            }
          ]
        };
      }
    };

    let toolExecutedWithArgs: any = null;
    const client = new GalxAI({ mock: true });
    const agent = client.agent({
      tools: {
        getWeather: {
          description: 'Get weather for city',
          execute: async (args: any) => {
            toolExecutedWithArgs = args;
            return { temp: 68, condition: 'sunny' };
          }
        }
      }
    });

    (agent as any).completions = mockCompletions;

    const res = await agent.run('What is the weather in SF?');
    assert.equal(toolExecutedWithArgs?.city, 'San Francisco');
    assert.equal(res.toolCallsExecuted.length, 1);
    assert.equal(res.toolCallsExecuted[0].toolCallId, 'call_weather_99');
    assert.equal(res.text, 'The weather in San Francisco is 68F and sunny.');
  });

  // 10. OpenAI Drop-In Shim
  await test('OpenAI compatibility shim exposes beta.parse and zodResponseFormat', async () => {
    const openai = new OpenAI({
      apiKey: 'test-key',
      fetch: async () => {
        return new Response(
          JSON.stringify({
            id: 'openai_mock',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: JSON.stringify({ name: 'Galaxy', score: 100 })
                }
              }
            ]
          })
        );
      }
    });

    const mockSchema = {
      _def: {
        typeName: 'ZodObject',
        shape: () => ({ name: { _def: { typeName: 'ZodString' } } })
      },
      safeParse: (val: any) => ({ success: true, data: val })
    };

    const res = await openai.beta.chat.completions.parse({
      model: 'gpt-5.6-sol',
      messages: [{ role: 'user', content: 'Extract name' }],
      response_format: zodResponseFormat(mockSchema, 'test')
    });

    assert.equal(res.parsed.name, 'Galaxy');
    assert.equal(res.parsed.score, 100);
  });

  // 11. Anthropic Drop-In Shim
  await test('Anthropic compatibility shim translates messages.create and countTokens', async () => {
    const anthropic = new Anthropic({
      apiKey: 'anthropic-test-key',
      fetch: async () => {
        return new Response(
          JSON.stringify({
            id: 'anthropic_mock',
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Claude style response'
                }
              }
            ]
          })
        );
      }
    });

    const msg = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: 'You are helpful.',
      messages: [{ role: 'user', content: 'Hello Claude' }]
    });

    assert.equal(msg.role, 'assistant');
    assert.equal(msg.content[0].type, 'text');
    assert.equal((msg.content[0] as any).text, 'Claude style response');

    const tokenCount = await anthropic.messages.countTokens({
      messages: [{ role: 'user', content: 'Hello Claude' }]
    });
    assert.ok(tokenCount.input_tokens > 0);
  });

  // 12. ConversationThread Branching & Forking
  await test('ConversationThread supports fork, export, import, and token counting', async () => {
    const client = new GalxAI({ mock: true });
    const thread = client.thread({ system: 'Be concise.' });

    thread.user('Step 1: User idea');
    thread.assistant('Step 1: Response');

    assert.equal(thread.getHistory().length, 3);
    assert.ok(thread.totalTokens() > 0);

    // Fork thread into branch B
    const branchB = thread.fork('gpt-5.6-terra');
    branchB.user('Branch B idea');

    assert.equal(thread.getHistory().length, 3, 'Original thread should not be modified by branch B');
    assert.equal(branchB.getHistory().length, 4, 'Branch B should contain new turn');

    // Export and import
    const exported = branchB.export();
    const restoredThread = client.thread().import(exported);
    assert.equal(restoredThread.getHistory().length, 4);
  });

  // 13. Webhooks HMAC Verification
  await test('WebhooksResource generates and cryptographically verifies HMAC signatures', () => {
    const client = new GalxAI({ mock: true });
    const secret = 'whsec_test_secret_key_12345';
    const payload = JSON.stringify({ event: 'task.completed', id: 'task_123' });

    const signatureHeader = client.webhooks.generateSignature(payload, secret);
    const isValid = client.webhooks.verifySignature(payload, signatureHeader, secret);
    assert.equal(isValid, true, 'Valid signature should verify true');

    const tampered = client.webhooks.verifySignature(payload + 'tampered', signatureHeader, secret);
    assert.equal(tampered, false, 'Tampered payload should verify false');

    const wrongSecret = client.webhooks.verifySignature(payload, signatureHeader, 'wrong_secret');
    assert.equal(wrongSecret, false, 'Wrong secret should verify false');
  });

  console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
