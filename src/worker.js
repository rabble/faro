// ABOUTME: Cloudflare Worker for CDN enforcement with geoblocking and takedowns
// ABOUTME: Manages rules in KV, provides admin API, and enforces content restrictions

import { evaluateRule, getAssetIdFromPath } from './lib/rules.js';
import { errorTemplates } from './lib/templates.js';
import { 
  validateBlockRequest, 
  validateUnblockRequest, 
  validateTakedownRequest 
} from './lib/validation.js';

// Worker for CDN enforcement and admin rule management.
// ENV provides:
// - RULES: KV namespace for storing enforcement rules
// - AUTH_TOKEN: secret bearer token for admin endpoints
// - ORIGIN_URL: upstream origin for media passthrough (optional)

async function jsonRes(obj, init = {}) {
  return new Response(JSON.stringify(obj), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
    ...init,
  });
}

function unauthorized() { return new Response('unauthorized', { status: 401 }); }
function badRequest(msg) { return new Response(msg || 'bad request', { status: 400 }); }

async function handleAdmin(request, env) {
  const url = new URL(request.url);
  const auth = request.headers.get('authorization') || '';
  if (!env.AUTH_TOKEN || !auth.startsWith('Bearer ') || auth.slice(7) !== env.AUTH_TOKEN) {
    return unauthorized();
  }
  const action = url.pathname.split('/').pop();
  let body = {};
  try { body = await request.json(); } catch {}

  if (action === 'block') {
    const errors = validateBlockRequest(body);
    if (errors.length > 0) {
      return badRequest(`Validation errors: ${errors.join('; ')}`);
    }
    
    const { id, paths, countries, reason, ttl } = body;
    const rule = {
      id,
      paths,
      status: 'region',
      countries_blocked: countries.map(c => String(c).toUpperCase()),
      reason: reason || 'legal',
      created_at: new Date().toISOString(),
    };
    
    if (ttl && Number(ttl) > 0) {
      rule.exp = Math.floor(Date.now() / 1000) + Number(ttl);
    }
    
    await env.RULES.put(`asset:${id}`, JSON.stringify(rule));
    
    // Log the action for audit trail
    const auditLog = {
      action: 'block',
      asset_id: id,
      countries: rule.countries_blocked,
      reason: rule.reason,
      timestamp: rule.created_at,
      expires: rule.exp || null,
    };
    console.log('AUDIT:', JSON.stringify(auditLog));
    
    // TODO: Trigger CDN cache purge for affected paths
    
    return jsonRes({ ok: true, rule, audit: auditLog });
  }

  if (action === 'unblock') {
    const errors = validateUnblockRequest(body);
    if (errors.length > 0) {
      return badRequest(`Validation errors: ${errors.join('; ')}`);
    }
    
    const { id } = body;
    
    // Get existing rule for audit log
    const existingRule = await env.RULES.get(`asset:${id}`, 'json');
    
    await env.RULES.delete(`asset:${id}`);
    
    // Log the action for audit trail
    const auditLog = {
      action: 'unblock',
      asset_id: id,
      previous_rule: existingRule,
      timestamp: new Date().toISOString(),
    };
    console.log('AUDIT:', JSON.stringify(auditLog));
    
    // TODO: Trigger CDN cache purge for affected paths
    
    return jsonRes({ ok: true, removed: !!existingRule, audit: auditLog });
  }

  if (action === 'takedown') {
    const errors = validateTakedownRequest(body);
    if (errors.length > 0) {
      return badRequest(`Validation errors: ${errors.join('; ')}`);
    }
    
    const { id, paths, reason } = body;
    const rule = { 
      id, 
      paths, 
      status: 'global_block', 
      reason: reason || 'removed',
      created_at: new Date().toISOString(),
    };
    
    await env.RULES.put(`asset:${id}`, JSON.stringify(rule));
    
    // Log the action for audit trail
    const auditLog = {
      action: 'takedown',
      asset_id: id,
      reason: rule.reason,
      paths: paths,
      timestamp: rule.created_at,
    };
    console.log('AUDIT:', JSON.stringify(auditLog));
    
    // TODO: Trigger origin deletion and CDN cache purge
    
    return jsonRes({ ok: true, rule, audit: auditLog });
  }

  return badRequest('unknown action');
}

async function handleMedia(request, env, ctx) {
  const url = new URL(request.url);
  const id = getAssetIdFromPath(url.pathname);
  if (!id) {
    return new Response('not found', { status: 404 });
  }
  
  // Check for enforcement rules
  const rule = await env.RULES.get(`asset:${id}`, 'json');
  
  // Derive country: CF sets request.cf.country; fallback to headers for testing
  const cfCountry = (request.cf && request.cf.country) || 
                    request.headers.get('cf-ipcountry') || 
                    request.headers.get('x-test-country') || '';
  
  const { code, reason, varyCountry } = evaluateRule(rule, cfCountry);
  
  // If blocked, return appropriate error page
  if (code) {
    const headers = new Headers({ 'content-type': 'text/html; charset=utf-8' });
    if (varyCountry) headers.set('Vary', 'CF-IPCountry');
    headers.set('Cache-Control', 'no-store');
    
    // Use proper HTML templates based on status code
    let body;
    if (code === 451) {
      body = errorTemplates[451](reason, cfCountry);
    } else if (code === 410) {
      body = errorTemplates[410](reason);
    } else if (code === 403) {
      body = errorTemplates[403](reason);
    } else {
      // Fallback for any other codes
      body = `<!doctype html><meta charset="utf-8"><title>${code}</title><h1>${code}</h1><p>${reason}</p>`;
    }
    
    return new Response(body, { status: code, headers });
  }
  
  // Media passthrough - fetch from origin if configured
  if (env.ORIGIN_URL) {
    const originUrl = new URL(url.pathname, env.ORIGIN_URL);
    originUrl.search = url.search; // Preserve query params
    
    // Forward request to origin with appropriate headers
    const originRequest = new Request(originUrl, {
      method: request.method,
      headers: request.headers,
      cf: {
        // Cache based on URL and country when rules exist
        cacheKey: rule && rule.status === 'region' ? 
          `${originUrl.toString()}#${cfCountry}` : 
          originUrl.toString(),
        cacheTtl: 3600, // 1 hour cache
      },
    });
    
    const response = await fetch(originRequest);
    
    // Clone response and add cache headers if needed
    const newHeaders = new Headers(response.headers);
    if (rule && rule.status === 'region') {
      newHeaders.set('Vary', 'CF-IPCountry');
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }
  
  // Fallback if no origin configured
  return new Response(`Media passthrough not configured for ${url.pathname}`, { 
    status: 503, 
    headers: { 'content-type': 'text/plain' } 
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname.startsWith('/admin/')) {
      return handleAdmin(request, env);
    }
    if (request.method === 'GET' && (url.pathname.startsWith('/v/') || url.pathname.startsWith('/t/'))) {
      return handleMedia(request, env, ctx);
    }
    return new Response('ok', { status: 200 });
  }
};

