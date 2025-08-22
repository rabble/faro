// ABOUTME: Input validation for admin API endpoints
// ABOUTME: Validates request payloads for block, unblock, and takedown operations

const VALID_COUNTRIES = [
  'US', 'CA', 'MX', 'BR', 'AR', 'GB', 'FR', 'DE', 'IT', 'ES', 
  'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'PL', 'RU',
  'UA', 'JP', 'CN', 'KR', 'IN', 'AU', 'NZ', 'ZA', 'EG', 'IL'
];

const VALID_REASONS = [
  'legal', 'copyright', 'trademark', 'privacy', 'defamation',
  'hate_speech', 'violence', 'sexual_content', 'minor_safety',
  'terrorism', 'self_harm', 'misinformation', 'spam', 'malware'
];

function validateBlockRequest(body) {
  const errors = [];
  
  // Validate ID
  if (!body.id || typeof body.id !== 'string' || body.id.length < 1) {
    errors.push('id must be a non-empty string');
  }
  
  // Validate paths
  if (!Array.isArray(body.paths) || body.paths.length === 0) {
    errors.push('paths must be a non-empty array');
  } else if (!body.paths.every(p => typeof p === 'string' && p.startsWith('/'))) {
    errors.push('all paths must be strings starting with /');
  }
  
  // Validate countries
  if (!Array.isArray(body.countries) || body.countries.length === 0) {
    errors.push('countries must be a non-empty array');
  } else {
    const invalidCountries = body.countries.filter(
      c => !VALID_COUNTRIES.includes(String(c).toUpperCase())
    );
    if (invalidCountries.length > 0) {
      errors.push(`invalid countries: ${invalidCountries.join(', ')}`);
    }
  }
  
  // Validate reason (optional but must be valid if provided)
  if (body.reason && !VALID_REASONS.includes(body.reason)) {
    errors.push(`reason must be one of: ${VALID_REASONS.join(', ')}`);
  }
  
  // Validate TTL (optional but must be positive if provided)
  if (body.ttl !== undefined) {
    const ttl = Number(body.ttl);
    if (isNaN(ttl) || ttl <= 0 || ttl > 31536000) { // Max 1 year
      errors.push('ttl must be a positive number (seconds, max 1 year)');
    }
  }
  
  return errors;
}

function validateUnblockRequest(body) {
  const errors = [];
  
  if (!body.id || typeof body.id !== 'string' || body.id.length < 1) {
    errors.push('id must be a non-empty string');
  }
  
  return errors;
}

function validateTakedownRequest(body) {
  const errors = [];
  
  // Validate ID
  if (!body.id || typeof body.id !== 'string' || body.id.length < 1) {
    errors.push('id must be a non-empty string');
  }
  
  // Validate paths
  if (!Array.isArray(body.paths) || body.paths.length === 0) {
    errors.push('paths must be a non-empty array');
  } else if (!body.paths.every(p => typeof p === 'string' && p.startsWith('/'))) {
    errors.push('all paths must be strings starting with /');
  }
  
  // Validate reason (optional but must be valid if provided)
  if (body.reason && !VALID_REASONS.includes(body.reason)) {
    errors.push(`reason must be one of: ${VALID_REASONS.join(', ')}`);
  }
  
  return errors;
}

export {
  validateBlockRequest,
  validateUnblockRequest,
  validateTakedownRequest,
  VALID_COUNTRIES,
  VALID_REASONS
};