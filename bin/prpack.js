#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pack } from '../src/pack.js';
import { loadConfig } from '../src/config.js';
import { DEFAULT_REVIEW_MODEL, runReview } from '../src/review.js';

const HELP = `prpack — pack a pull request into one markdown file for LLM review

Usage:
  prpack [options]

Options:
  --base <ref>          Base ref to diff against (default: origin/main, falls back to main)
  --head <ref>          Head ref (default: HEAD)
  --out <path>          Output file (default: stdout)
  --config <path>       Load preset from a .prpack.yml file
  --include-tests       Include test files even if not changed (looks for test/ __tests__/ *.test.* *.spec.*)
  --include-untracked   Include untracked files in the diff
  --no-content          Only include the diff, not full file contents
  --max-bytes <n>       Skip files larger than n bytes (default: 200000)
  --exclude <glob>      Exclude paths matching glob (repeatable)
  --review [angle]      Call Anthropic for a streamed review (general, security, performance, tests, architecture)
  --api-key <key>       Anthropic API key (overrides ANTHROPIC_API_KEY)
  --model <id>          Anthropic model for --review (default: ${DEFAULT_REVIEW_MODEL})
  --yes                 Skip cost-estimate confirmation in TTY review mode
  --quiet               Suppress stderr progress logs
  --version             Print version
  --help                Show this help

Examples:
  prpack --out ctx.md
  prpack --review security --api-key "$ANTHROPIC_API_KEY"
  prpack --base develop --include-tests --out review.md
  prpack --config security.yml --out audit.md
  pbpaste | prpack --base HEAD~3 | pbcopy
`;

const opts = {
  base: { type: 'string' },
  head: { type: 'string', default: 'HEAD' },
  out: { type: 'string' },
  config: { type: 'string' },
  'include-tests': { type: 'boolean', default: false },
  'include-untracked': { type: 'boolean', default: false },
  'no-content': { type: 'boolean', default: false },
  'max-bytes': { type: 'string' },
  exclude: { type: 'string', multiple: true },
  review: { type: 'string' },
  'api-key': { type: 'string' },
  model: { type: 'string', default: DEFAULT_REVIEW_MODEL },
  yes: { type: 'boolean', default: false },
  quiet: { type: 'boolean', default: false },
  version: { type: 'boolean', default: false },
  help: { type: 'boolean', default: false },
};

let parsed;
try {
  parsed = parseArgs({
    args: normalizeReviewArg(process.argv.slice(2)),
    options: opts,
    allowPositionals: false,
  });
} catch (err) {
  process.stderr.write(`prpack: ${err.message}\n`);
  process.stderr.write(HELP);
  process.exit(2);
}

const v = parsed.values;

if (v.help) {
  process.stdout.write(HELP);
  process.exit(0);
}

if (v.version) {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8'));
  process.stdout.write(`${pkg.version}\n`);
  process.exit(0);
}

const fileConfig = v.config ? await loadConfig(resolve(v.config)) : {};

const config = {
  base: v.base ?? fileConfig.base,
  head: v.head ?? fileConfig.head ?? 'HEAD',
  includeTests: v['include-tests'] ?? fileConfig.includeTests ?? false,
  includeUntracked: v['include-untracked'] ?? fileConfig.includeUntracked ?? false,
  includeContent: !(v['no-content'] ?? fileConfig.noContent ?? false),
  maxBytes: parseInt(v['max-bytes'] ?? fileConfig.maxBytes ?? '200000', 10),
  exclude: [...(v.exclude ?? []), ...(fileConfig.exclude ?? [])],
  preface: fileConfig.preface,
  reviewPrompt: fileConfig.reviewPrompt,
  quiet: v.quiet,
};

try {
  const output = await pack(config);
  if (v.review !== undefined) {
    if (v.out) {
      writePackedOutput(v.out, output);
    }

    const result = await runReview({
      context: output,
      angle: v.review || 'general',
      apiKey: v['api-key'],
      model: v.model,
      yes: v.yes,
    });

    if (v.out) {
      const reviewPath = `${v.out}.review.md`;
      const review = result.review.endsWith('\n') ? result.review : `${result.review}\n`;
      writeFileSync(resolve(reviewPath), review);
      if (!v.quiet) {
        const bytes = Buffer.byteLength(review, 'utf8');
        const tokens = Math.round(bytes / 4);
        process.stderr.write(
          `prpack: wrote ${reviewPath} (${formatBytes(bytes)}, ~${tokens.toLocaleString()} tokens)\n`,
        );
      }
    }
  } else if (v.out) {
    writePackedOutput(v.out, output);
  } else {
    process.stdout.write(output);
  }
} catch (err) {
  process.stderr.write(`prpack: ${err.message}\n`);
  if (process.env.PRPACK_DEBUG) {
    process.stderr.write(`${err.stack}\n`);
  }
  process.exit(1);
}

function writePackedOutput(path, output) {
  writeFileSync(resolve(path), output);
  if (!v.quiet) {
    const bytes = Buffer.byteLength(output, 'utf8');
    const tokens = Math.round(bytes / 4);
    process.stderr.write(
      `prpack: wrote ${path} (${formatBytes(bytes)}, ~${tokens.toLocaleString()} tokens)\n`,
    );
  }
}

function normalizeReviewArg(args) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--review') {
      out.push(arg);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        out.push(next);
        i++;
      } else {
        out.push('general');
      }
      continue;
    }
    out.push(arg);
  }
  return out;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
