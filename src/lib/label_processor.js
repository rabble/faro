// ABOUTME: Processes Nostr labels (kind:1985) and triggers CDN enforcement
// ABOUTME: Maps DTSP categories and actions to CDN rules (block/geoblock/takedown)

import { VALID_COUNTRIES } from './validation.js';

// Map DTSP categories to enforcement severity
const CATEGORY_SEVERITY = {
  // P0 - Immediate takedown required
  'sexual_minors': 'p0',
  'nonconsensual_sexual_content': 'p0',
  'credible_threats': 'p0',
  'doxxing_pii': 'p0',
  'terrorism_extremism': 'p0',
  'malware_scam': 'p0',
  
  // P1 - High priority
  'illegal_goods': 'p1',
  'hate_harassment': 'p1',
  'self_harm_suicide': 'p1',
  'graphic_violence_gore': 'p1',
  
  // P2 - Standard priority  
  'bullying_abuse': 'p2',
  'adult_nudity': 'p2',
  'explicit_sex': 'p2',
  'pornography': 'p2',
  'fetish': 'p2',
  'sexual_wellness': 'p2',
  
  // P3 - Low priority
  'spam': 'p3',
  'platform_abuse': 'p3',
  'impersonation': 'p3',
  'copyright': 'p3',
  'trademark': 'p3',
  'medical_misinformation': 'p3',
  'election_political_misinfo': 'p3',
};

// Extract imeta URLs from Nostr event content or tags
function extractImetaUrls(event) {
  const urls = [];
  
  // Check for imeta tags
  if (event.tags) {
    for (const tag of event.tags) {
      if (tag[0] === 'imeta') {
        // Parse imeta format: ["imeta", "url https://...", "m video/mp4", ...]
        for (let i = 1; i < tag.length; i++) {
          const part = tag[i];
          if (part.startsWith('url ')) {
            const url = part.substring(4);
            urls.push(url);
          }
        }
      }
    }
  }
  
  // Also check content for URLs (fallback)
  if (event.content) {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
    const matches = event.content.match(urlRegex) || [];
    urls.push(...matches);
  }
  
  return urls;
}

// Convert URL to asset ID for divine.video media
function urlToAssetId(url) {
  try {
    const parsed = new URL(url);
    
    // Check if it's a divine.video URL
    if (parsed.hostname === 'divine.video' || parsed.hostname.endsWith('.divine.video')) {
      // Extract asset ID from path (/v/:id or /t/:id)
      const pathMatch = parsed.pathname.match(/^\/(v|t)\/([^\/\?]+)/);
      if (pathMatch) {
        return pathMatch[2].replace(/\.[a-zA-Z0-9]+$/, ''); // Remove extension
      }
    }
  } catch (e) {
    // Invalid URL
  }
  return null;
}

// Process a kind:1985 label event and determine CDN actions
async function processLabelEvent(labelEvent, env) {
  const actions = [];
  
  // Parse label tags
  const tags = labelEvent.tags || [];
  let category, action, loc, sev, targetType, targetValue;
  
  for (const tag of tags) {
    const [key, value] = tag;
    switch (key) {
      case 'l': category = value; break;
      case 'action': action = value; break;
      case 'loc': loc = value; break;
      case 'sev': sev = value; break;
      case 'e': targetType = 'event'; targetValue = value; break;
      case 'a': targetType = 'address'; targetValue = value; break;
      case 'p': targetType = 'pubkey'; targetValue = value; break;
    }
  }
  
  if (!category) {
    return { error: 'No category found in label' };
  }
  
  // Determine enforcement based on category and action
  const defaultSeverity = CATEGORY_SEVERITY[category] || 'p3';
  const effectiveSeverity = sev || defaultSeverity;
  
  // For P0 violations, always takedown
  if (effectiveSeverity === 'p0' || action === 'block') {
    // Need to find the target event to get media URLs
    if (targetType === 'event' && targetValue) {
      // This would normally fetch the event from a relay
      // For now, we'll return the action structure
      actions.push({
        type: 'takedown',
        eventId: targetValue,
        category,
        reason: category.replace(/_/g, ' '),
        severity: effectiveSeverity,
      });
    }
  }
  
  // For copyright/legal with location, geoblock
  if ((category === 'copyright' || category === 'trademark') && loc) {
    const countries = loc.split(',').map(c => c.trim().toUpperCase());
    const validCountries = countries.filter(c => VALID_COUNTRIES.includes(c));
    
    if (validCountries.length > 0 && targetType === 'event' && targetValue) {
      actions.push({
        type: 'geoblock',
        eventId: targetValue,
        countries: validCountries,
        category,
        reason: `${category} restriction`,
        severity: effectiveSeverity,
      });
    }
  }
  
  return { actions };
}

// Apply CDN enforcement actions
async function applyCDNEnforcement(action, assetIds, env) {
  const results = [];
  
  for (const assetId of assetIds) {
    try {
      let response;
      
      if (action.type === 'takedown') {
        // Call takedown admin API
        response = await fetch(`${env.WORKER_URL}/admin/takedown`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: assetId,
            paths: [`/v/${assetId}`, `/t/${assetId}`],
            reason: action.reason,
          }),
        });
      } else if (action.type === 'geoblock') {
        // Call block admin API for regional restriction
        response = await fetch(`${env.WORKER_URL}/admin/block`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: assetId,
            paths: [`/v/${assetId}`, `/t/${assetId}`],
            countries: action.countries,
            reason: action.reason,
          }),
        });
      }
      
      if (response && response.ok) {
        const result = await response.json();
        results.push({ assetId, success: true, ...result });
      } else {
        results.push({ 
          assetId, 
          success: false, 
          error: response ? `HTTP ${response.status}` : 'Unknown error' 
        });
      }
    } catch (error) {
      results.push({ assetId, success: false, error: error.message });
    }
  }
  
  return results;
}

export {
  CATEGORY_SEVERITY,
  extractImetaUrls,
  urlToAssetId,
  processLabelEvent,
  applyCDNEnforcement,
};