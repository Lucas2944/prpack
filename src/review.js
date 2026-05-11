import { createInterface } from 'node:readline/promises';
import { stdin as processStdin, stderr as processStderr, stdout as processStdout } from 'node:process';
import { getReviewPrompt } from './prompts.js';

export const DEFAULT_REVIEW_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const OUTPUT_TOKEN_ESTIMATE = 1500;

export function estimateInputTokens(text) {
  return Math.ceil(Buffer.byteLength(text, 'utf8') / 4);
}

export function estimateReviewCost(inputTokens) {
  return Number((0.005 + inputTokens * 0.000003).toFixed(6));
}

export async function runReview({
  context,
  angle = 'general',
  apiKey = process.env.ANTHROPIC_API_KEY,
  model = DEFAULT_REVIEW_MODEL,
  yes = false,
  stdin = processStdin,
  stdout = processStdout,
  stderr = processStderr,
} = {}) {
  if (!apiKey) {
    throw new Error('missing Anthropic API key. Pass --api-key <key> or set ANTHROPIC_API_KEY.');
  }

  const prompt = appendReviewPrompt(context, getReviewPrompt(angle));
  const inputTokens = estimateInputTokens(prompt);
  const cost = estimateReviewCost(inputTokens);
  stderr.write(
    `prpack: estimated review cost ~$${cost.toFixed(3)} ` +
      `(${inputTokens.toLocaleString()} input tokens + ~${OUTPUT_TOKEN_ESTIMATE.toLocaleString()} output tokens)\n`,
  );

  if (!yes && stdin.isTTY) {
    const ok = await confirmProceed(stdin, stderr);
    if (!ok) {
      throw new Error('review canceled by user');
    }
  }

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: OUTPUT_TOKEN_ESTIMATE,
      stream: true,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Anthropic API error (${response.status})`);
  }

  if (!response.body || typeof response.body.getReader !== 'function') {
    throw new Error('Anthropic response did not include a readable stream');
  }

  const review = await streamTextDeltas(response.body, stdout);
  return { review, inputTokens, cost };
}

function appendReviewPrompt(context, prompt) {
  return `${context.replace(/\s+$/, '')}\n\n---\n## Review prompt\n\n${prompt}\n`;
}

async function confirmProceed(stdin, stderr) {
  const rl = createInterface({ input: stdin, output: stderr });
  try {
    const answer = await rl.question('Proceed with review? y/N ');
    return /^(y|yes)$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

async function streamTextDeltas(body, stdout) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let review = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseCompleteSseEvents(buffer);
    buffer = parsed.rest;
    for (const event of parsed.events) {
      const text = textFromEvent(event);
      if (text) {
        stdout.write(text);
        review += text;
      }
    }
  }

  buffer += decoder.decode();
  const parsed = parseCompleteSseEvents(`${buffer}\n\n`);
  for (const event of parsed.events) {
    const text = textFromEvent(event);
    if (text) {
      stdout.write(text);
      review += text;
    }
  }

  return review;
}

function parseCompleteSseEvents(raw) {
  const parts = raw.split(/\r?\n\r?\n/);
  const rest = parts.pop() ?? '';
  return {
    rest,
    events: parts.map(parseSseBlock).filter(Boolean),
  };
}

function parseSseBlock(block) {
  const data = [];
  let event = null;

  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      data.push(line.slice(5).trimStart());
    }
  }

  if (data.length === 0) return null;
  return { event, data: data.join('\n') };
}

function textFromEvent(event) {
  if (event.data === '[DONE]') return '';

  let payload;
  try {
    payload = JSON.parse(event.data);
  } catch {
    return '';
  }

  if (payload.type === 'error') {
    const message = payload.error?.message || 'Anthropic stream error';
    throw new Error(message);
  }

  if (
    payload.type === 'content_block_delta' &&
    payload.delta?.type === 'text_delta' &&
    typeof payload.delta.text === 'string'
  ) {
    return payload.delta.text;
  }

  return '';
}
