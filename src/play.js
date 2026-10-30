import { PATCHES, VoteRound, canonicalVoteUser, compilePatch } from './patches.js';
import { ArenaEngine } from './engine.js';
import { BOSS_FORMS } from './boss-evolution.js';
import { ACTS } from './progression.js';
import { demoChatEvent, DEMO_SCENARIO } from './demo.js';
import { TwitchChat, beginOAuth, consumeOAuthCallback, disconnectToken, getClientId, getToken, redirectUri } from './twitch.js';

const el = id => document.getElementById(id);
const offlineLabel = 'OFFLINE / SIMULATED';
let round = new VoteRound();
let liveMode = false;
let showcaseRunning = false;
let guidedMode = false;
let showcaseTimers = [];
let mockSequence = 0;
let demoVoterCount = 0;
let patchCount = 0;
let lastVetoAt = 0;
let feed = [];
let audioEnabled = true;
let audioContext = null;
const formatClock = total => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(Math.max(0, Math.floor(total % 60))).padStart(2, '0')}`;

function addFeed(kind, text) {
  feed.unshift({ kind, text, time: new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) });
  feed = feed.slice(0, 12);
  const root = el('activity-feed');
  root.replaceChildren();
  for (const item of feed.slice(0, 5)) {
    const row = document.createElement('div'); row.className = 'feed-item';
    const mark = document.createElement('span'); mark.className = `feed-marker ${item.kind}`; mark.textContent = item.kind === 'system' ? '✳' : item.kind === 'vote' ? '↗' : '◈';
    const content = document.createElement('span'); content.className = 'feed-text'; content.textContent = item.text;
    const time = document.createElement('time'); time.textContent = item.time;
    row.append(mark, content, time); root.append(row);
  }
}

function tone(frequency, duration = .1, type = 'sine') {
  if (!audioEnabled) return;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gain.gain.setValueAtTime(.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.07, audioContext.currentTime + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + duration + .02);
  } catch { /* Audio is an enhancement; the game remains complete without it. */ }
}

function resetRound() {
  round = new VoteRound();
  renderVotes();
}

function clearShowcaseTimers() {
  showcaseTimers.forEach(timer => clearTimeout(timer));
  showcaseTimers = [];
}

function showPatchImpact(recipe, sourceLabel, impact = null) {
  if (!recipe) return;
  const panel = el('patch-impact');
  el('patch-impact-icon').textContent = recipe.icon;
  el('patch-impact-label').textContent = impact?.visible || recipe.label;
  el('patch-impact-source').textContent = sourceLabel;
  panel.classList.remove('show');
  void panel.offsetWidth;
  panel.classList.add('show');
  setTimeout(() => panel.classList.remove('show'), 2800);
  tone(recipe.compounded ? 530 : 420, .16, 'triangle');
}

function renderVotes() {
  const counts = round.counts();
  const total = round.total();
  el('vote-count').textContent = total;
  el('unique-voters').textContent = new Set(round.votes.keys()).size;
  for (const option of document.querySelectorAll('.patch-option')) {
    const count = counts[option.dataset.patch] || 0;
    option.querySelector('.option-progress i').style.width = `${total ? Math.round(count / total * 100) : 0}%`;
    option.classList.toggle('leading', count > 0 && count === Math.max(...Object.values(counts)));
  }
}

function recordChatVote(event, source = 'demo') {
  if (source === 'demo' && liveMode) return { ok:false, reason:'Offline Lab is disabled while real Twitch is connected.' };
  const parsed = canonicalVoteUser(event);
  if (!parsed) return { ok:false, reason:'Invalid command. Try !patch moon+meteor.' };
  if (!round.vote(parsed.userId, parsed.patchId, Date.now(), parsed.name)) return { ok:false, reason:'That viewer already voted for this rule, or the round closed.' };
  const recipe = compilePatch(parsed.patchId);
  addFeed('vote', `${source === 'demo' ? '[OFFLINE SIM] ' : ''}${parsed.name} ${recipe.compounded ? 'forged' : 'voted'} ${recipe.short}`);
  renderVotes();
  return { ok:true, recipe };
}

function renderAnchors(snapshot) {
  const root = el('anchor-strip');
  root.replaceChildren();
  for (const [index, anchor] of snapshot.anchors.entries()) {
    const item = document.createElement('div');
    item.className = `anchor-item ${index < snapshot.anchorIndex ? 'done' : index === snapshot.anchorIndex ? 'active' : ''}`;
    const label = document.createElement('span'); label.textContent = String(index + 1).padStart(2, '0');
    const track = document.createElement('i'); const fill = document.createElement('b'); fill.style.width = `${index < snapshot.anchorIndex ? 100 : Math.round(anchor.charge * 100)}%`; track.append(fill);
    item.append(label, track); root.append(item);
  }
}

function updateHud(snapshot) {
  const boss = snapshot.boss;
  const form = BOSS_FORMS[boss?.form] || BOSS_FORMS.PRIME;
  el('boss-name').textContent = form.name;
  el('boss-name').style.color = form.color;
  el('boss-evolution').textContent = boss?.evolution ? `EVOLUTION 0${boss.evolution} · ${form.subtitle}` : 'FORM 00 · UNWRITTEN';
  el('boss-evolution').style.color = form.color;
  el('arena-panel').dataset.bossForm = boss?.form || 'PRIME';
  const seconds = Math.max(0, Math.ceil(snapshot.timeLeft));
  el('survival-time').textContent = formatClock(seconds);
  el('act-number').textContent = ['I', 'II', 'III'][snapshot.act.number - 1];
  el('act-name').textContent = snapshot.act.name;
  el('act-number-rail').textContent = ['I', 'II', 'III'][snapshot.act.number - 1];
  el('act-name-rail').textContent = snapshot.act.name;
  el('act-subtitle').textContent = snapshot.act.subtitle;
  el('act-copy').textContent = snapshot.finalPhase ? 'FINAL DUEL / BREAK THE CORE' : `ANCHOR ${Math.min(snapshot.anchorIndex + 1, 3)} / 03`;
  el('boss-health-fill').style.width = `${Math.max(0, boss.health / boss.maxHealth * 100)}%`;
  el('boss-health-label').textContent = snapshot.finalPhase ? `${boss.exposed ? 'EXPOSED' : 'AWAKENING'} · ${Math.ceil(boss.health)}%` : `${boss.phase.toUpperCase()} · ${Math.ceil(boss.health)}%`;
  el('objective').textContent = snapshot.finalPhase ? 'Dash through the Architect while the core is exposed.' : `Stabilize the ${snapshot.anchors[snapshot.anchorIndex]?.name || 'final anchor'}.`;
  el('engine-state').textContent = snapshot.patch ? 'PATCH ACTIVE' : snapshot.finalPhase ? 'COLLAPSE' : 'STABLE';
  el('dash-state').textContent = snapshot.player?.dashCooldown > 0 ? `DASH ${snapshot.player.dashCooldown.toFixed(1)}s` : 'DASH READY';
  el('patch-banner').classList.toggle('visible', Boolean(snapshot.patch));
  const recipe = compilePatch(snapshot.patch);
  if (recipe) { el('patch-symbol').textContent = recipe.icon; el('patch-name').textContent = recipe.short; el('patch-seconds').textContent = `${snapshot.patchSeconds}s`; }
  el('dna-gravity').textContent = snapshot.runDNA.gravity;
  el('dna-terrain').textContent = snapshot.runDNA.terrain;
  el('dna-boss').textContent = snapshot.runDNA.boss;
  document.querySelectorAll('.act-step').forEach(step => { const act = Number(step.dataset.act); step.classList.toggle('active', act === snapshot.act.number); step.classList.toggle('done', act < snapshot.act.number); });
  el('act-transition').classList.toggle('show', Boolean(snapshot.actFlash > 0 && snapshot.playing));
  el('pause-overlay').classList.toggle('show', Boolean(snapshot.paused));
  el('pause-reason').textContent = snapshot.guided ? 'GUIDED SHOWCASE PAUSED' : 'STREAMER PAUSE';
  renderAnchors(snapshot);
}

function showOutcome(won, outcome) {
  clearShowcaseTimers(); showcaseRunning = false;
  el('showcase-btn').disabled = false; el('start-showcase-btn').disabled = false;
  el('outcome-screen').classList.remove('hidden');
  el('outcome-kicker').textContent = guidedMode ? 'GUIDED OFFLINE SHOWCASE / COMPLETE' : 'RUN COMPLETE';
  el('outcome-title').innerHTML = won ? 'REALITY<br /><em>CONQUERED.</em>' : 'REALITY<br /><em>WINS AGAIN.</em>';
  el('outcome-copy').textContent = won ? `The Architect fell in ${outcome.seconds}s. Every visible scar below came from a bounded patch rule.` : `${outcome.reason}. The encounter ended at ${outcome.seconds}s with ${outcome.health}% health.`;
  el('outcome-time').textContent = formatClock(outcome.seconds);
  el('outcome-health').textContent = `${outcome.health}%`;
  el('outcome-grade').textContent = outcome.grade;
  const lineage = el('lineage-list'); lineage.replaceChildren();
  for (const patch of outcome.patchHistory || []) {
    const entry = document.createElement('div'); entry.className = 'lineage-entry';
    const title = document.createElement('b'); title.textContent = patch.label;
    const authors = document.createElement('small'); authors.textContent = patch.authors?.length ? `credited: ${patch.authors.join(', ')}` : 'credited: local rule fixture';
    entry.append(title, authors); lineage.append(entry);
  }
  tone(won ? 740 : 170, .34, won ? 'triangle' : 'sawtooth');
  addFeed('system', won ? 'The Architect was defeated. Run lineage preserved.' : 'Run ended. The Architect keeps the room.');
}

function resolveRound({ label = liveMode ? 'TWITCH CHAT' : offlineLabel } = {}) {
  const winner = round.winner();
  const patch = compilePatch(winner);
  if (patch && engine.playing) {
    const authors = round.credits(winner);
    engine.applyPatch(patch.id, 16, { source:label, authors });
    patchCount++;
    el('last-patch').textContent = patch.short;
    addFeed('patch', `${label}: ${patch.short}${authors.length ? ` · by ${authors.join(', ')}` : ''}`);
  } else if (!patch) addFeed('system', 'No votes this round. Reality remains stable.');
  resetRound();
}

function simulateVote(recipeId, name = `local_viewer_${++demoVoterCount}`) {
  if (liveMode) { addFeed('system', `Type !patch ${recipeId} in real Twitch chat.`); return; }
  recordChatVote(demoChatEvent(name, `!patch ${recipeId}`, ++mockSequence), 'demo');
}

function runShowcaseRound(items, delay, feedback) {
  showcaseTimers.push(setTimeout(() => {
    resetRound();
    items.forEach((item, index) => showcaseTimers.push(setTimeout(() => {
      const result = recordChatVote(demoChatEvent(item.name, item.text, ++mockSequence), 'demo');
      if (result.ok) el('showcase-feedback').textContent = `OFFLINE / SIMULATED: ${index + 1}/${items.length} viewers accepted.`;
    }, index * 220)));
    showcaseTimers.push(setTimeout(() => { resolveRound({ label:offlineLabel }); feedback(); }, items.length * 220 + 360));
  }, delay));
}

function startRun(guided = false) {
  clearShowcaseTimers(); showcaseRunning = false; guidedMode = guided; engine.start({ guided });
  el('start-screen').classList.add('hidden'); el('outcome-screen').classList.add('hidden');
  addFeed('system', guided ? 'Guided offline showcase started. Local viewers are clearly labelled.' : 'Free run started. Stabilize three anchors, then dash the exposed core.');
  tone(330, .12, 'triangle');
  el('arena-panel').focus();
}

function runOfflineShowcase() {
  if (liveMode || showcaseRunning) return;
  startRun(true); showcaseRunning = true; el('showcase-btn').disabled = true; el('start-showcase-btn').disabled = true;
  el('showcase-feedback').textContent = 'OFFLINE / SIMULATED: six named viewers are using the real compiler.';
  const first = DEMO_SCENARIO;
  const second = [
    { name:'frame_smith', text:'!patch reverse+magnet' }, { name:'luma_loop', text:'!patch reverse+magnet' },
    { name:'soft_reset', text:'!patch hyper' }, { name:'aether_cat', text:'!patch reverse+magnet' }
  ];
  const third = [
    { name:'boss_reader', text:'!patch blackout+magnet' }, { name:'night_shift', text:'!patch blackout+magnet' },
    { name:'tiny_orbit', text:'!patch blackout+magnet' }
  ];
  runShowcaseRound(first, 180, () => { el('showcase-feedback').textContent = 'EVOLUTION 01 · CATACLYSM / audience-authored meteor body'; });
  runShowcaseRound(second, 26000, () => { el('showcase-feedback').textContent = 'EVOLUTION 02 · SINGULARITY / gravity and magnetic limbs'; });
  runShowcaseRound(third, 54000, () => { el('showcase-feedback').textContent = 'EVOLUTION 03 · ECLIPSE / chat builds the final form'; });
}

function status({ state, detail }) {
  const dot = el('connection-dot'); dot.classList.remove('offline', 'live', 'error', 'connecting'); dot.classList.add(state);
  el('connection-label').textContent = state === 'live' ? 'TWITCH CONNECTED' : state === 'connecting' ? 'CONNECTING' : state === 'error' ? 'CONNECTION ERROR' : 'DEMO MODE';
  if (state === 'live') {
    liveMode = true; el('mode-badge').textContent = 'LIVE / AUTHENTICATED'; el('mode-badge').style.color = 'var(--pink)'; el('arena-live-status').textContent = 'LIVE TWITCH CHAT'; el('arena-disclosure').textContent = 'LIVE TWITCH CHAT. Offline fixtures are disabled.'; el('connect-button').textContent = 'DISCONNECT TWITCH';
    addFeed('system', `Live Twitch connection verified: ${detail}`);
  } else if (state === 'error') {
    liveMode = false; el('mode-badge').textContent = offlineLabel; el('mode-badge').style.color = 'var(--acid)'; el('arena-live-status').textContent = 'DEMO MODE • LOCAL'; el('arena-disclosure').textContent = `Twitch unavailable: ${detail} Offline simulation remains clearly labelled.`; el('connect-button').textContent = 'RECONNECT TWITCH'; addFeed('system', detail);
  } else if (state === 'offline') {
    liveMode = false; el('mode-badge').textContent = offlineLabel; el('mode-badge').style.color = 'var(--acid)'; el('arena-live-status').textContent = 'DEMO MODE • LOCAL'; el('arena-disclosure').textContent = 'OFFLINE / SIMULATED CHAT. No local activity is presented as real Twitch.'; el('connect-button').textContent = 'CONNECT TWITCH';
  } else { el('mode-badge').textContent = 'AUTH IN PROGRESS'; el('arena-disclosure').textContent = 'AUTH IN PROGRESS. Live status is not claimed until Twitch confirms the chat subscription.'; }
}

function openConnectModal() {
  el('connect-modal').classList.remove('hidden'); el('redirect-url').textContent = redirectUri(); el('twitch-client-id').value = getClientId(); el('connect-error').textContent = '';
}

const twitch = new TwitchChat({ onStatus:status, onMessage:event => recordChatVote(event, 'twitch') });
const engine = new ArenaEngine(el('arena'), {
  onUpdate: updateHud,
  onAct: act => { el('act-transition-name').textContent = act.name; el('act-transition-detail').textContent = act.subtitle; addFeed('system', `ACT ${act.number} // ${act.name}. Threats escalating.`); tone(act.number === 3 ? 620 : 480, .18, 'triangle'); },
  onPatch: event => {
    if (event.phase === 'in') {
      showPatchImpact(event.recipe, event.guided ? 'GUIDED / OFFLINE SIMULATED' : liveMode ? 'TWITCH CHAT' : offlineLabel, event.impact);
      if (event.impact?.evolution) {
        const evo = event.impact.evolution;
        addFeed('patch', `${evo.announcement} · ${evo.signature} · inherited ${evo.aspects.length} genes`);
        tone(evo.stage === 3 ? 152 : 224, .32, 'sawtooth');
      }
    }
    if (event.phase === 'counter') {
      addFeed('patch', `COUNTERATTACK +${event.damage} · ${event.weakPoint ? 'weak point exploited' : 'dash contact'}`);
      tone(event.weakPoint ? 760 : 560, .13, 'triangle');
    }
    if (event.phase === 'out') addFeed('system', `${event.recipe?.short || 'Reality patch'} ${event.reason === 'veto' ? 'vetoed by streamer' : 'expired'}; visible trace remains.`);
    if (event.phase === 'attack') { el('objective').textContent = 'TELEGRAPH — read the Architect attack.'; tone(210, .06, 'square'); }
  },
  onEnd: showOutcome
});

function tick() {
  const remaining = round.remaining();
  if (remaining === 0 && engine.playing && !engine.paused && !showcaseRunning) resolveRound();
  el('countdown').innerHTML = `${String(round.remaining()).padStart(2, '0')}<span>s</span>`;
  el('vote-progress-fill').style.width = `${100 * (1 - round.remaining() / (round.durationMs / 1000))}%`;
  el('vote-state').textContent = round.remaining() ? (liveMode ? 'LIVE VOTING OPEN' : 'VOTING OPEN') : 'ROUND WAITING';
}
setInterval(tick, 200);

function buildOptions() {
  const root = el('patch-options');
  for (const patch of PATCHES) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'patch-option'; button.dataset.patch = patch.id; button.title = liveMode ? `Vote in Twitch chat with ${patch.command}` : `Simulate ${patch.command}`;
    button.innerHTML = `<span class="option-icon">${patch.icon}</span><span class="option-content"><b>${patch.label}</b><small>${patch.description}</small><span class="option-progress"><i></i></span></span>`;
    button.addEventListener('click', () => simulateVote(patch.id)); root.append(button);
  }
}

el('start-btn').addEventListener('click', () => startRun(false));
el('start-showcase-btn').addEventListener('click', runOfflineShowcase);
el('showcase-btn').addEventListener('click', runOfflineShowcase);
el('retry-btn').addEventListener('click', () => startRun(false));
el('pause-btn').addEventListener('click', () => { if (!engine.playing) return; if (engine.paused) engine.resume(); else engine.pause('streamer'); });
el('resume-btn').addEventListener('click', () => engine.resume());
el('veto-btn').addEventListener('click', () => { if (Date.now() - lastVetoAt < 15000) return addFeed('system', 'Veto cooling down.'); if (engine.vetoPatch()) { lastVetoAt = Date.now(); addFeed('system', 'Streamer vetoed the active patch. Its trace remains in the lineage.'); } else addFeed('system', 'No active patch to veto.'); });
el('copy-command').addEventListener('click', () => navigator.clipboard?.writeText(`!patch ${compilePatch(round.winner())?.id || 'moon+meteor'}`).then(() => addFeed('system', 'Patch command copied.')).catch(() => {}));
el('expand-btn').addEventListener('click', () => document.fullscreenElement ? document.exitFullscreen?.() : el('arena-panel').requestFullscreen?.());
el('audio-btn').addEventListener('click', () => { audioEnabled = !audioEnabled; el('audio-btn').textContent = audioEnabled ? '♫' : '∅'; el('audio-btn').setAttribute('aria-label', audioEnabled ? 'Mute audio' : 'Enable audio'); if (audioEnabled) tone(440, .08); });
el('rail-toggle').addEventListener('click', () => { const collapsed = el('control-rail').classList.toggle('collapsed'); el('rail-toggle').textContent = collapsed ? 'EXPAND +' : 'COLLAPSE −'; el('rail-toggle').setAttribute('aria-expanded', String(!collapsed)); });
el('chat-toggle').addEventListener('click', () => { el('chat-drawer').classList.add('open'); el('chat-drawer').setAttribute('aria-hidden', 'false'); });
el('chat-close').addEventListener('click', () => { el('chat-drawer').classList.remove('open'); el('chat-drawer').setAttribute('aria-hidden', 'true'); });
el('lab-scenario').addEventListener('click', runOfflineShowcase);
el('lab-resolve').addEventListener('click', () => { if (!liveMode) { resolveRound(); el('lab-feedback').textContent = 'Local round resolved. Watch the patch land in the arena.'; } });
el('chat-lab-form').addEventListener('submit', event => { event.preventDefault(); const result = recordChatVote(demoChatEvent(el('lab-viewer').value, el('lab-command').value, ++mockSequence), 'demo'); el('lab-feedback').textContent = result.ok ? `LOCAL TEST ACCEPTED · ${result.recipe.short}` : result.reason; el('lab-feedback').classList.toggle('error', !result.ok); });
el('connect-button').addEventListener('click', () => { if (twitch.active) { twitch.stop(); disconnectToken(); } else openConnectModal(); });
el('close-modal').addEventListener('click', () => el('connect-modal').classList.add('hidden'));
el('connect-modal').addEventListener('click', event => { if (event.target === el('connect-modal')) el('connect-modal').classList.add('hidden'); });
el('copy-redirect').addEventListener('click', () => navigator.clipboard?.writeText(redirectUri()).catch(() => {}));
el('authorize-btn').addEventListener('click', () => { try { beginOAuth(el('twitch-client-id').value.trim()); } catch (error) { el('connect-error').textContent = error.message; } });
el('share-run-btn').addEventListener('click', () => { const text = `PATCH//LIVE — ${el('outcome-title').textContent.replaceAll('\n', ' ')} · ${el('outcome-time').textContent} · ${el('outcome-grade').textContent} · offline showcase`; navigator.clipboard?.writeText(text).then(() => addFeed('system', 'Run card copied for the submission.')).catch(() => {}); });

window.addEventListener('keydown', event => { if (event.target.matches('input,textarea')) return; if (['ArrowRight','ArrowLeft','ArrowUp','ArrowDown',' '].includes(event.key)) event.preventDefault(); engine.onKeyDown(event.key); });
window.addEventListener('keyup', event => engine.onKeyUp(event.key));
window.addEventListener('blur', () => engine.clearInput());
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (engine.pause('visibility')) addFeed('system', 'Window hidden. Run paused and input cleared.'); } else if (engine.paused && engine.pauseReason === 'visibility') engine.resume(); });
for (const button of document.querySelectorAll('.touch-controls button')) {
  const key = button.dataset.key;
  const release = event => { event.preventDefault(); button.classList.remove('pressed'); engine.onKeyUp(key); };
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); button.classList.add('pressed'); engine.onKeyDown(key); });
  button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
}

buildOptions(); renderVotes(); addFeed('system', 'Sandbox ready. Start a run or launch the guided showcase.');
const callback = consumeOAuthCallback(); if (callback?.error) addFeed('system', `Twitch authorization failed: ${callback.error}`);
if (getToken() && getClientId()) twitch.start(getToken(), getClientId());
