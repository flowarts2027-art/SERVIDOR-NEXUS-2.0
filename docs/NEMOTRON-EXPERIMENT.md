# NVIDIA Nemotron 3 Ultra — isolated, budgeted internal adapter

Status: **disabled / not integrated into production**.

Source of reference: NVIDIA NeMo AutoModel guide
[Fine-Tune Nemotron Ultra](https://github.com/NVIDIA-NeMo/Automodel/blob/main/docs/guides/llm/nemotron-3-ultra.md).
That is a training guide using GPU clusters. The Nexus adapter uses the **hosted API** and does not install/train the model.

## Scope

- Library: `cloudflare/src/experimental/nemotron-audit.js`
- Quota persistence: existing D1 `nexus_state` table (no new migration required)
- Unit tests: `cloudflare/test/nemotron-audit-budget.test.mjs`
- No public HTTP route, cron, dashboard button, agent invocation, PR patching, or automatic publishing. It cannot charge tokens until explicitly invoked in trusted server code.

## Fail-closed configuration

All four conditions must be satisfied **in the same Worker runtime**:
1. Secret `NVIDIA_API_KEY` installed in Cloudflare (never in GitHub or source).
2. `NEMOTRON_EXPERIMENT_ENABLED=true`.
3. `NEMOTRON_EXPERIMENT_BUDGET_APPROVED=true`.
4. `NEMOTRON_EXPERIMENT_DAILY_CALLS=1` (permitted values 1–3), with the D1 `DB` binding and existing `nexus_state` schema.

If any condition is missing, the adapter returns a reason without calling NVIDIA. Each attempt reserves a D1 slot with an atomic conditional UPDATE **before** the network call. An attempt counts even on timeout or provider failure. No retry.

The intended rollout is **one manually approved internal smoke invocation with sanitized, public, non-sensitive code** after verifying account eligibility, rates and NVIDIA licensing. The presence of the secret has **not been verified** from GitHub alone.

## Tests

```sh
node --test cloudflare/test/nemotron-audit-budget.test.mjs
```

These tests **mock** the provider and D1; passing them is not evidence of API connectivity, actual credits, latency, commercial licensing, or successful deployment.

## Safety boundaries

- Input is limited to 12,000 characters. Obvious tokens are rejected, but this is **not comprehensive DLP**; callers must remove signed URLs, client data, WhatsApp numbers and other secrets before invoking.
- Output is advisory text, never executable code or a publication trigger.
- Results are not considered verified bug fixes until Codex/QA run deterministic tests, CI/deploy and real MP4 checks when relevant.
- The NVIDIA API test/prototype offering is not automatically licensed for commercial customer-facing workloads. Confirm the user's actual license and credits before ever enabling.
- Do not merge the old experimental PR #144 directly into `main`: it is based on an older feature branch and carries unrelated video changes. This branch ports the useful isolated adapter from a fresh `main`.

## Verified Cloudflare D1 migration limitation (08/10/2026)

NEXUS CI on main, run 37789395867, **did not apply** migration 0010: the
`wrangler d1 migrations apply --remote` step returned HTTP error **7403**
(account not authorized to access D1). That CI step is configured with
`continue-on-error`, so the overall GitHub workflow still finished green.
Worker deployment and database migration success are **not equivalent**.

The adapter now uses the existing `nexus_state` table with an atomic conditional
SQLite JSON update. It no longer depends on migration 0010. The Cloudflare
D1 permission mismatch remains an independent infrastructure issue to fix for
future schema changes. No claims of live key/account/usage validation are made.
