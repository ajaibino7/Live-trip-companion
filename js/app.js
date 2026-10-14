import { TRIP } from './data.js';

/* ============================================================
   Testing hooks (safe to leave in — only active via URL):
     ?now=2026-10-18T12:15   pretend it's this IST time (clock keeps ticking)
     ?lat=18.7075&lng=73.372 pretend you're at this location
   ============================================================ */
const params = new URLSearchParams(location.search);
const simNowStart = params.get('now') ? parseIST(params.get('now')) : null;
const simStartedAt = Date.now();
const simLoc = params.has('lat') && params.has('lng')
  ? { lat: Number(params.get('lat')), lng: Number(params.get('lng')), accuracy: 25 }
  : null;

const IST = 'Asia/Kolkata';
const STORE_KEY = 'mlt-done-v1';
const TICK_MS = 20_000;

/* ---------- time helpers ---------- */
function parseIST(s) {
  if (/[zZ]$|[+-]\d\d:\d\d$/.test(s)) return new Date(s);
  return new Date(`${s}${s.length === 16 ? ':00' : ''}+05:30`);
}
const at = (date, hhmm) => parseIST(`${date}T${hhmm}`);
const now = () => (simNowStart ? new Date(simNowStart.getTime() + (Date.now() - simStartedAt)) : new Date());
const istDate = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(d);
const fmtClock = (d) => new Intl.DateTimeFormat('en-IN', { timeZone: IST, hour: 'numeric', minute: '2-digit', hour12: true })
  .format(d).replace(/\s?([ap])\.?m\.?/i, (_, p) => ` ${p.toUpperCase()}M`);

function fmtHHMM(hhmm) {
  let [h, m] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}
function fmtDur(ms) {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h < 24) return m ? `${h} h ${m} min` : `${h} h`;
  const d = Math.floor(h / 24), hh = h % 24;
  return hh ? `${d} d ${hh} h` : `${d} d`;
}

/* ---------- geo helpers ---------- */
function distM(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const fmtDist = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`);

// Rough travel-time estimate from straight-line distance. Deliberately pessimistic for Mumbai traffic.
function estimateTravel(m) {
  const road = m * 1.35;
  if (road < 1500) return { ms: (road / 4500) * 3600000, mode: 'walk' };
  const kmh = road > 30000 ? 45 : 18;
  return { ms: (road / 1000 / kmh) * 3600000 + 5 * 60000, mode: 'drive' };
}
const directionsUrl = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
const isHere = (pos, place) => pos && distM(pos, place) <= place.radius + Math.min(pos.accuracy || 0, 150);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- data prep ---------- */
for (const day of TRIP.days) {
  day.stops.forEach((s, i) => {
    s.id = `d${day.n}-${i}`;
    s.idx = i;
    s.day = day;
    s.startAt = at(day.date, s.start);
    s.endAt = at(day.date, s.end);
  });
  day.startAt = day.stops[0].startAt;
  day.endAt = day.stops[day.stops.length - 1].endAt;
  if (day.deadline) {
    day.deadline.atAt = at(day.date, day.deadline.at);
    day.deadline.departsAt = at(day.date, day.deadline.departs);
  }
}
const DAYS = TRIP.days;

/* ---------- state ---------- */
const state = {
  pos: simLoc,
  loc: simLoc ? 'on' : 'idle', // idle | asking | on | denied | unavailable | error
  watchId: null,
  selectedDay: null,
  selectedStop: null,
  done: loadDone(),
};

function loadDone() {
  try { return new Set(JSON.parse(localStorage.getItem(STORE_KEY) || '[]')); } catch { return new Set(); }
}
function saveDone() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify([...state.done])); } catch { /* storage unavailable */ }
}

/* ============================================================
   Status engine
   ============================================================ */
function tripPhase(t) {
  if (t < DAYS[0].startAt) return { phase: 'before' };
  if (t >= DAYS[DAYS.length - 1].endAt) return { phase: 'after' };
  const today = DAYS.find((d) => d.date === istDate(t));
  if (!today) return { phase: 'between', next: DAYS.find((d) => d.startAt > t) };
  if (t < today.startAt) return { phase: 'morning', day: today };
  if (t >= today.endAt) return { phase: 'night', day: today, next: DAYS.find((d) => d.startAt > t) };
  return { phase: 'live', day: today };
}

function stopState(s, t) {
  if (state.done.has(s.id)) return 'done';
  if (t >= s.endAt) return 'past';
  if (t >= s.startAt) return 'now';
  return 'upcoming';
}

function liveStatus(day, t) {
  const pos = state.pos;
  const open = day.stops.filter((s) => !state.done.has(s.id));
  const cur = open.find((s) => s.startAt <= t && t < s.endAt) || null;
  const next = open.find((s) => s.startAt > t) || null;
  const target = cur || next;
  const out = { day, cur, next, target, pill: { cls: 'info', text: 'On schedule' }, msg: null, stats: [] };

  if (cur) {
    out.stats.push({ k: cur.kind === 'travel' ? 'Arrive by' : 'Ends in', v: cur.kind === 'travel' ? fmtClock(cur.endAt) : fmtDur(cur.endAt - t), s: cur.kind === 'travel' ? '' : `at ${fmtClock(cur.endAt)}` });
  }
  if (next) out.stats.push({ k: 'Next up', v: fmtDur(next.startAt - t), s: next.title });

  // ---- location-aware comparison ----
  if (pos && target) {
    const dTarget = distM(pos, target.place);
    const atTarget = isHere(pos, target.place);
    const hereStops = day.stops.filter((s) => isHere(pos, s.place));
    const travel = estimateTravel(dTarget);
    const dueAt = cur ? (cur.kind === 'travel' ? cur.endAt : cur.startAt) : target.startAt;

    if (!atTarget) {
      out.stats.push({ k: 'Distance', v: fmtDist(dTarget), s: `~${fmtDur(travel.ms)} ${travel.mode} (est.)` });
    }

    if (atTarget) {
      if (cur === target && cur.kind !== 'travel') {
        out.pill = { cls: 'ok', text: 'On track' };
        out.msg = { cls: 'ok', html: `You're at <strong>${esc(target.place.name)}</strong>. Enjoy — you have ${fmtDur(cur.endAt - t)} here.` };
      } else if (cur === target) {
        out.pill = { cls: 'ok', text: 'Arrived' };
        out.msg = { cls: 'ok', html: `You've reached <strong>${esc(target.place.name)}</strong>${t < cur.endAt ? ` — ${fmtDur(cur.endAt - t)} ahead of the planned arrival` : ''}.` };
      } else {
        out.pill = { cls: 'ok', text: 'Early' };
        out.msg = { cls: 'ok', html: `You're already at <strong>${esc(target.place.name)}</strong> — ${fmtDur(target.startAt - t)} before it's scheduled.` };
      }
    } else {
      const ahead = hereStops.filter((s) => s.idx > target.idx);
      const behind = hereStops.filter((s) => s.idx < target.idx);
      const arriveAt = new Date(t.getTime() + travel.ms);
      const lateBy = arriveAt - dueAt;

      if (ahead.length && !behind.length) {
        out.pill = { cls: 'ok', text: 'Ahead' };
        out.msg = { cls: 'ok', html: `You're at <strong>${esc(ahead[0].title)}</strong> — ahead of schedule. Mark earlier stops done or skip them if you like.` };
      } else if (cur && cur.kind !== 'travel') {
        // Should be at the current stop but aren't.
        const into = t - cur.startAt;
        const where = behind.length ? `still near <strong>${esc(behind[behind.length - 1].place.name)}</strong>` : `${fmtDist(dTarget)} away`;
        out.pill = into > 30 * 60000 ? { cls: 'bad', text: 'Running behind' } : { cls: 'warn', text: 'Running behind' };
        out.msg = { cls: into > 30 * 60000 ? 'bad' : 'warn', html: `<strong>${esc(cur.title)}</strong> started ${fmtDur(into)} ago and you're ${where}. ETA ~${fmtClock(arriveAt)}. If time is tight, skip it and mark it done.` };
      } else if (lateBy > 10 * 60000) {
        out.pill = { cls: lateBy > 30 * 60000 ? 'bad' : 'warn', text: `~${fmtDur(lateBy)} late` };
        out.msg = { cls: lateBy > 30 * 60000 ? 'bad' : 'warn', html: `Head to <strong>${esc(target.place.name)}</strong> now — at this distance you'd arrive around ${fmtClock(arriveAt)}, ${fmtDur(lateBy)} after the plan.` };
      } else if (cur && cur.kind === 'travel') {
        out.pill = { cls: 'ok', text: 'En route' };
        out.msg = { cls: 'info', html: `On the way to <strong>${esc(target.place.name)}</strong> — ${fmtDist(dTarget)} to go, arriving ~${fmtClock(arriveAt)} (planned ${fmtClock(dueAt)}).` };
      } else {
        out.pill = { cls: 'ok', text: 'On track' };
        const leaveIn = dueAt - t - travel.ms;
        out.msg = {
          cls: 'info',
          html: leaveIn > 10 * 60000
            ? `Next stop <strong>${esc(target.place.name)}</strong> is ${fmtDist(dTarget)} away. Leave in about ${fmtDur(leaveIn)} to arrive on time.`
            : `On the way to <strong>${esc(target.place.name)}</strong> — ${fmtDist(dTarget)} to go, arriving ~${fmtClock(arriveAt)}.`,
        };
      }
    }
  } else if (target) {
    out.pill = { cls: 'info', text: cur ? 'In progress' : 'Up next' };
    out.msg = { cls: 'info', html: state.loc === 'denied'
      ? 'Location is blocked, so this follows the clock only. Allow location in your browser settings for live status.'
      : 'Turn on location to see whether you\'re on track and how far the next stop is.' };
  }

  // ---- hard deadline (e.g. train on Day 4) ----
  const dl = day.deadline;
  if (dl && t < dl.departsAt) {
    let leaveBy;
    if (pos && !isHere(pos, dl.place)) {
      const tr = estimateTravel(distM(pos, dl.place));
      leaveBy = new Date(dl.atAt - tr.ms - 15 * 60000);
    } else if (!pos) {
      leaveBy = day.stops.find((s) => s.place === dl.place)?.startAt || dl.atAt;
    }
    if (leaveBy) {
      out.stats.push({ k: 'Leave by', v: fmtClock(leaveBy), s: `${dl.label} ${fmtClock(dl.atAt)}` });
      const left = leaveBy - t;
      if (left <= 0) {
        out.pill = { cls: 'bad', text: 'Leave now' };
        out.msg = { cls: 'bad', html: `<strong>Leave for ${esc(dl.place.name)} now.</strong> Train departs ${fmtClock(dl.departsAt)}; aim to be there by ${fmtClock(dl.atAt)}.` };
      } else if (left < 45 * 60000) {
        out.pill = { cls: 'warn', text: `Leave in ${fmtDur(left)}` };
        out.msg = { cls: 'warn', html: `Start wrapping up — leave for <strong>${esc(dl.place.name)}</strong> by ${fmtClock(leaveBy)} (train ${fmtClock(dl.departsAt)}).` };
      }
    } else if (pos && isHere(pos, dl.place)) {
      out.pill = { cls: 'ok', text: 'At the station' };
      out.msg = { cls: 'ok', html: `You're at <strong>${esc(dl.place.name)}</strong>. Train departs ${fmtClock(dl.departsAt)} — ${fmtDur(dl.departsAt - t)} to go. Safe travels!` };
    }
  }

  // day progress (time based)
  out.progress = Math.min(1, Math.max(0, (t - day.startAt) / (day.endAt - day.startAt)));
  return out;
}

/* ============================================================
   Rendering
   ============================================================ */
const $ = (id) => document.getElementById(id);

function render() {
  const t = now();
  const ph = tripPhase(t);
  if (state.selectedDay == null) state.selectedDay = (ph.day || ph.next || (ph.phase === 'after' ? DAYS[DAYS.length - 1] : DAYS[0])).n;

  renderPhaseLine(ph, t);
  renderStatus(ph, t);
  renderLocButton();
  renderTabs(ph);
  renderDay(t, ph);
  renderMap(t, ph);
}

function renderPhaseLine(ph, t) {
  const line = {
    before: `Starts in ${fmtDur(DAYS[0].startAt - t)} · 17 – 20 Oct`,
    after: 'Trip complete · 17 – 20 Oct',
  }[ph.phase] || `Day ${(ph.day || ph.next).n} of ${DAYS.length} · ${fmtClock(t)} IST`;
  $('phase-line').textContent = line;
}

function setPill(p, live) {
  const el = $('status-pill');
  el.className = `pill ${p.cls}${live ? ' live' : ''}`;
  el.textContent = p.text;
}

function statsHtml(stats) {
  if (!stats.length) return '';
  return `<div class="stats">${stats.map((s) => `<div class="stat"><div class="k">${esc(s.k)}</div><div class="v">${esc(s.v)}</div>${s.s ? `<div class="s">${esc(s.s)}</div>` : ''}</div>`).join('')}</div>`;
}

function renderStatus(ph, t) {
  const body = $('status-body');
  if (ph.phase === 'before') {
    const first = DAYS[0].stops[0];
    setPill({ cls: 'info', text: 'Countdown' });
    body.innerHTML = `
      <div class="now-title">Trip starts in ${esc(fmtDur(first.startAt - t))}</div>
      <div class="now-meta">${esc(DAYS[0].weekday)}, 17 Oct · ${esc(fmtHHMM(first.start))} — ${esc(first.title)}</div>
      <div class="status-msg info">Live status switches on automatically once the trip begins. Turn on location now so it's ready.</div>`;
    return;
  }
  if (ph.phase === 'after') {
    setPill({ cls: 'ok', text: 'Complete' });
    body.innerHTML = `<div class="now-title">Hope it was a great trip!</div><div class="now-meta">All four days are done. The itinerary stays here for reference.</div>`;
    return;
  }
  if (ph.phase === 'morning' || ph.phase === 'night' || ph.phase === 'between') {
    const nd = ph.phase === 'morning' ? ph.day : ph.next;
    const first = nd.stops[0];
    setPill({ cls: 'info', text: ph.phase === 'night' ? 'Rest up' : 'Good morning' });
    body.innerHTML = `
      <div class="now-title">Day ${nd.n} starts ${ph.phase === 'night' ? 'tomorrow' : 'soon'}</div>
      <div class="now-meta">${esc(fmtHHMM(first.start))} — ${esc(first.title)} · in ${esc(fmtDur(first.startAt - t))}</div>
      ${statsHtml([{ k: 'First stop', v: fmtHHMM(first.start), s: first.place.name }, ...(state.pos ? [{ k: 'Distance', v: fmtDist(distM(state.pos, first.place)), s: 'to first stop' }] : [])])}
      <div class="actions"><a class="btn" href="${directionsUrl(first.place)}" target="_blank" rel="noopener">Directions</a></div>`;
    return;
  }

  const st = liveStatus(ph.day, t);
  setPill(st.pill, true);
  const focus = st.cur || st.next;
  body.innerHTML = focus ? `
    <div class="now-title">${st.cur ? '' : '<span style="color:var(--muted);font-size:.7em">Up next · </span>'}${esc(focus.title)}</div>
    <div class="now-meta">${esc(fmtHHMM(focus.start))} – ${esc(fmtHHMM(focus.end))} · ${esc(focus.place.name)}${focus.note ? ` · ${esc(focus.note)}` : ''}</div>
    ${st.msg ? `<div class="status-msg ${st.msg.cls}">${st.msg.html}</div>` : ''}
    ${statsHtml(st.stats)}
    <div class="progress" title="Day progress"><span style="width:${(st.progress * 100).toFixed(1)}%"></span></div>
    <div class="actions">
      <a class="btn" href="${directionsUrl(focus.place)}" target="_blank" rel="noopener">Directions</a>
      <button class="btn ghost" type="button" data-done="${focus.id}">${st.cur ? 'Done / skip' : 'Skip this'}</button>
    </div>` : `
    <div class="now-title">That's everything for today</div>
    <div class="now-meta">All of Day ${st.day.n}'s stops are done.</div>`;
}

function renderLocButton() {
  const dot = $('loc-dot'), label = $('loc-label');
  dot.className = 'loc-dot';
  const acc = state.pos?.accuracy;
  switch (state.loc) {
    case 'on': dot.classList.add('on'); label.textContent = simLoc ? 'Simulated location' : `Location on${acc ? ` · ±${Math.round(acc)} m` : ''}`; break;
    case 'asking': label.textContent = 'Finding you…'; break;
    case 'denied': dot.classList.add('err'); label.textContent = 'Location blocked'; break;
    case 'unavailable': dot.classList.add('err'); label.textContent = 'Location unavailable'; break;
    case 'error': dot.classList.add('err'); label.textContent = 'Retry location'; break;
    default: label.textContent = 'Use my location';
  }
  $('me-btn').disabled = !state.pos;
}

function renderTabs(ph) {
  const todayN = ph.day?.n;
  $('tabs').innerHTML = DAYS.map((d) => `
    <button class="tab theme-${d.theme}" role="tab" type="button" data-day="${d.n}" aria-selected="${d.n === state.selectedDay}">
      <div class="tn">${d.n}</div>
      <div class="td">${esc(d.label)}${d.n === todayN ? '<span class="today" title="Today"></span>' : ''}</div>
    </button>`).join('');
}

const TAG_TEXT = { must: 'Must see', key: 'Main attraction', optional: 'Optional', closing: 'Before closing', deadline: 'Be on time' };

function renderDay(t, ph) {
  const day = DAYS.find((d) => d.n === state.selectedDay);
  const isToday = ph.day === day;
  const el = $('day');
  el.className = `day theme-${day.theme}`;
  document.documentElement.style.setProperty('--accent', getComputedStyle(el).getPropertyValue('--accent'));

  el.innerHTML = `
    <div class="day-band">
      <div class="num">0${day.n}</div>
      <div class="eyebrow">Day ${day.n} · ${esc(day.weekday)}, ${esc(day.label.split(' ').slice(1).join(' '))}</div>
      <h2>${esc(day.title)}</h2>
    </div>
    <ol class="timeline">
      ${day.stops.map((s) => {
        const ss = stopState(s, t);
        const here = isToday && isHere(state.pos, s.place);
        const cls = ['tl', s.kind, ss === 'done' || ss === 'past' ? 'done' : '', ss === 'now' ? 'now' : '', here ? 'here' : '', state.selectedStop === s.id ? 'selected' : ''].join(' ');
        const dist = state.pos ? fmtDist(distM(state.pos, s.place)) : null;
        return `
        <li class="${cls}" data-stop="${s.id}" tabindex="0">
          <div class="t">${esc(fmtHHMM(s.start))}<small>to ${esc(fmtHHMM(s.end))}</small></div>
          <div class="d"></div>
          <div class="c">
            <div class="w">${esc(s.title)}${s.tag ? `<span class="tag ${s.tag}">${TAG_TEXT[s.tag]}</span>` : ''}${ss === 'now' ? '<span class="tag nowtag">Now</span>' : ''}${here ? '<span class="tag heretag">You\'re here</span>' : ''}</div>
            ${s.note ? `<div class="n">${esc(s.note)}</div>` : ''}
            <div class="m"><span>📍 ${esc(s.place.name)}${s.place.approx ? ' (approx.)' : ''}</span>${dist ? `<span>${dist} away</span>` : ''}</div>
            ${state.selectedStop === s.id ? `
              <div class="stop-actions">
                <a class="mini" href="${directionsUrl(s.place)}" target="_blank" rel="noopener">Directions</a>
                <button class="mini" type="button" data-done="${s.id}">${state.done.has(s.id) ? 'Undo done' : 'Mark done / skip'}</button>
              </div>` : ''}
          </div>
        </li>`;
      }).join('')}
    </ol>
    <div class="notes">
      ${day.notes.map((n) => `<div class="note ${n.type}"><b>${esc(n.title)}</b>${esc(n.text)}</div>`).join('')}
    </div>`;
}

/* ---------- map ---------- */
let map, layer, meLayer, lastMapDay = null;

function initMap() {
  if (!window.L) { $('map').innerHTML = '<p style="padding:16px;color:var(--muted)">Map unavailable offline.</p>'; return; }
  map = L.map('map', { zoomControl: true, attributionControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  layer = L.layerGroup().addTo(map);
  meLayer = L.layerGroup().addTo(map);
}

function accentFor(day) {
  return { navy: '#1f4e79', green: '#2f7a59', coral: '#c4553b', gold: '#b8801c' }[day.theme];
}

function renderMap(t) {
  if (!map) return;
  const day = DAYS.find((d) => d.n === state.selectedDay);
  const color = accentFor(day);
  layer.clearLayers();

  // One marker per distinct place, numbered by first appearance.
  const seen = new Map();
  day.stops.forEach((s) => {
    const key = `${s.place.lat},${s.place.lng}`;
    if (!seen.has(key)) seen.set(key, { place: s.place, stops: [] });
    seen.get(key).stops.push(s);
  });

  const pts = [];
  [...seen.values()].forEach((g, i) => {
    const states = g.stops.map((s) => stopState(s, t));
    const cls = states.includes('now') ? 'now' : states.every((x) => x === 'done' || x === 'past') ? 'done' : '';
    const icon = L.divIcon({ className: '', html: `<div class="num-marker ${cls}" style="background:${color}">${i + 1}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] });
    const popup = `<strong>${esc(g.place.name)}</strong><br>${g.stops.map((s) => `${esc(fmtHHMM(s.start))} · ${esc(s.title)}`).join('<br>')}<br><a href="${directionsUrl(g.place)}" target="_blank" rel="noopener">Directions</a>`;
    const m = L.marker([g.place.lat, g.place.lng], { icon }).bindPopup(popup).addTo(layer);
    g.stops.forEach((s) => { s._marker = m; });
    pts.push([g.place.lat, g.place.lng]);
  });
  // Route line in visiting order.
  const route = [];
  day.stops.forEach((s) => {
    const p = [s.place.lat, s.place.lng];
    const last = route[route.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) route.push(p);
  });
  L.polyline(route, { color, weight: 3, opacity: .55, dashArray: '6 8' }).addTo(layer);

  if (lastMapDay !== day.n) {
    lastMapDay = day.n;
    map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 });
  }
  renderMe();
}

function renderMe() {
  if (!map) return;
  meLayer.clearLayers();
  if (!state.pos) return;
  const ll = [state.pos.lat, state.pos.lng];
  if (state.pos.accuracy) L.circle(ll, { radius: state.pos.accuracy, color: '#2b7de9', weight: 1, fillOpacity: .1 }).addTo(meLayer);
  L.marker(ll, { icon: L.divIcon({ className: '', html: '<div class="me-marker"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }), zIndexOffset: 1000 })
    .bindPopup('You are here').addTo(meLayer);
}

/* ============================================================
   Location
   ============================================================ */
function startWatch() {
  if (!('geolocation' in navigator)) { state.loc = 'unavailable'; render(); return; }
  if (state.watchId != null) return;
  state.loc = 'asking';
  renderLocButton();
  state.watchId = navigator.geolocation.watchPosition(
    (p) => {
      const first = !state.pos;
      state.pos = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, ts: p.timestamp };
      state.loc = 'on';
      render();
      if (first && map) map.setView([state.pos.lat, state.pos.lng], Math.max(map.getZoom(), 14));
    },
    (err) => {
      state.loc = err.code === err.PERMISSION_DENIED ? 'denied' : 'error';
      navigator.geolocation.clearWatch(state.watchId);
      state.watchId = null;
      render();
    },
    { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 },
  );
}

async function initLocation() {
  if (simLoc) return;
  if (!('geolocation' in navigator)) { state.loc = 'unavailable'; return; }
  try {
    const perm = await navigator.permissions?.query({ name: 'geolocation' });
    if (perm?.state === 'granted') startWatch();
    else if (perm?.state === 'denied') state.loc = 'denied';
    perm?.addEventListener?.('change', () => { if (perm.state === 'granted') startWatch(); });
  } catch { /* Permissions API unsupported (older Safari) — wait for the button */ }
}

/* ============================================================
   Events
   ============================================================ */
document.addEventListener('click', (e) => {
  const doneBtn = e.target.closest('[data-done]');
  if (doneBtn) {
    const id = doneBtn.dataset.done;
    state.done.has(id) ? state.done.delete(id) : state.done.add(id);
    saveDone();
    render();
    return;
  }
  const tab = e.target.closest('[data-day]');
  if (tab) {
    state.selectedDay = Number(tab.dataset.day);
    state.selectedStop = null;
    render();
    return;
  }
  const stop = e.target.closest('[data-stop]');
  if (stop && !e.target.closest('a')) {
    const id = stop.dataset.stop;
    state.selectedStop = state.selectedStop === id ? null : id;
    render();
    const s = DAYS.flatMap((d) => d.stops).find((x) => x.id === id);
    if (state.selectedStop && map && s) {
      map.setView([s.place.lat, s.place.lng], Math.max(map.getZoom(), 15));
      s._marker?.openPopup();
    }
  }
});
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-stop]')) { e.preventDefault(); e.target.click(); }
});

$('loc-btn').addEventListener('click', () => {
  if (simLoc) return;
  if (state.loc === 'on' || state.loc === 'asking') return;
  startWatch();
});
$('fit-btn').addEventListener('click', () => { lastMapDay = null; render(); });
$('me-btn').addEventListener('click', () => { if (state.pos && map) map.setView([state.pos.lat, state.pos.lng], 16); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

/* ============================================================
   Boot
   ============================================================ */
if (simNowStart || simLoc) {
  const b = $('sim-banner');
  b.hidden = false;
  b.textContent = `Test mode — ${simNowStart ? `time ${fmtClock(simNowStart)} IST, ${istDate(simNowStart)}` : 'real time'}${simLoc ? ', simulated location' : ''}`;
}

initMap();
render();
initLocation().then(render);
setInterval(render, TICK_MS);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
