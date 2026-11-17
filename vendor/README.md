# Vendored packages

## picomatch (4.0.7 + Command patch)

**Why:** [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) (CVE-2026-112366, high): repeated extglobs such as `+(*a)` compile to regexes with exponential backtracking (ReDoS). It affects every picomatch release up to 4.0.7, and on 2026-11-17 no fixed release existed (advisory published 2026-10-19; upstream PR #194 does not fix it). It failed the CI `security` job (`npm audit --omit=dev`) because `better-auth` lists `vitest` as an optional peer, so npm counts vitest → vite/tinyglobby → picomatch as runtime packages. None of it runs on the live site, but rather than weaken the audit we fixed the code.

**How:** `vendor/picomatch/` is the reviewable source; `vendor/picomatch-patched.tgz` is it packed (`npm pack ./vendor/picomatch --pack-destination vendor`, then rename). `package.json` lists the tarball as the root `picomatch` dev dependency and `overrides` point vitest, vite and tinyglobby at it (`$picomatch`). The package is named `picomatch-command-patched@4.0.7+command.1` because it is no longer stock picomatch; npm still installs it as `node_modules/picomatch`, so `require('picomatch')` works unchanged. (A `file:` folder override or a `picomatch@^4` key sends npm 11 into an endless placement loop; the tarball does not.) After editing the source, repack, run `npm install`, and the test below fails if the installed copy differs from the source. Only `lib/parse.js` changed; search for `Command patch`. Upstream literalizes a deny-list of known-bad repeated extglobs. The patch adds an allow-list check (skipped when a caller passes a numeric `maxExtglobRecursion`). For `+(…)`/`*(…)`:

- One branch of fixed width (`+(a?)`, `+([ab])`): unchanged; it cannot backtrack.
- One branch containing `*` and no `/` (`+(*a)`): compiled once instead of repeated (`+(X)` → `@(X)`, `*(X)` → `?(X)`). Same matches, because one copy already matches any run of copies.
- Several plain literals that are uniquely decodable (Sardinas–Patterson; `+(js|jsx)` yes, `+(a|aa)` no) are unchanged. Nested `@(a|b)` is flattened first.
- Anything else (repeats nested in repeats, negations, ambiguous sets) is literalized, as upstream already does for its known-bad shapes.

**Tested (2026-11-17):** 2,760 generated patterns × 9 adversarial inputs; none slower than 40 ms (unpatched: some over 100 s). Upstream's own suite: 1,921 of 1,983 pass. The 62 that fail are bash-compatibility cases that nest a repeat or negation inside a repeat (`*(f*(o))`, `*(!(foo))`), which now match literally. Nothing in this repo or its test/build tooling uses that syntax. `tests/picomatch-redos.test.ts` checks that vitest, vite and tinyglobby load this copy, that the attack patterns stay fast, and that normal globs still match.

**Remove when:** picomatch publishes a release that fixes the advisory. Delete the override and this folder, run `npm install`, and confirm `npm audit --omit=dev --audit-level=high` passes.

License: MIT (see `picomatch/LICENSE`).
