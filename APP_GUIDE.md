# Faro Moderation App - User Guide

## Live App
🚀 **https://faro-tools.pages.dev/**

## Features

### Unified Application
- **Single entry point** with proper navigation
- **NIP-07 wallet login** (Alby, nos2x, etc.)
- **Session persistence** (remembers login)
- **Dashboard** with stats and quick actions
- **Integrated tools** accessible after login

### Core Functionality

#### 1. Dashboard
- Quick stats (labels, blocks, reports, DMCA)
- Recent activity feed
- Action cards for main functions
- One-click navigation to all tools

#### 2. Label Publisher (Built-in)
- Create DTSP-aligned labels (kind:1985)
- Quick presets for common scenarios
- Regional restrictions (US, EU, etc.)
- Direct relay publishing
- Real-time feedback

#### 3. Report Queue
- View pending reports (kind:1984)
- Triage and process complaints
- Link to label creation

#### 4. DMCA Management
- Links to intake forms
- Counter-notice processing
- Activity tracking

#### 5. Active Rules
- View all CDN enforcement rules
- See geoblocks and takedowns
- Manage rule lifecycle

## How to Use

### First Time Setup
1. Go to https://faro-tools.pages.dev/
2. Install Nostr wallet (Alby recommended)
3. Click "Connect Wallet"
4. Approve connection in your wallet
5. You're logged in!

### Creating Labels
1. Click "Label Content" from dashboard
2. Enter target (event ID, pubkey, etc.)
3. Select DTSP category
4. Choose action (block, blur, age_gate)
5. Add region if needed (US, EU, etc.)
6. Click "Sign & Publish"
7. Label is sent to relay and triggers CDN rules

### Processing DMCA
1. Click "DMCA Requests" from dashboard
2. Choose "New Takedown" or "Counter-Notice"
3. Fill out legal forms
4. Submit for processing

### Managing Rules
1. Click "Active Rules" from dashboard
2. View all enforcement rules
3. See what's blocked where
4. Remove expired rules

## Technical Details

### Architecture
```
┌─────────────┐
│  Browser    │
│  + NIP-07   │
└──────┬──────┘
       │
       ├─────────► Nostr Relay
       │           (Labels/Reports)
       │
       └─────────► CDN Worker
                   (Enforcement)
```

### Deployment URLs
- **App**: https://faro-tools.pages.dev/
- **Worker (Staging)**: https://faro-divine-video-staging.protestnet.workers.dev
- **Worker (Production)**: https://faro-divine-video-production.protestnet.workers.dev

### Files Structure
```
tools/
├── index.html      # Main app with router
├── app.js          # Core logic & NIP-07
├── styles.css      # Unified design system
├── dmca_intake.html    # DMCA form (standalone)
└── dmca_counter.html   # Counter-notice (standalone)
```

## Admin API Examples

### Create Geoblock
```bash
curl -X POST https://faro-divine-video-production.protestnet.workers.dev/admin/block \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "video123",
    "paths": ["/v/video123"],
    "countries": ["US"],
    "reason": "copyright"
  }'
```

### Remove Rule
```bash
curl -X POST https://faro-divine-video-production.protestnet.workers.dev/admin/unblock \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "video123"}'
```

## Next Steps

1. **Configure AUTH_TOKEN** for production Worker
2. **Set up webhook** from relay to Worker
3. **Add custom domain** (e.g., mod.divine.video)
4. **Train moderators** on DTSP categories
5. **Monitor performance** in Cloudflare dashboard

## Support

- **Issues**: Create issue in repo
- **Logs**: `wrangler tail --env production`
- **KV Management**: Use wrangler CLI