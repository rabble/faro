// Core rule evaluation and helpers for faro Worker

// Rule shape (stored in KV under key `asset:<id>`):
// {
//   id: string,
//   paths: string[],
//   status: 'region' | 'global_block',
//   countries_blocked?: string[],
//   reason?: string,
//   exp?: number // unix epoch seconds
// }

function isExpired(rule, nowSec = Math.floor(Date.now() / 1000)) {
  return !!(rule && rule.exp && Number(rule.exp) > 0 && Number(rule.exp) <= nowSec);
}

function evaluateRule(rule, country) {
  // Returns { code: number|null, reason: string|null, varyCountry: boolean }
  if (!rule) return { code: null, reason: null, varyCountry: false };
  if (isExpired(rule)) return { code: null, reason: null, varyCountry: false };
  if (rule.status === 'global_block') {
    return { code: 410, reason: rule.reason || 'removed', varyCountry: false };
  }
  if (rule.status === 'region') {
    const list = Array.isArray(rule.countries_blocked) ? rule.countries_blocked : [];
    const match = country && list.includes(String(country).toUpperCase());
    if (match) return { code: 451, reason: rule.reason || 'unavailable_for_legal_reasons', varyCountry: true };
  }
  return { code: null, reason: null, varyCountry: rule.status === 'region' };
}

function getAssetIdFromPath(pathname) {
  // Supported: /v/:id and /t/:id(.jpg|.png|...)
  // Returns just the :id portion (no extension)
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const bucket = parts[0];
  const idPart = parts.slice(1).join('/');
  if (bucket !== 'v' && bucket !== 't') return null;
  // strip extension for thumbnails
  const id = idPart.replace(/\.[a-zA-Z0-9]+$/, '');
  return id || null;
}

export {
  isExpired,
  evaluateRule,
  getAssetIdFromPath,
};

