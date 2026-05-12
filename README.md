# prpack

[![release](https://img.shields.io/github/v/release/Lucas2944/prpack)](https://github.com/Lucas2944/prpack/releases/latest)
[![license](https://img.shields.io/github/license/Lucas2944/prpack)](./LICENSE)
[![GitHub Action](https://img.shields.io/badge/GitHub%20Action-prpack--action-purple?logo=github)](https://github.com/Lucas2944/prpack-action)
[![Marketplace](https://img.shields.io/badge/Marketplace-prpack-purple?logo=github)](https://github.com/marketplace/actions/prpack)
[![demo](https://img.shields.io/badge/try%20in%20browser-lucas2944.github.io%2Fprpack--demo-d2a8ff)](https://lucas2944.github.io/prpack-demo/)
[![ko-fi](https://img.shields.io/badge/support-ko--fi-FF5E5B?logo=kofi&logoColor=white)](https://ko-fi.com/prpack)

> Pack a pull request into one markdown file optimized for LLM code review.

![prpack](./cover.png)

**Try it without installing:** paste a public GitHub PR URL into [lucas2944.github.io/prpack-demo](https://lucas2944.github.io/prpack-demo/) and watch the packed output appear in your browser. Pure client-side, no signup.

**Looking for review prompts only?** [Lucas2944/prpack-prompts](https://github.com/Lucas2944/prpack-prompts) has four focused review prompts (security / performance / tests / architecture) as plain markdown files — append one to your context and you'll get structured reviews that catch real issues. Works with any LLM, with or without prpack.

**Want this on every PR?** See [prpack-action](https://github.com/Lucas2944/prpack-action) — a GitHub Action wrapper. Drop a 5-line workflow in your repo and you get the packed markdown on every PR.

`prpack` walks the diff between two refs and emits a single, well-structured markdown file containing the commit list, the diff, **and the full post-change contents of every touched file**. Drop it into Claude / Cursor / any model and ask for review — no copy-pasting, no missing context, no per-file back-and-forth.

```sh
$ prpack --out ctx.md
prpack: base=origin/main head=HEAD merge-base=4f8a91c
prpack: 7 file(s) to pack (1 excluded)
prpack: wrote ctx.md (24.6 KB, ~6,150 tokens)
```

Then paste `ctx.md` into your model of choice and ask:

> Review this PR. The diff and full file contents are below. Flag bugs, missing edge cases, and anything that would make a reviewer pause.

That's it.

## Why

> The technique behind prpack is written up at length in [THE_TECHNIQUE.md](./THE_TECHNIQUE.md) — a story of how a missed null-deref taught me that LLM code review is a context-engineering problem, not a model problem. For a reproducible side-by-side, see [examples/](./examples/).

Asking an LLM to review a PR is the obvious move, but the context it sees matters more than the prompt. Just pasting a diff drops crucial context — the model can't see what the rest of the function looks like, how callers use the changed code, or what the surrounding module exports. Pasting the whole repo wastes tokens and dilutes attention.

`prpack` packs **exactly the diff plus the full state of every file the diff touches**. That's enough context to reason about the change without drowning the model in noise. If you want adjacent test files included automatically, pass `--include-tests`.

## Install

```sh
# One-shot, no install:
npx github:Lucas2944/prpack --out ctx.md

# Or install globally:
npm install -g github:Lucas2944/prpack
prpack --out ctx.md
```

Requires Node 18+ and `git` on PATH.

## Usage

```
prpack [options]

Options:
  --base <ref>          Base ref to diff against (default: origin/main, falls back to main)
  --head <ref>          Head ref (default: HEAD)
  --out <path>          Output file (default: stdout)
  --config <path>       Load preset from a .prpack.yml file
  --include-tests       Include test files even if not changed (auto-discovers siblings)
  --include-untracked   Include untracked files in the diff
  --no-content          Only include the diff, not full file contents
  --max-bytes <n>       Skip files larger than n bytes (default: 200000)
  --exclude <glob>      Exclude paths matching glob (repeatable)
  --review [angle]      Call Anthropic for a streamed review (default: general)
  --api-key <key>       Anthropic API key (overrides ANTHROPIC_API_KEY)
  --model <id>          Anthropic model for --review
  --yes                 Skip cost-estimate confirmation in TTY review mode
  --quiet               Suppress stderr progress logs
```

### Review mode

One-line install plus review:

```sh
npx github:Lucas2944/prpack --review security --api-key "$ANTHROPIC_API_KEY"
```

`--review` packs the PR context, appends a focused review prompt, calls Anthropic's Messages API, and streams the response to your terminal. If you also pass `--out ctx.md`, prpack writes the packed context to `ctx.md` and the model's review to `ctx.md.review.md`.

Focused angles:

- `security`
- `performance`
- `tests`
- `architecture`

The default `general` angle gives a balanced pass across all four.

### Common recipes

```sh
# Default: pack vs origin/main, write to ctx.md
prpack --out ctx.md

# Diff against a different base
prpack --base develop --out ctx.md

# Pack the last 3 commits even on main
prpack --base HEAD~3 --head HEAD --out ctx.md

# Diff-only, skip full contents (smaller, faster)
prpack --no-content --out ctx.md

# Pull adjacent tests in too
prpack --include-tests --out ctx.md

# Exclude generated/lock files
prpack --exclude 'pnpm-lock.yaml' --exclude 'dist/**' --out ctx.md

# Pipe straight to clipboard (macOS)
prpack | pbcopy

# Use a review preset (see prpack-pro)
prpack --config security.prpack.yml --out audit.md

# Stream a native AI review with the default general angle
prpack --review --yes
```

### `.prpack.yml` configs

Drop a YAML file with any of these keys:

```yaml
base: develop
includeTests: true
exclude:
  - dist/**
  - "*.lock"
preface: |
  This PR introduces a new payment flow. Focus on input validation and
  error paths around the Stripe webhook handler.
reviewPrompt: |
  You are a senior engineer reviewing this PR. Flag bugs, missing edge
  cases, and security issues. Quote line numbers when you do.
```

`preface` is added under "Reviewer note from author" near the top. `reviewPrompt` is appended at the end, ready for the model to act on.

For editor autocomplete and validation, add a `# yaml-language-server` line at the top of your config:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/Lucas2944/prpack/main/schema/prpack.schema.json
base: develop
includeTests: true
```

## Output shape

```
# Pull Request Context
**Repo:** `org/repo`
**Branch:** `feature/...`
**Base:** `main` → **Head:** `HEAD`
**Commits:** 3
**Files changed:** 7

## Commits
- `abc1234` 2026-05-10 — Add Stripe webhook handler

## Files changed
- `src/payments/webhook.ts` _(added)_
- ...

---
## `src/payments/webhook.ts` _(added)_

### Diff
```diff
...
```

### Full content (post-change)
```ts
...
```
```

Every code block uses a fence longer than any backtick run inside it, so embedded markdown / code samples never break formatting.

## What it doesn't do

- **No network calls in pack mode.** `prpack` only calls Anthropic when you explicitly pass `--review`.
- **No hidden AI.** Review mode uses your Anthropic API key and prints the cost estimate before the call.
- **No web UI.** It's a single CLI binary.
- **No telemetry.** Pack mode never opens a socket; review mode only opens the Anthropic request you explicitly asked for.

## Pro presets

If you want curated `.prpack.yml` configs for specific review styles — security, performance, architecture, test-coverage — plus a one-page workflow guide, see **[prpack Pro Pack](https://scottthurman89.itch.io/prpack)** (free or pay-what-you-want). The CLI is and stays free; the pack is optional.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Good first issues are listed at the bottom — comment before you start so we don't duplicate work.

## License

MIT.
