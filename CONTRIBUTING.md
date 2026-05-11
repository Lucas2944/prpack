# Contributing

Thanks for being interested. prpack is small on purpose — a single CLI, zero dependencies, MIT. The bar for changes is: does it make the output better for LLM code review, or does it fix a real bug.

## Quick start

```sh
git clone https://github.com/Lucas2944/prpack
cd prpack
node bin/prpack.js --help
```

There is no build step. The CLI is plain ES modules.

## What's in scope

- Bug fixes (diff edge cases, test-sibling discovery for new languages, fence escaping)
- Reasonable new flags (the bar: would a working dev hit it monthly?)
- More language pairs for `--include-tests` auto-discovery (the current list lives in [`src/pack.js`](src/pack.js); search for `guessTestSiblings`)
- Examples in [`examples/`](examples/) — real-bug-from-real-PR preferred over contrived
- README clarity

## What's out of scope

- AI features in the CLI itself. prpack writes markdown; you bring the model. There's a planned optional `--review` mode that hits an API directly, but that lives in a sibling tool, not in prpack.
- Tight coupling to any specific LLM provider
- Heavy dependencies. The package has zero deps and intends to stay that way.
- Web UI features (those belong in [prpack-demo](https://github.com/Lucas2944/prpack-demo))
- CI integration features (those belong in [prpack-action](https://github.com/Lucas2944/prpack-action))

## Filing an issue

The most useful issues include:

- The command you ran
- A minimal repo or diff that reproduces it (or a public PR URL)
- What you expected vs. what happened
- Node version (`node -v`) and OS

If you're filing a feature request, lead with the workflow problem you're trying to solve. "I want X" lands flat without "because Y costs me time."

## Opening a PR

1. One change per PR. Bug fix or feature — not both.
2. Run `node bin/prpack.js --help` and make sure it still parses.
3. If you change output format, dry-run on a real repo and paste a sample in the PR body.
4. Match the existing style. Two-space indent, no semicolons-everywhere fights — the file you're editing is the source of truth.

## Good first issues

- Add `.cjs` / `.mjs` to the test-sibling pair list in `guessTestSiblings`
- Add language pairs for Java (`Foo.java` ↔ `FooTest.java`), Rust (`foo.rs` ↔ `tests/foo.rs` or `#[cfg(test)]` blocks), C# (`Foo.cs` ↔ `FooTests.cs`)
- Better fence-escaping when source files contain very long backtick runs (current heuristic counts the longest run; check `src/pack.js`)
- An `.editorconfig` so contributors don't fight over whitespace
- A small contract test that runs prpack on a tiny fixture repo and asserts the output structure

If you pick one, comment on the issue first so we don't duplicate work.

## Releasing

Maintainer-only:

1. Bump `version` in `package.json`
2. `git tag vX.Y.Z`
3. `git push origin vX.Y.Z`
4. `gh release create vX.Y.Z --generate-notes`

## License

By contributing you agree your contribution is licensed under MIT, same as the project.
