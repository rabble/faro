// ABOUTME: Main application controller for Faro moderation system
// ABOUTME: Handles NIP-07 auth, navigation, and shared functionality

// Application State
const APP = {
  user: null,
  npub: null,
  pubkey: null,
  relay: localStorage.getItem('faro_relay') || 'wss://relay3.openvine.co',
  workerUrl: window.location.hostname === 'localhost' 
    ? 'https://faro-divine-video-staging.protestnet.workers.dev'
    : 'https://faro-divine-video-production.protestnet.workers.dev',
  currentPage: 'dashboard',
  stats: {
    labels: 0,
    blocks: 0,
    reports: 0,
    dmca: 0
  },
  relays: [
    'wss://relay3.openvine.co',
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band',
    'wss://relay.snort.social',
    'wss://relay.primal.net',
    'wss://purplepag.es'
  ]
};

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Setup event listeners first
  document.getElementById('loginBtn').addEventListener('click', login);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  
  // Setup relay selector
  setupRelaySelector();
  
  // Check for saved session
  const savedPubkey = localStorage.getItem('faro_pubkey');
  if (savedPubkey && window.nostr) {
    try {
      const pubkey = await window.nostr.getPublicKey();
      if (pubkey === savedPubkey) {
        // Auto-login with saved session
        APP.pubkey = savedPubkey;
        APP.npub = pubkeyToNpub(savedPubkey);
        APP.user = true;
        
        // Update UI
        document.getElementById('loginGate').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        document.getElementById('loginBtn').classList.add('hidden');
        document.getElementById('userInfo').classList.remove('hidden');
        document.getElementById('navRelay').classList.remove('hidden');
        document.querySelector('.user-npub').textContent = APP.npub.substring(0, 16) + '...';
        
        // Load dashboard
        showDashboard();
        loadActivity();
      } else {
        // Different wallet connected, clear saved session
        localStorage.removeItem('faro_pubkey');
      }
    } catch (e) {
      console.log('Session restore failed:', e);
      localStorage.removeItem('faro_pubkey');
    }
  }
  
  // Load stats
  loadStats();
}

function setupRelaySelector() {
  const savedRelay = localStorage.getItem('faro_relay') || APP.relay;
  const select = document.getElementById('relaySelect');
  const customInput = document.getElementById('customRelay');
  const connectBtn = document.getElementById('connectRelay');
  const status = document.getElementById('relayStatus');
  
  if (select) {
    // Check if saved relay is in predefined list
    if (APP.relays.includes(savedRelay)) {
      select.value = savedRelay;
      status.textContent = `Connected to: ${savedRelay.replace('wss://', '')}`;
    } else {
      // Custom relay
      select.value = 'custom';
      customInput.value = savedRelay;
      customInput.style.display = 'block';
      connectBtn.style.display = 'block';
      status.textContent = `Connected to: ${savedRelay.replace('wss://', '')}`;
    }
    
    APP.relay = savedRelay;
  }
}

// NIP-07 Authentication
async function login() {
  if (!window.nostr) {
    alert('Please install a Nostr wallet extension like Alby or nos2x');
    window.open('https://getalby.com', '_blank');
    return;
  }
  
  try {
    APP.pubkey = await window.nostr.getPublicKey();
    APP.npub = pubkeyToNpub(APP.pubkey);
    APP.user = true;
    
    // Save session
    localStorage.setItem('faro_pubkey', APP.pubkey);
    
    // Update UI
    document.getElementById('loginGate').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('loginBtn').classList.add('hidden');
    document.getElementById('userInfo').classList.remove('hidden');
    document.getElementById('navRelay').classList.remove('hidden');
    document.querySelector('.user-npub').textContent = APP.npub.substring(0, 16) + '...';
    
    // Load dashboard
    showDashboard();
    
  } catch (error) {
    console.error('Login failed:', error);
    alert('Failed to connect wallet. Please try again.');
  }
}

function logout() {
  APP.user = null;
  APP.pubkey = null;
  APP.npub = null;
  
  // Clear session
  localStorage.removeItem('faro_pubkey');
  
  // Update UI
  document.getElementById('loginGate').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('pageContent').classList.add('hidden');
  document.getElementById('loginBtn').classList.remove('hidden');
  document.getElementById('userInfo').classList.add('hidden');
  document.getElementById('navRelay').classList.add('hidden');
  
  // Reset to initial state
  APP.currentPage = 'dashboard';
  
  // Log activity
  console.log('User logged out');
}

// Navigation
function navigateTo(page) {
  if (!APP.user) {
    alert('Please connect your wallet first');
    return;
  }
  
  APP.currentPage = page;
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('pageContent').classList.remove('hidden');
  
  switch(page) {
    case 'labeler':
      loadLabeler();
      break;
    case 'reports':
      loadReports();
      break;
    case 'dmca':
      loadDMCA();
      break;
    case 'rules':
      loadRules();
      break;
    default:
      showDashboard();
  }
}

function showDashboard() {
  APP.currentPage = 'dashboard';
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('pageContent').classList.add('hidden');
  loadStats();
  loadActivity();
}

// Page Loaders
function loadLabeler() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">🏷️ Label Publisher</h2>
      <div class="page-actions">
        <button class="btn-secondary" onclick="showDashboard()">← Back</button>
      </div>
    </div>
    
    <div class="labeler-container">
      <fieldset>
        <legend>Target Selection</legend>
        <label for="targetType">Target Type</label>
        <select id="targetType">
          <option value="e">Event (e)</option>
          <option value="a">Address (a)</option>
          <option value="p">Pubkey (p)</option>
        </select>
        
        <label for="targetValue">Target Value</label>
        <input id="targetValue" placeholder="Event ID, address, or pubkey hex">
      </fieldset>
      
      <fieldset>
        <legend>DTSP Label</legend>
        <label for="category">Category</label>
        <select id="category">
          <option value="">Select category...</option>
          <optgroup label="P0 - Critical">
            <option value="sexual_minors">sexual_minors</option>
            <option value="nonconsensual_sexual_content">nonconsensual_sexual_content</option>
            <option value="credible_threats">credible_threats</option>
            <option value="doxxing_pii">doxxing_pii</option>
            <option value="terrorism_extremism">terrorism_extremism</option>
            <option value="malware_scam">malware_scam</option>
          </optgroup>
          <optgroup label="P1 - High">
            <option value="illegal_goods">illegal_goods</option>
            <option value="hate_harassment">hate_harassment</option>
            <option value="self_harm_suicide">self_harm_suicide</option>
            <option value="graphic_violence_gore">graphic_violence_gore</option>
          </optgroup>
          <optgroup label="P2 - Standard">
            <option value="bullying_abuse">bullying_abuse</option>
            <option value="adult_nudity">adult_nudity</option>
            <option value="explicit_sex">explicit_sex</option>
            <option value="pornography">pornography</option>
          </optgroup>
          <optgroup label="Legal">
            <option value="copyright">copyright</option>
            <option value="trademark">trademark</option>
          </optgroup>
        </select>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label for="action">Action</label>
            <select id="action">
              <option value="">None</option>
              <option value="block">block</option>
              <option value="age_gate">age_gate</option>
              <option value="blur">blur</option>
              <option value="warn">warn</option>
              <option value="mute">mute</option>
            </select>
          </div>
          
          <div>
            <label for="loc">Region</label>
            <select id="loc">
              <option value="">Global</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="EU">European Union</option>
              <option value="NZ">New Zealand</option>
              <option value="AU">Australia</option>
            </select>
          </div>
        </div>
        
        <label for="reason">Reason / Notes</label>
        <textarea id="reason" placeholder="Optional explanation or case notes"></textarea>
      </fieldset>
      
      <fieldset>
        <legend>Quick Actions</legend>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn-secondary btn-small" onclick="applyPreset('adult')">Adult Content</button>
          <button class="btn-secondary btn-small" onclick="applyPreset('copyright')">Copyright (US)</button>
          <button class="btn-danger btn-small" onclick="applyPreset('p0')">P0 Violation</button>
        </div>
      </fieldset>
      
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button class="btn-secondary" onclick="clearLabel()">Clear</button>
        <button class="btn-primary" onclick="publishLabel()">Sign & Publish</button>
      </div>
      
      <div id="labelStatus" style="margin-top: 20px;"></div>
    </div>
  `;
}

async function loadReports() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">📢 Report Queue</h2>
      <div class="page-actions">
        <button class="btn-secondary" onclick="showDashboard()">← Back</button>
        <button class="btn-primary" onclick="loadReports()">Refresh</button>
      </div>
    </div>
    
    <div style="background: #dbeafe; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
      <strong>Connected to:</strong> ${APP.relay}
    </div>
    
    <div class="reports-container">
      <div id="reportsList" class="activity-feed">
        <div class="activity-empty">Connecting to relay...</div>
      </div>
    </div>
  `;
  
  // Fetch real 1984 reports from relay
  fetchReports();
}

async function fetchReports() {
  const container = document.getElementById('reportsList');
  
  try {
    const ws = new WebSocket(APP.relay);
    
    ws.onopen = () => {
      container.innerHTML = '<div class="activity-empty">Loading moderation queue...</div>';
      
      // Subscribe to kind:1984 events (reports)
      const filter = {
        kinds: [1984],
        limit: 50,
        since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) // Last 7 days
      };
      
      const subId = Math.random().toString(36).substring(7);
      ws.send(JSON.stringify(['REQ', subId, filter]));
      
      const reports = [];
      let timeout;
      
      ws.onmessage = async (msg) => {
        const data = JSON.parse(msg.data);
        
        if (data[0] === 'EVENT' && data[1] === subId) {
          const event = data[2];
          reports.push(event);
          
          // Reset timeout on each message
          clearTimeout(timeout);
          timeout = setTimeout(async () => {
            ws.close();
            // Fetch all related data and display
            await processAndDisplayReports(reports);
          }, 1000);
        }
        
        if (data[0] === 'EOSE' && data[1] === subId) {
          // End of stored events
          setTimeout(async () => {
            ws.close();
            await processAndDisplayReports(reports);
          }, 500);
        }
      };
    };
    
    ws.onerror = (error) => {
      console.error('Relay error:', error);
      container.innerHTML = `<div class="activity-empty" style="color: var(--danger);">Failed to connect to relay: ${APP.relay}</div>`;
    };
    
  } catch (error) {
    console.error('Failed to fetch reports:', error);
    container.innerHTML = `<div class="activity-empty" style="color: var(--danger);">Error: ${error.message}</div>`;
  }
}

async function processAndDisplayReports(reports) {
  if (reports.length === 0) {
    document.getElementById('reportsList').innerHTML = '<div class="activity-empty">No reports found in the last 7 days</div>';
    APP.stats.reports = 0;
    updateStats();
    return;
  }
  
  // Sort by timestamp (newest first)
  reports.sort((a, b) => b.created_at - a.created_at);
  
  // Collect all IDs we need to fetch
  const profiles = new Map();
  const reportedEvents = new Map();
  const eventIds = new Set();
  const pubkeys = new Set();
  
  reports.forEach(report => {
    pubkeys.add(report.pubkey); // Reporter
    
    report.tags.forEach(tag => {
      if (tag[0] === 'e' && tag[1]) {
        eventIds.add(tag[1]); // Event being reported
      }
      if (tag[0] === 'p' && tag[1]) {
        pubkeys.add(tag[1]); // Person being reported
      }
    });
  });
  
  // Fetch all data in parallel
  const [profilesData, eventsData] = await Promise.all([
    fetchProfiles(Array.from(pubkeys)),
    fetchEvents(Array.from(eventIds))
  ]);
  
  // Store fetched data
  profilesData.forEach(p => profiles.set(p.pubkey, p));
  eventsData.forEach(e => reportedEvents.set(e.id, e));
  
  // For reported users without events, fetch their recent posts
  const reportedUsersWithoutEvents = [];
  reports.forEach(report => {
    report.tags.forEach(tag => {
      if (tag[0] === 'p' && tag[1]) {
        const hasEvent = Array.from(eventIds).some(id => {
          const event = reportedEvents.get(id);
          return event && event.pubkey === tag[1];
        });
        if (!hasEvent) {
          reportedUsersWithoutEvents.push(tag[1]);
        }
      }
    });
  });
  
  if (reportedUsersWithoutEvents.length > 0) {
    const recentPosts = await fetchRecentPosts(reportedUsersWithoutEvents);
    recentPosts.forEach(post => {
      if (!reportedEvents.has(post.id)) {
        reportedEvents.set(post.pubkey, post); // Store by pubkey for profile reports
      }
    });
  }
  
  // Update stats
  APP.stats.reports = reports.length;
  updateStats();
  
  // Display with all fetched data
  displayModerationQueue(reports, profiles, reportedEvents);
}

async function fetchProfiles(pubkeys) {
  if (pubkeys.length === 0) return [];
  
  return new Promise((resolve) => {
    const ws = new WebSocket(APP.relay);
    const profiles = [];
    
    ws.onopen = () => {
      const filter = {
        kinds: [0], // Profile metadata
        authors: pubkeys
      };
      
      const subId = Math.random().toString(36).substring(7);
      ws.send(JSON.stringify(['REQ', subId, filter]));
      
      let timeout;
      
      ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        
        if (data[0] === 'EVENT' && data[1] === subId) {
          const event = data[2];
          try {
            const metadata = JSON.parse(event.content);
            profiles.push({ pubkey: event.pubkey, ...metadata });
          } catch (e) {
            console.error('Failed to parse profile:', e);
          }
          
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            ws.close();
            resolve(profiles);
          }, 500);
        }
        
        if (data[0] === 'EOSE') {
          setTimeout(() => {
            ws.close();
            resolve(profiles);
          }, 200);
        }
      };
    };
    
    ws.onerror = () => resolve(profiles);
    setTimeout(() => {
      ws.close();
      resolve(profiles);
    }, 3000);
  });
}

async function fetchEvents(eventIds) {
  if (eventIds.length === 0) return [];
  
  return new Promise((resolve) => {
    const ws = new WebSocket(APP.relay);
    const events = [];
    
    ws.onopen = () => {
      const filter = {
        ids: eventIds
      };
      
      const subId = Math.random().toString(36).substring(7);
      ws.send(JSON.stringify(['REQ', subId, filter]));
      
      let timeout;
      
      ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        
        if (data[0] === 'EVENT' && data[1] === subId) {
          events.push(data[2]);
          
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            ws.close();
            resolve(events);
          }, 500);
        }
        
        if (data[0] === 'EOSE') {
          setTimeout(() => {
            ws.close();
            resolve(events);
          }, 200);
        }
      };
    };
    
    ws.onerror = () => resolve(events);
    setTimeout(() => {
      ws.close();
      resolve(events);
    }, 3000);
  });
}

async function fetchRecentPosts(pubkeys) {
  if (pubkeys.length === 0) return [];
  
  return new Promise((resolve) => {
    const ws = new WebSocket(APP.relay);
    const posts = [];
    
    ws.onopen = () => {
      const filter = {
        kinds: [1], // Text notes
        authors: pubkeys,
        limit: 3 // Get 3 recent posts per user
      };
      
      const subId = Math.random().toString(36).substring(7);
      ws.send(JSON.stringify(['REQ', subId, filter]));
      
      let timeout;
      
      ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        
        if (data[0] === 'EVENT' && data[1] === subId) {
          posts.push(data[2]);
          
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            ws.close();
            resolve(posts);
          }, 500);
        }
        
        if (data[0] === 'EOSE') {
          setTimeout(() => {
            ws.close();
            resolve(posts);
          }, 200);
        }
      };
    };
    
    ws.onerror = () => resolve(posts);
    setTimeout(() => {
      ws.close();
      resolve(posts);
    }, 3000);
  });
}

async function fetchProfilesForReports(reports, profilesMap) {
  const pubkeysToFetch = new Set();
  
  // Collect all pubkeys we need profiles for
  reports.forEach(report => {
    pubkeysToFetch.add(report.pubkey); // Reporter
    
    // Find reported pubkeys from tags
    report.tags.forEach(tag => {
      if (tag[0] === 'p' && tag[1]) {
        pubkeysToFetch.add(tag[1]);
      }
    });
  });
  
  if (pubkeysToFetch.size === 0) return;
  
  // Fetch profiles from relay
  return new Promise((resolve) => {
    const ws = new WebSocket(APP.relay);
    
    ws.onopen = () => {
      const filter = {
        kinds: [0], // Profile metadata
        authors: Array.from(pubkeysToFetch)
      };
      
      const subId = Math.random().toString(36).substring(7);
      ws.send(JSON.stringify(['REQ', subId, filter]));
      
      let timeout;
      
      ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        
        if (data[0] === 'EVENT' && data[1] === subId) {
          const event = data[2];
          try {
            const metadata = JSON.parse(event.content);
            profilesMap.set(event.pubkey, metadata);
          } catch (e) {
            console.error('Failed to parse profile:', e);
          }
          
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            ws.close();
            resolve();
          }, 500);
        }
        
        if (data[0] === 'EOSE') {
          setTimeout(() => {
            ws.close();
            resolve();
          }, 200);
        }
      };
    };
    
    ws.onerror = () => {
      resolve(); // Continue even if profiles fail
    };
    
    // Timeout after 3 seconds
    setTimeout(() => {
      ws.close();
      resolve();
    }, 3000);
  });
}

function displayModerationQueue(reports, profiles, reportedContent) {
  const container = document.getElementById('reportsList');
  
  if (reports.length === 0) {
    container.innerHTML = '<div class="activity-empty">No reports found in the last 7 days</div>';
    APP.stats.reports = 0;
    updateStats();
    return;
  }
  
  // Update stats
  APP.stats.reports = reports.length;
  updateStats();
  
  // Helper to detect content type
  function getContentType(kind) {
    const types = {
      0: { label: 'Profile', icon: '👤', color: 'var(--info)' },
      1: { label: 'Post', icon: '📝', color: 'var(--primary)' },
      3: { label: 'Contacts', icon: '📋', color: 'var(--success)' },
      4: { label: 'DM', icon: '✉️', color: 'var(--danger)' },
      6: { label: 'Repost', icon: '🔁', color: 'var(--warning)' },
      7: { label: 'Reaction', icon: '❤️', color: 'var(--danger)' },
      1984: { label: 'Report', icon: '🚨', color: 'var(--warning)' },
      1985: { label: 'Label', icon: '🏷️', color: 'var(--info)' }
    };
    return types[kind] || { label: `Kind ${kind}`, icon: '📄', color: 'var(--gray)' };
  }
  
  // Helper to format content preview
  function formatContent(content, maxLength = 500) {
    if (!content) return '<em>No content</em>';
    
    // Check for images/videos
    const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|mp4|webm|mov))/gi;
    const hasMedia = content.match(urlRegex);
    
    let formatted = content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(urlRegex, '<a href="$1" target="_blank" class="content-link">$1</a>');
    
    if (hasMedia) {
      hasMedia.forEach(url => {
        if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          formatted += `<br><img src="${url}" style="max-width: 100%; max-height: 300px; border-radius: 8px; margin-top: 8px;" onerror="this.style.display='none'">`;
        }
      });
    }
    
    if (content.length > maxLength && !hasMedia) {
      return formatted.substring(0, maxLength) + '...';
    }
    
    return formatted;
  }
  
  // Parse and display reports
  const html = reports.map((report, index) => {
    let reportCategory = 'unknown';
    let targetEventId = '';
    let targetPubkey = '';
    let reportReason = report.content || 'No reason provided';
    
    // Parse report tags
    for (const tag of report.tags) {
      if (tag[0] === 'e') targetEventId = tag[1];
      if (tag[0] === 'p') targetPubkey = tag[1];
      if (tag[0] === 'report' || tag[0] === 'l') reportCategory = tag[1];
      if (tag[0] === 'k') reportCategory = tag[1];
    }
    
    // Get the actual reported content
    let reportedEvent = null;
    let contentToShow = null;
    let contentType = null;
    
    if (targetEventId) {
      reportedEvent = reportedContent.get(targetEventId);
    } else if (targetPubkey) {
      // For profile reports, get their recent post
      reportedEvent = reportedContent.get(targetPubkey);
    }
    
    if (reportedEvent) {
      contentType = getContentType(reportedEvent.kind);
      contentToShow = reportedEvent.content;
    }
    
    // Get profiles
    const reporterProfile = profiles.get(report.pubkey) || {};
    const reportedProfile = targetPubkey ? profiles.get(targetPubkey) : null;
    
    // Format displays
    const reporterName = reporterProfile.display_name || reporterProfile.name || 'Anonymous';
    const reportedName = reportedProfile ? (reportedProfile.display_name || reportedProfile.name || 'Unknown User') : 'Unknown';
    
    const time = new Date(report.created_at * 1000).toLocaleString();
    
    return `
      <div class="moderation-card" id="report-${report.id}">
        <!-- Report Header -->
        <div class="mod-header">
          <div class="mod-badges">
            ${contentType ? `
              <span class="content-type-badge" style="background: ${contentType.color};">
                ${contentType.icon} ${contentType.label}
              </span>
            ` : ''}
            <span class="report-category-badge">
              🚨 ${reportCategory}
            </span>
          </div>
          <div class="mod-time">${time}</div>
        </div>
        
        <!-- Reported Content Section -->
        ${reportedEvent ? `
          <div class="reported-content-section">
            <div class="content-header">
              <strong>Reported Content</strong>
              ${reportedEvent.kind === 1 ? '<span class="content-meta">Text Note</span>' : ''}
            </div>
            <div class="reported-content-box">
              ${reportedProfile ? `
                <div class="content-author">
                  ${reportedProfile.picture ? `<img src="${reportedProfile.picture}" class="author-pic" onerror="this.style.display='none'">` : ''}
                  <div>
                    <div class="author-name">${reportedName}</div>
                    <div class="author-time">${new Date(reportedEvent.created_at * 1000).toLocaleString()}</div>
                  </div>
                </div>
              ` : ''}
              <div class="content-body">
                ${formatContent(contentToShow)}
              </div>
              ${reportedEvent.tags && reportedEvent.tags.length > 0 ? `
                <div class="content-tags">
                  ${reportedEvent.tags.filter(t => t[0] === 't').map(t => 
                    `<span class="hashtag">#${t[1]}</span>`
                  ).join(' ')}
                </div>
              ` : ''}
            </div>
          </div>
        ` : targetPubkey ? `
          <div class="reported-content-section">
            <div class="content-header">
              <strong>Reported User Profile</strong>
            </div>
            <div class="reported-content-box">
              ${reportedProfile ? `
                <div class="profile-preview">
                  ${reportedProfile.picture ? `<img src="${reportedProfile.picture}" class="profile-preview-pic" onerror="this.style.display='none'">` : ''}
                  <div class="profile-preview-info">
                    <div class="profile-name">${reportedName}</div>
                    ${reportedProfile.about ? `<div class="profile-bio">${reportedProfile.about}</div>` : ''}
                    ${reportedProfile.website ? `<div class="profile-link"><a href="${reportedProfile.website}" target="_blank">${reportedProfile.website}</a></div>` : ''}
                  </div>
                </div>
              ` : '<em>Profile data not available</em>'}
            </div>
          </div>
        ` : `
          <div class="reported-content-section">
            <div class="content-header">
              <strong>Reported Content</strong>
            </div>
            <div class="reported-content-box">
              <em>Content could not be loaded. It may have been deleted.</em>
            </div>
          </div>
        `}
        
        <!-- Report Details -->
        <div class="report-details">
          <div class="report-meta">
            <div class="reporter-info">
              <span class="meta-label">Reported by:</span>
              <span class="reporter-name">${reporterName}</span>
            </div>
            ${targetEventId ? `
              <div class="event-id">
                <span class="meta-label">Event:</span>
                <code class="id-code">${targetEventId.substring(0, 16)}...</code>
              </div>
            ` : ''}
          </div>
          <div class="report-reason">
            <div class="reason-label">Report Reason:</div>
            <div class="reason-text">${reportReason}</div>
          </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="mod-actions">
          <div class="quick-moderation-panel">
            <!-- Category Selection -->
            <div class="mod-category-group">
              <label class="mod-label">Content Category:</label>
              <select class="mod-category-select" id="cat-${report.id}">
                <option value="">Select violation type...</option>
                <optgroup label="Sexual Content">
                  <option value="adult_nudity">Adult/Nudity</option>
                  <option value="erotic_nudity">Erotic/Nudity</option>
                  <option value="pornography">Pornography</option>
                </optgroup>
                <optgroup label="Violence">
                  <option value="graphic_violence_gore">Graphic Violence/Gore</option>
                  <option value="violence">Violence</option>
                </optgroup>
                <optgroup label="Harmful Content">
                  <option value="hate_harassment">Hate/Harassment</option>
                  <option value="self_harm_suicide">Self-Harm/Suicide</option>
                  <option value="child_safety">Child Safety</option>
                </optgroup>
                <optgroup label="Deceptive">
                  <option value="spam">Spam</option>
                  <option value="impersonation">Impersonation</option>
                  <option value="malware_scam">Malware/Scam</option>
                  <option value="misinformation">Misinformation</option>
                </optgroup>
                <optgroup label="Legal">
                  <option value="copyright">Copyright</option>
                  <option value="illegal_goods">Illegal Goods</option>
                  <option value="illegal_services">Illegal Services</option>
                </optgroup>
              </select>
            </div>
            
            <!-- Action Checkboxes -->
            <div class="mod-action-checks">
              <label class="mod-label">Apply Actions:</label>
              <div class="mod-checks-row">
                <label class="mod-check">
                  <input type="checkbox" id="blur-${report.id}" value="blur">
                  <span>🫥 Content Warning</span>
                </label>
                <label class="mod-check">
                  <input type="checkbox" id="age-${report.id}" value="age_gate">
                  <span>🔞 Age Gate (18+)</span>
                </label>
                <label class="mod-check">
                  <input type="checkbox" id="block-${report.id}" value="block">
                  <span>🚫 Full Block</span>
                </label>
              </div>
            </div>
            
            <!-- Regional Restrictions -->
            <div class="mod-region-group">
              <label class="mod-label">Regional Restrictions (optional):</label>
              <div class="mod-region-chips">
                <label class="region-chip">
                  <input type="checkbox" value="US">
                  <span>🇺🇸 US</span>
                </label>
                <label class="region-chip">
                  <input type="checkbox" value="EU">
                  <span>🇪🇺 EU</span>
                </label>
                <label class="region-chip">
                  <input type="checkbox" value="GB">
                  <span>🇬🇧 UK</span>
                </label>
                <label class="region-chip">
                  <input type="checkbox" value="CA">
                  <span>🇨🇦 CA</span>
                </label>
                <label class="region-chip">
                  <input type="checkbox" value="AU">
                  <span>🇦🇺 AU</span>
                </label>
                <label class="region-chip">
                  <input type="checkbox" value="JP">
                  <span>🇯🇵 JP</span>
                </label>
              </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="mod-button-row">
              <button class="btn-primary" onclick="applyModeration('${report.id}', '${targetEventId || targetPubkey}')">
                ✓ Apply Labels
              </button>
              <button class="btn-secondary" onclick="dismissReport('${report.id}')">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = html || '<div class="activity-empty">No reports to display</div>';
}

// Enhanced moderation with multiple actions
async function applyModeration(reportId, target) {
  if (!window.nostr) {
    alert('Connect wallet first');
    return;
  }
  
  // Get selected category
  const category = document.getElementById(`cat-${reportId}`).value;
  if (!category) {
    alert('Please select a content category');
    return;
  }
  
  // Get selected actions
  const actions = [];
  if (document.getElementById(`blur-${reportId}`).checked) actions.push('blur');
  if (document.getElementById(`age-${reportId}`).checked) actions.push('age_gate');
  if (document.getElementById(`block-${reportId}`).checked) actions.push('block');
  
  if (actions.length === 0) {
    alert('Please select at least one action');
    return;
  }
  
  // Get selected regions
  const regionChips = document.querySelectorAll(`#report-${reportId} .region-chip input:checked`);
  const regions = Array.from(regionChips).map(input => input.value);
  
  try {
    // Create a label for each action
    for (const action of actions) {
      const tags = [
        ['l', category],
        ['L', 'divine.video/mod'],
        [target.length === 64 ? 'e' : 'p', target],
        ['action', action]
      ];
      
      // Add regions if specified
      if (regions.length > 0) {
        tags.push(['regions', regions.join(',')]);
      }
      
      const nostrEvent = {
        kind: 1985,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content: `Moderation: ${action} for ${category}${regions.length ? ` in ${regions.join(', ')}` : ''}`,
        pubkey: APP.pubkey
      };
      
      const signed = await window.nostr.signEvent(nostrEvent);
      const relay = await connectRelay(APP.relay);
      await relay.publish(signed);
    }
    
    // Visual feedback
    const card = document.getElementById(`report-${reportId}`);
    if (card) {
      card.style.opacity = '0.5';
      const header = card.querySelector('.mod-header');
      if (header && !header.querySelector('.action-applied')) {
        const badge = document.createElement('span');
        badge.className = 'action-applied';
        badge.style.cssText = 'background: var(--success); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: auto;';
        badge.textContent = `✓ ${actions.length} action(s) applied`;
        header.appendChild(badge);
      }
    }
    
    // Update stats
    APP.stats.labels += actions.length;
    APP.stats.reports = Math.max(0, APP.stats.reports - 1);
    updateStats();
    
    // Log activity
    const activity = {
      action: `Applied ${actions.join(', ')}`,
      target: category,
      time: Date.now()
    };
    const activities = JSON.parse(localStorage.getItem('faro_activity') || '[]');
    activities.unshift(activity);
    localStorage.setItem('faro_activity', JSON.stringify(activities.slice(0, 50)));
    
  } catch (error) {
    console.error('Failed to apply moderation:', error);
    alert('Failed to apply moderation: ' + error.message);
  }
}

// Legacy quick action function (kept for compatibility)
async function quickAction(action, target, category, buttonElement) {
  if (!window.nostr) {
    alert('Connect wallet first');
    return;
  }
  
  const tags = [
    ['l', category || 'content_warning'],
    ['L', 'divine.video/mod'],
    [target.length === 64 ? 'e' : 'p', target],
    ['action', action]
  ];
  
  const nostrEvent = {
    kind: 1985,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: `Quick moderation: ${action}`,
    pubkey: APP.pubkey
  };
  
  try {
    const signed = await window.nostr.signEvent(nostrEvent);
    const relay = await connectRelay(APP.relay);
    await relay.publish(signed);
    
    // Visual feedback - find the card from the button that was clicked
    const card = buttonElement ? buttonElement.closest('.moderation-card') : 
                 document.querySelector('.moderation-card');
    if (card) {
      card.style.opacity = '0.5';
      const header = card.querySelector('.mod-header');
      if (header && !header.querySelector('.action-applied')) {
        const badge = document.createElement('span');
        badge.className = 'action-applied';
        badge.style.cssText = 'background: var(--success); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: auto;';
        badge.textContent = `✓ ${action} applied`;
        header.appendChild(badge);
      }
    }
    
    // Update stats
    APP.stats.labels++;
    APP.stats.reports = Math.max(0, APP.stats.reports - 1);
    updateStats();
    
  } catch (error) {
    console.error('Failed to apply action:', error);
    alert('Failed to apply action: ' + error.message);
  }
}

function toggleContent(contentId) {
  const content = document.getElementById(contentId);
  const expand = event.target;
  
  if (content.classList.contains('expanded')) {
    content.classList.remove('expanded');
    expand.textContent = 'Show full content';
  } else {
    content.classList.add('expanded');
    expand.textContent = 'Show less';
  }
}

function loadDMCA() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">⚖️ DMCA Management</h2>
      <div class="page-actions">
        <button class="btn-secondary" onclick="showDashboard()">← Back</button>
      </div>
    </div>
    
    <div class="dmca-container">
      <div class="action-grid">
        <div class="action-card" onclick="window.open('dmca_intake.html', '_blank')">
          <h3>📝 New Takedown</h3>
          <p>File a DMCA takedown request</p>
        </div>
        
        <div class="action-card" onclick="window.open('dmca_counter.html', '_blank')">
          <h3>🔄 Counter-Notice</h3>
          <p>Contest a takedown</p>
        </div>
      </div>
      
      <div class="activity-section">
        <h3>Recent DMCA Actions</h3>
        <div class="activity-feed">
          <div class="activity-empty">No recent DMCA activity</div>
        </div>
      </div>
    </div>
  `;
}

function loadRules() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">🚫 Active Rules</h2>
      <div class="page-actions">
        <button class="btn-secondary" onclick="showDashboard()">← Back</button>
        <button class="btn-primary" onclick="loadRules()">Refresh</button>
      </div>
    </div>
    
    <div id="rulesContainer">
      <div class="activity-feed">
        <div class="activity-empty">Loading active rules...</div>
      </div>
    </div>
  `;
  
  // Would fetch from Worker API
  fetchActiveRules();
}

// Label Publisher Functions
function applyPreset(type) {
  switch(type) {
    case 'adult':
      document.getElementById('category').value = 'adult_nudity';
      document.getElementById('action').value = 'blur';
      break;
    case 'copyright':
      document.getElementById('category').value = 'copyright';
      document.getElementById('action').value = 'block';
      document.getElementById('loc').value = 'US';
      break;
    case 'p0':
      document.getElementById('category').value = 'sexual_minors';
      document.getElementById('action').value = 'block';
      break;
  }
}

function clearLabel() {
  document.getElementById('targetValue').value = '';
  document.getElementById('category').value = '';
  document.getElementById('action').value = '';
  document.getElementById('loc').value = '';
  document.getElementById('reason').value = '';
}

async function publishLabel() {
  if (!window.nostr) {
    alert('Wallet not connected');
    return;
  }
  
  const targetType = document.getElementById('targetType').value;
  const targetValue = document.getElementById('targetValue').value;
  const category = document.getElementById('category').value;
  const action = document.getElementById('action').value;
  const loc = document.getElementById('loc').value;
  const reason = document.getElementById('reason').value;
  
  if (!targetValue || !category) {
    alert('Target and category are required');
    return;
  }
  
  const tags = [
    ['l', category],
    ['L', 'divine.video/mod'],
    [targetType, targetValue]
  ];
  
  if (action) tags.push(['action', action]);
  if (loc) tags.push(['loc', loc]);
  
  const event = {
    kind: 1985,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: reason || '',
    pubkey: APP.pubkey
  };
  
  try {
    const signed = await window.nostr.signEvent(event);
    
    // Publish to relay
    const relay = await connectRelay(APP.relay);
    await relay.publish(signed);
    
    document.getElementById('labelStatus').innerHTML = 
      `<div style="padding: 12px; background: #d1fae5; border-radius: 8px; color: #065f46;">
        ✓ Label published successfully<br>
        Event ID: ${signed.id}
      </div>`;
    
    // Update stats
    APP.stats.labels++;
    updateStats();
    
    // Clear form
    setTimeout(clearLabel, 2000);
    
  } catch (error) {
    console.error('Failed to publish:', error);
    document.getElementById('labelStatus').innerHTML = 
      `<div style="padding: 12px; background: #fee2e2; border-radius: 8px; color: #991b1b;">
        ✗ Failed to publish: ${error.message}
      </div>`;
  }
}

// Relay Connection
async function connectRelay(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const relay = {
      publish: (event) => {
        return new Promise((res, rej) => {
          ws.send(JSON.stringify(['EVENT', event]));
          const handler = (msg) => {
            const data = JSON.parse(msg.data);
            if (data[0] === 'OK' && data[1] === event.id) {
              ws.removeEventListener('message', handler);
              res(data);
            }
          };
          ws.addEventListener('message', handler);
          setTimeout(() => rej(new Error('Publish timeout')), 5000);
        });
      },
      close: () => ws.close()
    };
    
    ws.onopen = () => resolve(relay);
    ws.onerror = reject;
  });
}

// Stats and Activity
function loadStats() {
  document.getElementById('statLabels').textContent = APP.stats.labels;
  document.getElementById('statBlocks').textContent = APP.stats.blocks;
  document.getElementById('statReports').textContent = APP.stats.reports;
  document.getElementById('statDMCA').textContent = APP.stats.dmca;
  
  // Update badges
  document.getElementById('reportCount').textContent = `${APP.stats.reports} pending`;
  document.getElementById('ruleCount').textContent = `${APP.stats.blocks} active`;
}

function updateStats() {
  loadStats();
}

function loadActivity() {
  const feed = document.getElementById('activityFeed');
  const activities = JSON.parse(localStorage.getItem('faro_activity') || '[]');
  
  if (activities.length === 0) {
    feed.innerHTML = '<div class="activity-empty">No recent activity</div>';
    return;
  }
  
  feed.innerHTML = activities.slice(0, 10).map(a => `
    <div class="activity-item">
      <strong>${a.action}</strong> - ${a.target}
      <div class="activity-time">${new Date(a.time).toLocaleString()}</div>
    </div>
  `).join('');
}

async function fetchActiveRules() {
  // This would call the Worker API in production
  // For now, show demo data
  const container = document.getElementById('rulesContainer');
  container.innerHTML = `
    <table style="width: 100%; background: white; border-radius: 8px;">
      <thead>
        <tr style="border-bottom: 2px solid var(--border);">
          <th style="padding: 12px; text-align: left;">Asset ID</th>
          <th style="padding: 12px; text-align: left;">Type</th>
          <th style="padding: 12px; text-align: left;">Regions</th>
          <th style="padding: 12px; text-align: left;">Reason</th>
          <th style="padding: 12px; text-align: left;">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="5" style="padding: 24px; text-align: center; color: var(--gray);">
            No active rules
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

// Utility Functions
function pubkeyToNpub(hex) {
  // Simplified npub encoding (would use proper bech32 in production)
  return 'npub1' + hex.substring(0, 12) + '...';
}

// Relay Management
function changeRelay(value) {
  const customInput = document.getElementById('customRelay');
  const connectBtn = document.getElementById('connectRelay');
  const status = document.getElementById('relayStatus');
  
  if (value === 'custom') {
    // Show custom input
    customInput.style.display = 'block';
    connectBtn.style.display = 'block';
    customInput.focus();
    status.innerHTML = '<span style="color: var(--warning);">⚠️ Enter custom relay URL and click Connect</span>';
  } else {
    // Hide custom input and connect to selected relay
    customInput.style.display = 'none';
    connectBtn.style.display = 'none';
    
    // Update relay
    APP.relay = value;
    localStorage.setItem('faro_relay', value);
    
    // Show connection status
    status.innerHTML = `<span style="color: var(--success);">✓ Connected to: ${value.replace('wss://', '')}</span>`;
    
    // Refresh reports if on reports page
    if (APP.currentPage === 'reports') {
      setTimeout(() => loadReports(), 500);
    }
  }
}

function connectCustomRelay() {
  const customUrl = document.getElementById('customRelay').value.trim();
  const status = document.getElementById('relayStatus');
  
  if (!customUrl) {
    status.innerHTML = '<span style="color: var(--danger);">✗ Please enter a relay URL</span>';
    return;
  }
  
  if (!customUrl.startsWith('wss://') && !customUrl.startsWith('ws://')) {
    status.innerHTML = '<span style="color: var(--danger);">✗ Relay URL must start with wss:// or ws://</span>';
    return;
  }
  
  // Test connection
  status.innerHTML = '<span style="color: var(--info);">⏳ Connecting...</span>';
  
  const ws = new WebSocket(customUrl);
  
  ws.onopen = () => {
    // Connection successful
    APP.relay = customUrl;
    localStorage.setItem('faro_relay', customUrl);
    status.innerHTML = `<span style="color: var(--success);">✓ Connected to: ${customUrl.replace('wss://', '')}</span>`;
    ws.close();
    
    // Refresh reports if on reports page
    if (APP.currentPage === 'reports') {
      setTimeout(() => loadReports(), 500);
    }
  };
  
  ws.onerror = () => {
    status.innerHTML = '<span style="color: var(--danger);">✗ Failed to connect to relay</span>';
  };
  
  setTimeout(() => {
    if (ws.readyState === WebSocket.CONNECTING) {
      ws.close();
      status.innerHTML = '<span style="color: var(--danger);">✗ Connection timeout</span>';
    }
  }, 5000);
}

// Helper Functions for Reports
function createLabelForReport(target, reportType) {
  // Navigate to labeler with pre-filled data
  navigateTo('labeler');
  
  setTimeout(() => {
    // Detect if target is event or pubkey
    if (target.length === 64) {
      document.getElementById('targetType').value = 'e';
      document.getElementById('targetValue').value = target;
    } else {
      document.getElementById('targetType').value = 'p';
      document.getElementById('targetValue').value = target;
    }
    
    // Map report type to DTSP category if possible
    const categoryMap = {
      'spam': 'spam',
      'illegal': 'illegal_goods',
      'impersonation': 'impersonation',
      'harassment': 'hate_harassment',
      'adult': 'adult_nudity',
      'violence': 'graphic_violence_gore',
      'malware': 'malware_scam',
      'self-harm': 'self_harm_suicide',
      'copyright': 'copyright'
    };
    
    for (const [key, value] of Object.entries(categoryMap)) {
      if (reportType && reportType.toLowerCase().includes(key)) {
        document.getElementById('category').value = value;
        break;
      }
    }
  }, 100);
}

function dismissReport(reportId) {
  // In production, this would mark the report as reviewed
  const element = document.getElementById(`report-${reportId}`);
  if (element) {
    element.classList.add('report-dismissed');
    
    // Update count
    APP.stats.reports = Math.max(0, APP.stats.reports - 1);
    updateStats();
  }
}

// Export for use in other pages
window.APP = APP;
window.navigateTo = navigateTo;
window.showDashboard = showDashboard;
window.publishLabel = publishLabel;
window.applyPreset = applyPreset;
window.clearLabel = clearLabel;
window.changeRelay = changeRelay;
window.connectCustomRelay = connectCustomRelay;
window.createLabelForReport = createLabelForReport;
window.dismissReport = dismissReport;
window.loadReports = loadReports;
window.quickAction = quickAction;
window.applyModeration = applyModeration;
window.toggleContent = toggleContent;