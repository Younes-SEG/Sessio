# Command shared syllabus reader (owner deployment)

Users upload and review, without an AI key, AI account or model installation. The downloadable planner stays on loopback with its local database. Deploy **only this service**, never expose the existing workspace server. The service has no database credentials or workspace routes.

## Status

The service and app integration are implemented. No live endpoint or owner billing account is connected yet. `src/lib/syllabus-service-config.ts` deliberately has an empty URL; do not distribute a release claiming working imports until deployment and a live read have been verified.

## Deploy once

Use one always-on Docker service with HTTPS ingress and a persistent disk (for example a paid Render web service with a persistent disk). Read the host's current pricing before creating it. Serverless ephemeral filesystems and multiple replicas are **not** supported by this quota implementation.

The repository-root `render.yaml` prepares one Starter service plus a 1 GB disk, in Ohio (United States). It prompts the owner for the provider key, generates a quota salt and disables automatic redeploys. No paid resources have been created. To use it, push the reviewed changes, create a Render account, choose **New → Blueprint**, connect this repository and review the charges before creation. With the conservative proxy setting of 0, requests through the same proxy may share the daily network allowance until forwarding is verified. The chosen US region and host retention must be reflected in the public privacy notice before distributing the app.

1. Build from repository root using `services/syllabus/Dockerfile`. The image allowlist excludes `.env*`, `.postgres`, workspace data, Git history, tests and Next.js routes. Do not pass secrets as build arguments.
2. Mount persistent storage at `/var/lib/command-syllabus`, writable by UID 1000. Keep one instance. Point the health check at `/health`.
3. Select `SYLLABUS_AI_PROVIDER=openai` with `OPENAI_API_KEY` / `OPENAI_SYLLABUS_MODEL`, or `SYLLABUS_AI_PROVIDER=gemini` with `GEMINI_API_KEY` / `GEMINI_SYLLABUS_MODEL` (default `gemini-3.5-flash-lite`). Provider choice is explicit and failures never fall back to a different provider. Configure a random `SYLLABUS_LIMIT_SALT` (at least 32 characters) in the host's secret settings. Use a dedicated provider project and restricted key. Set provider spending controls too. Never put these secrets in a release, repository or `NEXT_PUBLIC_` setting.
4. Set daily/monthly request caps from `env.example`, then set `SYLLABUS_ENABLED=true` when ready to accept requests. Turning it off and restarting stops new reads; already submitted requests may still incur charges.
5. Verify the host's forwarding behavior before setting `SYLLABUS_TRUST_PROXY_HOPS`. With 0 the socket address is used and forwarded headers are ignored. Behind a proxy that means users may share the proxy's quota. With N trusted hops, the Nth address from the right of `X-Forwarded-For` is used. Restrict direct origin access and ensure **every** ingress path has exactly this trusted chain. Never trust the leftmost value blindly. Do not guess this setting for an unverified host.
6. Check HTTPS `/health`, then set the public origin in `src/lib/syllabus-service-config.ts` and build the app release. This is a publisher step; users do not edit anything. `COMMAND_SYLLABUS_SERVICE_URL` is an optional developer override. Production accepts only HTTPS origins with no credentials, path, query or fragment. Redirects are rejected.
7. Upload a non-sensitive sample through Command, verify dates and weights, save reviewed rows, then confirm the provider usage dashboard and quota persistence after a service restart. Mocked tests do not establish live model accuracy.

Render documentation: [Docker services](https://render.com/docs/docker), [persistent disks](https://render.com/docs/disks). Provider guidance: [production setup](https://developers.openai.com/api/docs/guides/production-best-practices), [spend controls](https://developers.openai.com/api/docs/guides/spend-limits).

## Limits and exposure

This is an anonymous, narrowly scoped reading endpoint, not an authenticated account API. No shared app secret is shipped and no CORS or Origin check is represented as authentication. Each request can only read a supplied document using the fixed prompt/schema/model; callers cannot select tools, provider URLs, prompts or token limits.

Defaults: 20 attempts per network per UTC day, 100 globally per UTC day and 500 globally per UTC month. IPv6 addresses are grouped by /64. Shared school networks can share a quota. Network rotation can bypass the network quota but **cannot** bypass the global counters. One in-flight upload/read is allowed. Invalid input is rejected before reserving an AI attempt; provider failures and cancelled paid requests still consume a reservation. Gemini requests retry explicit HTTP 500/502/503/504 errors at most twice, with exponential backoff and jitter, within the original 120-second provider deadline. Every retry reserves another quota attempt; a rejected reservation stops the retry. Quota/credential errors, refusals, invalid output and ambiguous network failures are not retried. Retry-After is respected; long delays stop the read instead of retrying early. OpenAI behavior is unchanged.

SQLite reserves all counters atomically on the persistent disk before calling the provider. Quotas survive restarts; an unavailable quota store fails closed. Do not delete or restore old quota data to resume traffic, rotate disks per deployment, or run another independent instance against the same provider budget. Counts bound calls, **not exact dollars**: input size, model and token prices affect costs. Pair with provider spending limits. Global caps limit financial exposure but cannot prevent somebody exhausting everyone's allowance. Before broad promotion, add host-level abuse filtering/bot protection or account-based quotas and load-test real traffic; there is no claim of per-person identity here.

Uploads: PDF/DOCX/JPG/PNG/TXT, 8 MB, 60 PDF pages or 100,000 text characters. Images: 25 megapixels maximum, oriented and resized to at most 4096 pixels per side with metadata stripped. DOCX archives: at most 32 MB expanded, 2,000 entries, 20 embedded JPG/PNG images with at most 8 MB normalized image data. No macros or external resources are executed or fetched. DOCX page layout is not preserved; preview warnings recommend PDF for complex layouts. Body deadline: 30 seconds. Provider timeout: 120 seconds. No documents or responses are persisted or logged by this service; accepted source excerpts are saved only in the user's local planner. The service sends original PDFs inline; OpenAI requests use `store:false`. Provider retention still applies. Gemini free-tier content may be used for Google product improvement and human review: use non-sensitive samples and review https://ai.google.dev/gemini-api/terms before public release.

Usage storage contains aggregate counters and an HMAC of the network prefix salted with the UTC day, not raw addresses or document details. Daily identifiers expire the following UTC day and are pruned hourly and at startup; aggregate month counters expire next month. Persistent-disk snapshots and hosting/proxy logs may have separate retention. Disable request-body/header capture in hosting diagnostics and document the selected host's retention and processing locations in public notices before release. Finish the operator/contact details already flagged in Command's policies.

## Local service development

Node 24 is required for built-in SQLite. Copy `env.example` to the ignored repository-root `.env.syllabus.local`; fill owner secrets locally, not in chat. Run `npm run syllabus:service`. It binds to `127.0.0.1` by default. Use `COMMAND_SYLLABUS_SERVICE_URL=http://127.0.0.1:8080` only with `next dev`; production requires HTTPS. Do not disable TLS checks. Tests inject a fake reader and never incur provider charges.

### Gemini availability

`GEMINI_SYLLABUS_FALLBACK_MODEL` optionally selects a second Gemini model for the third and final attempt, after two transient server errors. No cross-provider fallback is performed. Without this setting, all attempts use the primary model. The backup must accept PDFs, the JSON response schema and MEDIUM thinking level; validate it with a sample before enabling it. Successful responses and completed extraction are never retried. No provider errors, API keys or document content are logged. See [Google's retry guidance](https://ai.google.dev/gemini-api/docs/troubleshooting#retry-strategy).

## Signed hosted requests

Remotely bound readers now require signed, expiring, budget-bearing planner requests with durable replay protection. Configure the same private `COMMAND_READER_SIGNING_SECRET` on planner and reader and approve provider models/usage ceilings on the planner. The Blueprint starts disabled. See [P0 operations](../../docs/p0-operations.md#reader-deployment). Do not deploy a shared signing secret in browser code or downloaded installations. Loopback-only personal readers retain their local workflow.
