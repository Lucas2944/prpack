import test from 'node:test';
import assert from 'node:assert/strict';
import { runReview, estimateReviewCost } from '../src/review.js';
import { getReviewPrompt } from '../src/prompts.js';

test('estimates review cost from approximate input tokens plus output budget', () => {
  assert.equal(estimateReviewCost(10_000), 0.035);
});

test('requires an Anthropic API key from flag or environment', async () => {
  await assert.rejects(
    runReview({
      context: '# Pull Request Context',
      angle: 'general',
      stdout: captureStream(),
      stderr: captureStream(),
    }),
    /Pass --api-key <key> or set ANTHROPIC_API_KEY/,
  );
});

test('streams text deltas from the Anthropic Messages SSE response', async () => {
  const originalFetch = global.fetch;
  const stdout = captureStream();
  const stderr = captureStream();
  let request;

  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      body: fakeSseStream([
        'event: message_start\ndata: {"type":"message_start","message":{"content":[]}}\n\n',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Ship"}}\n\n',
        'event: ping\ndata: {"type":"ping"}\n\n',
        'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" it"}}\n\n',
        'event: message_stop\ndata: {"type":"message_stop"}\n\n',
      ]),
      text: async () => '',
    };
  };

  try {
    const result = await runReview({
      context: '# Pull Request Context\n\nBody',
      angle: 'security',
      apiKey: 'test-key',
      model: 'claude-test',
      yes: true,
      stdout,
      stderr,
    });

    assert.equal(result.review, 'Ship it');
    assert.equal(stdout.text, 'Ship it');
    assert.match(stderr.text, /estimated review cost ~\$/);
    assert.equal(request.url, 'https://api.anthropic.com/v1/messages');
    assert.equal(request.options.headers['x-api-key'], 'test-key');
    assert.equal(request.options.headers['anthropic-version'], '2023-06-01');

    const body = JSON.parse(request.options.body);
    assert.equal(body.model, 'claude-test');
    assert.equal(body.stream, true);
    assert.equal(body.max_tokens, 1500);
    assert.match(body.messages[0].content, /# Pull Request Context/);
    assert.match(body.messages[0].content, /# Security review prompt/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('surfaces Anthropic API error bodies', async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => ({
    ok: false,
    status: 400,
    body: null,
    text: async () => '{"error":{"message":"bad request"}}',
  });

  try {
    await assert.rejects(
      runReview({
        context: '# Pull Request Context',
        angle: 'general',
        apiKey: 'test-key',
        yes: true,
        stdout: captureStream(),
        stderr: captureStream(),
      }),
      /bad request/,
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('rejects unsupported review angles', () => {
  assert.throws(() => getReviewPrompt('style'), /unknown review angle/);
});

function captureStream() {
  return {
    text: '',
    write(chunk) {
      this.text += String(chunk);
    },
  };
}

function fakeSseStream(chunks) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}
