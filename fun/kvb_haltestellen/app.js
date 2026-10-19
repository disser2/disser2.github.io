/* KVB Haltestellen – Sammel-App für die Stadtbahn Köln */
(function () {
  "use strict";

  var STORE_KEY = "kvbHaltestellen.v1";
  var INTRO_KEY = "kvbHaltestellen.introOk";
  var ROLE = { e: "Eingestiegen", a: "Ausgestiegen", u: "Umgestiegen" };
  var ROLE_SHORT = { e: "Ein", a: "Aus", u: "Um" };
  var MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

  // ---------- Netz aufbereiten ----------
  function segKey(a, b) { return a < b ? a + "-" + b : b + "-" + a; }

  var IDX_OF = {};
  STATIONS.forEach(function (s, i) { IDX_OF[s.id] = i; });

  var SEGLEN = {}, TOTAL_M = 0;
  Object.keys(SEGS).forEach(function (k) {
    var f = SEGS[k], L = 0;
    for (var i = 2; i < f.length; i += 2) L += Math.hypot(f[i] - f[i - 2], f[i + 1] - f[i - 1]);
    SEGLEN[k] = L;
    TOTAL_M += L;
  });
  var TOTAL_SEGS = Object.keys(SEGS).length;

  var lineByNr = {}, LINES_AT = STATIONS.map(function () { return []; }), TERM = {};
  var NET = LINES.map(function (l) {
    var stns = {}, segs = {};
    l.v.forEach(function (v) {
      TERM[v[0]] = 1; TERM[v[v.length - 1]] = 1;
      v.forEach(function (i, k) {
        stns[i] = 1;
        if (k) segs[segKey(v[k - 1], i)] = 1;
      });
    });
    var m = 0;
    Object.keys(segs).forEach(function (k) { m += SEGLEN[k] || 0; });
    lineByNr[l.nr] = l;
    var list = Object.keys(stns).map(Number);
    list.forEach(function (i) { LINES_AT[i].push(l.nr); });
    var main = l.v[0];
    return {
      nr: l.nr, line: l, stns: list, segs: Object.keys(segs), m: m,
      label: STATIONS[main[0]].name + " – " + STATIONS[main[main.length - 1]].name
    };
  });
  var netByNr = {};
  NET.forEach(function (n) { netByNr[n.nr] = n; });

  // Kurze Fußwege zwischen benachbarten Haltestellen (z. B. die beiden Deutzer Halte)
  var WALK_AT = STATIONS.map(function () { return []; });
  STATIONS.forEach(function (a, i) {
    STATIONS.forEach(function (b, j) {
      if (i < j && Math.hypot(a.xy[0] - b.xy[0], a.xy[1] - b.xy[1]) < 380) {
        WALK_AT[i].push(j); WALK_AT[j].push(i);
      }
    });
  });

  // Rheinbrücken der Stadtbahn (für die Erfolge)
  var BRIDGES = [
    ["Deutzer Brücke", "Heumarkt", "Deutzer Freiheit"],
    ["Severinsbrücke", "Severinstraße", "Suevenstraße"],
    ["Mülheimer Brücke", "Slabystraße", "Mülheim Wiener Platz"]
  ].map(function (b) {
    var a = STATIONS.findIndex(function (s) { return s.name === b[1]; });
    var c = STATIONS.findIndex(function (s) { return s.name === b[2]; });
    return { name: b[0], key: a >= 0 && c >= 0 ? segKey(a, c) : null };
  }).filter(function (b) { return b.key && SEGS[b.key]; });

  // ---------- Persistenz ----------
  // Intern:      trips: { id, d: "YYYY-MM-DD", s: [Haltestellen-Index, ...], l: ["16", "12"] }
  //                     l[k] = Linie zwischen s[k] und s[k+1]; "F" = Fußweg
  //              marks: { id, d, s: Haltestellen-Index, r: "e"|"a"|"u" }  (ohne Fahrt abgehakt)
  // Gespeichert: Haltestellen als ID ("neumarkt"), damit ein neu erzeugtes data.js
  //              mit anderer Reihenfolge alte Einträge nicht verschiebt.
  function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function tripIn(x) {
    if (!x || !x.d || !x.s || x.s.length < 2) return null;
    var s = x.s.map(function (id) { return IDX_OF[id]; });
    if (s.some(function (i) { return i == null; })) return null;
    var l = s.slice(1).map(function (_, k) {
      var nr = (x.l || [])[k] || "";
      return nr === "F" || lineByNr[nr] ? nr : "";
    });
    return { id: x.id || newId(), d: x.d, s: s, l: l };
  }
  function tripOut(t) {
    return { id: t.id, d: t.d, s: t.s.map(function (i) { return STATIONS[i].id; }), l: t.l };
  }
  function markIn(x) {
    if (!x || IDX_OF[x.s] == null) return null;
    return { id: x.id || newId(), d: x.d || "", s: IDX_OF[x.s], r: ROLE[x.r] ? x.r : "e" };
  }
  function markOut(m) { return { id: m.id, d: m.d, s: STATIONS[m.s].id, r: m.r }; }

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
      return {
        trips: (raw.trips || []).map(tripIn).filter(Boolean),
        marks: (raw.marks || []).map(markIn).filter(Boolean)
      };
    } catch (e) { return { trips: [], marks: [] }; }
  }
  function exportObj() {
    return { v: 1, app: "kvb-haltestellen", trips: trips.map(tripOut), marks: marks.map(markOut) };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(exportObj())); } catch (e) {}
  }
  var stored = load();
  var trips = stored.trips, marks = stored.marks;

  // ---------- Zustand ----------
  var state = {
    view: "halte",      // halte | linien | karte | fahrten
    q: "",
    hf: "alle",         // alle | got | miss
    hk: null,           // hub | tunnel | end
    hl: null,           // Liniennummer
    ho: null,           // koeln | umland
    sort: "az",         // az | route | last | count
    lf: "alle",         // alle | used | open | full
    tf: "alle",         // alle | um | Jahr
    mapSel: null,       // { st: i } | { line: nr }
    colored: false
  };

  // ---------- Helpers ----------
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function fmtDate(iso) {
    if (!iso) return "ohne Datum";
    var p = iso.split("-");
    return p[2] + "." + p[1] + "." + p[0];
  }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
      "-" + String(d.getDate()).padStart(2, "0");
  }
  function pct(n, total) { return total ? n / total * 100 : 0; }
  function fmtPct(p) { return (p > 0 && p < 10 ? p.toFixed(1) : Math.round(p)).toString().replace(".", ",") + " %"; }
  function fmtKm(m) { return (m / 1000).toFixed(m < 100000 ? 1 : 0).replace(".", ",") + " km"; }
  function stName(i) { return STATIONS[i] ? STATIONS[i].name : "?"; }
  function norm(s) {
    return String(s || "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe")
      .replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/str\./g, "strasse");
  }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function place(s) {
    if (!s.teil) return s.ort;
    return s.ort === "Köln" ? s.teil : s.teil + " (" + s.ort + ")";
  }

  // Linienfarben: Zahl schwarz auf hellen Farben (3, 17), sonst weiß
  function lineFg(col) {
    var h = col.replace("#", "");
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.68 ? "#111" : "#fff";
  }
  function lineStyle(nr) {
    var l = lineByNr[nr];
    return l ? "background:" + l.col + ";color:" + lineFg(l.col) : "";
  }
  function lineBadge(nr, cls) {
    if (nr === "F") return '<div class="linebadge walk ' + (cls || "") + '" title="Fußweg">🚶</div>';
    return '<div class="linebadge ' + (cls || "") + '" style="' + lineStyle(nr) + '">' + esc(nr || "?") + '</div>';
  }
  function miniBadges(list) {
    return '<span class="lbs">' + list.map(function (nr) {
      return '<i class="lb" style="' + lineStyle(nr) + '">' + esc(nr) + '</i>';
    }).join("") + '</span>';
  }
  function hsign(got) {
    return '<div class="hsign' + (got ? " got" : "") + '"><svg viewBox="0 0 40 40" aria-hidden="true">' +
      '<circle class="hs-c" cx="20" cy="20" r="17.5" stroke-width="3"/>' +
      '<path class="hs-h" d="M12.5 10.5h4.6v7.2h5.8v-7.2h4.6v19h-4.6v-7.6h-5.8v7.6h-4.6z"/></svg></div>';
  }

  // ---------- Fahrten auswerten ----------
  // Weg einer Teilstrecke auf der Linie (kürzeste passende Laufwegvariante)
  function legPath(nr, a, b) {
    var l = lineByNr[nr];
    if (!l || a == null || b == null || a === b) return null;
    var best = null;
    l.v.forEach(function (v) {
      var i = v.indexOf(a), j = v.indexOf(b);
      if (i < 0 || j < 0) return;
      if (!best || Math.abs(j - i) < best.span) best = { v: v, i: i, j: j, span: Math.abs(j - i) };
    });
    if (!best) return null;
    var out = [], step = best.j > best.i ? 1 : -1;
    for (var k = best.i; k !== best.j + step; k += step) out.push(best.v[k]);
    return out;
  }
  function directLines(a, b) {
    var out = [];
    LINES.forEach(function (l) {
      var p = legPath(l.nr, a, b);
      if (p) out.push({ nr: l.nr, n: p.length });
    });
    out.sort(function (x, y) { return x.n - y.n; });
    return out.map(function (x) { return x.nr; });
  }
  function pathLen(p) {
    var m = 0;
    for (var k = 1; k < p.length; k++) m += SEGLEN[segKey(p[k - 1], p[k])] || 0;
    return m;
  }
  function tripLen(t) {
    var m = 0;
    t.l.forEach(function (nr, k) {
      var p = nr !== "F" && legPath(nr, t.s[k], t.s[k + 1]);
      if (p) m += pathLen(p);
    });
    return m;
  }

  // Rolle je Halt einer Fahrt: zählt nur, wer dort in eine Bahn ein- oder aus ihr aussteigt.
  // Ein Halt, an dem nur ein Fußweg beginnt oder endet (Fahrt startet zu Fuß), zählt nicht.
  function tripRoles(t) {
    var rides = [];
    t.l.forEach(function (nr, k) { if (nr !== "F") rides.push(k); });
    return t.s.map(function (_, j) {
      var start = rides.indexOf(j) >= 0, end = rides.indexOf(j - 1) >= 0;
      if (!start && !end) return null;
      if (start && !end && j === rides[0]) return "e";
      if (end && !start && j === rides[rides.length - 1] + 1) return "a";
      return "u";
    });
  }
  function tripRides(t) { return t.l.filter(function (nr) { return nr !== "F"; }).length; }

  // Verbindung mit möglichst wenigen Umstiegen (Dijkstra; Kosten je Teilstrecke >> je Halt)
  function suggest(a, b) {
    var N = STATIONS.length, dist = [], prev = [], done = [];
    for (var i = 0; i < N; i++) { dist.push(Infinity); prev.push(null); done.push(false); }
    dist[a] = 0;
    for (;;) {
      var u = -1, best = Infinity;
      for (i = 0; i < N; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
      if (u < 0 || u === b) break;
      done[u] = true;
      LINES_AT[u].forEach(function (nr) {
        lineByNr[nr].v.forEach(function (v) {
          var p = v.indexOf(u);
          if (p < 0) return;
          v.forEach(function (w, q) {
            var c = best + 1000 + Math.abs(q - p);
            if (c < dist[w]) { dist[w] = c; prev[w] = { from: u, l: nr }; }
          });
        });
      });
      WALK_AT[u].forEach(function (w) {
        var c = best + 1500;
        if (c < dist[w]) { dist[w] = c; prev[w] = { from: u, l: "F" }; }
      });
    }
    if (!isFinite(dist[b])) return null;
    var s = [b], l = [];
    for (var x = b; x !== a; x = prev[x].from) { l.unshift(prev[x].l); s.unshift(prev[x].from); }
    return { s: s, l: l };
  }

  var DB = null;
  function invalidate() { DB = null; }
  function db() {
    if (DB) return DB;
    var st = [];
    function rec(i) {
      return st[i] || (st[i] = { e: 0, a: 0, u: 0, n: 0, pass: 0, first: null, last: null, trips: [], marks: [] });
    }
    function hit(i, r, d) {
      var v = rec(i);
      v[r]++; v.n++;
      if (d) {
        if (!v.first || d < v.first) v.first = d;
        if (!v.last || d > v.last) v.last = d;
      }
    }
    var cov = {}, segs = {}, lineLegs = {}, lineKm = {}, m = 0, legs = 0, um = 0;
    trips.forEach(function (t) {
      var roles = tripRoles(t);
      t.s.forEach(function (i, k) {
        if (!roles[k]) return;
        hit(i, roles[k], t.d);
        if (rec(i).trips.indexOf(t) < 0) rec(i).trips.push(t);
      });
      um += Math.max(tripRides(t) - 1, 0);
      t.l.forEach(function (nr, k) {
        if (!lineByNr[nr]) return;
        lineLegs[nr] = (lineLegs[nr] || 0) + 1;
        legs++;
        var p = legPath(nr, t.s[k], t.s[k + 1]);
        if (!p) return;
        var c = cov[nr] || (cov[nr] = {});
        for (var j = 1; j < p.length; j++) {
          var key = segKey(p[j - 1], p[j]);
          c[key] = 1; segs[key] = 1;
          lineKm[nr] = (lineKm[nr] || 0) + (SEGLEN[key] || 0);
          m += SEGLEN[key] || 0;
          if (j < p.length - 1) rec(p[j]).pass++;
        }
      });
    });
    marks.forEach(function (mk) { hit(mk.s, mk.r, mk.d); rec(mk.s).marks.push(mk); });
    var got = {}, nGot = 0;
    st.forEach(function (v, i) { if (v && v.n) { got[i] = 1; nGot++; } });
    var nSegsM = 0;
    Object.keys(segs).forEach(function (k) { nSegsM += SEGLEN[k] || 0; });
    DB = { st: st, got: got, nGot: nGot, cov: cov, segs: segs, nSegs: Object.keys(segs).length,
           segsM: nSegsM, lineLegs: lineLegs, lineKm: lineKm, m: m, legs: legs, um: um };
    return DB;
  }
  function lineStat(nr) {
    var D = db(), n = netByNr[nr], got = 0;
    n.stns.forEach(function (i) { if (D.got[i]) got++; });
    var c = D.cov[nr] ? Object.keys(D.cov[nr]).length : 0;
    return { got: got, total: n.stns.length, pct: pct(got, n.stns.length),
             segs: c, segsTotal: n.segs.length, legs: D.lineLegs[nr] || 0, m: D.lineKm[nr] || 0 };
  }

  // ---------- Liste: Haltestellen ----------
  function filteredStations() {
    var D = db(), q = norm(state.q).trim();
    var lineQ = q.match(/^(?:linie\s*)?(\d{1,2})$/);
    var arr = [];
    STATIONS.forEach(function (s, i) {
      var got = !!D.got[i];
      if (state.hf === "got" && !got) return;
      if (state.hf === "miss" && got) return;
      if (state.hl && LINES_AT[i].indexOf(state.hl) < 0) return;
      if (state.hk === "hub" && LINES_AT[i].length < 2) return;
      if (state.hk === "tunnel" && !s.u) return;
      if (state.hk === "end" && !TERM[i]) return;
      if (state.ho === "koeln" && s.ort !== "Köln") return;
      if (state.ho === "umland" && s.ort === "Köln") return;
      if (q) {
        if (lineQ) {
          if (LINES_AT[i].indexOf(lineQ[1]) < 0) return;
        } else if (norm(s.name + " " + (s.teil || "") + " " + (s.bez || "") + " " + s.ort).indexOf(q) < 0) {
          return;
        }
      }
      arr.push(i);
    });
    var sort = state.sort === "route" && !state.hl ? "az" : state.sort;
    if (sort === "route") {
      var pos = {};
      lineByNr[state.hl].v.forEach(function (v, vi) {
        v.forEach(function (i, k) { if (pos[i] == null) pos[i] = vi * 1000 + k; });
      });
      arr.sort(function (a, b) { return pos[a] - pos[b]; });
    } else if (sort === "last") {
      arr.sort(function (a, b) {
        var la = D.st[a] && D.st[a].n ? D.st[a].last || "0" : "";
        var lb = D.st[b] && D.st[b].n ? D.st[b].last || "0" : "";
        if (la !== lb) return la > lb ? -1 : 1;
        return stName(a).localeCompare(stName(b), "de");
      });
    } else if (sort === "count") {
      arr.sort(function (a, b) {
        var na = D.st[a] ? D.st[a].n : 0, nb = D.st[b] ? D.st[b].n : 0;
        return nb - na || stName(a).localeCompare(stName(b), "de");
      });
    } else {
      arr.sort(function (a, b) { return stName(a).localeCompare(stName(b), "de"); });
    }
    return arr;
  }

  function stationCard(i) {
    var D = db(), s = STATIONS[i], v = D.st[i], got = !!D.got[i];
    return '<div class="card' + (got ? " seen" : "") + '" data-st="' + i + '">' +
      '<button class="seen-toggle" data-toggle="' + i + '" aria-label="' +
        (got ? "Details" : "Abhaken") + '">✓</button>' +
      '<div class="card-body">' +
        '<div class="card-name">' + esc(s.name) + '</div>' +
        '<div class="card-sub">' + miniBadges(LINES_AT[i]) +
          (s.u ? '<span class="badge ubadge" title="Tunnelhaltestelle">U</span>' : "") +
          '<span>' + esc(place(s)) + '</span>' +
          (got ? '<span class="seen-date">✓ ' + (v.n > 1 ? v.n + "× · " : "") +
            (v.last ? fmtDate(v.last) : "") + '</span>' : "") +
        '</div>' +
      '</div>' + hsign(got) +
    '</div>';
  }

  var SORTS = { az: "A–Z", route: "Linienverlauf", last: "Zuletzt", count: "Häufigkeit" };
  function chip(key, val, label, extra) {
    return '<button class="chip' + (extra || "") + (state[key] === val ? " active" : "") +
      '" data-k="' + key + '" data-v="' + esc(val) + '">' + label + '</button>';
  }
  var SEP = '<span class="chip-sep"></span>';

  function renderChips() {
    var html = "";
    if (state.view === "halte") {
      html += chip("hf", "alle", "Alle") + chip("hf", "got", "Gesammelt") + chip("hf", "miss", "Fehlt") + SEP;
      LINES.forEach(function (l) {
        html += '<button class="chip lchip' + (state.hl === l.nr ? " active" : "") + '" data-k="hl" data-v="' +
          l.nr + '" style="--lc:' + l.col + ';--lt:' + lineFg(l.col) + '">' + l.nr + '</button>';
      });
      html += SEP + chip("hk", "hub", "Umsteigehalte") + chip("hk", "tunnel", "Tunnel") +
        chip("hk", "end", "Endhalte") + SEP + chip("ho", "koeln", "Köln") + chip("ho", "umland", "Umland");
    } else if (state.view === "linien") {
      html += chip("lf", "alle", "Alle") + chip("lf", "used", "Genutzt") + chip("lf", "open", "Offen") +
        chip("lf", "full", "Komplett");
    } else if (state.view === "fahrten") {
      html += chip("tf", "alle", "Alle") + chip("tf", "um", "Mit&nbsp;Umstieg");
      var years = tripYears();
      if (years.length > 1) {
        html += SEP;
        years.forEach(function (y) { html += chip("tf", y, y); });
      }
    }
    var box = $("chips"), x = box.dataset.view === state.view ? box.scrollLeft : 0;
    box.innerHTML = html;
    box.dataset.view = state.view;
    box.scrollLeft = x;                 // Neuaufbau soll die Leiste nicht zurückspringen lassen
  }

  // ---------- Liste: Linien ----------
  function filteredLines() {
    var q = norm(state.q).trim();
    return NET.filter(function (n) {
      var ls = lineStat(n.nr);
      if (state.lf === "used" && !ls.legs) return false;
      if (state.lf === "open" && ls.got === ls.total) return false;
      if (state.lf === "full" && ls.got < ls.total) return false;
      if (q) {
        if (q === n.nr || norm("linie " + n.nr) === q) return true;
        var hay = norm(n.label + " " + n.stns.map(stName).join(" "));
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }
  function lineCard(n) {
    var ls = lineStat(n.nr);
    return '<div class="card' + (ls.got === ls.total ? " seen" : "") + '" data-line="' + n.nr + '">' +
      lineBadge(n.nr) +
      '<div class="card-body">' +
        '<div class="card-name">' + esc(n.label) + '</div>' +
        '<div class="card-sub"><span>' + n.stns.length + ' Halte · ' + fmtKm(n.m) + '</span>' +
          (ls.legs ? '<span>· ' + plural(ls.legs, "Fahrt", "Fahrten") + '</span>' : "") +
          (n.line.v.length > 1 ? '<span class="badge">' + n.line.v.length + ' Laufwege</span>' : "") +
        '</div>' +
        '<div class="minibar"><div style="width:' + ls.pct.toFixed(1) + '%;background:' + n.line.col + '"></div></div>' +
      '</div>' +
      '<div class="card-right"><b>' + Math.round(ls.pct) + '%</b>' + ls.got + '/' + ls.total + '</div>' +
    '</div>';
  }

  // ---------- Liste: Fahrten ----------
  function tripYears() {
    var y = {};
    trips.forEach(function (t) { if (t.d) y[t.d.slice(0, 4)] = 1; });
    return Object.keys(y).sort().reverse();
  }
  function filteredTrips() {
    var q = norm(state.q).trim();
    return trips.filter(function (t) {
      if (state.tf === "um" && t.s.length < 3) return false;
      if (/^\d{4}$/.test(state.tf) && t.d.slice(0, 4) !== state.tf) return false;
      if (q) {
        var hay = norm(t.s.map(stName).join(" ") + " " + t.l.map(function (l) { return "linie " + l; }).join(" ") +
          " " + fmtDate(t.d));
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    }).sort(function (a, b) {
      return a.d === b.d ? (a.id < b.id ? 1 : -1) : (a.d < b.d ? 1 : -1);
    });
  }
  function tripSummary(t) {
    var roles = tripRoles(t), n = Math.max(tripRides(t) - 1, 0);
    var mid = t.s.filter(function (i, k) { return roles[k] === "u"; }).map(stName);
    return (n ? plural(n, "Umstieg", "Umstiege") + " (" + mid.join(", ") + ")" : "direkt") +
      (t.l.indexOf("F") >= 0 ? " · mit Fußweg" : "");
  }
  function tripCard(t) {
    return '<div class="card" data-trip="' + esc(t.id) + '">' +
      '<div class="tlines">' + t.l.map(function (nr) { return lineBadge(nr, "sm"); }).join("") + '</div>' +
      '<div class="card-body">' +
        '<div class="card-name">' + esc(stName(t.s[0])) + ' → ' + esc(stName(t.s[t.s.length - 1])) + '</div>' +
        '<div class="card-sub"><span>' + fmtDate(t.d) + ' · ' + esc(tripSummary(t)) + ' · ' +
          fmtKm(tripLen(t)) + '</span></div>' +
      '</div>' +
    '</div>';
  }

  // ---------- Rendern ----------
  var TITLES = { halte: "KVB&nbsp;Haltestellen", linien: "Linien", karte: "Netzkarte", fahrten: "Meine&nbsp;Fahrten" };
  var PLACEHOLDER = { halte: "Haltestelle, Stadtteil oder Linie", linien: "Linie oder Haltestelle",
                      fahrten: "Haltestelle, Linie oder Datum" };

  function render() {
    var D = db(), isMap = state.view === "karte";
    $("headerCount").textContent = D.nGot + "/" + STATIONS.length;
    $("title").innerHTML = TITLES[state.view];
    $("search").placeholder = PLACEHOLDER[state.view] || "";
    document.querySelector(".searchwrap").hidden = isMap;
    $("chips").hidden = isMap;
    $("mapView").hidden = !isMap;
    $("listMeta").hidden = isMap;
    $("list").hidden = isMap;
    $("credits").hidden = isMap;
    $("intro").hidden = isMap || state.view !== "halte" || introDone();
    if (isMap) {
      $("empty").hidden = true;
      renderMap();
      return;
    }
    if (state.view === "fahrten" && /^\d{4}$/.test(state.tf) && tripYears().indexOf(state.tf) < 0) state.tf = "alle";
    renderChips();

    var html = "", n = 0, empty = "Nichts gefunden";
    $("sortBtn").hidden = state.view !== "halte";
    if (state.view === "halte") {
      var arr = filteredStations();
      n = arr.length;
      html = arr.map(stationCard).join("");
      var s = state.sort === "route" && !state.hl ? "az" : state.sort;
      $("sortBtn").innerHTML = "Sortierung: " + SORTS[s] + " ⇅";
      $("listCount").textContent = n + " von " + STATIONS.length + " Haltestellen";
      empty = "Keine Haltestelle gefunden";
    } else if (state.view === "linien") {
      var ls = filteredLines();
      n = ls.length;
      html = ls.map(lineCard).join("");
      $("listCount").textContent = n + " von " + NET.length + " Linien";
      empty = "Keine Linie gefunden";
    } else {
      var tr = filteredTrips();
      n = tr.length;
      html = tr.map(tripCard).join("");
      $("listCount").textContent = plural(n, "Fahrt", "Fahrten") +
        (trips.length !== n ? " von " + trips.length : "");
      empty = trips.length ? "Keine Fahrt gefunden" : "Noch keine Fahrt eingetragen – tippe auf ＋ Fahrt";
    }
    $("list").innerHTML = html;
    $("emptyText").textContent = empty;
    $("empty").hidden = n > 0;
  }

  function introDone() {
    try { return !!localStorage.getItem(INTRO_KEY) || trips.length > 0 || marks.length > 0; }
    catch (e) { return true; }
  }

  // ---------- Karte ----------
  var bigMap = null;
  function renderMap() {
    var D = db();
    if (!bigMap) {
      bigMap = KVBMap.create($("mapWrap"), {
        interactive: true,
        onSelect: function (sel) {
          var cur = state.mapSel;
          if (sel && cur && ((sel.st != null && sel.st === cur.st) || (sel.line && sel.line === cur.line))) sel = null;
          state.mapSel = sel;
          bigMap.select(sel);
          renderMapInfo();
        }
      });
    }
    bigMap.update({ cov: D.cov, got: D.got, sel: state.mapSel, colored: state.colored });
    bigMap.resize();
    renderMapInfo();
  }
  function renderMapInfo() {
    var box = $("mapInfo"), sel = state.mapSel, D = db();
    if (!sel) { box.hidden = true; return; }
    if (sel.st != null) {
      var v = D.st[sel.st], got = !!D.got[sel.st];
      $("mapInfoBadge").innerHTML = hsign(got);
      $("mapInfoName").textContent = stName(sel.st);
      $("mapInfoSub").innerHTML = miniBadges(LINES_AT[sel.st]) + " " + (got
        ? "gesammelt · " + v.n + "× · zuletzt " + (v.last ? fmtDate(v.last) : "–")
        : "noch nicht gesammelt" + (v && v.pass ? " · " + v.pass + "× durchfahren" : ""));
    } else {
      var n = netByNr[sel.line], ls = lineStat(sel.line);
      $("mapInfoBadge").innerHTML = lineBadge(sel.line, "sm");
      $("mapInfoName").textContent = "Linie " + n.nr + " · " + n.label;
      $("mapInfoSub").textContent = ls.got + " von " + ls.total + " Halten gesammelt · " +
        ls.segs + "/" + ls.segsTotal + " Abschnitte befahren";
    }
    box.hidden = false;
  }

  // ---------- Haltestellen-Detail ----------
  var currentSt = null;
  function openStation(i, refresh) {
    var s = STATIONS[i];
    if (!s) return;
    currentSt = i;            // liegt über dem Linien-Detail – Schließen führt dorthin zurück
    var D = db(), v = D.st[i], got = !!D.got[i];
    var lage = s.u === 2 ? "Tunnelhaltestelle" : s.u === 1 ? "teils unterirdisch" : "oberirdisch";
    var endOf = LINES.filter(function (l) {
      return l.v.some(function (vv) { return vv[0] === i || vv[vv.length - 1] === i; });
    }).map(function (l) { return l.nr; });
    var where = [s.teil, s.bez && s.bez !== s.teil ? "Bezirk " + s.bez : null, s.ort].filter(Boolean).join(" · ");

    var html =
      '<div class="detail-top">' + hsign(got) +
        '<div><div class="detail-name">' + esc(s.name) + '</div>' +
        '<div class="detail-sub">' + esc(where) + '</div></div>' +
      '</div>' +
      '<div class="detail-lines">' + LINES_AT[i].map(function (nr) {
        return '<span data-open-line="' + nr + '">' + lineBadge(nr, "sm") + '</span>';
      }).join("") + '</div>' +
      '<div class="status-pill' + (got ? " got" : "") + '">' +
        (got ? "✓ Gesammelt" + (v.first ? " · seit " + fmtDate(v.first) : "")
             : "Noch nicht gesammelt") + '</div>';

    if (v) {
      html += '<div class="kv-table">' +
        (v.e ? kv("Eingestiegen", v.e + "×") : "") +
        (v.a ? kv("Ausgestiegen", v.a + "×") : "") +
        (v.u ? kv("Umgestiegen", v.u + "×") : "") +
        (v.pass ? kv("Durchfahren (zählt nicht)", v.pass + "×") : "") +
        (v.last ? kv("Zuletzt", fmtDate(v.last)) : "") +
      '</div>';
    }
    html += '<div class="kv-table">' + kv("Lage", lage) +
      kv("Linien", LINES_AT[i].join(", ")) +
      (endOf.length ? kv("Endhaltestelle", "Linie " + endOf.join(", ")) : "") + '</div>';

    html += '<div class="btn-row">' +
      '<button class="big-btn" id="stTrip">Fahrt ab hier</button>' +
      '<button class="big-btn secondary" id="stMark">' + (got ? "Nochmal abhaken" : "Abhaken") + '</button>' +
    '</div>' +
    '<div class="mapwrap map-mini" id="stMap"></div>';

    if (v && (v.trips.length || v.marks.length)) {
      var rows = [];
      v.trips.forEach(function (t) {
        var r = tripRoles(t)[t.s.indexOf(i)] || "u";
        rows.push({ d: t.d, html:
          '<div class="trip-row" data-trip="' + esc(t.id) + '"><span class="role ' + r + '">' + ROLE_SHORT[r] + '</span>' +
          '<div class="tr-main"><div>' + esc(stName(t.s[0])) + ' → ' + esc(stName(t.s[t.s.length - 1])) + '</div>' +
          '<div class="tr-sub">' + fmtDate(t.d) + ' · Linie ' + t.l.filter(function (x) { return x !== "F"; }).join(", ") +
          '</div></div>' + '<div class="tlines">' + t.l.map(function (nr) { return lineBadge(nr, "sm"); }).join("") + '</div></div>' });
      });
      v.marks.forEach(function (m) {
        rows.push({ d: m.d, html:
          '<div class="trip-row"><span class="role ' + m.r + '">' + ROLE_SHORT[m.r] + '</span>' +
          '<div class="tr-main"><div>Ohne Fahrt abgehakt</div><div class="tr-sub">' + ROLE[m.r] + '</div></div>' +
          '<input type="date" value="' + esc(m.d) + '" max="' + todayISO() + '" data-mark-date="' + esc(m.id) + '">' +
          '<button class="del-x" data-mark-del="' + esc(m.id) + '" aria-label="Entfernen">×</button></div>' });
      });
      rows.sort(function (a, b) { return (a.d || "") < (b.d || "") ? 1 : -1; });
      html += '<div class="hist-title">Besuche</div><div class="hist">' +
        rows.map(function (r) { return r.html; }).join("") + '</div>';
    }

    $("stTitle").textContent = "Haltestelle";
    $("stContent").innerHTML = html;
    if (!refresh) $("stContent").scrollTop = 0;
    $("stTrip").addEventListener("click", function () { openEdit(null, { st: i }); });
    $("stMark").addEventListener("click", function () { openMark(i); });
    if (!refresh) showSheet("st");
    var mm = KVBMap.create($("stMap"), { interactive: false });
    mm.update({ cov: D.cov, got: D.got, sel: { st: i }, colored: true });
    mm.fitStation(i, 1100);
  }
  function kv(k, v) {
    return '<div class="kv"><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + '</span></div>';
  }

  // ---------- Linien-Detail ----------
  var currentLine = null;
  function openLine(nr, refresh) {
    var n = netByNr[nr];
    if (!n) return;
    if (!refresh && !$("stSheet").hidden) hideSheet("st");
    currentLine = nr;
    var D = db(), ls = lineStat(nr), cov = D.cov[nr] || {};
    var html =
      '<div class="detail-top">' + lineBadge(nr) +
        '<div><div class="detail-name">' + esc(n.label) + '</div>' +
        '<div class="detail-sub">' + n.stns.length + ' Haltestellen · ' + fmtKm(n.m) + ' Linienlänge</div></div>' +
      '</div>' +
      '<div class="kv-table">' +
        kv("Haltestellen gesammelt", ls.got + " von " + ls.total + " (" + fmtPct(ls.pct) + ")") +
        kv("Abschnitte befahren", ls.segs + " von " + ls.segsTotal) +
        kv("Fahrten auf der Linie", String(ls.legs)) +
        (ls.m ? kv("Gefahren", fmtKm(ls.m)) : "") +
      '</div>' +
      '<div class="mapwrap map-mini" id="lineMap"></div>' +
      '<button class="big-btn" id="lineTrip">Fahrt mit Linie ' + esc(nr) + ' eintragen</button>' +
      '<div class="route-legend"><span><i class="got"></i>gesammelt</span>' +
        '<span><i class="pass"></i>nur durchfahren</span><span><i></i>offen</span></div>';

    n.line.v.forEach(function (v, vi) {
      html += '<div class="route-var">' + (n.line.v.length > 1 ? "Laufweg " + (vi + 1) + ": " : "Laufweg: ") +
        esc(stName(v[0])) + " – " + esc(stName(v[v.length - 1])) + '</div>';
      html += '<div class="route" style="--lc:' + n.line.col + '">';
      v.forEach(function (i, k) {
        var got = !!D.got[i], rec = D.st[i];
        var inSeg = k > 0 && cov[segKey(v[k - 1], i)];
        var outSeg = k < v.length - 1 && cov[segKey(i, v[k + 1])];
        var other = LINES_AT[i].filter(function (x) { return x !== nr; });
        html += '<div class="stop' + (got ? " got" : (rec && rec.pass ? " pass" : "")) +
          (inSeg ? " rail-in" : "") + (outSeg ? " rail-out" : "") + '" data-st="' + i + '">' +
          '<div class="stop-rail"><span class="stop-dot"></span></div>' +
          '<div class="stop-name"><span>' + esc(stName(i)) + '</span>' +
            (other.length ? miniBadges(other) : "") +
            (STATIONS[i].u === 2 ? '<span class="badge ubadge">U</span>' : "") + '</div>' +
        '</div>';
      });
      html += '</div>';
    });

    $("lineTitle").textContent = "Linie " + nr;
    $("lineContent").innerHTML = html;
    if (!refresh) $("lineContent").scrollTop = 0;
    $("lineTrip").addEventListener("click", function () { openEdit(null, { line: nr }); });
    if (!refresh) showSheet("line");
    var mm = KVBMap.create($("lineMap"), { interactive: false });
    mm.update({ cov: D.cov, got: D.got, sel: { line: nr } });
    mm.fitLine(nr);
  }

  // ---------- Abhaken ohne Fahrt (Aktionsblatt) ----------
  var openAS = null;
  function openMark(i) {
    if (openAS) openAS();
    var wrap = document.createElement("div");
    wrap.className = "as-backdrop";
    wrap.innerHTML = '<div class="as-wrap"><div class="as-box">' +
      '<div class="as-head"><div class="as-title">' + esc(stName(i)) + ' abhaken</div>' +
      '<div class="as-text">Zählt nur, wenn du hier wirklich ein-, aus- oder umgestiegen bist.</div></div>' +
      '<div class="as-date"><span>Datum</span><input type="date" id="asDate" value="' + todayISO() +
        '" max="' + todayISO() + '"></div>' +
      '<button class="as-btn" data-r="e">Eingestiegen</button>' +
      '<button class="as-btn" data-r="a">Ausgestiegen</button>' +
      '<button class="as-btn" data-r="u">Umgestiegen</button>' +
      '</div><button class="as-btn as-cancel" data-r="">Abbrechen</button></div>';
    document.body.appendChild(wrap);
    requestAnimationFrame(function () { requestAnimationFrame(function () { wrap.classList.add("show"); }); });
    function close() {
      wrap.classList.remove("show");
      setTimeout(function () { if (wrap.parentNode) wrap.remove(); }, 220);
      openAS = null;
    }
    wrap.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-r]");
      if (!b && ev.target !== wrap) return;
      var r = b ? b.dataset.r : "";
      var d = wrap.querySelector("#asDate").value || "";
      close();
      if (!r) return;
      var wasGot = !!db().got[i];
      marks.push({ id: newId(), d: d, s: i, r: r });
      save(); invalidate(); render(); refreshOpen();
      toast(wasGot ? stName(i) + ": weiterer Besuch notiert" : stName(i) + " gesammelt 🎉");
    });
    openAS = close;
  }

  // ---------- Fahrt eintragen / bearbeiten ----------
  var form = null;
  function openEdit(tripId, preset) {
    var t = tripId ? trips.filter(function (x) { return x.id === tripId; })[0] : null;
    preset = preset || {};
    form = t ? { id: t.id, d: t.d, s: t.s.slice(), l: t.l.slice() }
             : { id: null, d: todayISO(), s: [preset.st != null ? preset.st : null, null], l: [preset.line || ""] };
    $("editTitle").textContent = t ? "Fahrt bearbeiten" : "Fahrt eintragen";
    renderEdit();
    $("editContent").scrollTop = 0;
    showSheet("edit");
  }

  function fixLegs() {
    for (var k = 0; k < form.l.length; k++) {
      var a = form.s[k], b = form.s[k + 1];
      if (a == null || b == null || form.l[k] === "F") continue;
      var c = directLines(a, b);
      if (c.indexOf(form.l[k]) < 0) form.l[k] = c.length ? c[0] : "";
    }
  }
  function formCheck() {
    if (form.s.some(function (s) { return s == null; })) return "Wähle alle Haltestellen aus.";
    for (var k = 1; k < form.s.length; k++) {
      if (form.s[k] === form.s[k - 1]) return "Zwei aufeinanderfolgende Halte sind gleich.";
    }
    if (form.l.some(function (l) { return !l; })) return "Für jede Teilstrecke braucht es eine Linie (oder einen Fußweg).";
    if (!tripRides(form)) return "Mindestens eine Teilstrecke muss mit einer Linie gefahren sein.";
    return "";
  }

  function legHTML(k) {
    var a = form.s[k], b = form.s[k + 1], cur = form.l[k];
    var col = lineByNr[cur] ? lineByNr[cur].col : null;
    function lp(nr) {
      return '<button class="lp' + (cur === nr ? " active" : "") + '" data-leg="' + k + '" data-line="' + nr + '">' +
        lineBadge(nr, "sm") + '</button>';
    }
    var h = '<div class="re-leg"><div class="re-rail"><span' + (cur === "F" ? ' class="walk"' : "") +
      (col ? ' style="background:' + col + '"' : "") + '></span></div><div class="re-lines">';
    if (a != null && b != null) {
      var c = directLines(a, b);
      h += '<div class="linepick">' + c.map(lp).join("") +
        '<button class="lp txt' + (cur === "F" ? " active" : "") + '" data-leg="' + k + '" data-line="F">🚶 Fußweg</button></div>';
      if (!c.length && cur !== "F") {
        h += '<div class="hint warn">Keine Linie fährt direkt von ' + esc(stName(a)) + ' nach ' + esc(stName(b)) +
          '.<br><button class="inline-btn" data-suggest="' + k + '">Umstieg vorschlagen</button></div>';
      } else if (c.length > 1 && cur !== "F") {
        h += '<div class="hint">Mehrere Linien fahren hier – wähle die, mit der du gefahren bist.</div>';
      } else if (cur === "F") {
        h += '<div class="hint">Fußweg – ein Halt zählt nur, wenn du dort in eine Bahn ein- oder aus ihr aussteigst.</div>';
      }
    } else if (a != null) {
      h += '<div class="linepick' + (cur ? " dim" : "") + '">' + LINES_AT[a].map(lp).join("") + '</div>' +
        '<div class="hint">Optional: Linie wählen – dann stehen ihre Halte in der Auswahl oben.</div>';
    } else if (cur && lineByNr[cur]) {
      h += '<div class="linepick">' + lp(cur) + '</div>';
    } else {
      h += '<div class="hint">Zuerst den Einstieg wählen.</div>';
    }
    return h + '</div></div>';
  }

  function renderEdit() {
    fixLegs();
    var n = form.s.length;
    var html =
      '<div class="form-group" style="margin-top:6px"><div class="form-row"><span class="k">Datum</span>' +
        '<input type="date" id="fDate" value="' + form.d + '" max="' + todayISO() + '"></div></div>' +
      '<div class="form-section">Verlauf</div><div class="redit">';
    for (var k = 0; k < n; k++) {
      var s = form.s[k];
      var role = k === 0 ? "Einstieg" : (k === n - 1 ? "Ausstieg" : "Umstieg");
      html += '<div class="re-stop"><div class="re-mark"><span class="re-dot"></span></div>' +
        '<div class="re-body"><div class="re-role">' + role + '</div>' +
          '<button class="picker-btn' + (s == null ? " empty" : "") + '" data-pick="' + k + '">' +
            (s == null ? "Haltestelle wählen" : esc(stName(s))) + '</button></div>' +
        (k > 0 && k < n - 1 ? '<button class="re-del" data-del="' + k + '" aria-label="Umstieg entfernen">×</button>' : "") +
      '</div>';
      if (k < n - 1) html += legHTML(k);
    }
    html += '</div><button class="re-add" id="reAdd">＋ Umstieg einfügen</button>';

    var why = formCheck();
    if (!why) {
      var t = { s: form.s, l: form.l }, roles = tripRoles(t);
      var newOnes = form.s.filter(function (i, k) {
        return roles[k] && !db().got[i] && form.s.indexOf(i) === k;
      });
      html += '<div class="hint">' + fmtKm(tripLen(t)) + (newOnes.length
        ? ' · <b style="color:var(--green)">' + plural(newOnes.length, "neue Haltestelle", "neue Haltestellen") + '</b>'
        : "") + '</div>';
    }
    html += '<button class="big-btn" id="fSave"' + (why ? " disabled" : "") + '>Speichern</button>';
    if (why) html += '<div class="hint" style="text-align:center">' + esc(why) + '</div>';
    if (form.id) html += '<button class="text-btn" id="fDelete">Fahrt löschen</button>';
    $("editContent").innerHTML = html;
  }

  function saveForm() {
    if (formCheck()) return;
    var before = db().nGot;
    var t = { id: form.id || newId(), d: form.d || todayISO(), s: form.s.slice(), l: form.l.slice() };
    var idx = -1;
    trips.forEach(function (x, k) { if (x.id === t.id) idx = k; });
    if (idx >= 0) trips[idx] = t; else trips.push(t);
    save(); invalidate();
    var gain = db().nGot - before;
    render(); refreshOpen();
    hideSheet("edit");
    toast(gain > 0 ? "Gespeichert · " + plural(gain, "neue Haltestelle", "neue Haltestellen") + " 🎉"
                   : (idx >= 0 ? "Fahrt aktualisiert" : "Fahrt gespeichert"));
  }
  function deleteForm() {
    var t = trips.filter(function (x) { return x.id === form.id; })[0];
    if (!t) return;
    confirmDialog({
      title: "Fahrt löschen?",
      text: stName(t.s[0]) + " → " + stName(t.s[t.s.length - 1]) + " am " + fmtDate(t.d) +
        " wird entfernt. Haltestellen, die nur durch diese Fahrt gesammelt wurden, gelten dann wieder als offen.",
      ok: "Löschen", destructive: true
    }, function () {
      trips = trips.filter(function (x) { return x.id !== form.id; });
      save(); invalidate(); render(); refreshOpen();
      hideSheet("edit");
      toast("Fahrt gelöscht");
    });
  }

  // ---------- Haltestellenauswahl ----------
  var pickK = 0;
  function openPicker(k) {
    pickK = k;
    var n = form.s.length;
    $("pickTitle").textContent = k === 0 ? "Einstieg" : (k === n - 1 ? "Ausstieg" : "Umstieg");
    $("pickSearch").value = "";
    renderPicker();
    $("pickContent").scrollTop = 0;
    showSheet("pick");
    setTimeout(function () { $("pickSearch").focus(); }, 320);
  }
  function renderPicker() {
    var q = norm($("pickSearch").value).trim();
    var k = pickK, n = form.s.length, D = db();
    var prev = k > 0 ? form.s[k - 1] : null;
    var next = k < n - 1 ? form.s[k + 1] : null;
    var legLine = k > 0 ? form.l[k - 1] : form.l[0];
    var cur = form.s[k];
    var match = function (i) {
      var s = STATIONS[i];
      return !q || norm(s.name + " " + (s.teil || "") + " " + s.ort).indexOf(q) >= 0;
    };
    var first = [], title = "";
    if (lineByNr[legLine] && (prev == null || LINES_AT[prev].indexOf(legLine) >= 0)) {
      title = "Linie " + legLine + (prev != null ? " ab " + stName(prev) : "");
      var seen = {};
      lineByNr[legLine].v.forEach(function (v) {
        v.forEach(function (i) { if (!seen[i] && i !== prev) { seen[i] = 1; first.push(i); } });
      });
    } else if (prev != null || next != null) {
      var ref = prev != null ? prev : next;
      title = (prev != null ? "Direkt ab " : "Direkt nach ") + stName(ref);
      var set = {};
      LINES_AT[ref].forEach(function (nr) {
        lineByNr[nr].v.forEach(function (v) {
          if (v.indexOf(ref) >= 0) v.forEach(function (i) { set[i] = 1; });
        });
      });
      delete set[ref];
      first = Object.keys(set).map(Number).sort(function (a, b) { return stName(a).localeCompare(stName(b), "de"); });
    }
    var inFirst = {};
    first.forEach(function (i) { inFirst[i] = 1; });
    var rest = STATIONS.map(function (s, i) { return i; }).filter(function (i) { return !inFirst[i] && i !== prev; })
      .sort(function (a, b) { return stName(a).localeCompare(stName(b), "de"); });
    first = first.filter(match);
    rest = rest.filter(match);

    function row(i) {
      var s = STATIONS[i];
      return '<div class="pick-row' + (i === cur ? " sel" : "") + '" data-pick-st="' + i + '">' +
        '<div><div class="pn">' + esc(s.name) + '</div>' +
        '<div class="ps">' + miniBadges(LINES_AT[i]) + '<span>' + esc(place(s)) + '</span></div></div>' +
        (D.got[i] ? '<span class="got-dot" title="gesammelt"></span>' : "") +
      '</div>';
    }
    var html = "";
    if (first.length) html += '<div class="hist-title">' + esc(title) + ' (' + first.length + ')</div>' + first.map(row).join("");
    if (rest.length) {
      if (first.length) html += '<div class="hist-title">Weitere Haltestellen (' + rest.length + ')</div>';
      html += rest.map(row).join("");
    }
    $("pickContent").innerHTML = html || '<div class="hint">Keine Haltestelle gefunden.</div>';
  }

  // ---------- Statistik ----------
  function barRow(label, n, total, col, attrs, blCls) {
    var p = total && n ? Math.max(n / total * 100, 1.5) : 0;
    return '<div class="bar-row' + (attrs ? " click" : "") + '"' + (attrs || "") + '><span class="bl ' + (blCls || "") + '">' + label + '</span>' +
      '<div class="bar"><div style="width:' + p.toFixed(1) + '%' + (col ? ";background:" + col : "") + '"></div></div>' +
      '<span class="bn">' + n + '/' + total + '</span></div>';
  }
  function countRow(label, n, max, suffix, col) {
    return '<div class="bar-row"><span class="bl">' + label + '</span>' +
      '<div class="bar"><div style="width:' + pct(n, max).toFixed(1) + '%' + (col ? ";background:" + col : "") + '"></div></div>' +
      '<span class="bn">' + n + (suffix || "") + '</span></div>';
  }
  function ach(icon, title, have, need, unit) {
    var done = have >= need;
    return '<div class="ach' + (done ? " done" : "") + '"><span class="ai">' + icon + '</span><div>' +
      '<div class="at">' + title + '</div><div class="as">' +
      (done ? "geschafft ✓" : Math.min(have, need) + " / " + need + (unit ? " " + unit : "")) + '</div></div></div>';
  }

  function renderStats() {
    var D = db(), total = STATIONS.length;
    var p = pct(D.nGot, total), R = 80, C = 2 * Math.PI * R;
    var html =
      '<div class="ringwrap"><div class="ring">' +
        '<svg width="190" height="190" viewBox="0 0 190 190">' +
          '<circle cx="95" cy="95" r="' + R + '" fill="none" stroke="var(--chipbg)" stroke-width="16"/>' +
          '<circle cx="95" cy="95" r="' + R + '" fill="none" stroke="var(--green)" stroke-width="16" ' +
            'stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - p / 100)) + '"/>' +
        '</svg>' +
        '<div class="ring-label"><span class="ring-frac">' + D.nGot + '/' + total + '</span>' +
          '<span class="ring-pct">' + fmtPct(p) + '</span><span class="ring-sub">HALTESTELLEN</span></div>' +
      '</div></div>';

    var usedLines = NET.filter(function (n) { return D.lineLegs[n.nr]; }).length;
    html += '<div class="tiles">' +
      '<div class="tile"><div class="tv">' + trips.length + '</div><div class="tl">Fahrten</div></div>' +
      '<div class="tile"><div class="tv">' + usedLines + '/' + NET.length + '</div><div class="tl">Linien<br>genutzt</div></div>' +
      '<div class="tile"><div class="tv">' + (D.m / 1000).toFixed(D.m < 100000 ? 1 : 0).replace(".", ",") + '</div><div class="tl">km<br>gefahren</div></div>' +
    '</div><div class="tiles">' +
      '<div class="tile"><div class="tv">' + D.um + '</div><div class="tl">Umstiege</div></div>' +
      '<div class="tile"><div class="tv">' + Math.round(pct(D.segsM, TOTAL_M)) + '%</div><div class="tl">Netz befahren<br>' +
        fmtKm(D.segsM) + ' / ' + fmtKm(TOTAL_M) + '</div></div>' +
      '<div class="tile"><div class="tv">' + marks.length + '</div><div class="tl">ohne Fahrt<br>abgehakt</div></div>' +
    '</div>';

    // Wie gesammelt
    var nE = 0, nA = 0, nU = 0;
    D.st.forEach(function (v) { if (v) { nE += v.e; nA += v.a; nU += v.u; } });
    var maxR = Math.max(nE, nA, nU, 1);
    html += '<div class="stat-section">Ein-, Aus- und Umstiege</div><div class="statcard">' +
      countRow("Eingestiegen", nE, maxR, "×", "#0a84ff") +
      countRow("Ausgestiegen", nA, maxR, "×", "#ff9f0a") +
      countRow("Umgestiegen", nU, maxR, "×", "#af52de") + '</div>';

    // Linien
    html += '<div class="stat-section">Haltestellen je Linie</div><div class="statcard">';
    NET.forEach(function (n) {
      var ls = lineStat(n.nr);
      html += barRow(miniBadges([n.nr]), ls.got, ls.total, n.line.col, ' data-open-line="' + n.nr + '"', "bl-s");
    });
    html += '</div>';

    var legsMax = Math.max.apply(null, NET.map(function (n) { return D.lineLegs[n.nr] || 0; }).concat([1]));
    if (D.legs) {
      html += '<div class="stat-section">Fahrten je Linie</div><div class="statcard">';
      NET.slice().sort(function (a, b) { return (D.lineLegs[b.nr] || 0) - (D.lineLegs[a.nr] || 0); })
        .forEach(function (n) {
          if (!D.lineLegs[n.nr]) return;
          html += countRow(miniBadges([n.nr]) + " " + fmtKm(D.lineKm[n.nr] || 0), D.lineLegs[n.nr], legsMax, "×", n.line.col);
        });
      html += '</div>';
    }

    // Stadtbezirke und Umland
    var bez = {}, ort = {};
    STATIONS.forEach(function (s, i) {
      var g = !!D.got[i];
      if (s.ort === "Köln") {
        var b = bez[s.bez || "?"] = bez[s.bez || "?"] || { n: 0, t: 0 };
        b.t++; if (g) b.n++;
      } else {
        var o = ort[s.ort] = ort[s.ort] || { n: 0, t: 0 };
        o.t++; if (g) o.n++;
      }
    });
    html += '<div class="stat-section">Kölner Stadtbezirke</div><div class="statcard">';
    Object.keys(bez).sort(function (a, b) { return bez[b].t - bez[a].t; }).forEach(function (k) {
      html += barRow(esc(k), bez[k].n, bez[k].t);
    });
    html += '</div><div class="stat-section">Umland</div><div class="statcard">';
    Object.keys(ort).sort(function (a, b) { return ort[b].t - ort[a].t; }).forEach(function (k) {
      html += barRow(esc(k), ort[k].n, ort[k].t);
    });
    html += '</div>';

    // Häufigste Haltestellen
    var top = [];
    D.st.forEach(function (v, i) { if (v && v.n) top.push(i); });
    top.sort(function (a, b) { return D.st[b].n - D.st[a].n; });
    top = top.slice(0, 8);
    if (top.length) {
      var maxS = D.st[top[0]].n;
      html += '<div class="stat-section">Meistgenutzte Haltestellen</div><div class="statcard">';
      top.forEach(function (i) { html += countRow(esc(stName(i)), D.st[i].n, maxS, "×"); });
      html += '</div>';
    }

    // Neu gesammelt je Monat
    var byMonth = {};
    D.st.forEach(function (v) {
      if (v && v.n && v.first) {
        var m = v.first.slice(0, 7);
        byMonth[m] = (byMonth[m] || 0) + 1;
      }
    });
    var months = [], now = new Date();
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      months.push({ n: byMonth[key] || 0, label: MONTHS[d.getMonth()] });
    }
    var maxM = Math.max.apply(null, months.map(function (m) { return m.n; }).concat([1]));
    html += '<div class="stat-section">Neu gesammelt · letzte 12 Monate</div>' +
      '<div class="statcard"><div class="month-chart">';
    months.forEach(function (m) {
      html += '<div class="mc"><span class="mcn">' + (m.n || "") + '</span>' +
        '<div class="mcb" style="height:' + Math.round(m.n / maxM * 70 + (m.n ? 6 : 2)) +
          'px;opacity:' + (m.n ? 1 : .25) + '"></div><span class="mcl">' + m.label + '</span></div>';
    });
    html += '</div></div>';

    // Erfolge
    function countSet(fn) {
      var have = 0, need = 0;
      STATIONS.forEach(function (s, i) { if (fn(s, i)) { need++; if (D.got[i]) have++; } });
      return [have, need];
    }
    var term = countSet(function (s, i) { return TERM[i]; });
    var tun = countSet(function (s) { return s.u > 0; });
    var hub = countSet(function (s, i) { return LINES_AT[i].length > 1; });
    var inn = countSet(function (s) { return s.bez === "Innenstadt" && s.ort === "Köln"; });
    var bezDone = Object.keys(bez).filter(function (k) { return bez[k].n > 0; }).length;
    var fullLines = NET.filter(function (n) { var ls = lineStat(n.nr); return ls.got === ls.total; }).length;
    var bridges = BRIDGES.filter(function (b) { return D.segs[b.key]; }).length;
    var bonn = countSet(function (s) { return s.ort === "Bonn"; });
    html += '<div class="stat-section">Erfolge</div><div class="badges">' +
      ach("🚋", "Erste Fahrt", trips.length, 1) +
      ach("🔀", "Knotenpunkte", hub[0], hub[1], "Umsteigehalte") +
      ach("🏁", "Endstation", term[0], term[1], "Endhalte") +
      ach("🚇", "Untergrund", tun[0], tun[1], "Tunnelhalte") +
      ach("⛪", "Innenstadt komplett", inn[0], inn[1], "Halte") +
      ach("🗺️", "Alle Stadtbezirke", bezDone, Object.keys(bez).length, "Bezirke") +
      ach("🌉", "Rheinquerer", bridges, BRIDGES.length, "Brücken befahren") +
      ach("🎯", "Linie komplett", fullLines, 1, "Linien") +
      ach("🔁", "Umsteige-Profi", D.um, 50, "Umstiege") +
      ach("🏛️", "Bis nach Bonn", bonn[0], 1, "Halt in Bonn") +
      ach("💯", "Hundert", D.nGot, 100, "Halte") +
      ach("👑", "Alle Haltestellen", D.nGot, total, "Halte") +
    '</div>';

    html += '<div class="io-row">' +
      '<button id="exportBtn">Exportieren</button>' +
      '<button id="importBtn">Importieren</button>' +
      '<button id="resetBtn" class="danger">Zurücksetzen</button>' +
    '</div>';

    $("statsContent").innerHTML = html;
    $("exportBtn").addEventListener("click", doExport);
    $("importBtn").addEventListener("click", doImport);
    $("resetBtn").addEventListener("click", doReset);
  }

  // ---------- Export / Import ----------
  function doExport() {
    var data = JSON.stringify(exportObj());
    if (navigator.share) {
      navigator.share({ title: "KVB Haltestellen", text: data }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(data).then(function () { toast("In die Zwischenablage kopiert"); });
    } else {
      prompt("Daten kopieren:", data);
    }
  }
  function doImport() {
    var txt = prompt("Exportierte Daten einfügen:");
    if (!txt) return;
    try {
      var obj = JSON.parse(txt);
      var have = {}, nt = 0, nm = 0;
      trips.forEach(function (x) { have[x.id] = 1; });
      marks.forEach(function (x) { have[x.id] = 1; });
      (obj.trips || []).forEach(function (x) {
        var t = tripIn(x);
        if (!t || have[t.id]) return;
        have[t.id] = 1; trips.push(t); nt++;
      });
      (obj.marks || []).forEach(function (x) {
        var m = markIn(x);
        if (!m || have[m.id]) return;
        have[m.id] = 1; marks.push(m); nm++;
      });
      save(); invalidate(); render(); renderStats();
      toast(plural(nt, "Fahrt", "Fahrten") + " und " + plural(nm, "Abhakung", "Abhakungen") + " importiert");
    } catch (e) { alert("Konnte die Daten nicht lesen."); }
  }
  function doReset() {
    confirmDialog({
      title: "Alles zurücksetzen?",
      text: "Alle " + plural(trips.length, "Fahrt", "Fahrten") + " und " +
        plural(marks.length, "Abhakung", "Abhakungen") + " werden gelöscht. Das lässt sich nicht rückgängig machen.",
      ok: "Löschen", destructive: true
    }, function () {
      trips = []; marks = [];
      save(); invalidate(); render(); renderStats();
      toast("Alles gelöscht");
    });
  }

  // ---------- Sheets, Dialog, Toast ----------
  function showSheet(name) {
    var s = $(name + "Sheet"), b = $(name + "Backdrop");
    clearTimeout(s._t);
    s.hidden = false; b.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { s.classList.add("show"); b.classList.add("show"); });
    });
  }
  function hideSheet(name) {
    var s = $(name + "Sheet"), b = $(name + "Backdrop");
    s.classList.remove("show"); b.classList.remove("show");
    s._t = setTimeout(function () { s.hidden = true; b.hidden = true; }, 300);
  }
  function isOpen(name) { return $(name + "Sheet").classList.contains("show"); }
  function refreshOpen() {
    if (isOpen("st") && currentSt != null) openStation(currentSt, true);
    if (isOpen("line") && currentLine) openLine(currentLine, true);
    if (isOpen("stats")) renderStats();
  }

  var openAlert = null;
  function confirmDialog(opts, onOk) {
    document.querySelectorAll(".alert-backdrop").forEach(function (x) { x.remove(); });
    openAlert = null;
    var wrap = document.createElement("div");
    wrap.className = "alert-backdrop";
    wrap.innerHTML = '<div class="alert" role="alertdialog" aria-modal="true">' +
      '<div class="alert-title">' + esc(opts.title) + '</div>' +
      (opts.text ? '<div class="alert-text">' + esc(opts.text) + '</div>' : "") +
      '<div class="alert-actions">' +
        '<button class="alert-btn" data-act="cancel">' + esc(opts.cancel || "Abbrechen") + '</button>' +
        '<button class="alert-btn ' + (opts.destructive ? "destructive" : "primary") +
          '" data-act="ok">' + esc(opts.ok || "OK") + '</button>' +
      '</div></div>';
    document.body.appendChild(wrap);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { wrap.classList.add("show"); });
    });
    function close(ok) {
      if (!wrap.parentNode) return;
      wrap.classList.remove("show");
      setTimeout(function () { if (wrap.parentNode) wrap.remove(); }, 200);
      openAlert = null;
      if (ok) onOk();
    }
    wrap.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-act]");
      if (b) close(b.dataset.act === "ok");
      else if (ev.target === wrap) close(false);
    });
    openAlert = function () { close(false); };
  }

  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(function () { toastEl.classList.add("show"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  // ---------- Events ----------
  $("search").addEventListener("input", function () {
    state.q = this.value.trim();
    $("clearSearch").hidden = !state.q;
    render();
  });
  $("clearSearch").addEventListener("click", function () {
    $("search").value = ""; state.q = ""; this.hidden = true;
    render(); $("search").focus();
  });

  $("chips").addEventListener("click", function (ev) {
    var c = ev.target.closest(".chip");
    if (!c) return;
    var k = c.dataset.k, v = c.dataset.v;
    if (k === "hf" || k === "lf" || k === "tf") state[k] = v;
    else state[k] = state[k] === v ? null : v;          // Zusatzfilter: nochmal tippen hebt auf
    if (k === "hl") state.sort = state.hl ? "route" : (state.sort === "route" ? "az" : state.sort);
    render();
  });

  $("sortBtn").addEventListener("click", function () {
    var order = state.hl ? ["route", "az", "last", "count"] : ["az", "last", "count"];
    var cur = state.sort === "route" && !state.hl ? "az" : state.sort;
    state.sort = order[(order.indexOf(cur) + 1) % order.length];
    render();
  });

  $("list").addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-toggle]");
    if (t) {
      var i = parseInt(t.dataset.toggle, 10);
      if (db().got[i]) openStation(i); else openMark(i);
      return;
    }
    var card = ev.target.closest(".card");
    if (!card) return;
    if (card.dataset.st != null) openStation(parseInt(card.dataset.st, 10));
    else if (card.dataset.line) openLine(card.dataset.line);
    else if (card.dataset.trip) openEdit(card.dataset.trip);
  });

  $("introOk").addEventListener("click", function () {
    try { localStorage.setItem(INTRO_KEY, "1"); } catch (e) {}
    $("intro").hidden = true;
  });

  var VIEWS = { halte: "tabHalte", linien: "tabLinien", karte: "tabKarte", fahrten: "tabFahrten" };
  function switchView(v) {
    state.view = v;
    Object.keys(VIEWS).forEach(function (k) { $(VIEWS[k]).classList.toggle("active", k === v); });
    if (v !== "karte") {
      $("search").value = state.q = "";
      $("clearSearch").hidden = true;
    }
    render();
    window.scrollTo({ top: 0 });
  }
  Object.keys(VIEWS).forEach(function (k) {
    $(VIEWS[k]).addEventListener("click", function () { switchView(k); });
  });
  $("tabAdd").addEventListener("click", function () { openEdit(null); });

  $("mapIn").addEventListener("click", function () { bigMap && bigMap.zoom(1 / 1.5); });
  $("mapOut").addEventListener("click", function () { bigMap && bigMap.zoom(1.5); });
  $("mapCenter").addEventListener("click", function () { bigMap && bigMap.fitCenter(); });
  $("mapAll").addEventListener("click", function () { bigMap && bigMap.fitAll(); });
  $("mapColor").addEventListener("click", function () {
    state.colored = !state.colored;
    this.classList.toggle("on", state.colored);
    renderMap();
  });
  $("mapInfo").addEventListener("click", function () {
    var sel = state.mapSel;
    if (!sel) return;
    if (sel.st != null) openStation(sel.st); else openLine(sel.line);
  });
  window.addEventListener("resize", function () {
    if (bigMap && state.view === "karte") bigMap.resize();
  });

  $("statsBtn").addEventListener("click", function () { renderStats(); $("statsContent").scrollTop = 0; showSheet("stats"); });
  $("statsContent").addEventListener("click", function (ev) {
    var r = ev.target.closest("[data-open-line]");
    if (r) openLine(r.dataset.openLine);
  });

  // Haltestellen-Detail
  $("stContent").addEventListener("click", function (ev) {
    var l = ev.target.closest("[data-open-line]");
    if (l) { openLine(l.dataset.openLine); return; }
    var del = ev.target.closest("[data-mark-del]");
    if (del) {
      var id = del.dataset.markDel;
      confirmDialog({ title: "Abhakung entfernen?", text: "Der Eintrag ohne Fahrt wird gelöscht.",
        ok: "Entfernen", destructive: true }, function () {
        marks = marks.filter(function (m) { return m.id !== id; });
        save(); invalidate(); render(); refreshOpen();
      });
      return;
    }
    if (ev.target.closest("[data-mark-date]")) return;
    var r = ev.target.closest("[data-trip]");
    if (r) openEdit(r.dataset.trip);
  });
  $("stContent").addEventListener("change", function (ev) {
    var inp = ev.target.closest("[data-mark-date]");
    if (!inp) return;
    marks.forEach(function (m) { if (m.id === inp.dataset.markDate) m.d = inp.value; });
    save(); invalidate(); render(); refreshOpen();
  });

  // Linien-Detail
  $("lineContent").addEventListener("click", function (ev) {
    var r = ev.target.closest("[data-st]");
    if (r) openStation(parseInt(r.dataset.st, 10));
  });

  // Fahrt-Formular
  $("editContent").addEventListener("click", function (ev) {
    var b;
    if ((b = ev.target.closest("[data-pick]"))) { openPicker(parseInt(b.dataset.pick, 10)); return; }
    if ((b = ev.target.closest("[data-leg]"))) {
      var k = parseInt(b.dataset.leg, 10), nr = b.dataset.line;
      var bothSet = form.s[k] != null && form.s[k + 1] != null;
      form.l[k] = !bothSet && form.l[k] === nr ? "" : nr;   // Vorauswahl lässt sich abwählen
      renderEdit();
      return;
    }
    if ((b = ev.target.closest("[data-del]"))) {
      var d = parseInt(b.dataset.del, 10);
      form.s.splice(d, 1);
      form.l.splice(d, 1);
      renderEdit();
      return;
    }
    if ((b = ev.target.closest("[data-suggest]"))) {
      var j = parseInt(b.dataset.suggest, 10);
      var res = suggest(form.s[j], form.s[j + 1]);
      if (!res) { toast("Keine Verbindung gefunden"); return; }
      Array.prototype.splice.apply(form.s, [j, 2].concat(res.s));
      Array.prototype.splice.apply(form.l, [j, 1].concat(res.l));
      renderEdit();
      toast(res.s.length > 2 ? plural(res.s.length - 2, "Umstieg", "Umstiege") + " eingefügt" : "Direkte Linie gefunden");
      return;
    }
    if (ev.target.closest("#reAdd")) {
      var n = form.s.length;
      form.s.splice(n - 1, 0, null);
      form.l.splice(n - 1, 0, "");
      renderEdit();
      openPicker(n - 1);
      return;
    }
    if (ev.target.closest("#fSave")) { saveForm(); return; }
    if (ev.target.closest("#fDelete")) { deleteForm(); }
  });
  $("editContent").addEventListener("change", function (ev) {
    if (ev.target.id === "fDate") form.d = ev.target.value || todayISO();
  });

  // Auswahl
  $("pickSearch").addEventListener("input", renderPicker);
  $("pickContent").addEventListener("click", function (ev) {
    var r = ev.target.closest("[data-pick-st]");
    if (!r) return;
    form.s[pickK] = parseInt(r.dataset.pickSt, 10);
    hideSheet("pick");
    renderEdit();
  });

  // Schließen
  ["st", "line", "edit", "pick", "stats"].forEach(function (name) {
    $(name + "Close").addEventListener("click", function () { hideSheet(name); });
    $(name + "Backdrop").addEventListener("click", function () { hideSheet(name); });
    // Swipe-down zum Schließen
    var el = $(name + "Sheet"), startY = null;
    el.addEventListener("touchstart", function (ev) {
      var content = el.querySelector(".sheet-content");
      startY = content.scrollTop <= 0 && !ev.target.closest(".map-mini") ? ev.touches[0].clientY : null;
    }, { passive: true });
    el.addEventListener("touchmove", function (ev) {
      if (startY === null) return;
      if (ev.touches[0].clientY - startY > 70) { startY = null; hideSheet(name); }
    }, { passive: true });
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    if (openAlert) { openAlert(); return; }
    if (openAS) { openAS(); return; }
    var order = ["pick", "edit", "st", "line", "stats"];
    for (var i = 0; i < order.length; i++) {
      if (isOpen(order[i])) { hideSheet(order[i]); return; }
    }
  });

  // ---------- Start ----------
  $("netzStand").textContent = NETZ_STAND ? fmtDate(NETZ_STAND) : "–";
  render();
})();
