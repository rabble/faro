# Faro Deployment - Cloudflare (Nos Verse Account)

## Deployed Services

### Workers (CDN Enforcement + Admin API)

#### Production
- **URL**: https://faro-divine-video-production.protestnet.workers.dev
- **KV Namespace**: `5e6aa5d982dd439687760e722cabe1ca`
- **AUTH_TOKEN**: Set (production secret)
- **Version**: `94d8c43d-8a9d-4cab-8c3f-2c3fb0780847`

#### Staging
- **URL**: https://faro-divine-video-staging.protestnet.workers.dev
- **KV Namespace**: `9bd8fb4db5a54cc182d78d34c45c01d8`
- **AUTH_TOKEN**: Set (staging secret)
- **Version**: `d8b5101a-b777-499c-91c4-26fecbe236bd`

### Pages (Unified Moderation App)

- **Main App**: https://faro-tools.pages.dev/
- **DMCA Intake**: https://faro-tools.pages.dev/dmca_intake.html
- **DMCA Counter-Notice**: https://faro-tools.pages.dev/dmca_counter.html
- **Latest Deployment**: https://0d3d6a87.faro-tools.pages.dev

## Quick Test Commands

### Test Staging Worker
```bash
# Test root endpoint
curl https://faro-divine-video-staging.protestnet.workers.dev

# Test media endpoint (should 404)
curl https://faro-divine-video-staging.protestnet.workers.dev/v/test123

# Test admin auth (should 401)
curl -X POST https://faro-divine-video-staging.protestnet.workers.dev/admin/block \
  -H "Content-Type: application/json" \
  -d '{"id":"test"}'
```

### Access Tools
1. Label Publisher: https://faro-tools.pages.dev/nip07_label_publisher.html
2. DMCA Forms: https://faro-tools.pages.dev/dmca_intake.html

## Management Commands

```bash
# View logs
wrangler tail --env staging
wrangler tail --env production

# Update secrets
wrangler secret put AUTH_TOKEN --env staging
wrangler secret put AUTH_TOKEN --env production

# Deploy updates
npm run deploy:staging
npm run deploy:production

# Update Pages
wrangler pages deploy tools --project-name faro-tools
```

## KV Management

```bash
# List KV keys (staging)
wrangler kv key list --namespace-id 9bd8fb4db5a54cc182d78d34c45c01d8

# List KV keys (production)
wrangler kv key list --namespace-id 5e6aa5d982dd439687760e722cabe1ca

# Put a test rule
wrangler kv key put "asset:test123" '{"status":"region","countries_blocked":["US"]}' \
  --namespace-id 9bd8fb4db5a54cc182d78d34c45c01d8

# Get a rule
wrangler kv key get "asset:test123" \
  --namespace-id 9bd8fb4db5a54cc182d78d34c45c01d8

# Delete a rule
wrangler kv key delete "asset:test123" \
  --namespace-id 9bd8fb4db5a54cc182d78d34c45c01d8
```

## Next Steps

1. **Configure Custom Domain** (if desired):
   - Add custom domain in Cloudflare dashboard
   - Update CORS headers if needed

2. **Set Production AUTH_TOKEN**:
   - Generate secure token
   - Share with authorized moderators only
   - Update in worker: `wrangler secret put AUTH_TOKEN --env production`

3. **Connect to Nostr Relay**:
   - Update relay URL in label publisher
   - Configure webhook from relay to worker admin API

4. **Monitor Performance**:
   - Enable Cloudflare Analytics
   - Set up alerts for 4xx/5xx errors
   - Monitor KV usage

## Account Details
- **Account**: Nos Verse
- **Account ID**: c84e7a9bf7ed99cb41b8e73566568c75
- **Email**: rabble@verse.app