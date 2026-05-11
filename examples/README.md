# Examples

Reproducible side-by-side experiments showing what changes when you pack a PR with prpack vs. paste a raw diff.

Each example is self-contained: source files, the diff, the prpack output, and a prompt to paste into Claude / Cursor / your model of choice. Run the experiment yourself.

## Why this exists

The claim behind prpack is that **full post-change file content** — not just the diff — is what flips an LLM review from "LGTM" to catching real bugs. That claim is easy to make and hard to verify in the abstract.

These examples make it concrete. You can read the source, paste each context into a model, and judge the difference for yourself.

## Layout

```
examples/
  invoice-refactor/        # null-deref hiding two lines outside the diff
    before/                # pre-PR file state
    after/                 # post-PR file state
    diff-only.md           # raw diff (what naive paste looks like)
    ctx.md                 # prpack output (what we recommend)
    PROMPT.md              # the review prompt
    EXPECTED.md            # what a careful reviewer should flag in each
```

## How to reproduce

For each example:

1. Open `diff-only.md` and paste it into your model along with `PROMPT.md`. Note the review.
2. In a fresh chat, do the same with `ctx.md`. Note the review.
3. Compare against `EXPECTED.md` — that lists the bugs a thorough human reviewer would flag.

You should see the diff-only review miss bugs that the prpack review catches. If you don't see a difference, open an issue — we'd genuinely like to hear about it.

## Generating prpack output yourself

The `ctx.md` files were generated with:

```sh
cd examples/invoice-refactor/after
git init -q && git add . && git commit -q -m "after" \
  && git checkout -q --orphan before \
  && git rm -rqf . \
  && cp -r ../before/. . \
  && git add . && git commit -q -m "before" \
  && git checkout -q main \
  && npx github:Lucas2944/prpack --base before --head HEAD --out ../ctx.md
```

You don't need to re-run it — the output is checked in.

## Contributing examples

Have a PR where a model missed a bug that prpack would have caught? Open a PR adding it here. Keep examples small (one or two files) and reproducible. Real bugs preferred over contrived ones.
