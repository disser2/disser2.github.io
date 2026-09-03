/* Mahlzeiten-Tracker – mobile first, iOS-Look, komplett lokal.
   Datenhaltung: localStorage + JSON-Import/-Export. */
(function () {
'use strict';

/* ============================================================
   Konfiguration
   ============================================================ */

const CATS = [
  { key: 'protein', label: 'Protein', short: 'Protein', items: [
    ['Hähnchen','🍗'], ['Schwein','🥓'], ['Rind','🥩'], ['Tofu','🧊'],
    ['Falafel','🧆'], ['Fischstäbchen','🐟'], ['Lachs','🍣']
  ]},
  { key: 'carbs', label: 'Kohlenhydrate', short: 'KH', items: [
    ['Reis','🍚'], ['Nudeln','🍝'], ['Kartoffeln','🥔']
  ]},
  { key: 'veggies', label: 'Gemüse', short: 'Gemüse', items: [
    ['Mischgemüse','🥘'], ['Aubergine','🍆'], ['Zucchini','🥒'], ['Karotten','🥕'],
    ['Grüne Bohnen','🫘'], ['Pak Choi','🥬'], ['Kohl','🥬'], ['Rosenkohl','🌱'], ['Brokkoli','🥦']
  ]},
  { key: 'sides', label: 'Beilagen', short: 'Beilagen', items: [
    ['Salat','🥗'], ['Gurke','🥒']
  ]}
];

const MEAL_TYPES = ['Frühstück', 'Mittag', 'Abend', 'Snack'];
const STORE_KEY = 'mahlzeiten.v1';
const WD = ['So','Mo','Di','Mi','Do','Fr','Sa'];
const WD_LONG = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
const MON = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const MON_LONG = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

/* ============================================================
   Speicher
   ============================================================ */

const emptySel = () => ({ protein: [], carbs: [], veggies: [], sides: [] });

let store = {
  v: 1,
  meals: [],                                     // {id, ts, type, sel:{...}, note}
  custom: { protein: [], carbs: [], veggies: [], sides: [] },
  settings: { autoCopy: true }
};

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d && Array.isArray(d.meals)) {
      store.meals = d.meals.filter(m => m && m.ts).map(normalizeMeal);
      if (d.custom) CATS.forEach(c => { if (Array.isArray(d.custom[c.key])) store.custom[c.key] = d.custom[c.key].slice(); });
      if (d.settings && typeof d.settings.autoCopy === 'boolean') store.settings.autoCopy = d.settings.autoCopy;
    }
  } catch (e) { console.warn('Laden fehlgeschlagen', e); }
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {
    toast('Speichern fehlgeschlagen', 'Der lokale Speicher ist nicht verfügbar (Privater Modus?).', []);
  }
}

function normalizeMeal(m) {
  const sel = emptySel();
  CATS.forEach(c => { if (m.sel && Array.isArray(m.sel[c.key])) sel[c.key] = m.sel[c.key].slice(); });
  return {
    id: m.id || uid(),
    ts: m.ts,
    type: MEAL_TYPES.indexOf(m.type) >= 0 ? m.type : guessType(new Date(m.ts)),
    sel: sel,
    note: typeof m.note === 'string' ? m.note : ''
  };
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ============================================================
   Datum & Text
   ============================================================ */

const p2 = n => String(n).padStart(2, '0');
const dateKey = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
const timeStr = d => p2(d.getHours()) + ':' + p2(d.getMinutes());
const dmy = d => p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + '.' + d.getFullYear();

function guessType(d) {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 10.5) return 'Frühstück';
  if (h < 15) return 'Mittag';
  if (h < 21.5) return 'Abend';
  return 'Snack';
}

function toLocalInput(d) {
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes());
}

function relDay(d) {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const diff = Math.round((t - x) / 86400000);
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Gestern';
  if (diff === 2) return 'Vorgestern';
  if (diff < 7 && diff > 0) return WD_LONG[x.getDay()];
  return WD[x.getDay()] + ', ' + dmy(x);
}

/** Ein-Zeilen-Text für die Notizen-App. */
function mealString(m) {
  const d = new Date(m.ts);
  const parts = [dateKey(d) + ' ' + timeStr(d), m.type];
  CATS.forEach(c => {
    if (m.sel[c.key] && m.sel[c.key].length) parts.push(c.short + ': ' + m.sel[c.key].join(', '));
  });
  if (m.note) parts.push('Notiz: ' + m.note);
  return parts.join(' | ');
}

function selSummary(m) {
  const all = [];
  CATS.forEach(c => (m.sel[c.key] || []).forEach(i => all.push(i)));
  return all;
}

/* ============================================================
   DOM-Helfer
   ============================================================ */

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function el(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
}

function haptic(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms || 8); } catch (e) {} } }

async function copy(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch (e) {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.focus(); ta.select(); ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}

/* ============================================================
   Toast
   ============================================================ */

let toastTimer = null;
function toast(title, text, actions, holdMs) {
  const t = $('#toast');
  $('#toast-title').textContent = title;
  $('#toast-text').textContent = text || '';
  $('#toast-text').classList.toggle('hide', !text);
  const acts = $('#toast-acts');
  acts.innerHTML = '';
  (actions || []).forEach(a => {
    const b = el('button', a.primary ? 'pri' : '', a.label);
    b.onclick = () => { a.onClick && a.onClick(); if (a.close !== false) hideToast(); };
    acts.appendChild(b);
  });
  acts.classList.toggle('hide', !(actions && actions.length));
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, holdMs || (actions && actions.length ? 6500 : 2600));
}
function hideToast() { $('#toast').classList.remove('on'); }
$('#toast').addEventListener('click', e => { if (e.target.id === 'toast') hideToast(); });

/* ============================================================
   Sheet
   ============================================================ */

function openSheet(title, buildBody) {
  $('#sheet-title').textContent = title;
  const body = $('#sheet-body');
  body.innerHTML = '';
  buildBody(body);
  $('#backdrop').classList.add('on');
  $('#sheet').classList.add('on');
}
function closeSheet() {
  $('#backdrop').classList.remove('on');
  $('#sheet').classList.remove('on');
}
$('#backdrop').onclick = closeSheet;
$('#sheet-close').onclick = closeSheet;

/* ============================================================
   Chip-Raster (wird von Erfassen + Bearbeiten genutzt)
   ============================================================ */

function itemsFor(cat) {
  const base = cat.items.map(i => ({ n: i[0], e: i[1] }));
  (store.custom[cat.key] || []).forEach(n => base.push({ n: n, e: '•' }));
  return base;
}

/**
 * Rendert alle Kategorien mit Auswahl-Chips.
 * @param {HTMLElement} host   Zielcontainer
 * @param {object} sel         Auswahlobjekt (wird direkt mutiert)
 * @param {function} onChange  Callback nach jeder Änderung
 */
function renderCats(host, sel, onChange) {
  host.innerHTML = '';
  CATS.forEach(cat => {
    const wrap = el('div', 'cat');
    const head = el('div', 'cathead');
    head.appendChild(el('h2', null, cat.label));
    const add = el('button', 'addbtn', '+');
    add.setAttribute('aria-label', 'Eigene Zutat zu ' + cat.label);
    add.onclick = () => addCustomItem(cat, name => {
      if (sel[cat.key].indexOf(name) < 0) sel[cat.key].push(name);
      renderCats(host, sel, onChange);
      onChange && onChange();
    });
    head.appendChild(add);
    wrap.appendChild(head);
    const chips = el('div', 'chips');

    itemsFor(cat).forEach(it => {
      const b = el('button', 'chip' + (sel[cat.key].indexOf(it.n) >= 0 ? ' on' : ''));
      const e = el('span', 'e', it.e); b.appendChild(e);
      b.appendChild(el('span', null, it.n));
      b.onclick = () => {
        const i = sel[cat.key].indexOf(it.n);
        if (i >= 0) sel[cat.key].splice(i, 1); else sel[cat.key].push(it.n);
        b.classList.toggle('on');
        haptic();
        onChange && onChange();
      };
      chips.appendChild(b);
    });

    wrap.appendChild(chips);
    host.appendChild(wrap);
  });
}

function addCustomItem(cat, done) {
  openSheet('Eigene Zutat · ' + cat.label, body => {
    const inp = el('input', 'txtin');
    inp.type = 'text';
    inp.placeholder = 'z. B. Kichererbsen';
    inp.autocapitalize = 'sentences';
    body.appendChild(inp);
    const row = el('div', 'btnrow');
    const cancel = el('button', '', 'Abbrechen');
    const ok = el('button', 'pri', 'Hinzufügen');
    cancel.onclick = closeSheet;
    ok.onclick = () => {
      const v = inp.value.trim();
      if (!v) return;
      const exists = cat.items.some(i => i[0].toLowerCase() === v.toLowerCase())
        || store.custom[cat.key].some(n => n.toLowerCase() === v.toLowerCase());
      if (!exists) { store.custom[cat.key].push(v); save(); }
      closeSheet();
      done(v);
    };
    row.appendChild(cancel); row.appendChild(ok);
    body.appendChild(row);
    setTimeout(() => inp.focus(), 260);
  });
}

/* ============================================================
   Screen: Erfassen
   ============================================================ */

const draft = { ts: null, type: null, typeManual: false, sel: emptySel(), note: '' };

function draftDate() { return draft.ts ? new Date(draft.ts) : new Date(); }
function draftHasItems() { return CATS.some(c => draft.sel[c.key].length > 0); }

function renderTime() {
  const d = draftDate();
  const isNow = !draft.ts;
  const type = draft.type || guessType(d);
  const lab = $('#time-label');
  lab.textContent = isNow
    ? 'Jetzt · ' + WD[d.getDay()] + ' ' + timeStr(d)
    : WD[d.getDay()] + ', ' + p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + '. · ' + timeStr(d);
  lab.classList.toggle('now', isNow);
  $('#time-type').textContent = type;
}

function renderMealTypes() {
  const seg = $('#mealtype');
  seg.innerHTML = '';
  const active = draft.type || guessType(draftDate());
  MEAL_TYPES.forEach(t => {
    const b = el('button', t === active ? 'on' : '', t);
    b.onclick = () => { draft.type = t; draft.typeManual = true; renderMealTypes(); renderTime(); haptic(); };
    seg.appendChild(b);
  });
}

function renderQuick() {
  const wrap = $('#quickwrap');
  const box = $('#quick');
  const recent = store.meals.slice().sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 60);
  const seen = new Map();
  recent.forEach(m => {
    const items = selSummary(m);
    if (!items.length) return;
    const sig = CATS.map(c => (m.sel[c.key] || []).slice().sort().join(',')).join('|');
    if (!seen.has(sig)) seen.set(sig, { m: m, n: 0 });
    seen.get(sig).n++;
  });
  const top = Array.from(seen.values()).sort((a, b) => b.n - a.n).slice(0, 5);
  wrap.classList.toggle('hide', top.length === 0);
  if (!top.length) return;
  box.innerHTML = '';
  top.forEach(entry => {
    const b = el('button', 'qcard');
    b.appendChild(el('span', 't', entry.n > 1 ? entry.n + '×' : '↺'));
    b.appendChild(el('span', 'l', selSummary(entry.m).join(' · ')));
    b.onclick = () => {
      CATS.forEach(c => { draft.sel[c.key] = (entry.m.sel[c.key] || []).slice(); });
      renderCats($('#cats'), draft.sel, updateSaveBtn);
      updateSaveBtn();
      haptic(12);
    };
    box.appendChild(b);
  });
}

function updateSaveBtn() {
  const n = CATS.reduce((s, c) => s + draft.sel[c.key].length, 0);
  const btn = $('#btn-save');
  btn.disabled = n === 0;
  btn.textContent = n === 0 ? 'Auswählen zum Speichern' : 'Speichern · ' + n + ' Zutat' + (n === 1 ? '' : 'en');
}

function resetDraft() {
  draft.ts = null; draft.type = null; draft.typeManual = false; draft.sel = emptySel(); draft.note = '';
  $('#note').value = '';
  $('#note').classList.add('hide');
  $('#note-toggle').classList.remove('hide');
  $('#time-editor').classList.add('hide');
  renderTime(); renderMealTypes();
  renderCats($('#cats'), draft.sel, updateSaveBtn);
  updateSaveBtn();
}

function saveDraft() {
  if (!draftHasItems()) return;
  const d = draftDate();
  const meal = {
    id: uid(),
    ts: d.toISOString(),
    type: draft.type || guessType(d),
    sel: JSON.parse(JSON.stringify(draft.sel)),
    note: $('#note').value.trim()
  };
  store.meals.push(meal);
  save();
  haptic(18);

  const str = mealString(meal);
  const finish = ok => {
    toast(ok ? 'Gespeichert & kopiert' : 'Gespeichert', str, [
      { label: 'Text kopieren', onClick: () => copy(str).then(o => toast(o ? 'Kopiert' : 'Kopieren nicht möglich', str, [])) },
      { label: 'Rückgängig', primary: false, onClick: () => {
          store.meals = store.meals.filter(m => m.id !== meal.id);
          save(); renderAll();
          toast('Eintrag entfernt', '', []);
        } }
    ]);
  };
  if (store.settings.autoCopy) copy(str).then(finish); else finish(false);

  resetDraft();
  renderQuick();
  renderLog();
  renderStats();
}

/* Ereignisse Erfassen-Screen */
$('#btn-save').onclick = saveDraft;
$('#btn-reset').onclick = () => { resetDraft(); haptic(); };
$('#note').oninput = e => { draft.note = e.target.value; };
$('#note-toggle').onclick = () => {
  $('#note-toggle').classList.add('hide');
  $('#note').classList.remove('hide');
  $('#note').focus();
};

function openTimeEditor() {
  const ed = $('#time-editor');
  const isHidden = ed.classList.contains('hide');
  if (isHidden) { $('#time-input').value = toLocalInput(draftDate()); ed.classList.remove('hide'); }
  else ed.classList.add('hide');
}
$('#btn-time-edit').onclick = openTimeEditor;
$('#time-pill').onclick = openTimeEditor;
$('#time-now').onclick = () => {
  draft.ts = null;
  if (!draft.typeManual) draft.type = null;
  $('#time-editor').classList.add('hide');
  renderTime(); renderMealTypes();
};
$('#time-ok').onclick = () => {
  const v = $('#time-input').value;
  if (v) {
    const d = new Date(v);
    if (!isNaN(d)) { draft.ts = d.toISOString(); if (!draft.typeManual) draft.type = null; }
  }
  $('#time-editor').classList.add('hide');
  renderTime(); renderMealTypes();
};

/* ============================================================
   Screen: Verlauf
   ============================================================ */

function renderLog() {
  const host = $('#log-list');
  host.innerHTML = '';
  const meals = store.meals.slice().sort((a, b) => new Date(b.ts) - new Date(a.ts));
  $('#log-sub').textContent = meals.length
    ? meals.length + ' Mahlzeit' + (meals.length === 1 ? '' : 'en') + ' erfasst'
    : 'Noch nichts erfasst';

  if (!meals.length) {
    const e = el('div', 'empty');
    e.appendChild(el('span', 'big', '🍽️'));
    e.appendChild(el('div', null, 'Noch keine Mahlzeiten.\nLege im Tab „Erfassen“ los.'));
    host.appendChild(e);
    return;
  }

  let lastKey = null;
  meals.forEach(m => {
    const d = new Date(m.ts);
    const k = dateKey(d);
    if (k !== lastKey) { host.appendChild(el('div', 'daylabel', relDay(d))); lastKey = k; }

    const card = el('button', 'meal');
    const h = el('div', 'h');
    h.appendChild(el('span', 'type', m.type));
    h.appendChild(el('span', 'time', timeStr(d) + ' Uhr'));
    card.appendChild(h);

    const tags = el('div', 'tags');
    CATS.forEach(c => (m.sel[c.key] || []).forEach(i => tags.appendChild(el('span', 'tag' + (c.key === 'protein' ? ' p' : ''), i))));
    card.appendChild(tags);
    if (m.note) card.appendChild(el('div', 'note', '„' + m.note + '“'));

    card.onclick = () => openMealSheet(m);
    host.appendChild(card);
  });
}

function openMealSheet(meal) {
  const work = { sel: JSON.parse(JSON.stringify(meal.sel)), ts: meal.ts, type: meal.type, note: meal.note };
  openSheet('Mahlzeit bearbeiten', body => {
    const dt = el('input');
    dt.type = 'datetime-local';
    dt.value = toLocalInput(new Date(work.ts));
    dt.onchange = () => { const d = new Date(dt.value); if (!isNaN(d)) work.ts = d.toISOString(); };
    body.appendChild(dt);

    const seg = el('div', 'seg');
    seg.style.marginTop = '10px';
    const drawSeg = () => {
      seg.innerHTML = '';
      MEAL_TYPES.forEach(t => {
        const b = el('button', t === work.type ? 'on' : '', t);
        b.onclick = () => { work.type = t; drawSeg(); };
        seg.appendChild(b);
      });
    };
    drawSeg();
    body.appendChild(seg);

    const cats = el('div');
    body.appendChild(cats);
    renderCats(cats, work.sel, null);

    const note = el('input', 'notein');
    note.type = 'text'; note.placeholder = 'Notiz (optional)'; note.value = work.note || '';
    note.style.marginTop = '14px';
    note.oninput = () => { work.note = note.value; };
    body.appendChild(note);

    const row1 = el('div', 'btnrow');
    const bCopy = el('button', '', 'Text kopieren');
    bCopy.onclick = () => copy(mealString(meal)).then(ok => toast(ok ? 'Kopiert' : 'Kopieren nicht möglich', mealString(meal), []));
    const bSave = el('button', 'pri', 'Sichern');
    bSave.onclick = () => {
      const has = CATS.some(c => work.sel[c.key].length);
      if (!has) { toast('Mindestens eine Zutat wählen', '', []); return; }
      meal.sel = work.sel; meal.ts = work.ts; meal.type = work.type; meal.note = (work.note || '').trim();
      save(); closeSheet(); renderAll();
      toast('Aktualisiert', '', []);
    };
    row1.appendChild(bCopy); row1.appendChild(bSave);
    body.appendChild(row1);

    const row2 = el('div', 'btnrow');
    const bDel = el('button', 'danger', 'Löschen');
    bDel.onclick = () => {
      const backup = meal;
      store.meals = store.meals.filter(m => m.id !== meal.id);
      save(); closeSheet(); renderAll();
      toast('Gelöscht', '', [{ label: 'Rückgängig', primary: true, onClick: () => { store.meals.push(backup); save(); renderAll(); } }]);
    };
    row2.appendChild(bDel);
    body.appendChild(row2);
  });
}

/* ============================================================
   Screen: Statistik
   ============================================================ */

let statsRange = 'week';

function buckets(range) {
  const now = new Date();
  const out = [];
  if (range === 'year') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ key: d.getFullYear() + '-' + p2(d.getMonth() + 1), label: MON[d.getMonth()], n: 0 });
    }
  } else {
    const days = range === 'week' ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      out.push({ key: dateKey(d), label: range === 'week' ? WD[d.getDay()] : '', n: 0 });
    }
  }
  return out;
}

function renderStats() {
  const host = $('#stats-body');
  host.innerHTML = '';

  const bs = buckets(statsRange);
  const index = new Map(bs.map((b, i) => [b.key, i]));
  const counts = { protein: {}, carbs: {}, veggies: {}, sides: {} };
  let total = 0;

  store.meals.forEach(m => {
    const d = new Date(m.ts);
    const key = statsRange === 'year' ? d.getFullYear() + '-' + p2(d.getMonth() + 1) : dateKey(d);
    if (!index.has(key)) return;
    bs[index.get(key)].n++;
    total++;
    CATS.forEach(c => (m.sel[c.key] || []).forEach(i => { counts[c.key][i] = (counts[c.key][i] || 0) + 1; }));
  });

  const filled = bs.filter(b => b.n > 0).length;
  const pct = Math.round(filled / bs.length * 100);
  const unit = statsRange === 'year' ? 'Monate' : 'Tage';

  $('#stats-sub').textContent = statsRange === 'week' ? 'Letzte 7 Tage'
    : statsRange === 'month' ? 'Letzte 30 Tage' : 'Letzte 12 Monate';

  if (!store.meals.length) {
    const e = el('div', 'empty');
    e.appendChild(el('span', 'big', '📊'));
    e.appendChild(el('div', null, 'Sobald du Mahlzeiten erfasst,\nentsteht hier deine Statistik.'));
    host.appendChild(e);
    return;
  }

  /* Ring */
  const ringCard = el('div', 'card');
  ringCard.style.marginTop = '14px';
  const rw = el('div', 'ringwrap');
  const ring = el('div', 'ring');
  const R = 78, C = 2 * Math.PI * R;
  ring.innerHTML =
    '<svg width="190" height="190" viewBox="0 0 190 190">' +
    '<circle cx="95" cy="95" r="' + R + '" fill="none" stroke="var(--fill)" stroke-width="17"/>' +
    '<circle cx="95" cy="95" r="' + R + '" fill="none" stroke="var(--blue)" stroke-width="17" stroke-linecap="round" ' +
    'stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - pct / 100)) + '"/></svg>' +
    '<div class="mid"><div class="frac">' + filled + '/' + bs.length + ' ' + unit + '</div>' +
    '<div class="pct">' + String(pct).replace('.', ',') + ' %</div>' +
    '<div class="cap">Erfasst</div></div>';
  rw.appendChild(ring);
  ringCard.appendChild(rw);
  host.appendChild(ringCard);

  /* KPIs */
  const kpis = el('div', 'kpis');
  kpis.style.marginTop = '10px';
  const perDay = statsRange === 'year' ? (total / 365) : (total / bs.length);
  const topProt = Object.entries(counts.protein).sort((a, b) => b[1] - a[1])[0];
  [
    [String(total), total === 1 ? 'Mahlzeit' : 'Mahlzeiten'],
    [perDay.toFixed(1).replace('.', ','), 'pro Tag'],
    [topProt ? topProt[0] : '–', 'Top-Protein']
  ].forEach(k => {
    const c = el('div', 'kpi');
    const v = el('div', 'v', k[0]);
    if (k[0].length > 6) v.style.fontSize = '15px';
    c.appendChild(v);
    c.appendChild(el('div', 'l', k[1]));
    kpis.appendChild(c);
  });
  host.appendChild(kpis);

  /* Balken */
  host.appendChild(el('div', 'sectitle', 'Verlauf'));
  const barCard = el('div', 'card');
  const max = Math.max(1, ...bs.map(b => b.n));
  const bars = el('div', 'bars');
  if (bs.length > 12) bars.style.gap = '2px';
  bs.forEach(b => {
    const bar = el('div', 'b' + (b.n === 0 ? ' z' : ''));
    bar.style.height = b.n === 0 ? '3px' : Math.max(6, Math.round(b.n / max * 110)) + 'px';
    bar.title = b.key + ': ' + b.n;
    bars.appendChild(bar);
  });
  barCard.appendChild(bars);
  if (statsRange === 'month') {
    const xr = el('div', 'xrange');
    ['vor 30 Tagen', 'vor 15 Tagen', 'heute'].forEach(t => xr.appendChild(el('span', null, t)));
    barCard.appendChild(xr);
  } else {
    const xl = el('div', 'xlabels');
    bs.forEach(b => xl.appendChild(el('span', null, b.label)));
    barCard.appendChild(xl);
  }
  host.appendChild(barCard);

  /* Ranglisten je Kategorie */
  CATS.forEach(cat => {
    const list = Object.entries(counts[cat.key]).sort((a, b) => b[1] - a[1]);
    if (!list.length) return;
    host.appendChild(el('div', 'sectitle', cat.label));
    const card = el('div', 'card');
    const mx = list[0][1];
    list.slice(0, 8).forEach(([name, n]) => {
      const r = el('div', 'rank');
      r.appendChild(el('div', 'n', name));
      const track = el('div', 'track');
      const fill = el('div', 'fill');
      fill.style.width = Math.max(6, Math.round(n / mx * 100)) + '%';
      track.appendChild(fill);
      r.appendChild(track);
      r.appendChild(el('div', 'c', String(n)));
      card.appendChild(r);
    });
    host.appendChild(card);
  });

  const tail = el('div');
  tail.style.height = '10px';
  host.appendChild(tail);
}

$$('#stats-range button').forEach(b => {
  b.onclick = () => {
    statsRange = b.dataset.r;
    $$('#stats-range button').forEach(x => x.classList.toggle('on', x === b));
    renderStats();
  };
});

/* ============================================================
   Screen: Daten
   ============================================================ */

function exportPayload() {
  return JSON.stringify({
    app: 'mahlzeiten-tracker',
    v: 1,
    exportedAt: new Date().toISOString(),
    settings: store.settings,
    custom: store.custom,
    meals: store.meals.slice().sort((a, b) => new Date(a.ts) - new Date(b.ts))
  }, null, 2);
}

function renderData() {
  const n = store.meals.length;
  $('#data-sub').textContent = n + ' Mahlzeit' + (n === 1 ? '' : 'en') + ' · lokal gespeichert';
  $('#d-clipauto-state').textContent = store.settings.autoCopy ? 'An' : 'Aus';
  const cn = CATS.reduce((s, c) => s + store.custom[c.key].length, 0);
  $('#d-custom-sub').textContent = cn + ' eigene ' + (cn === 1 ? 'Zutat' : 'Zutaten');
  const sample = store.meals.length
    ? mealString(store.meals[store.meals.length - 1])
    : '2026-09-03 18:45 | Abend | Protein: Lachs | KH: Reis | Gemüse: Brokkoli, Zucchini | Beilagen: Salat';
  $('#fmt-sample').textContent = sample;
}

$('#d-export').onclick = () => {
  const data = exportPayload();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mahlzeiten-' + dateKey(new Date()) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Export erstellt', 'mahlzeiten-' + dateKey(new Date()) + '.json', []);
};

$('#d-export-clip').onclick = () => {
  const data = exportPayload();
  copy(data).then(ok => {
    if (ok) { toast('JSON kopiert', store.meals.length + ' Mahlzeit' + (store.meals.length === 1 ? '' : 'en') + ' in der Zwischenablage', []); return; }
    openSheet('JSON exportieren', body => {
      const ta = el('textarea', 'io'); ta.value = data; ta.readOnly = true;
      body.appendChild(ta);
      setTimeout(() => { ta.focus(); ta.select(); }, 250);
    });
  });
};

$('#d-import').onclick = () => {
  openSheet('JSON importieren', body => {
    const info = el('div', 'muted');
    info.style.cssText = 'font-size:13px;line-height:1.4;margin:0 4px 10px';
    info.textContent = 'Datei wählen oder JSON-Text einfügen. „Zusammenführen“ ergänzt fehlende Einträge, „Ersetzen“ überschreibt alle Daten.';
    body.appendChild(info);

    const pick = el('div', 'btnrow');
    const bFile = el('button', '', '📄 Datei wählen');
    bFile.onclick = () => $('#file-input').click();
    pick.appendChild(bFile);
    body.appendChild(pick);

    const ta = el('textarea', 'io');
    ta.placeholder = '{ "meals": [ ... ] }';
    ta.style.marginTop = '10px';
    body.appendChild(ta);

    const row = el('div', 'btnrow');
    const bMerge = el('button', 'pri', 'Zusammenführen');
    const bRepl = el('button', 'danger', 'Ersetzen');
    bMerge.onclick = () => doImport(ta.value, false);
    bRepl.onclick = () => doImport(ta.value, true);
    row.appendChild(bMerge); row.appendChild(bRepl);
    body.appendChild(row);
  });
};

$('#file-input').onchange = e => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const ta = $('#sheet-body textarea');
    if (ta) ta.value = String(r.result);
    else doImport(String(r.result), false);
    toast('Datei geladen', f.name + ' · jetzt Import wählen', []);
  };
  r.readAsText(f);
  e.target.value = '';
};

function doImport(text, replace) {
  let data;
  try { data = JSON.parse(text); }
  catch (err) { toast('Ungültiges JSON', String(err.message || err), []); return; }

  const incoming = Array.isArray(data) ? data : (data && Array.isArray(data.meals) ? data.meals : null);
  if (!incoming) { toast('Keine Mahlzeiten gefunden', 'Erwartet wird ein Objekt mit „meals“.', []); return; }

  const clean = incoming.filter(m => m && m.ts && !isNaN(new Date(m.ts))).map(normalizeMeal);
  const before = store.meals.length;

  if (replace) {
    store.meals = clean;
    if (data.custom) CATS.forEach(c => { if (Array.isArray(data.custom[c.key])) store.custom[c.key] = data.custom[c.key].slice(); });
  } else {
    const known = new Set(store.meals.map(m => m.id));
    const sig = new Set(store.meals.map(m => m.ts + '|' + selSummary(m).join(',')));
    clean.forEach(m => {
      if (known.has(m.id)) return;
      if (sig.has(m.ts + '|' + selSummary(m).join(','))) return;
      store.meals.push(m);
    });
    if (data.custom) CATS.forEach(c => {
      (data.custom[c.key] || []).forEach(n => {
        const dup = store.custom[c.key].some(x => x.toLowerCase() === n.toLowerCase())
          || c.items.some(i => i[0].toLowerCase() === String(n).toLowerCase());
        if (!dup) store.custom[c.key].push(n);
      });
    });
  }

  save(); closeSheet(); renderAll();
  const diff = store.meals.length - before;
  toast('Import abgeschlossen',
    replace ? store.meals.length + ' Mahlzeit' + (store.meals.length === 1 ? '' : 'en') + ' übernommen'
            : (diff > 0 ? diff + (diff === 1 ? ' neue Mahlzeit ergänzt' : ' neue Mahlzeiten ergänzt') : 'Keine neuen Einträge'), []);
}

$('#d-clipauto').onclick = () => {
  store.settings.autoCopy = !store.settings.autoCopy;
  save(); renderData();
  toast(store.settings.autoCopy ? 'Automatisches Kopieren an' : 'Automatisches Kopieren aus', '', []);
};

$('#d-custom').onclick = () => {
  openSheet('Eigene Zutaten', body => {
    let any = false;
    CATS.forEach(cat => {
      const list = store.custom[cat.key];
      if (!list.length) return;
      any = true;
      body.appendChild(el('div', 'sectitle', cat.label));
      const rows = el('div', 'rows');
      list.slice().forEach(name => {
        const r = el('button', 'row');
        r.appendChild(el('span', 'ico', '•'));
        r.appendChild(el('span', null, name));
        const del = el('span', 'chev', 'Löschen');
        del.style.color = 'var(--red)';
        r.appendChild(del);
        r.onclick = () => {
          store.custom[cat.key] = store.custom[cat.key].filter(x => x !== name);
          save(); closeSheet(); renderAll();
          toast('Entfernt', name, []);
        };
        rows.appendChild(r);
      });
      body.appendChild(rows);
    });
    if (!any) {
      const e = el('div', 'empty');
      e.appendChild(el('span', 'big', '🏷️'));
      e.appendChild(el('div', null, 'Noch keine eigenen Zutaten.\nÜber „+“ beim Erfassen anlegen.'));
      body.appendChild(e);
    }
  });
};

$('#d-wipe').onclick = () => {
  openSheet('Alle Daten löschen?', body => {
    const info = el('div', 'muted');
    info.style.cssText = 'font-size:14px;line-height:1.4;margin:0 4px 12px';
    info.textContent = 'Alle ' + store.meals.length + ' Mahlzeiten und eigenen Zutaten werden dauerhaft aus diesem Browser entfernt. Vorher am besten exportieren.';
    body.appendChild(info);
    const row = el('div', 'btnrow');
    const c = el('button', '', 'Abbrechen'); c.onclick = closeSheet;
    const d = el('button', 'danger', 'Endgültig löschen');
    d.onclick = () => {
      store.meals = []; store.custom = { protein: [], carbs: [], veggies: [], sides: [] };
      save(); closeSheet(); renderAll();
      toast('Alle Daten gelöscht', '', []);
    };
    row.appendChild(c); row.appendChild(d);
    body.appendChild(row);
  });
};

/* ============================================================
   Navigation
   ============================================================ */

$$('.tab').forEach(t => {
  t.onclick = () => {
    const s = t.dataset.scr;
    $$('.tab').forEach(x => x.classList.toggle('on', x === t));
    $$('.screen').forEach(x => x.classList.toggle('on', x.id === 'scr-' + s));
    window.scrollTo(0, 0);
    if (s === 'stats') renderStats();
    if (s === 'log') renderLog();
    if (s === 'data') renderData();
    haptic();
  };
});

/* ============================================================
   Start
   ============================================================ */

function renderAll() {
  renderTime(); renderMealTypes(); renderQuick();
  renderCats($('#cats'), draft.sel, updateSaveBtn);
  updateSaveBtn(); renderLog(); renderStats(); renderData();
}

load();
renderAll();

/* Uhrzeit aktuell halten, solange „Jetzt“ aktiv ist */
setInterval(() => { if (!draft.ts) { renderTime(); renderMealTypes(); } }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && !draft.ts) { renderTime(); renderMealTypes(); } });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

})();
