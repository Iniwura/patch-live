const VALIDATE = 'https://id.twitch.tv/oauth2/validate';
const API = 'https://api.twitch.tv/helix/eventsub/subscriptions';
const SOCKET = 'wss://eventsub.wss.twitch.tv/ws';
const TOKEN_KEY = 'patchlive_twitch_token';
const STATE_KEY = 'patchlive_oauth_state';
const CLIENT_KEY = 'patchlive_client_id';

// Storage can be blocked in privacy modes, sandboxed embeds or local reviewers.
// In those environments the demo still works, but OAuth must fail explicitly.
function safeGet(kind, key) { try { return globalThis[kind].getItem(key); } catch { return null; } }
function safeRemove(kind, key) { try { globalThis[kind].removeItem(key); } catch { /* storage unavailable */ } }
function requiredSet(kind, key, value) {
  try { globalThis[kind].setItem(key, value); }
  catch { throw new Error('Browser storage is blocked. Open PATCH//LIVE in a normal browser tab to connect Twitch.'); }
}
export function getClientId() { return safeGet('localStorage',CLIENT_KEY) || ''; }
export function saveClientId(id) { requiredSet('localStorage',CLIENT_KEY,id.trim()); }
export function getToken() { return safeGet('sessionStorage',TOKEN_KEY); }
export function disconnectToken() { safeRemove('sessionStorage',TOKEN_KEY); }
export function redirectUri(path = '/play/') { return `${location.origin}${path === '/duel/' ? '/duel/' : '/play/'}`; }

export function beginOAuth(clientId, path = '/play/') {
  if (!/^[a-z0-9]{25,40}$/i.test(clientId)) throw new Error('Enter a valid Twitch application Client ID.');
  saveClientId(clientId);
  const state = Array.from(crypto.getRandomValues(new Uint8Array(24)), x => x.toString(16).padStart(2, '0')).join('');
  requiredSet('sessionStorage',STATE_KEY,state);
  const params = new URLSearchParams({
    response_type: 'token', client_id: clientId, redirect_uri: redirectUri(path),
    scope: 'user:read:chat', state
  });
  location.assign(`https://id.twitch.tv/oauth2/authorize?${params}`);
}

export function consumeOAuthCallback() {
  const hash = location.hash.slice(1);
  if (!hash.includes('access_token=') && !hash.includes('error=')) return null;
  history.replaceState(null, '', location.pathname + location.search);
  const parsed = new URLSearchParams(hash);
  if (parsed.has('error')) return { error: parsed.get('error_description') || parsed.get('error') };
  const expected = safeGet('sessionStorage',STATE_KEY);
  safeRemove('sessionStorage',STATE_KEY);
  if (!expected || parsed.get('state') !== expected) return { error: 'OAuth state mismatch. Reconnect to Twitch.' };
  const token = parsed.get('access_token');
  if (!token) return { error: 'Twitch did not return an access token.' };
  try { requiredSet('sessionStorage',TOKEN_KEY,token); } catch(e) { return {error:e.message}; }
  return { success: true };
}

export async function validateToken(token, clientId) {
  const res = await fetch(VALIDATE, { headers: { Authorization: `OAuth ${token}` } });
  if (!res.ok) throw new Error(`Twitch token validation failed (HTTP ${res.status}). Reconnect.`);
  const data = await res.json();
  if (data.client_id !== clientId) throw new Error('The token belongs to a different Twitch Client ID.');
  if (!data.scopes?.includes('user:read:chat')) throw new Error('Missing user:read:chat permission. Reconnect.');
  return data;
}

export class TwitchChat {
  constructor({ onStatus, onMessage }) {
    this.onStatus = onStatus;
    this.onMessage = onMessage;
    this.ws = null;
    this.migratingFrom = null;
    this.stopped = true;
    this.active = false;
    this.token = null;
    this.clientId = null;
    this.userId = null;
    this.seen = new Set();
    this.retries = 0;
    this.retryTimer = null;
    this.socketGeneration = 0;
  }

  status(state, detail = '') { this.onStatus({ state, detail }); }

  async start(token, clientId) {
    this.stop();
    this.stopped = false;
    this.token = token;
    this.clientId = clientId;
    this.status('connecting', 'Validating Twitch authorization…');
    try {
      const user = await validateToken(token, clientId);
      if (this.stopped) return;
      this.userId = user.user_id;
      this.userName = user.login;
      this.connectSocket(SOCKET, false);
    } catch (e) {
      this.status('error', e.message);
    }
  }

  connectSocket(url, isTwitchReconnect) {
    if (this.stopped) return;
    const generation = ++this.socketGeneration;
    this.status('connecting', isTwitchReconnect ? 'Migrating Twitch session…' : 'Connecting to Twitch EventSub…');
    const ws = new WebSocket(url);
    const old = this.ws;
    this.ws = ws;
    if (old && old !== ws) {
      old.onclose = null;
      if (isTwitchReconnect) {
        // Twitch requires the old connection to remain open until the new Welcome.
        // It can still deliver chat notifications during the transition.
        this.migratingFrom = old;
      } else {
        old.close();
        if (this.migratingFrom && this.migratingFrom !== old) this.migratingFrom.close();
        this.migratingFrom = null;
      }
    }
    ws.onmessage = async ({ data }) => {
      if (this.stopped || (generation !== this.socketGeneration && ws !== this.migratingFrom)) return;
      let packet;
      try { packet = JSON.parse(data); } catch { return; }
      const type = packet.metadata?.message_type;
      if (type === 'session_welcome') {
        this.retries = 0;
        if (isTwitchReconnect) {
          const previous = this.migratingFrom;
          this.migratingFrom = null;
          if (previous) { previous.onmessage = null; previous.close(); }
          this.active = true;
          this.status('live', `Listening in #${this.userName}`);
        } else await this.subscribe(packet.payload?.session?.id, generation);
      } else if (type === 'notification' && packet.metadata?.subscription_type === 'channel.chat.message') {
        const event = packet.payload?.event;
        if (event && (!event.message_id || !this.seen.has(event.message_id))) {
          if (event.message_id) this.seen.add(event.message_id);
          if (this.seen.size > 1200) this.seen.clear();
          this.onMessage(event);
        }
      } else if (type === 'session_reconnect' && ws === this.ws) {
        const reconnectUrl = packet.payload?.session?.reconnect_url;
        if (reconnectUrl?.startsWith('wss://eventsub.wss.twitch.tv/')) this.connectSocket(reconnectUrl, true);
        else this.status('error', 'Twitch sent an invalid reconnect URL.');
      } else if (type === 'revocation') {
        this.active = false;
        this.status('error', `Twitch authorization revoked: ${packet.payload?.subscription?.status || 'unknown'}`);
      }
    };
    ws.onerror = () => { if (!this.stopped && generation === this.socketGeneration) this.status('error', 'Twitch WebSocket error. Reconnecting…'); };
    ws.onclose = () => {
      if (this.stopped || generation !== this.socketGeneration) return;
      if (this.migratingFrom) { this.migratingFrom.onmessage = null; this.migratingFrom.close(); this.migratingFrom = null; }
      this.active = false;
      this.retries++;
      const delay = Math.min(16000, 1000 * 2 ** Math.min(this.retries, 4));
      this.status('connecting', `Connection lost. Retry ${this.retries} in ${delay / 1000}s…`);
      this.retryTimer = setTimeout(() => this.connectSocket(SOCKET, false), delay);
    };
  }

  async subscribe(sessionId, generation) {
    if (!sessionId || !this.userId || !this.token || this.stopped) return;
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Client-ID': this.clientId, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'channel.chat.message', version: '1',
          condition: { broadcaster_user_id: this.userId, user_id: this.userId },
          transport: { method: 'websocket', session_id: sessionId }
        })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `Subscription failed (HTTP ${res.status}).`);
      if (this.stopped || generation !== this.socketGeneration) return;
      this.active = true;
      this.status('live', `Listening in #${this.userName}`);
    } catch (e) {
      if (this.stopped || generation !== this.socketGeneration) return;
      this.active = false;
      // A forbidden/expired scope will not improve through socket retries.
      this.stopped = true;
      if (this.ws) { this.ws.onclose = null; this.ws.close(); this.ws = null; }
      this.status('error', `EventSub subscription failed: ${e.message}`);
    }
  }

  stop() {
    this.stopped = true;
    this.active = false;
    this.socketGeneration++;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    if (this.ws) { this.ws.onclose = null; this.ws.close(); this.ws = null; }
    if (this.migratingFrom) { this.migratingFrom.onmessage = null; this.migratingFrom.close(); this.migratingFrom = null; }
    this.status('offline', 'Twitch is not connected');
  }
}
