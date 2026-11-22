# Sessio

**A bilingual (English / French) planner for college and university students** — courses, assessments and grades, tasks, a calendar that syncs with Brightspace, syllabus import, Gmail grade notices and an in-app assistant. Live at **[sessioapp.ca](https://sessioapp.ca)** (invite-only beta).

Built by [@Younes-SEG](https://github.com/Younes-SEG).

## What it does

- **Courses and grades** — weighted grade calculator, "what do I need on the final?" targets, best-of-N grading rules, letter grades and GPA for 43 Ontario schools.
- **Syllabus import** — upload a PDF, Word file or photo of a syllabus; an AI reader proposes every assessment with dates and weights, and nothing is saved until the student reviews it.
- **Calendar sync** — subscribes to a Brightspace calendar feed, imports deadlines as assessments and keeps them up to date without duplicating or overwriting the student's own edits.
- **Gmail grade notices** — reads school notification emails (read-only scope), matches grades and deadline changes to assessments, and applies clear ones automatically.
- **Ask Sessio** — a chat assistant that answers "what's due this week?" and "how am I doing in SEG3102?", schedules study sessions and records grades. The AI only interprets the request; grades are always computed by the app.
- **Invite system** — invite-only sign-up where each student can invite up to five friends.
- **Installable** on phones as a web app, fully translated to Canadian French, keyboard- and screen-reader-accessible.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 / Radix UI · Prisma 7 · PostgreSQL (Neon) · Neon Auth · Google Gemini · Vitest · Playwright · GitHub Actions · Render

## Engineering highlights

- **Multi-tenant by construction** — every read and write derives the workspace from a verified session on the server; client-supplied IDs never grant access. A dedicated suite of 48 database tests checks isolation between accounts, export and erasure.
- **Privacy built in** — full data export and erase, staged account deletion with database-level write barriers (PostgreSQL triggers), content-free AI usage records, and a privacy policy written for Quebec's Law 25 and PIPEDA.
- **Safe AI usage** — global and per-user daily/monthly spending caps with atomic reservations, an age gate for AI features, and strict output validation; untrusted model output can never change data without matching server-side checks.
- **Security** — same-origin checks on every change, SSRF-safe calendar fetching (DNS pinning, private-address blocking, redirect revalidation), signed requests between the app and the syllabus reader, and dependency auditing in CI.
- **Quality gates** — 540+ unit tests, the tenancy suite, browser tests (including accessibility checks with axe, 320 px reflow and touch-target sizes) and a production build all run on every pull request; `main` is protected and only accepts green PRs.
- **Two editions** — the same codebase runs as a hosted, account-based service or as a private local app bound to the user's own machine.

## Run it locally

Requires Node.js 24.

```sh
npm install
npm run db:local          # starts a bundled PostgreSQL; keep this terminal open
npm run setup             # in a second terminal: config, migrations, sample data
npm run dev               # then open http://127.0.0.1:3000
```

`npm run setup:empty` starts with an empty workspace instead of sample data.

Checks: `npm test`, `npm run lint`, `npm run typecheck`, `npm run test:tenancy`, `npm run build`.

## License

Copyright © YC Studio. All rights reserved — see [LICENSE](LICENSE). The code is shared for viewing; it may not be copied, modified or redistributed without permission.
