# Claude handoff — Nexus 2.0 video correction

Repository: `globalplay27/SERVIDOR-GLOBAL-PLAY`
Branch: `main`

## Goal
Finish the current Nexus Client Portal video-generation correction end-to-end. The user just retested and it failed again.

Do not redesign the architecture or remove existing working behavior unless required by the root cause.

## Files you must inspect
- `public/client-lite.js`
- `public/portal.html`
- `public/client-lite.css`
- `cloudflare/src/portal.js`
- `cloudflare/src/github-video-render.js`
- `cloudflare/src/video-source.js`
- `cloudflare/src/video-catalog.js`
- `.github/workflows/video-template-render.yml`
- `.github/workflows/ci.yml`
- `scripts/local-youtube/helper.py`
- `scripts/local-youtube/start.ps1`
- `scripts/local-youtube/INICIAR.cmd`

Also inspect any tests referenced by CI for video/local-youtube behavior.

## Latest relevant commits
- `151d2b227f97e97f45e24c2a946555976ac6ef0e` — fix Core autonomy self-test syntax
- `fd08e3d576386bd4429d6e4683366cc0350cbb15` — show real local-helper failure reason in client UI
- `045c1f9e4a02135db12f5b207b0916520b33bf7c` — preserve local-helper failure diagnostics in Worker
- `e189a1db71d2398d013ca4e97b8f29fb56b0746d` — bump client JS cache version

## Current architecture relevant to the bug
Client click:
`public/client-lite.js -> POST /api/portal/videos/youtube`

For action `local_generate`, Worker creates a job and returns:
- sourceUrl
- jobId
- clientId
- uploadTicket
- callbackBase

Browser then POSTs that payload to:
`http://127.0.0.1:8765/handoff`

Local helper:
`scripts/local-youtube/helper.py`
downloads/validates the MP4, reports status to:
`/api/local-video-ingest/status`
and uploads the MP4 to:
`/api/local-video-ingest/upload`

Worker callback handling is in:
`cloudflare/src/github-video-render.js`

After source ingestion, automatic mode should dispatch:
`startGitHubVideoRender(...)`
which triggers:
`.github/workflows/video-template-render.yml`

Expected final chain:
button -> backend job -> local helper or server fallback -> R2 source -> GitHub render workflow -> callbacks -> ready clip -> direct 9:16 download.

## Current known failure
The user retested after the latest fixes and the video still failed.

The local helper is currently a single point of failure in the browser path. If the browser cannot reach `127.0.0.1:8765`, generation currently terminates rather than automatically continuing through a server-side ingestion fallback.

Check especially:
1. Browser Private Network Access / CORS behavior for HTTPS portal -> http://127.0.0.1:8765.
2. Exact `/handoff` preflight behavior and headers.
3. Whether helper process is actually alive after `INICIAR.cmd`.
4. Whether the helper fails in `select_format()` because it requires a Portuguese audio track exposed by yt-dlp metadata.
5. Whether `upload_to_nexus()` receives HTTP 201 and `renderStarted: true`.
6. Whether `startGitHubVideoRender()` dispatch succeeds and the workflow starts.
7. Whether render callbacks reach Worker and transition job to `ready`.
8. Whether the browser still has any path that marks the job failed before server-side recovery is attempted.

## Required fix direction
Preferred behavior:
- local helper may remain as first attempt;
- if handoff fails or helper is unreachable/rejects the job, do NOT leave the job dead;
- Worker should recover the same job by switching it to server/GitHub ingestion when that path is available;
- UI should show which path is being used;
- do not ask the customer to re-enter title or synopsis;
- preserve automatic/editable switch, WhatsApp, optional logo, direct result download;
- no fake success state.

## Acceptance criteria
Do not claim success from syntax/CI alone.

Need evidence for:
1. click Gerar video
2. source ingestion starts
3. MP4 lands in Nexus/R2
4. render workflow dispatches
5. render callback arrives
6. job reaches ready
7. final 9:16 MP4 downloads
8. failure path exposes the actual error
9. no manual title/synopsis required when catalog metadata exists

If local-helper route is fundamentally unreliable from modern browsers, replace the browser dependency with a robust server-side fallback rather than requiring repeated user retries.
