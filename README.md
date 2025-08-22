# Faro - Trust & Safety for divine.video

Nostr-native moderation service implementing DTSP-aligned content labeling and CDN enforcement.

## Features

✅ **KV Storage + Admin APIs** - Secure rule management with audit logging  
✅ **Media Passthrough + Geoblocks** - 451/410 responses with professional HTML templates  
✅ **NIP-07 Labeler UI** - Sign and publish kind:1985 labels via browser wallet  
✅ **Label→CDN Hook** - Process labels and trigger enforcement actions  
✅ **DMCA/Counter-Notice Forms** - Legal compliance intake with validation  
✅ **Tests + CI** - Comprehensive test suite with GitHub Actions  

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start local development
npm run dev

# Deploy to Cloudflare
npm run deploy:staging
npm run deploy:production
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Labeler UI │────▶│ Nostr Relay  │◀────│  Reporters  │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │                     │
   kind:1985           kind:1985             kind:1984
       │                    │                     │
       └────────────────────┼─────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ Label Hook   │
                    │ (Processor)  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ CDN Worker   │
                    │ (/admin API) │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  KV Store    │
                    │ (Rules DB)   │
                    └──────────────┘
```

## Admin API Endpoints

### Block (Regional)
```bash
curl -X POST https://divine.video/admin/block \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "video123",
    "paths": ["/v/video123", "/t/video123"],
    "countries": ["US", "CA"],
    "reason": "copyright",
    "ttl": 86400
  }'
```

### Takedown (Global)
```bash
curl -X POST https://divine.video/admin/takedown \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "video456",
    "paths": ["/v/video456"],
    "reason": "policy_violation"
  }'
```

### Unblock
```bash
curl -X POST https://divine.video/admin/unblock \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "video123"}'
```

## Configuration

### Environment Variables
- `AUTH_TOKEN`: Bearer token for admin API authentication
- `ORIGIN_URL`: Upstream media origin for passthrough
- `RULES`: KV namespace binding (auto-configured by Wrangler)

### Cloudflare Setup
1. Create KV namespace: `wrangler kv:namespace create RULES`
2. Update namespace ID in `wrangler.toml`
3. Set secrets: `wrangler secret put AUTH_TOKEN`
4. Deploy: `npm run deploy:production`

## Tools

### Label Publisher (`tools/nip07_label_publisher.html`)
- NIP-07 wallet integration
- DTSP category selection
- Action/severity/location tags
- Evidence URL support
- Preset configurations

### DMCA Intake (`tools/dmca_intake.html`)
- Legal compliance form
- Required attestations
- Electronic signature
- Audit trail

### Counter-Notice (`tools/dmca_counter.html`)
- Contest false claims
- Timeline expectations
- Risk acknowledgment
- Legal jurisdiction consent

## Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:rules

# Watch logs in production
npm run tail
```

## Deployment

### GitHub Actions CI/CD
- Automatic testing on push/PR
- Preview deployments for PRs
- Production deployment on main branch merge

### Manual Deployment
```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production (requires confirmation)
npm run deploy:production
```

## Security

- Admin endpoints require bearer token authentication
- All actions logged for audit trail
- Personal information handling compliant with privacy laws
- Rate limiting via Cloudflare
- Input validation on all endpoints

## License

Private - Copyright divine.video