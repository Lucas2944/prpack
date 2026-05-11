const PROMPTS = {
  security: `# Security review prompt

Append this to a packed PR context (or any diff + file content you've given the model) and ask for a review.

---

You are conducting a security review of the pull request above. Your one job is to find security issues — not to congratulate, summarize, or rephrase the change.

For every finding, output one entry in exactly this form:

\`\`\`
[SEVERITY] file:line — one-sentence summary
Why it matters: <one or two sentences>
Suggested fix: <one or two sentences, prefer concrete code>
\`\`\`

Severity levels:

- **CRITICAL** — exploitable now
- **HIGH** — exploitable with modest effort
- **MEDIUM** — requires unusual conditions
- **LOW** — defense in depth

Specifically check for:

1. User-controlled input flowing into shell, SQL, file paths, URLs, deserializers, or template engines without escaping.
2. AuthN/AuthZ checks that can be bypassed: missing, ordered wrong, trusting client-supplied IDs, race conditions on permission state.
3. Secrets / API keys / tokens introduced into source, env files, or log statements.
4. Crypto: weak primitives, hard-coded IVs/salts, MAC-then-encrypt, \`==\` comparison of MACs.
5. Dependency additions — flag any new dependency with the package name and ask the human to verify maintainer reputation.
6. Error handling that swallows exceptions where a security-relevant branch could fail open.
7. CORS / cookie / CSRF settings that loosen defaults.

If a section of the diff is irrelevant to security, say so once and move on. Do not pad.

End with one line:

\`\`\`
Bottom line: ship | fix-before-ship | hold
\`\`\``,

  performance: `# Performance review prompt

Append this to a packed PR context (or any diff + file content you've given the model) and ask for a review.

---

You are conducting a performance review of the pull request above. Skip line-level style nits — focus on how this code behaves under real load.

For every finding, output:

\`\`\`
[IMPACT] file:line — one-sentence summary
Cost shape: constant | linear | quadratic | network | blocking
Why it matters: <one or two sentences>
Suggested fix: <one or two sentences, prefer concrete code>
\`\`\`

Impact levels:

- **HIGH** — changes asymptotic complexity or adds RTT to a hot path
- **MEDIUM** — per-request waste on a non-trivial endpoint
- **LOW** — cold path or one-off

Specifically check for:

1. Loops that issue queries / network calls per iteration (N+1).
2. Newly-added \`await\` inside a tight loop where \`Promise.all\` would unblock work.
3. Re-allocations inside hot paths: new buffers, regex compilation, JSON.parse, deep clones — flag if it looks per-request.
4. Blocking I/O on async paths: sync FS, sync crypto, sync compress.
5. Datastructure choices: \`Array.includes\` for membership tests on hot lookups, \`Object.keys\` length checks on large dicts, repeated sorts of the same data.
6. Database changes: missing indexes implied by new query patterns, \`SELECT *\` additions, transactions held open across awaits.
7. Cache invalidation: did this PR widen a cache key, miss a key, or extend TTL inappropriately?
8. Bundle size impact (frontend): new heavy deps, accidental re-export of an entire library, dynamic-import that became static.

If a section of the diff is irrelevant to performance, say so once and move on.

End with one line:

\`\`\`
Bottom line: ship | measure-before-ship | regression-likely
\`\`\``,

  tests: `# Test-coverage review prompt

Append this to a packed PR context (or any diff + file content you've given the model) and ask for a review.

---

You are reviewing the test coverage of the pull request above. Look at both the changed source and the changed/adjacent tests, then ask: would a real failure in this code be caught?

For every finding, output:

\`\`\`
[GAP] file:line — what behavior is untested
Why it matters: <what could break in production unnoticed>
Suggested test: <a one-paragraph description of a specific test case, with concrete inputs and expected outputs>
\`\`\`

Specifically check for:

1. New code paths with no test that exercises them.
2. Tests that assert on incidental output (full JSON equality, field order) where the intent is narrower — these are brittle and will pass even when wrong.
3. Tests that mock the boundary so heavily that the real failure mode (DB error, network timeout, malformed payload) is untested.
4. Edge cases that matter for THIS change: empty input, null, undefined, max-length, negative numbers, unicode, concurrent access. Don't list every theoretical case — pick the ones the implementation actually handles.
5. Tests that pass today but would also pass if the implementation were wrong. ("Tests the spec" vs. "tests what the function happens to return".)
6. Removed tests — was their behavior moved elsewhere, or just dropped?

Order findings by severity. Do not pad.

End with one line:

\`\`\`
Coverage verdict: adequate | has-gaps | not-meaningfully-tested
\`\`\``,

  architecture: `# Architecture review prompt

Append this to a packed PR context (or any diff + file content you've given the model) and ask for a review.

---

You are conducting an architecture review of the pull request above. Pull back from line-level concerns. Look at the *shape* of the change: where the boundary was drawn, what coupling is introduced or removed, and whether the change holds up over the next year of growth.

Address these questions in order, briefly. Use bullets and concrete file references. A senior reviewer skims this; paragraphs lose them.

1. **What is the change actually doing?** Summarize the structural intent in two sentences.

2. **Where did the seams move?** What modules now know about each other that didn't before? What dependencies were inverted, added, or removed?

3. **Coupling check.** Is any new coupling load-bearing? In particular:
    - Are layers leaking (UI reaching into DB, domain types importing transport types)?
    - Are utilities now importing from feature modules?
    - Is shared mutable state being introduced?

4. **Premature or speculative abstraction.** Does the PR introduce interfaces, factories, or config layers that have only one implementation? Flag them — they are debt.

5. **Scalability.** If this code path goes 10x in volume or scope, where does it break first?

6. **Reversibility.** If this turns out to be wrong in a month, how much work is it to roll back? One-way doors should be called out.

7. **Naming.** Are any new types/functions named in a way that will read poorly in six months — names that describe the implementation (\`UserManagerImplV2\`) instead of the role (\`UserDirectory\`)?

End with one line:

\`\`\`
Architecturally sound | needs trim | re-think before merging
\`\`\``,

  general: `You are reviewing the packed PR context above. Give a balanced review across correctness, security, performance, tests, and architecture.

For each finding, use this format:

\`\`\`
[SEVERITY] file:line — one-sentence summary
Why it matters: <one or two sentences>
Suggested fix: <one or two sentences>
\`\`\`

Severity levels: CRITICAL, HIGH, MEDIUM, LOW.

Focus on issues that would make a human reviewer pause. Avoid praise, summary, and style-only nits. If there are no substantive findings, say so directly.

End with one line:

\`\`\`
Bottom line: ship | fix-before-ship | hold
\`\`\``,
};

export const REVIEW_ANGLES = Object.freeze(Object.keys(PROMPTS));

export function getReviewPrompt(angle = 'general') {
  const normalized = angle || 'general';
  const prompt = PROMPTS[normalized];
  if (!prompt) {
    throw new Error(`unknown review angle "${normalized}" (expected ${REVIEW_ANGLES.join(', ')})`);
  }
  return prompt;
}
