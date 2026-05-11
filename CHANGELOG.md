# Changelog

## v0.2.0 - 2026-05-11

- Added native `--review [angle]` mode for `security`, `performance`, `tests`, `architecture`, and `general` reviews.
- Added `--api-key`, `--model`, and `--yes` flags for Anthropic review runs.
- Integrated Anthropic Messages API review calls with streamed SSE output.
- Added review cost estimation before API calls.
- Inlined the four focused review angles from `Lucas2944/prpack-prompts`.

## v0.1.1 - 2026-05-10

- Fixed Python adjacent-test discovery so `src/foo.py` looks for `src/test_foo.py` instead of `test_foo.py` in the current working directory.
- Added cross-links to `prpack-action`, the browser demo, and the long-form technique writeup.
- Added the project cover image and install-focused README updates.

## v0.1.0 - 2026-05-10

- Initial release of the zero-dependency Node CLI.
- Packed PR metadata, commit list, changed-file diffs, and full post-change file contents into one markdown artifact.
- Added `.prpack.yml` config support, file filtering, adjacent test inclusion, untracked file support, and output sizing controls.
