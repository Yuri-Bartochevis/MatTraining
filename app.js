/* Mat Strength: app logic. Depends on js/program.js. */
const APP_VERSION = '1.3.0';
/* ---------- Storage ---------- */
const KEY = 'mat-strength-v1';
const fresh = () => ({sessions:[], bodyweight:[], activities:[], active:null, settings:{blockStart:null, sound:true}});
let data = fresh();
const Store = {
  async load(){
    try { if (window.storage) { const r = await window.storage.get(KEY, false); if (r && r.value) return JSON.parse(r.value); } } catch(e) {}
    try { const v = window.localStorage.getItem(KEY); if (v) return JSON.parse(v); } catch(e) {}
    return null;
  },
  async save(obj){
    const s = JSON.stringify(obj);
    if (window.storage) { try { const r = await window.storage.set(KEY, s, false); if (r) return true; } catch(e) {} }
    try { window.localStorage.setItem(KEY, s); return true; } catch(e) {}
    return false;
  }
};
let saveWarned = false, lastSaved = null, saveOK = null;
function saveNow(){
  const str = JSON.stringify(data);
  // Outside Claude: write to the phone right away, no delay, so closing the app can't drop the last change.
  if (!window.storage) {
    try { window.localStorage.setItem(KEY, str); lastSaved = new Date(); saveOK = true; }
    catch (e) { saveOK = false; if (!saveWarned) { saveWarned = true; toast('This browser is blocking saving. Turn off Private Browsing.'); } }
    return;
  }
  window.storage.set(KEY, str, false).then(r => { saveOK = !!r; if (r) lastSaved = new Date(); }).catch(() => { saveOK = false; });
}
function save(){ saveNow(); }
// Extra safety when the app is swiped away or sent to the background.
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });

/* ---------- Helpers ---------- */
const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const todayISO = () => iso(new Date());
const parseISO = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const fmtDate = s => parseISO(s).toLocaleDateString(undefined, {weekday:'short', day:'numeric', month:'short'});
const fmtDur = sec => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec/3600), m = Math.floor(sec%3600/60), s = sec%60; return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
const round25 = x => Math.round(x / 2.5) * 2.5;
const e1rm = (w, r) => (w && r && r <= 12) ? w * (1 + r/30) : null;
const weekStart = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x; };
const daysBetween = (a, b) => Math.round((b - a) / 86400000);
const fmtKg = x => (Math.round(x * 10) / 10).toString();
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

let undoFn = null;
function toast(msg, undo){
  const t = $('#toast'); undoFn = undo || null;
  t.innerHTML = esc(msg) + (undo ? '<button data-a="undo">Undo</button>' : '');
  t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => { t.classList.remove('show'); undoFn = null; }, undo ? 5000 : 2200);
}

/* ---------- Audio & wake lock ---------- */
let actx = null;
function unlockAudio(){
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
  if (actx && actx.state === 'suspended') actx.resume();
}
document.addEventListener('touchstart', unlockAudio, {passive:true});
document.addEventListener('click', unlockAudio);
function beep(times = 3, freq = 880){
  if (navigator.vibrate) navigator.vibrate(times > 1 ? [200,100,200,100,200] : 150);
  if (!data.settings.sound || !actx) return;
  const t0 = actx.currentTime;
  for (let i = 0; i < times; i++) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value = freq; o.type = 'square';
    g.gain.setValueAtTime(0.0001, t0 + i*0.28);
    g.gain.exponentialRampToValueAtTime(0.18, t0 + i*0.28 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + i*0.28 + 0.18);
    o.connect(g).connect(actx.destination); o.start(t0 + i*0.28); o.stop(t0 + i*0.28 + 0.2);
  }
}
let wake = null;
async function keepAwake(on){
  try {
    if (on && 'wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => wake = null); }
    if (!on && wake) { await wake.release(); wake = null; }
  } catch(e) {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && data.active) keepAwake(true); });

/* ---------- Domain logic ---------- */
function blockInfo(){
  const first = data.sessions.length ? data.sessions.map(s => s.date).sort()[0] : null;
  const start = parseISO(data.settings.blockStart || first || todayISO());
  const d = Math.max(0, daysBetween(weekStart(start), new Date()));
  const w = Math.floor(d / 7);
  return {block: Math.floor(w/8) + 1, week: (w % 8) + 1, deload: (w % 8) === 7};
}
function lastFor(exId, beforeDate){
  const list = data.sessions.filter(s => (!beforeDate || s.date <= beforeDate) && s.items.some(i => i.exId === exId));
  list.sort((a, b) => (b.date + b.startedAt).localeCompare(a.date + a.startedAt));
  if (!list.length) return null;
  return list[0].items.find(i => i.exId === exId);
}
function lastDoneDay(dayId){
  const s = data.sessions.filter(s => s.dayId === dayId).map(s => s.date).sort().pop();
  return s || null;
}
function nextDayId(){
  if (!data.sessions.length) return 'd1';
  const last = [...data.sessions].sort((a,b) => (a.date + a.startedAt).localeCompare(b.date + b.startedAt)).pop();
  const idx = PROGRAM.findIndex(d => d.id === last.dayId);
  return PROGRAM[(idx + 1) % PROGRAM.length].id;
}
function weekCounts(ref = new Date()){
  const ws = iso(weekStart(ref)); const we = new Date(weekStart(ref)); we.setDate(we.getDate() + 6); const wee = iso(we);
  const inW = d => d >= ws && d <= wee;
  const lifts = data.sessions.filter(s => inW(s.date));
  const acts = data.activities.filter(a => inW(a.date));
  return {
    lift: lifts.length,
    liftHard: lifts.filter(s => DAY[s.dayId]?.kind === 'hard').length,
    bjj: acts.filter(a => a.type.startsWith('bjj')).length,
    bjjHard: acts.filter(a => a.type === 'bjj-hard').length,
    cf: acts.filter(a => a.type === 'crossfit').length,
  };
}
function setSummary(item){
  const ex = EX[item.exId];
  const done = item.sets.filter(s => s.done);
  if (!done.length) return '';
  return done.map(s => {
    if (ex.type === 'time') return `${s.t ?? 0} s`;
    if (ex.type === 'dist') return `${s.w ?? 0} kg × ${s.d ?? 0} m`;
    if (ex.type === 'r') return (s.w ? `+${s.w} kg × ` : '') + `${s.r ?? 0}`;
    return `${s.w ?? 0} × ${s.r ?? 0}`;
  }).join(', ');
}
function sessionVolume(s){
  let v = 0;
  s.items.forEach(i => i.sets.forEach(st => { if (st.done && st.w && st.r) v += st.w * st.r; }));
  return v;
}
function bestE1rm(item){
  let b = 0; item.sets.forEach(s => { if (s.done) { const e = e1rm(s.w, s.r); if (e && e > b) b = e; } }); return b || null;
}
function latestBW(){ const b = [...data.bodyweight].sort((a,b) => a.date.localeCompare(b.date)).pop(); return b ? b.kg : null; }

/* ---------- Session actions ---------- */
function startSession(dayId){
  const day = DAY[dayId]; const bi = blockInfo();
  data.active = {
    id: uid(), dayId, date: todayISO(), startedAt: new Date().toISOString(), deload: bi.deload, notes:'',
    items: day.ex.map(e => {
      const last = lastFor(e.id);
      const n = bi.deload ? Math.max(1, Math.ceil(e.sets * 2/3)) : e.sets;
      const sets = Array.from({length:n}, (_, k) => {
        const ls = last ? (last.sets.filter(x => x.done)[k] || last.sets.filter(x => x.done).slice(-1)[0]) : null;
        let w = ls ? ls.w : null; if (w && bi.deload) w = round25(w * 0.8);
        return {w: w ?? null, r:null, d:null, t:null, ph:{r: ls ? ls.r : null, d: ls ? ls.d : null, t: ls ? ls.t : null}, done:false};
      });
      return {exId:e.id, sets};
    })
  };
  save(); keepAwake(true); render(); window.scrollTo(0, 0);
}
function finishSession(){
  const a = data.active; if (!a) return;
  const doneSets = a.items.reduce((n, i) => n + i.sets.filter(s => s.done).length, 0);
  if (!doneSets && !confirm('No sets are checked off. Save this workout anyway?')) return;
  a.endedAt = new Date().toISOString();
  a.durationSec = Math.round((new Date(a.endedAt) - new Date(a.startedAt)) / 1000);
  a.items = a.items.map(i => ({exId:i.exId, sets:i.sets.filter(s => s.done).map(({ph, ...s}) => s)})).filter(i => i.sets.length);
  data.sessions.push(a); data.active = null; stopRest(); hold = null;
  save(); keepAwake(false); toast('Workout saved'); tab = 'log'; render();
}
function discardSession(){
  if (!confirm('Discard this workout? Nothing from it will be saved.')) return;
  data.active = null; stopRest(); hold = null; save(); keepAwake(false); render();
}

/* ---------- Timers ---------- */
let rest = null; // {end, total, label}
function startRest(sec, label){ rest = {end: Date.now() + sec*1000, total: sec, label: label || 'Rest', fired:false}; $('#restbar').hidden = false; tick(); }
function stopRest(){ rest = null; $('#restbar').hidden = true; }
let sw = {running:false, base:0, startedAt:0, laps:[]};
const swTime = () => sw.base + (sw.running ? Date.now() - sw.startedAt : 0);
let ivl = {work:40, rest:20, rounds:6, running:false, phase:'work', round:1, end:0};
let hold = null; // {ii, si, start}

function tick(){
  const now = Date.now();
  if (rest) {
    const left = (rest.end - now) / 1000;
    const el = $('#restT'); if (el) el.textContent = left >= 0 ? fmtDur(Math.ceil(left)) : '+' + fmtDur(-left);
    $('#restL').textContent = left >= 0 ? rest.label : 'Rest is over. Next set.';
    $('#restP').style.width = Math.min(100, Math.max(0, 100 * (1 - left / rest.total))) + '%';
    $('#restIn').classList.toggle('over', left < 0);
    if (left <= 0 && !rest.fired) { rest.fired = true; beep(3); }
    if (left < -600) stopRest();
  }
  if (data.active) { const c = $('#sessClock'); if (c) c.textContent = fmtDur((now - new Date(data.active.startedAt)) / 1000); }
  const swEl = $('#swT'); if (swEl) { const ms = swTime(); swEl.textContent = fmtDur(Math.floor(ms/1000)) + '.' + Math.floor(ms % 1000 / 100); }
  if (ivl.running) {
    let left = (ivl.end - now) / 1000;
    if (left <= 0) {
      if (ivl.phase === 'work' && ivl.rest > 0) { ivl.phase = 'rest'; ivl.end = now + ivl.rest*1000; beep(1, 660); }
      else if (ivl.round < ivl.rounds) { ivl.round++; ivl.phase = 'work'; ivl.end = now + ivl.work*1000; beep(2, 990); }
      else { ivl.running = false; beep(3); if (tab === 'timer') render(); }
      left = (ivl.end - now) / 1000;
    }
    const t = $('#ivT'); if (t) t.textContent = fmtDur(Math.ceil(Math.max(0, left)));
    const p = $('#ivP'); if (p) { p.textContent = ivl.running ? `${ivl.phase === 'work' ? 'Work' : 'Rest'}, round ${ivl.round} of ${ivl.rounds}` : 'Done'; p.className = 'phase ' + ivl.phase; }
  }
  if (hold) { const h = $(`#hold-${hold.ii}-${hold.si}`); if (h) h.textContent = Math.floor((now - hold.start)/1000) + ' s'; }
}
setInterval(tick, 200);

/* ---------- Views ---------- */
let tab = 'train', openEntry = null, progEx = null;

function beltHTML(bi){
  const stripes = Array.from({length:7}, (_, i) => {
    const w = i + 1; const cls = bi.deload || w < bi.week ? 'on' : (w === bi.week ? 'cur' : '');
    return `<span class="stripe ${cls}"></span>`;
  }).join('');
  return `<div class="belt ${bi.deload ? 'deload' : ''}" role="img" aria-label="Block ${bi.block}, week ${bi.week}"><div class="belt-body"></div><div class="belt-bar">${stripes}</div><div class="belt-tail"></div></div>`;
}

let editAct = null, actDate = null;
function actRow(a){
  const A = ACT[a.type] || ACT['bjj-hard']; const open = editAct === a.id;
  return `<div class="act-row"><div class="act-head">
      <span><span class="dot" style="background:${A.color}"></span>${A.label} <span class="muted small">${fmtDate(a.date)}</span></span>
      <button class="linkbtn" data-a="act-edit" data-id="${a.id}">${open ? 'Done' : 'Edit'}</button></div>
    ${open ? `<div class="act-edit">
      <select data-a="act-type" data-id="${a.id}" aria-label="Session type">${Object.entries(ACT).map(([k, v]) => `<option value="${k}" ${k === a.type ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
      <input type="date" data-a="act-date" data-id="${a.id}" value="${a.date}" max="${todayISO()}" aria-label="Date">
      <div class="full"><span class="small muted">Changes save right away.</span><button class="btn sm ghost" data-a="delact" data-id="${a.id}">Delete</button></div>
    </div>` : ''}</div>`;
}

function viewTrain(){
  if (data.active) return viewSession();
  const bi = blockInfo(); const wc = weekCounts(); const next = nextDayId();
  const cap = bi.deload
    ? `Block ${bi.block}, deload week. Workouts start with about 2/3 of the sets and 20% less weight.`
    : `Block ${bi.block}, week ${bi.week} of 7. Stop each set about ${RIR[bi.week-1]} rep${RIR[bi.week-1] > 1 ? 's' : ''} short of failure.`;
  const hard = wc.liftHard + wc.bjjHard + wc.cf;
  let note = '', ok = false;
  if (wc.lift >= 4 && wc.cf) note = 'You have 4 lifting days and CrossFit this week. CrossFit should replace a light day, not add to it.';
  else if (wc.lift > 4) note = 'More than 4 lifting days this week. The plan tops out at 4 alongside 5 BJJ sessions.';
  else if (wc.lift + wc.cf >= 4) { note = 'Your lifting days are covered for this week. Rest or keep it to BJJ.'; ok = true; }
  else if (hard >= 6) note = `${hard} hard sessions so far this week. Make the next lift a light day or take the day off.`;
  else { note = `Up next: Day ${DAY[next].n}, ${DAY[next].title.toLowerCase()}. Put hard lifting on drilling days and light lifting on sparring days.`; ok = true; }

  return `
  ${beltHTML(bi)}
  <p class="belt-cap">${cap}</p>
  <div class="stats">
    <div class="stat"><div class="v">${wc.lift}<span class="muted" style="font-size:1.1rem"> / 4</span></div><div class="l">Lifting days</div></div>
    <div class="stat"><div class="v">${wc.bjj}</div><div class="l">BJJ sessions</div></div>
    <div class="stat"><div class="v">${wc.cf}</div><div class="l">CrossFit</div></div>
  </div>
  <p class="note ${ok ? 'ok' : ''}">${note}</p>
  <div class="quick">
    <button class="btn sm" data-a="act" data-type="bjj-hard">Log BJJ, hard</button>
    <button class="btn sm" data-a="act" data-type="bjj-light">Log BJJ, drilling</button>
    <button class="btn sm" data-a="act" data-type="crossfit">Log CrossFit</button>
  </div>
  <label class="date-pick">Log for <input type="date" data-a="act-day" value="${actDate || todayISO()}" max="${todayISO()}"></label>
  ${(() => { const ws = iso(weekStart(new Date())); const list = data.activities.filter(a => a.date >= ws).sort((x, y) => (y.date + (y.at||'')).localeCompare(x.date + (x.at||''))); 
     return list.length ? `<div class="acts">${list.map(actRow).join('')}</div>` : ''; })()}
  <h2>Start a workout</h2>
  <ul class="days">${PROGRAM.map(d => {
    const ld = lastDoneDay(d.id);
    return `<li class="day ${d.id === next ? 'next' : ''}">
      <span class="n">${d.n}</span>
      <div class="info"><h3>${d.title}<span class="tag ${d.kind}">${d.kind}</span></h3>
      <p class="small muted">${d.ex.length} exercises${ld ? `, last done ${fmtDate(ld)}` : ', not done yet'}</p></div>
      <button class="btn ${d.id === next ? 'red' : ''}" data-a="start" data-day="${d.id}">Start</button>
    </li>`; }).join('')}
  </ul>`;
}

function setRow(item, ii, s, si){
  const ex = EX[item.exId]; const ph = s.ph || {};
  const f = (field, unit, placeholder, mode='decimal') =>
    `<div class="field"><input inputmode="${mode}" type="text" data-ii="${ii}" data-si="${si}" data-f="${field}" value="${s[field] ?? ''}" placeholder="${placeholder ?? ''}" aria-label="${unit}"><span class="u">${unit}</span></div>`;
  const chk = `<button class="check" data-a="check" data-ii="${ii}" data-si="${si}" aria-label="Mark set ${si+1} done" aria-pressed="${s.done}">${CHECK}</button>`;
  if (ex.type === 'time') {
    const on = hold && hold.ii === ii && hold.si === si;
    return `<div class="set t1 ${s.done ? 'done' : ''}"><span class="i">${si+1}</span>${f('t','sec', ph.t, 'numeric')}<button class="hold ${on ? 'on' : ''}" id="hold-${ii}-${si}" data-a="hold" data-ii="${ii}" data-si="${si}">${on ? '0 s' : 'Hold'}</button>${chk}</div>`;
  }
  if (ex.type === 'dist') return `<div class="set ${s.done ? 'done' : ''}"><span class="i">${si+1}</span>${f('w','kg', '')}${f('d','m', ph.d ?? '30', 'numeric')}${chk}</div>`;
  if (ex.type === 'r') return `<div class="set ${s.done ? 'done' : ''}"><span class="i">${si+1}</span>${f('w','+kg', '0')}${f('r','reps', ph.r, 'numeric')}${chk}</div>`;
  return `<div class="set ${s.done ? 'done' : ''}"><span class="i">${si+1}</span>${f('w','kg', '')}${f('r','reps', ph.r, 'numeric')}${chk}</div>`;
}

function viewSession(){
  const a = data.active; const day = DAY[a.dayId];
  const done = a.items.reduce((n, i) => n + i.sets.filter(s => s.done).length, 0);
  const total = a.items.reduce((n, i) => n + i.sets.length, 0);
  return `
  <div class="sess-head">
    <div class="t"><h3>Day ${day.n}, ${day.title.toLowerCase()}</h3><p class="small muted">${done} of ${total} sets done</p></div>
    <div class="clock" id="sessClock">0:00</div>
  </div>
  ${a.deload ? `<p class="banner">Deload week. Sets are cut to about 2/3 and weights start 20% lighter. Keep BJJ light too if you can.</p>` : ''}
  ${a.items.map((item, ii) => {
    const ex = EX[item.exId]; const prev = lastFor(item.exId);
    return `<section class="ex">
      <div class="ex-top"><h3>${ex.name}</h3><span class="target">${ex.target}</span></div>
      <p class="last">${prev ? 'Last time: ' + esc(setSummary(prev)) : 'First time logging this.'} Rest ${fmtDur(ex.rest)}.</p>
      ${ex.tip ? `<p class="tip">${ex.tip}</p>` : ''}
      <div class="sets">${item.sets.map((s, si) => setRow(item, ii, s, si)).join('')}</div>
      <div class="ex-actions"><button class="linkbtn" data-a="addset" data-ii="${ii}">Add set</button>${item.sets.length > 1 ? `<button class="linkbtn" data-a="delset" data-ii="${ii}">Remove last set</button>` : ''}<button class="linkbtn" data-a="restnow" data-ii="${ii}">Start rest</button></div>
    </section>`;
  }).join('')}
  <h2>Notes</h2>
  <textarea data-f="notes" placeholder="How did it feel? Any aches?">${esc(a.notes)}</textarea>
  <div class="row"><button class="btn solid" data-a="finish">Finish and save</button><button class="btn ghost" data-a="discard">Discard</button></div>`;
}

function viewTimer(){
  return `
  <h2 style="margin-top:12px">Rest timer</h2>
  <p class="small muted">Checking off a set starts this automatically with the exercise's rest time.</p>
  <div class="presets">${[45,60,90,120,150,180].map(s => `<button class="btn sm" data-a="restpreset" data-s="${s}">${fmtDur(s)}</button>`).join('')}</div>
  <h2>Stopwatch</h2>
  <div class="big" id="swT">0:00.0</div>
  <div class="row">
    <button class="btn ${sw.running ? '' : 'solid'}" data-a="sw-toggle">${sw.running ? 'Pause' : (swTime() ? 'Resume' : 'Start')}</button>
    <button class="btn ghost" data-a="sw-lap" ${sw.running ? '' : 'disabled'}>Lap</button>
    <button class="btn ghost" data-a="sw-reset" ${swTime() ? '' : 'disabled'}>Reset</button>
  </div>
  ${sw.laps.length ? `<ol class="laps">${sw.laps.map((l, i) => `<li><span>Lap ${i+1}</span><span>${fmtDur(Math.floor(l/1000))}.${Math.floor(l%1000/100)}</span></li>`).join('')}</ol>` : ''}
  <h2>Interval timer</h2>
  <p class="small muted">For holds, neck work and grip circuits.</p>
  <div class="ivl-grid">
    <div><label for="ivW">Work, sec</label><input id="ivW" inputmode="numeric" data-iv="work" value="${ivl.work}"></div>
    <div><label for="ivR">Rest, sec</label><input id="ivR" inputmode="numeric" data-iv="rest" value="${ivl.rest}"></div>
    <div><label for="ivN">Rounds</label><input id="ivN" inputmode="numeric" data-iv="rounds" value="${ivl.rounds}"></div>
  </div>
  <div class="big" id="ivT" style="margin-top:14px">${fmtDur(ivl.work)}</div>
  <p class="phase ${ivl.phase}" id="ivP">${ivl.running ? '' : 'Ready'}</p>
  <div class="row"><button class="btn ${ivl.running ? '' : 'solid'}" data-a="iv-toggle">${ivl.running ? 'Stop' : 'Start intervals'}</button></div>`;
}

function viewLog(){
  const rows = [
    ...data.sessions.map(s => ({kind:'s', date:s.date, key:s.date + (s.startedAt || ''), s})),
    ...data.activities.map(a => ({kind:'a', date:a.date, key:a.date + (a.at || ''), a})),
  ].sort((x, y) => y.key.localeCompare(x.key));
  if (!rows.length) return `<h2 style="margin-top:12px">Training log</h2><p class="empty">Finished workouts and logged BJJ or CrossFit sessions show up here. Start one from Train.</p>`;
  let html = `<h2 style="margin-top:12px">Training log</h2>`, lastWeek = '';
  rows.forEach(r => {
    const wk = iso(weekStart(parseISO(r.date)));
    if (wk !== lastWeek) { lastWeek = wk; const wc = weekCounts(parseISO(r.date)); html += `<p class="day-sep">Week of ${fmtDate(wk)}: ${wc.lift} lifts, ${wc.bjj} BJJ, ${wc.cf} CrossFit</p>`; }
    if (r.kind === 'a') {
      const A = ACT[r.a.type];
      html += actRow(r.a);
    } else {
      const s = r.s, d = DAY[s.dayId], sets = s.items.reduce((n, i) => n + i.sets.length, 0), open = openEntry === s.id;
      html += `<div class="entry"><button class="entry-h" data-a="toggle" data-id="${s.id}" aria-expanded="${open}">
        <span><h3>Day ${d.n}, ${d.title.toLowerCase()}${s.deload ? ' (deload)' : ''}</h3><span class="meta">${fmtDate(s.date)}, ${fmtDur(s.durationSec || 0)}, ${sets} sets, ${Math.round(sessionVolume(s)).toLocaleString()} kg moved</span></span>
        <span class="muted">${open ? '−' : '+'}</span></button>
        ${open ? `<div class="detail">${s.items.map(i => `<div class="dx"><b>${EX[i.exId].name}:</b> ${esc(setSummary(i))}</div>`).join('')}
          ${s.notes ? `<p class="muted" style="margin-top:6px">${esc(s.notes)}</p>` : ''}
          <button class="linkbtn" data-a="delsess" data-id="${s.id}" style="margin-top:6px">Delete workout</button></div>` : ''}
      </div>`;
    }
  });
  return html;
}

function lineChart(pts, {unit = 'kg', h = 170} = {}){
  if (pts.length < 2) return `<p class="small muted" style="margin-top:10px">Log this at least twice to see a trend line.</p>`;
  const W = 340, H = h, L = 36, R = 10, T = 12, B = 24;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x1 === x0) x1 = x0 + 1;
  let y0 = Math.min(...ys), y1 = Math.max(...ys); const padY = Math.max(1, (y1 - y0) * 0.15); y0 -= padY; y1 += padY;
  const X = x => L + (x - x0) / (x1 - x0) * (W - L - R), Y = y => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  const grid = [0, .5, 1].map(f => { const v = y0 + f * (y1 - y0); return `<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#CDD2CB"/><text x="${L-6}" y="${Y(v)+4}" text-anchor="end" font-size="10" fill="#5A6572">${Math.round(v)}</text>`; }).join('');
  const d = t => new Date(t).toLocaleDateString(undefined, {day:'numeric', month:'short'});
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trend in ${unit}">${grid}
    <path d="${path}" fill="none" stroke="#B8272C" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map(p => `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="3.5" fill="#F7F8F5" stroke="#B8272C" stroke-width="2"/>`).join('')}
    <text x="${L}" y="${H-6}" font-size="10" fill="#5A6572">${d(x0)}</text><text x="${W-R}" y="${H-6}" text-anchor="end" font-size="10" fill="#5A6572">${d(x1)}</text></svg>`;
}

function exHistory(exId){
  return data.sessions.filter(s => s.items.some(i => i.exId === exId)).sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({s, item: s.items.find(i => i.exId === exId)}));
}

function viewProgress(){
  const bw = latestBW();
  const bestFor = id => { let b = 0; exHistory(id).forEach(h => { const e = bestE1rm(h.item); if (e > b) b = e; }); return b || null; };
  let std = `<h2 style="margin-top:12px">Strength vs bodyweight</h2>`;
  if (!bw) std += `<p class="small muted">Log your bodyweight in Body to compare your lifts with the BJJ strength targets.</p>`;
  else {
    std += `<p class="small muted">Estimated one-rep max divided by your ${fmtKg(bw)} kg bodyweight. The green zone is the target range from the research.</p>`;
    STANDARDS.forEach(st => {
      const b = bestFor(st.id); const ratio = b ? b / bw : null; const max = st.hi * 1.3;
      std += `<div class="std"><div class="std-top"><h3>${st.label}</h3><span class="num">${ratio ? ratio.toFixed(2) + '×' : 'No data'}</span></div>
        <p class="small muted">Target ${st.lo}–${st.hi}×, which is ${Math.round(st.lo*bw)}–${Math.round(st.hi*bw)} kg${b ? `. Your estimate: ${Math.round(b)} kg` : ''}</p>
        <div class="track"><div class="zone" style="left:${st.lo/max*100}%;width:${(st.hi-st.lo)/max*100}%"></div>${ratio ? `<div class="marker" style="left:${Math.min(100, ratio/max*100)}%"></div>` : ''}</div></div>`;
    });
  }
  const logged = Object.values(EX).filter(e => exHistory(e.id).length);
  if (!logged.length) return std + `<h2>Exercise trends</h2><p class="empty">Finish a workout to start tracking your lifts.</p>`;
  if (!progEx || !logged.find(e => e.id === progEx)) progEx = logged[0].id;
  const ex = EX[progEx]; const hist = exHistory(progEx);
  let metric, unitLabel;
  if (ex.type === 'time') { metric = i => Math.max(0, ...i.sets.map(s => s.t || 0)); unitLabel = 'Longest hold, sec'; }
  else if (ex.type === 'dist') { metric = i => Math.max(0, ...i.sets.map(s => s.w || 0)); unitLabel = 'Heaviest carry, kg'; }
  else if (ex.type === 'r' && !hist.some(h => h.item.sets.some(s => s.w))) { metric = i => Math.max(0, ...i.sets.map(s => s.r || 0)); unitLabel = 'Best set, reps'; }
  else { metric = i => bestE1rm(i) || Math.max(0, ...i.sets.map(s => s.w || 0)); unitLabel = 'Estimated 1RM, kg'; }
  const pts = hist.map(h => ({x: parseISO(h.s.date).getTime(), y: metric(h.item)}));
  const heavy = Math.max(0, ...hist.flatMap(h => h.item.sets.map(s => s.w || 0)));
  const best = Math.max(...pts.map(p => p.y));
  const weeks = Array.from({length:8}, (_, k) => { const d = new Date(); d.setDate(d.getDate() - 7*(7-k)); return {d, c: weekCounts(d)}; });
  const maxC = Math.max(6, ...weeks.map(w => w.c.lift + w.c.bjj + w.c.cf));
  const bars = `<svg class="chart" viewBox="0 0 340 130" role="img" aria-label="Sessions per week">${weeks.map((w, k) => {
      const x = 10 + k*41, u = 100/maxC; let y = 110; const seg = (n, c) => { const hh = n*u; y -= hh; return n ? `<rect x="${x}" y="${y}" width="28" height="${hh}" fill="${c}"/>` : ''; };
      return seg(w.c.bjj, '#7B8794') + seg(w.c.lift, '#141414') + seg(w.c.cf, '#B8272C') + `<text x="${x+14}" y="124" text-anchor="middle" font-size="10" fill="#5A6572">${w.d.toLocaleDateString(undefined,{day:'numeric',month:'numeric'})}</text>`;
    }).join('')}<line x1="0" x2="340" y1="110" y2="110" stroke="#CDD2CB"/></svg>`;
  return std + `
  <h2>Exercise trends</h2>
  <select data-a="progex" aria-label="Exercise">${logged.map(e => `<option value="${e.id}" ${e.id === progEx ? 'selected' : ''}>${e.name}</option>`).join('')}</select>
  <div class="kv"><div><div class="v">${fmtKg(best)}</div><div class="l">${unitLabel}</div></div><div><div class="v">${heavy ? fmtKg(heavy) : '–'}</div><div class="l">Heaviest kg</div></div><div><div class="v">${hist.length}</div><div class="l">Sessions</div></div></div>
  ${lineChart(pts, {unit: unitLabel})}
  <h2>Weekly load</h2>
  <p class="small muted">Last 8 weeks. Black is lifting, grey is BJJ, red is CrossFit.</p>
  ${bars}`;
}

function viewBody(){
  const list = [...data.bodyweight].sort((a, b) => b.date.localeCompare(a.date));
  const pts = [...list].reverse().map(b => ({x: parseISO(b.date).getTime(), y: b.kg}));
  const bi = blockInfo();
  return `
  <h2 style="margin-top:12px">Bodyweight</h2>
  <div class="inline"><div class="field"><input id="bwIn" inputmode="decimal" placeholder="${list[0] ? list[0].kg : '95'}" aria-label="Bodyweight in kg"><span class="u">kg</span></div><button class="btn solid" data-a="bw-add">Log weight</button></div>
  ${list.length ? `<div class="kv"><div><div class="v">${fmtKg(list[0].kg)}</div><div class="l">Latest kg</div></div><div><div class="v">${list.length > 1 ? (list[0].kg - list[list.length-1].kg > 0 ? '+' : '') + fmtKg(list[0].kg - list[list.length-1].kg) : '–'}</div><div class="l">Since first log</div></div><div><div class="v">${list.length}</div><div class="l">Entries</div></div></div>
  ${lineChart(pts)}
  <div style="margin-top:10px">${list.slice(0, 12).map(b => `<div class="set-row"><span>${fmtDate(b.date)}</span><span class="num">${fmtKg(b.kg)} kg <button class="linkbtn" data-a="bw-del" data-id="${b.id}" style="margin-left:10px">Remove</button></span></div>`).join('')}</div>`
  : `<p class="small muted" style="margin-top:8px">Log it weekly, same time of day. It sets your strength targets in Progress.</p>`}
  <h2>Settings</h2>
  <div class="set-row"><label for="blk">Block start date<br><span class="small muted">Now on block ${bi.block}, week ${bi.week}${bi.deload ? ' (deload)' : ''}</span></label><input type="date" id="blk" data-a="blk" value="${data.settings.blockStart || ''}"></div>
  <div class="set-row"><span>Saving on this phone<br><span class="small muted">${saveOK === false ? 'Blocked. Turn off Private Browsing, then reopen from the home screen icon.' : lastSaved ? 'Last saved at ' + lastSaved.toLocaleTimeString() : 'Working. Everything saves the moment you enter it.'}</span></span><span class="num" style="color:${saveOK === false ? 'var(--bar)' : 'var(--mat)'}">${saveOK === false ? 'Off' : 'On'}</span></div>
  <div class="set-row"><span>Sound when rest ends</span><button class="switch" role="switch" aria-checked="${!!data.settings.sound}" data-a="sound" aria-label="Sound"></button></div>
  <div class="set-row"><span>Backup<br><span class="small muted">Export before clearing Safari data or switching phones.</span></span><span style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end"><button class="btn sm" data-a="export">Export</button><button class="btn sm ghost" data-a="import">Import</button></span></div>
  <div class="set-row"><span>Version</span><span class="num">${APP_VERSION}</span></div>
  <div class="set-row"><span>Erase everything</span><button class="btn sm ghost" data-a="reset">Erase</button></div>
  <input type="file" id="importFile" accept="application/json,.json" hidden>`;
}

function render(){
  const v = $('#view');
  v.innerHTML = tab === 'train' ? viewTrain() : tab === 'timer' ? viewTimer() : tab === 'log' ? viewLog() : tab === 'progress' ? viewProgress() : viewBody();
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-current', t.dataset.tab === tab ? 'page' : 'false'));
  $('#title').textContent = tab === 'train' && data.active ? 'Training' : 'Mat Strength';
  tick();
}

/* ---------- Events ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-tab]');
  if (t) { tab = t.dataset.tab; openEntry = null; render(); window.scrollTo(0, 0); return; }
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a, ii = +b.dataset.ii, si = +b.dataset.si;
  const act = data.active;
  switch (a) {
    case 'start': startSession(b.dataset.day); break;
    case 'finish': finishSession(); break;
    case 'discard': discardSession(); break;
    case 'act': {
      const d = actDate || todayISO(); const item = {id: uid(), type: b.dataset.type, date: d, at: new Date().toISOString()};
      data.activities.push(item); save(); render();
      toast(`${ACT[item.type].label} logged for ${d === todayISO() ? 'today' : fmtDate(d)}`, () => { data.activities = data.activities.filter(x => x.id !== item.id); save(); render(); });
      break;
    }
    case 'act-edit': editAct = editAct === b.dataset.id ? null : b.dataset.id; render(); break;
    case 'delact': {
      const gone = data.activities.find(x => x.id === b.dataset.id);
      data.activities = data.activities.filter(x => x.id !== b.dataset.id); editAct = null; save(); render();
      if (gone) toast('Session deleted', () => { data.activities.push(gone); save(); render(); });
      break;
    }
    case 'undo': if (undoFn) { const f = undoFn; undoFn = null; f(); $('#toast').classList.remove('show'); } break;
    case 'check': {
      const s = act.items[ii].sets[si]; const ex = EX[act.items[ii].exId];
      s.done = !s.done;
      if (s.done) {
        if (s.r == null && s.ph?.r != null) s.r = s.ph.r;
        if (s.d == null && ex.type === 'dist') s.d = s.ph?.d ?? 30;
        if (s.t == null && s.ph?.t != null) s.t = s.ph.t;
        act.items[ii].sets.forEach((o, k) => { if (k > si && !o.done && o.w == null && s.w != null) o.w = s.w; });
        startRest(ex.rest, `Rest after ${ex.name.toLowerCase()}`);
      }
      save(); render(); break;
    }
    case 'hold': {
      if (hold && hold.ii === ii && hold.si === si) {
        const secs = Math.round((Date.now() - hold.start) / 1000); const s = act.items[ii].sets[si];
        s.t = secs; s.done = true; hold = null; beep(1, 660);
        startRest(EX[act.items[ii].exId].rest, 'Rest'); save();
      } else { hold = {ii, si, start: Date.now()}; beep(1, 990); }
      render(); break;
    }
    case 'addset': { const sets = act.items[ii].sets; const l = sets[sets.length-1]; sets.push({w: l?.w ?? null, r:null, d:null, t:null, ph:{...(l?.ph||{}), r: l?.r ?? l?.ph?.r, d: l?.d ?? l?.ph?.d, t: l?.t ?? l?.ph?.t}, done:false}); save(); render(); break; }
    case 'delset': act.items[ii].sets.pop(); save(); render(); break;
    case 'restnow': startRest(EX[act.items[ii].exId].rest, 'Rest'); break;
    case 'rest-add': if (rest) { rest.end += 15000; rest.total += 15; rest.fired = false; tick(); } break;
    case 'rest-stop': stopRest(); break;
    case 'restpreset': startRest(+b.dataset.s, 'Rest'); break;
    case 'sw-toggle': if (sw.running) { sw.base = swTime(); sw.running = false; } else { sw.startedAt = Date.now(); sw.running = true; } render(); break;
    case 'sw-lap': sw.laps.unshift(swTime()); render(); break;
    case 'sw-reset': sw = {running:false, base:0, startedAt:0, laps:[]}; render(); break;
    case 'iv-toggle':
      if (ivl.running) ivl.running = false;
      else { ivl.running = true; ivl.phase = 'work'; ivl.round = 1; ivl.end = Date.now() + ivl.work*1000; beep(2, 990); }
      render(); break;
    case 'toggle': openEntry = openEntry === b.dataset.id ? null : b.dataset.id; render(); break;
    case 'delsess': if (confirm('Delete this workout from your log?')) { data.sessions = data.sessions.filter(s => s.id !== b.dataset.id); save(); render(); } break;
    case 'bw-add': {
      const v = num($('#bwIn').value.replace(',', '.'));
      if (!v || v < 30 || v > 250) { toast('Enter your weight in kg, like 95.4'); break; }
      data.bodyweight = data.bodyweight.filter(x => x.date !== todayISO());
      data.bodyweight.push({id: uid(), date: todayISO(), kg: v}); save(); toast('Weight logged'); render(); break;
    }
    case 'bw-del': data.bodyweight = data.bodyweight.filter(x => x.id !== b.dataset.id); save(); render(); break;
    case 'sound': data.settings.sound = !data.settings.sound; save(); render(); break;
    case 'export': exportData(); break;
    case 'import': $('#importFile').click(); break;
    case 'reset': if (confirm('Erase all workouts, bodyweight and settings? Export a backup first if you want to keep them.')) { data = fresh(); stopRest(); save(); render(); toast('Everything erased'); } break;
  }
});

document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.f && data.active) {
    if (el.dataset.f === 'notes') { data.active.notes = el.value; save(); return; }
    const s = data.active.items[+el.dataset.ii].sets[+el.dataset.si];
    s[el.dataset.f] = num(el.value.replace(',', '.')); save(); return;
  }
  if (el.dataset.iv) { const v = Math.max(el.dataset.iv === 'rest' ? 0 : 1, parseInt(el.value) || 0); ivl[el.dataset.iv] = v; if (!ivl.running && el.dataset.iv === 'work') { const t = $('#ivT'); if (t) t.textContent = fmtDur(v); } }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.a === 'progex') { progEx = el.value; render(); }
  if (el.dataset.a === 'act-day') { actDate = el.value && el.value !== todayISO() ? el.value : null; }
  if (el.dataset.a === 'act-type' || el.dataset.a === 'act-date') {
    const a = data.activities.find(x => x.id === el.dataset.id);
    if (a && el.value) { if (el.dataset.a === 'act-type') a.type = el.value; else a.date = el.value; save(); render(); toast('Session updated'); }
  }
  if (el.dataset.a === 'blk') { data.settings.blockStart = el.value || null; save(); render(); toast('Block start updated'); }
  if (el.id === 'importFile' && el.files[0]) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(r.result);
        if (!Array.isArray(obj.sessions)) throw new Error();
        if (!confirm('Replace your current log with this backup?')) return;
        data = {...fresh(), ...obj, settings: {...fresh().settings, ...(obj.settings || {})}}; save(); render(); toast('Backup imported');
      } catch(err) { toast('That file is not a Mat Strength backup'); }
    };
    r.readAsText(el.files[0]); el.value = '';
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'bwIn') document.querySelector('[data-a="bw-add"]').click(); });

async function exportData(){
  const json = JSON.stringify(data, null, 1); const name = `mat-strength-${todayISO()}.json`;
  try {
    const file = new File([json], name, {type:'application/json'});
    if (navigator.canShare && navigator.canShare({files:[file]})) { await navigator.share({files:[file], title:'Mat Strength backup'}); return; }
  } catch(e) { if (e.name === 'AbortError') return; }
  try {
    const url = URL.createObjectURL(new Blob([json], {type:'application/json'}));
    const l = document.createElement('a'); l.href = url; l.download = name; document.body.appendChild(l); l.click(); l.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000); toast('Backup exported');
  } catch(e) {
    try { await navigator.clipboard.writeText(json); toast('Backup copied to clipboard'); } catch(_) { toast('Export is blocked here'); }
  }
}

/* ---------- Offline support ---------- */
const canUseSW = 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost');
if (canUseSW) window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });

/* ---------- Boot ---------- */
(async function init(){
  $('#today').textContent = new Date().toLocaleDateString(undefined, {weekday:'long', day:'numeric', month:'long'});
  const saved = await Store.load();
  if (saved) data = {...fresh(), ...saved, settings: {...fresh().settings, ...(saved.settings || {})}};
  if (data.active) keepAwake(true);
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch(e) {}
  if (!window.storage) { try { localStorage.setItem(KEY + '-test', '1'); localStorage.removeItem(KEY + '-test'); saveOK = true; } catch(e) { saveOK = false; } }
  render();
})();
