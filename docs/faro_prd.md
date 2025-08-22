# Faro (divine.video) — PRD

## Summary
Faro is the trust & safety service for divine.video using Nostr-native moderation. It publishes signed DTSP-aligned labels (kind:1985), ingests community reports (kind:1984), and enforces legal/critical actions on divine.video media at the CDN. The client remains smart (applies labels locally) and server infrastructure stays minimal.

## Goals
- Publish DTSP-aligned `1985` labels from a dedicated moderation key (NIP-07 now; optional NIP-46 later).
- Enforce P0/DMCA on divine.video media (CDN geoblocks 451, takedowns 410). External hosts are advisory-only.
- Provide a small, secure moderator flow to compose/sign labels without server-held secrets.
- Keep everything transparent and reversible where possible (expiries, clears).

## Non-goals (MVP)
- No centralized content feed/proxy (clients connect to relays directly).
- No age verification collection (client-only interstitial consent, indefinite).
- No heavy ML pipelines (optional later via async tooling).

## Personas
- Moderator (solo operator): labels P0/DMCA/adult; triggers CDN rules when needed.
- Viewer: sees warnings/age-gates; can still use any relay.
- Reporter: files NIP-56 (1984) reports with evidence.

## User Stories
- As a moderator, I can sign and publish a `1985` label targeting an event/pubkey with DTSP category and optional `action/loc/sev/age/exp/r`.
- As a moderator, I can geoblock or takedown divine.video media derived from that event’s imeta.
- As a viewer, adult content shows a one-time 18+ interstitial; P0 content is hidden; DMCA content is unavailable in certain regions.

## Functional Requirements
- Label Publisher (client-only): NIP-07 detection, compose `1985`, sign, publish to `wss://relay3.openvine.co`.
- CDN Enforcement (divine.video only):
  - Regional legal block → HTTP 451 with `Vary: CF-IPCountry`.
  - Global takedown (P0/confirmed) → HTTP 410; origin delete + purge.
  - Optional policy overlay (e.g., NZ gore) → HTTP 403.
- External hosts: advisory-only labels; client shows warnings/interstitials; no autoplay; safe click-through.

## Nostr Event Model
- Reports `kind:1984` (ingest as signals): tags include `p`, `e|a`, `k=<dtsp_category>`, optional `loc`, `r`, `t`.
- Labels `kind:1985` (authoritative, signed by moderation key):
  - Required tags: `['l', category]`, `['L','divine.video/mod']`, target one of `['e'|'a'|'p', value]`.
  - Optional tags: `['action', 'block|age_gate|blur|warn|mute|quarantine']`, `['sev','p0|p1|p2']`, `['loc','US|NZ|...']`, `['age','18']`, `['exp', unix]`, `['r', caseURL]`.

## Divine.video Enforcement API (Worker-based, later)
- POST `/admin/block` { id, paths[], countries[], reason, ttl? } → KV upsert + CDN purge; 451 in countries.
- POST `/admin/unblock` { id } → remove KV rule + purge.
- POST `/admin/takedown` { id, paths[] } → mark global 410, delete at origin + purge.
Notes: secured via bearer token; logs each change; uses `Vary: CF-IPCountry` and cache key `url#country`.

## Data Model (KV keys)
- `asset:<id>` → { paths: string[], status: 'region'|'global_block', countries?: string[], reason: string, exp?: number }
- `eventassets:<eventId>` → string[] (asset ids)
- `assetevents:<assetId>` → string[] (event ids)

## Compliance Workflows
- P0: sexual_minors, nonconsensual_sexual_content, credible_threats, doxxing_pii, malware_scam → takedown (410), `1985` block.
- DMCA (US): validate → `1985` copyright + `loc:US`, geoblock (451); counter-notice may clear.
- Adult: `adult_nudity` → blur+18; `explicit_sex|pornography|fetish|sexual_wellness` → 18+ gate; client-only gating.

## Telemetry & Audit
- Append-only log of label publishes (event id, category, target, relay ack).
- CDN actions log (who/when/what, purge IDs). Minimal PII, retention-limited.

## Milestones
- M0: DTSP vocabulary, labeler UI (NIP-07), documentation.
- M1: CDN enforcement Worker (KV, 451/410/403), admin endpoints, imeta→asset mapping.
- M2: DMCA and reclaim intake forms (storage only), basic reporter trust heuristics.
- M3: Optional ingestion service for 1984/1985 analytics; transparency manifest.

## Risks & Mitigations
- Third-party clients ignore labels → mitigate via CDN on divine.video media.
- Key compromise (moderator) → rotate npub; NIP-46 with hardware signer later.
- Over/under-labeling → reversible labels with `exp`, appeals flow later.

