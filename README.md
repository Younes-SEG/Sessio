# Sessio

A university command center with a local edition and hosted private accounts built with Next.js, TypeScript, Tailwind CSS, shadcn/ui components, Prisma, and PostgreSQL.

## Run locally

Optional Gmail grade notifications: follow [Gmail setup](GMAIL_SETUP.md), then open **Grades → Email updates**. Sessio finds matching emails while open and lets you review scores before saving them. Gmail setup is separate from a Gemini API key or ChatGPT's Gmail connection.

For a hosted website with sign-in and private workspaces, follow [Vercel + Neon setup](docs/vercel.md). Each account starts empty; local data is not automatically uploaded or assigned to an account.

Requires Node.js 22.12+ (Node 24 recommended). From this directory:

```sh
npm install
npm run db:local
```

Keep the database terminal open. In another terminal:

```sh
npm run setup
npm run dev
```

Open **http://127.0.0.1:3000**. Setup creates `.env` if needed, generates Prisma, applies migrations, and adds sample university data. PostgreSQL data lives in `.postgres/` and persists between runs. Stop each terminal with Ctrl+C; start `db:local` and `dev` again next time.

For an empty workspace, use `npm run setup:empty` on a new database. Remove the seeded fixtures later with `npm run db:clear-demo`. Demo removal preserves courses that have user-created linked entries; you can then remove retained courses using the app. Rerunning the seed restores missing fixture IDs and never overwrites existing records.

The bundled database uses port **54329**. New installations automatically generate a random database password in `.env`; existing installations keep their credentials. Protect this file and exclude it from releases. `.env.example` and Docker use development-only example credentials. If you prefer Docker, configure its connection in `.env`, run `docker compose up -d` in place of `db:local`, and wait for its healthcheck before setup. For an existing PostgreSQL server, set `DATABASE_URL` in `.env` and skip `db:local`. Do not run the bundled and Docker database on the same port simultaneously.

If your package manager blocks install scripts, approve the installed Prisma engine and embedded-postgres platform packages before setup. On npm 12, use `npm install-scripts ls` to inspect the project approvals. The lockfile and approved build packages are included.

## Using your workspace

- Set your name, theme, time format, and active semester in Settings. Manage terms on Courses and Import syllabus links to Settings ? Terms. Deleting a term after confirmation removes its courses and their linked work; personal items remain.
- Pick Mochi, Sprout, or Nimbus under **Settings → Appearance → Your study buddy** and save preferences. The buddy quietly wanders along the screen edges, follows the mouse, and hops along on navigation. Turn off **Gentle movement** for a still companion, or choose **Off**. Reduced motion is respected; the buddy never intercepts clicks or plays sounds.
- In **Settings → Connect your calendar**, paste a Brightspace subscription URL, preview the current term, then choose **Connect and import**. Adjust import dates before connecting if needed.
- Create courses, add their weekly sessions, then add assessments and weights.
- Choose **Import syllabus** on Courses or a course page, choose Create a course from syllabus plus a term, or Existing course, then upload a PDF, DOCX, JPG/PNG or TXT file. New-course imports suggest the code and name for review; course creation and assessment saving happen in one transaction. Selecting a file keeps it on the device. Click **Read syllabus** to send it to the reader and open the review list. PDFs are sent as original files so the model sees page images and text, including scanned pages. Review dates, weights, source excerpts/pages and existing matches before saving. Word inputs include extracted paragraphs, table cells and embedded JPG/PNG images, with a layout warning and no invented page numbers. Image inputs are decoded and normalized before AI reading. Pasted text uses the same AI reader. Session-based assessments retain their week ranges and timetable evidence. After reading, users confirm lecture/tutorial/lab sections to derive dates; ambiguous sessions and explicit holidays require review. Individual quizzes stay separate even when only a collective grade weight is known. Imports are snapshots, not live syllabus connections.
- Enter assessment scores to update the gradebook and target-grade calculator.
- Open **Grades** in the sidebar (or **Enter grades** on Home) to enter scores across courses. Mark an assessment **Completed** in its editor to keep it on the **Awaiting grades** list until its score arrives.
- Open **User guide** in the sidebar for setup steps, calendar troubleshooting, completion/grade entry and data controls.
- Add tasks, optionally attach a course/assessment, and break work into subtasks.
- Use the combined month/week calendar for deadlines, classes, tasks, and personal events.
- Press **Ctrl+K** on Windows or **Cmd+K** on macOS for navigation and quick add.

Dates and recurring classes use your device's local time zone. An all-day event's “Last day” is inclusive in the editor; its database end is exclusive. Recurring classes stop at the semester boundary. Home, Tasks, Calendar, and Grades default to non-archived courses in the active semester, while retaining personal items. Use the semester filters to view older coursework; Tasks and Grades also offer Include archived courses.

## Shared syllabus reading

Users do not configure AI accounts, API keys or model downloads. The planner sends only the chosen syllabus and course/semester context to Sessio’s shared reader. It returns suggestions for review; only confirmed assessments are saved in your workspace. Reading starts only with **Read syllabus** (or the pasted-text submit button); refresh never retries a paid request, and there is no local-key fallback.

The separately deployable service and owner instructions are in [services/syllabus/README.md](services/syllabus/README.md). It includes HTTPS client integration, a persistent atomic quota store, upload limits, cancellation, provider error handling and a deployment Dockerfile. Deploy the reader separately from the planner. The hosted planner uses Neon Auth and per-account ownership; the local edition remains bound to loopback.

**Deployment pending:** no owner provider account or live service URL is connected in this checkout. The release URL in `src/lib/syllabus-service-config.ts` is intentionally empty. Until the owner deploys the service and bundles its public URL, the app shows an availability notice with Retry instead of asking users for keys. `COMMAND_SYLLABUS_SERVICE_URL` is an optional developer override, not an end-user setup step.

The owner funds hosting and provider usage. Daily network and global daily/monthly quotas persist across service restarts; these are request counts, not exact monetary caps. Add provider spending controls and verify the reverse-proxy configuration. The anonymous endpoint does not establish per-user identity; host abuse controls are needed before broad public promotion. See the deployment guide for limits and release checks.

Uploads are bounded to 8 MB locally or 4 MB in the hosted planner, 60 PDF pages or 100,000 text characters. Documents are processed in memory and sent inline to the configured provider (Google Gemini or OpenAI). OpenAI requests use `store:false`; provider retention still applies. Google?s free tier may use submissions for product improvement and human review; use only non-sensitive syllabi. See [Google?s data-use terms](https://ai.google.dev/gemini-api/terms). No grades, other courses, notes or calendar credentials are sent. The reader may miss or misinterpret content, so compare suggestions and source references with the original. See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

Tests use simulated provider responses without charges or uploading personal data. A live smoke test still requires the deployed service and owner billing configuration.

## Calendar subscriptions

Calendar subscriptions create missing courses from Brightspace's course labels, reuse matching course codes in an overlapping semester, and import recognized deadlines as assessments. Other entries appear as calendar events. Grades and weights are not supplied by calendar feeds; imported assessments start with no score and 0% weight.

The local Node server checks connected feeds every 15 minutes and on startup when due, including while the browser is closed. The open app refreshes its display every minute and on focus. **Sync now** requests an immediate check (limited to once per minute). Stop the server and syncing stops; the next startup catches up. On Vercel, authenticated workspace refreshes check up to three due feeds after the response. Hosted automatic refresh depends on app activity, not a persistent timer.

The server needs outbound HTTPS access. Starting it inside a network-restricted development tool can leave the local app working while every calendar request fails with `EACCES`. Start Sessio normally from your terminal or the tool's approved network-capable mode; retain loopback binding and TLS/feed validation. The app now distinguishes network-permission, DNS and certificate failures without exposing the private URL.

Each subscription retains its selected date range. Reconnect with new dates for a new term. Stable event IDs prevent duplicates across refreshes and reconnection to the same URL. Sync updates source titles/dates/locations while preserving locally entered grades, weights, progress and notes. Manually deleted imported items stay deleted. Explicit cancellations are labelled; cancelled assessments lose their due date but retain grades. Missing feed entries are kept because a provider can shorten its feed without cancelling work.

Disconnecting stops updates and keeps imported entries plus the private connection record for later reconnection. Subscription URLs are stored in PostgreSQL, excluded from API responses and never written to source files. HTTPS requests reject internal/private addresses and revalidate redirects. Import supports bounded recurrence, exceptions, all-day dates and time zones; oversized or unsupported feeds fail without partially importing records.

Disconnected connections remain visible. **Forget link** deletes the private connection and import mapping while keeping academic entries; importing the same feed after forgetting it can create duplicates. Preview and Connect explain provider access and storage before acting.

## Privacy and public release

**Settings → Your data** downloads a readable JSON copy without private feed URLs, or erases the active workspace after typed confirmation. Erasure does not remove independent backups, exported files or provider calendars. The export has no automatic restore tool yet.

Footer links open Privacy, Terms, Cookies, Accessibility, Credits and About without loading private workspace data. The local edition rejects non-local workspace requests. The hosted edition uses verified Neon Auth sessions and account-scoped access. Necessary authentication cookies are used; no fees, marketing emails, advertising or analytics are implemented.

See [the public-release review](docs/public-release-review.md) for implemented protections, deliberately omitted features, dependency/licence findings and remaining distribution work. Ontario is configured; operator identity and contact details are intentionally pending. New public services require a fresh review. `npm run licenses` regenerates notices and the unmodified ical.js source included for redistribution.

## Architecture and decisions

- PostgreSQL is the source of truth for all academic data and preferences. There is no browser-storage fallback for saved data.
- A server-rendered layout loads a consistent workspace snapshot. Client components manage interaction; validated route handlers persist changes and refresh the shared snapshot.
- `src/lib/grades.ts`, `tasks.ts`, `dates.ts`, and `calendar.ts` hold reusable business logic. Presentation components do not implement grade formulas.
- Current grade is a weighted average of **graded work only**. Course weight graded and points earned toward the final grade are separate values. Targets assume a final weight of 100%; missing weights and unattainable targets are explained.
- Mutations validate relationships and use serializable transactions to prevent concurrent assessment weights exceeding 100%. Deleting a course removes its assessments, grades, recurring classes, linked tasks, and linked events. Unlinked personal items remain. Archive a course instead to retain its records.
- Local commands bind to loopback and need no login. On Vercel (or with `COMMAND_HOSTED=true`), each data operation derives ownership from a verified Neon Auth session. Client-supplied workspace IDs never grant access.
- The CLI dependency overrides in `package.json` select patched versions of `deepmerge-ts` and `mysql2`; the application itself uses PostgreSQL.

## Verification

```sh
npm test
npm run lint
npm run typecheck
npm run test:db
npm run test:calendar-db
npm run test:privacy-db
npm run test:e2e
npm run build
```

Database and browser checks require PostgreSQL to be running and setup to have completed. The browser suite creates temporary records and removes them afterward. It uses installed Google Chrome by default; set `PLAYWRIGHT_CHANNEL=chromium` and install Playwright Chromium if Chrome is unavailable. It can reuse a running app on port 3000 or start the development server itself.

For production locally, run `npm run build`, then `npm start`. Keep PostgreSQL running. Back up your database before changing database infrastructure; `.postgres/` is your persistent data, not a disposable build folder.

The privacy database check uses a separate disposable database and verifies its identity before testing erasure. Do not test the valid erase endpoint against your personal workspace. A full backup/restore workflow and packaged installer remain future work.

### Calendar tasks and interface language

Calendar course deadlines import as assessments only. Tasks are independent study/preparation plans and may optionally link to an assessment. Sync does not create or update tasks. Legacy unchanged automatic task mirrors are removed on sync; customized tasks are preserved as manual tasks. Completing either item does not change the other.

Sync matches provider UIDs across subscriptions on the same origin, plus language-independent Brightspace event links for older imports. It never merges by translated name/date alone, keeps recurring occurrences separate, and does not automatically merge conflicting grades or weights. Local duplicate repair is available with `node --import tsx scripts/repair-local-calendar.ts`; it writes a private backup under the ignored `.postgres/backups` directory and verifies progressed records before committing.

Use Français / English in the sidebar or Settings to change the interface and date labels. A first-party language cookie remembers the browser choice for one year; academic content keeps its original language. The guide is available in French; detailed legal policies currently remain in English.

### Instructor grading instructions

After syllabus extraction, use **Instructor instructions and grading rules** to enter a note such as ?Best 4 of 5 quizzes count?. The local parser proposes a group; confirm the full membership, number to keep and combined course weight before saving. This feature supports equal averaging of the retained score percentages, not arbitrary grading formulas. Unsupported instructions remain course notes and never silently change calculations. No AI request is made for these notes.

Rules persist with the course, can be removed or replaced in its Grades tab, and override (without deleting) individual assessment weights. Current averages use the best recorded scores so far; unknown grades are not zeros. The target calculator waits for all scores in best-of groups. Apply migrations before running this version; the new migration only adds course grading configuration.

Study reminders: active, unarchived courses get one planning task per pending quiz, midterm or final when its known date falls within the next 240 hours. Workspace loads/refreshes generate these atomically; completion and deletion are remembered. The dashboard shows pending reminders under Study ahead until the assessment time. Editing the generated title/date/link makes it a personal task. Calendar deadlines remain assessments.

Onboarding: each workspace sees a quiet welcome screen until its tour is finished or skipped. The tour highlights a sidebar button for the user to click, then explains individual controls on that page before moving to the next section (Courses, Calendar, Tasks, Grades and Home). The remaining workspace is dimmed; unrelated controls, card entrances and the study buddy are paused. The topbar scrolls with the page during the tour, and the old instruction fades out before the next step is positioned, and new instructions stay hidden until their own target is ready. Transitions respect reduced-motion preferences. Completion is stored in workspace settings and the tour is replayable from User guide. No sample records are added.
