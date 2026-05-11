Use this prompt for both the diff-only and prpack runs:

---

You are reviewing the pull request above. Look for bugs, missing edge cases, and assumptions the new code makes that the old code didn't. Focus on:

- Nullability and undefined handling
- Changes to error paths or early returns
- Assumptions the new code makes about its inputs or callers

Be specific. Cite file and line. If you're unsure, say so.

End with a verdict on one line:

```
Safe to merge | needs changes | reject
```
