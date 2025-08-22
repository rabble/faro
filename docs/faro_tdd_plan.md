# Faro — TDD Plan & TODOs

## Test Philosophy
Write tests first for each unit and endpoint. Focus on deterministic rule evaluation (no network). Use Miniflare/Vitest (or similar) for Worker unit tests; mock purge/origin calls. UI is minimal and relies on NIP-07—test via manual acceptance and small helpers.

## Test Matrix (Worker)
1) Rule Evaluation
- Given KV rule `region US` on `/v/abc`, request from `US` → 451; from `NZ` → passthrough.
- Given `global_block` on `/v/abc` → 410 worldwide.
- No rule → passthrough.

2) Caching & Headers
- 451 responses include `Vary: CF-IPCountry` and no-store/cache-buster.
- Cache key respects `url#country` strategy (configurable).

3) Admin API
- POST /admin/block upserts KV rule; idempotent on repeat; validates payload.
- POST /admin/unblock removes KV rule; safe if missing.
- POST /admin/takedown sets global_block; triggers origin delete + purge (mocked) and returns success.
- All admin routes require bearer token; reject without/invalid.

4) Expiry
- KV rule with exp in past is ignored and auto-pruned on access.

5) Imeta Mapping
- Parse event with `imeta`/`i` tags → extract urls, sha256 (`x`), mime (`m`); build `eventassets` and `assetevents` entries deterministically.
- Fallback URL extraction from content; normalize host+path.

## Test Matrix (Labeler UI)
Manual acceptance + light unit helpers:
- Detect NIP-07 and read pubkey (mock window.nostr in tests).
- Build `kind:1985` event with DTSP tags from form/preset.
- Simulate relay OK ack (mock WebSocket) and show event id.

## TODOs (TDD Order)
- [ ] Tests: rule evaluation → 451/410/200 by country/status.
- [ ] Tests: headers/caching vary behavior.
- [ ] Tests: admin/block validation + idempotency.
- [ ] Tests: admin/unblock removes rules.
- [ ] Tests: takedown triggers mock purge/origin delete.
- [ ] Tests: rule expiry pruning.
- [ ] Tests: imeta parsing to assets map.
- [ ] Implement: minimal Worker router, types.
- [ ] Implement: KV adapter and rule model.
- [ ] Implement: GET media passthrough with rule checks.
- [ ] Implement: POST /admin/block|unblock|takedown.
- [ ] Implement: purge/origin delete hooks (mockable).
- [ ] Wire: logging/audit stubs.
- [ ] Manual: labeler UI smoke (NIP-07 detect, preset publish, relay ack).

## CI
- Lint + unit tests on push.
- Optional preview deploy to CF using wrangler (manual approval).

## Notes
- Keep Worker stateless; all state in KV. Avoid long-lived connections.
- Security: admin endpoints require token; rate-limit; structured logs.

