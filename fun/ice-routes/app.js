/* ICE Verbindungen – Fahrten-Tracker */
(function () {
  "use strict";

  var STORE_KEY = "iceRoutes.v1";

  // ---------- Persistenz ----------
  // Intern:     { id, d: "YYYY-MM-DD", z: "ICE 106", l: "43", a: vonIdx, b: nachIdx,
  //               m: "p"|"g" (privat/geschäftlich), k: "1"|"2" (Wagenklasse) }
  // Gespeichert: a/b als Bahnhofs-ID ("Köln Hbf"), damit ein neu erzeugtes
  //              data.js mit anderer Reihenfolge alte Fahrten nicht verschiebt.
  var IDX_OF = {};
  STATIONS.forEach(function (s, i) { IDX_OF[s.id] = i; });

  function toIdx(v) {
    if (typeof v === "number") return STATIONS[v] ? v : null;   // Altformat
    return IDX_OF[v] != null ? IDX_OF[v] : null;
  }
  function tripIn(x) {
    if (!x || !x.d) return null;
    var a = toIdx(x.a), b = toIdx(x.b);
    if (a == null || b == null) return null;
    return { id: x.id || newId(), d: x.d, z: x.z || "", l: x.l || "",
             a: a, b: b, m: x.m === "g" ? "g" : "p", k: x.k === "1" ? "1" : "2" };
  }
  function tripOut(t) {
    return { id: t.id, d: t.d, z: t.z, l: t.l,
             a: STATIONS[t.a].id, b: STATIONS[t.b].id, m: t.m, k: t.k };
  }
  function loadTrips() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORE_KEY));
      var arr = raw && raw.trips ? raw.trips : [];
      return arr.map(tripIn).filter(Boolean);
    } catch (e) { return []; }
  }
  function saveTrips() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, trips: trips.map(tripOut) }));
    } catch (e) {}
  }
  var trips = loadTrips();

  // ---------- Zustand ----------
  var state = {
    view: "linien",     // linien | karte | fahrten
    q: "",
    lf: "alle",         // alle | gefahren | offen | voll | sprinter
    ff: "alle",         // alle | p | g | k1 | k2
    yf: "alle",         // alle | "2024" | ... (Jahr der Fahrt)
    mapSel: null        // auf der Karte hervorgehobene Linie
  };

  // ---------- Netz aufbereiten ----------
  function segKey(a, b) { return a < b ? a + "-" + b : b + "-" + a; }

  var lineByNr = {};
  var NET = LINES.map(function (l) {
    var stns = {}, segs = {}, longest = l.v[0];
    l.v.forEach(function (v) {
      if (v.length > longest.length) longest = v;
      v.forEach(function (p, i) {
        stns[p[0]] = 1;
        if (i) segs[segKey(v[i - 1][0], p[0])] = 1;
      });
    });
    var info = {
      nr: l.nr,
      line: l,
      stns: Object.keys(stns).map(Number),
      segs: Object.keys(segs),
      label: STATIONS[longest[0][0]].name + " – " + STATIONS[longest[longest.length - 1][0]].name
    };
    lineByNr[l.nr] = l;
    return info;
  });
  var netByNr = {};
  NET.forEach(function (n) { netByNr[n.nr] = n; });

  var TOTAL_SEGS = (function () {
    var all = {};
    NET.forEach(function (n) { n.segs.forEach(function (s) { all[s] = 1; }); });
    return Object.keys(all).length;
  })();

  // Bahnhof -> Liniennummern
  var LINES_AT = {};
  NET.forEach(function (n) {
    n.stns.forEach(function (s) {
      (LINES_AT[s] = LINES_AT[s] || []).push(n.nr);
    });
  });

  // ---------- Helpers ----------
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function fmtDate(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    return p[2] + "." + p[1] + "." + p[0];
  }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
      "-" + String(d.getDate()).padStart(2, "0");
  }
  function pct(n, total) { return total ? n / total * 100 : 0; }
  function fmtPct(p) { return p.toFixed(p >= 10 ? 0 : 1).replace(".", ",") + " %"; }
  function stName(i) { return STATIONS[i] ? STATIONS[i].name : "?"; }
  function norm(s) {
    return s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe")
      .replace(/ü/g, "ue").replace(/ß/g, "ss");
  }

  // Linienfarbe aus der Wikipedia-Netzgrafik
  function lineStyle(l) {
    var c = l && l.col;
    if (!c) return 'style="border-color:var(--sep)"';
    var h = c.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return 'style="background:' + c + ';color:' + (lum > 0.6 ? "#000" : "#fff") +
      ';border-color:rgba(128,128,128,.4)"';
  }
  function lineBadge(nr, small) {
    return '<div class="linebadge' + (small ? " sm" : "") + '" ' + lineStyle(lineByNr[nr]) + '>' +
      esc(nr) + '</div>';
  }

  // ---------- Abdeckung ----------
  // Sucht die Variante der Linie, auf der beide Bahnhöfe liegen (kürzester Abschnitt).
  function tripPath(t) {
    var l = lineByNr[t.l];
    if (!l || t.a == null || t.b == null) return null;
    var best = null;
    l.v.forEach(function (v) {
      var i = -1, j = -1;
      for (var k = 0; k < v.length; k++) {
        if (v[k][0] === t.a && i < 0) i = k;
        if (v[k][0] === t.b) j = k;
      }
      if (i < 0 || j < 0) return;
      var lo = Math.min(i, j), hi = Math.max(i, j);
      if (!best || hi - lo < best.hi - best.lo) best = { v: v, lo: lo, hi: hi };
    });
    return best;
  }

  var COV = null;
  function coverage() {
    if (COV) return COV;
    var segs = {}, stns = {}, byLine = {}, tripsOfLine = {};
    trips.forEach(function (t) {
      (tripsOfLine[t.l] = tripsOfLine[t.l] || []).push(t);
      var p = tripPath(t);
      if (!p) return;
      var b = byLine[t.l] = byLine[t.l] || { segs: {}, stns: {} };
      for (var k = p.lo; k <= p.hi; k++) {
        stns[p.v[k][0]] = 1; b.stns[p.v[k][0]] = 1;
      }
      for (k = p.lo; k < p.hi; k++) {
        var key = segKey(p.v[k][0], p.v[k + 1][0]);
        segs[key] = 1; b.segs[key] = 1;
      }
    });
    COV = {
      segs: segs, stns: stns, byLine: byLine, tripsOfLine: tripsOfLine,
      nSegs: Object.keys(segs).length,
      nStns: Object.keys(stns).length,
      nLines: Object.keys(tripsOfLine).filter(function (nr) { return !!lineByNr[nr]; }).length
    };
    return COV;
  }
  function lineCov(nr) {
    var c = coverage(), b = c.byLine[nr], n = netByNr[nr];
    var done = b ? Object.keys(b.segs).length : 0;
    return { done: done, total: n.segs.length, pct: pct(done, n.segs.length),
             trips: (c.tripsOfLine[nr] || []).length };
  }
  function invalidate() { COV = null; }

  // ---------- Liste ----------
  function filteredLines() {
    var q = norm(state.q);
    return NET.filter(function (n) {
      var c = lineCov(n.nr);
      if (state.lf === "gefahren" && !c.trips) return false;
      if (state.lf === "offen" && c.trips) return false;
      if (state.lf === "voll" && c.done < c.total) return false;
      if (state.lf === "sprinter" && !n.line.sp) return false;
      if (q) {
        if (norm("ice " + n.nr).indexOf(q) === 0 || n.nr === state.q.trim()) return true;
        var hay = norm(n.label + " " + n.line.fz + " " +
          n.stns.map(stName).join(" "));
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }
  // Jahre mit Fahrten, absteigend
  function tripYears() {
    var seen = {};
    trips.forEach(function (t) { if (t.d) seen[t.d.slice(0, 4)] = 1; });
    return Object.keys(seen).sort().reverse();
  }
  function filteredTrips() {
    var q = norm(state.q);
    return trips.filter(function (t) {
      if (state.yf !== "alle" && t.d.slice(0, 4) !== state.yf) return false;
      if (state.ff === "p" || state.ff === "g") { if (t.m !== state.ff) return false; }
      else if (state.ff === "k1" && t.k !== "1") return false;
      else if (state.ff === "k2" && t.k !== "2") return false;
      if (q) {
        var hay = norm((t.z || "") + " " + stName(t.a) + " " + stName(t.b) +
          " ICE " + (t.l || "") + " " + fmtDate(t.d));
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    }).sort(function (a, b) {
      return a.d === b.d ? (a.id < b.id ? 1 : -1) : (a.d < b.d ? 1 : -1);
    });
  }

  function renderChips() {
    var html = "";
    if (state.view === "linien") {
      [["alle", "Alle"], ["gefahren", "Gefahren"], ["offen", "Offen"],
       ["voll", "Komplett"], ["sprinter", "Sprinter"]].forEach(function (p) {
        html += '<button class="chip' + (state.lf === p[0] ? " active" : "") +
          '" data-lf="' + p[0] + '">' + p[1] + '</button>';
      });
    } else {
      [["alle", "Alle"], ["p", "Privat"], ["g", "Geschäftlich"], ["sep", ""],
       ["k1", "1.&nbsp;Klasse"], ["k2", "2.&nbsp;Klasse"]].forEach(function (p) {
        if (p[0] === "sep") { html += '<span class="chip-sep"></span>'; return; }
        html += '<button class="chip' + (state.ff === p[0] ? " active" : "") +
          '" data-ff="' + p[0] + '">' + p[1] + '</button>';
      });
      var years = tripYears();
      if (years.length > 1) {
        html += '<span class="chip-sep"></span>';
        html += '<button class="chip' + (state.yf === "alle" ? " active" : "") +
          '" data-yf="alle">Alle&nbsp;Jahre</button>';
        years.forEach(function (y) {
          html += '<button class="chip' + (state.yf === y ? " active" : "") +
            '" data-yf="' + y + '">' + y + '</button>';
        });
      }
    }
    $("chips").innerHTML = html;
  }

  function render() {
    var c = coverage();
    var isMap = state.view === "karte";
    $("headerCount").textContent = c.nLines + "/" + NET.length;
    $("title").innerHTML = isMap ? "Netzkarte"
      : (state.view === "linien" ? "ICE&nbsp;Verbindungen" : "Meine&nbsp;Fahrten");
    $("search").placeholder = state.view === "linien"
      ? "Linie, Bahnhof oder Zugnummer" : "Zug, Bahnhof oder Datum";
    document.querySelector(".searchwrap").hidden = isMap;
    $("chips").hidden = isMap;
    $("mapView").hidden = !isMap;
    $("listMeta").hidden = isMap;
    $("list").hidden = isMap;
    document.querySelector(".credits").hidden = isMap;
    if (isMap) {
      $("empty").hidden = true;
      renderMap();
      return;
    }
    // gelöschte Fahrten können ein Jahr verschwinden lassen
    if (state.yf !== "alle" && tripYears().indexOf(state.yf) === -1) state.yf = "alle";
    renderChips();

    var html = "";
    if (state.view === "linien") {
      var arr = filteredLines();
      arr.forEach(function (n) {
        var lc = lineCov(n.nr);
        html += '<div class="card' + (lc.trips ? " done" : "") + '" data-line="' + esc(n.nr) + '">' +
          lineBadge(n.nr) +
          '<div class="card-body">' +
            '<div class="card-name">' + esc(n.label) + '</div>' +
            '<div class="card-sub">' +
              (n.line.sp ? '<span class="badge">Sprinter</span>' : "") +
              (n.line.fz ? '<span>' + esc(n.line.fz) + '</span>' : "") +
              (lc.trips ? '<span>· ' + lc.trips + (lc.trips === 1 ? " Fahrt" : " Fahrten") + '</span>' : "") +
            '</div>' +
            '<div class="minibar"><div style="width:' + lc.pct.toFixed(1) + '%"></div></div>' +
          '</div>' +
          '<div class="card-right"><b>' + Math.round(lc.pct) + '%</b>' +
            lc.done + '/' + lc.total + '</div>' +
        '</div>';
      });
      $("listMeta").textContent = arr.length + " von " + NET.length + " Linien";
      $("emptyText").textContent = "Keine Linie gefunden";
      $("empty").hidden = arr.length > 0;
    } else {
      var tr = filteredTrips();
      tr.forEach(function (t) {
        html += '<div class="card" data-trip="' + esc(t.id) + '">' +
          (t.l ? lineBadge(t.l, true) : '<div class="linebadge sm" style="border-color:var(--sep)">–</div>') +
          '<div class="card-body">' +
            '<div class="card-name">' + esc(stName(t.a)) + ' → ' + esc(stName(t.b)) + '</div>' +
            '<div class="card-sub">' +
              '<span class="badge ' + (t.m === "g" ? "dienst" : "privat") + '">' +
                (t.m === "g" ? "Geschäftlich" : "Privat") + '</span>' +
              '<span class="badge klasse">' + t.k + '. Kl.</span>' +
              (t.z ? '<span>' + esc(t.z) + '</span>' : "") +
              '<span>· ' + fmtDate(t.d) + '</span>' +
              (!t.l ? '<span class="badge warn">ohne Linie</span>' : "") +
            '</div>' +
          '</div>' +
        '</div>';
      });
      $("listMeta").textContent = tr.length + (tr.length === 1 ? " Fahrt" : " Fahrten") +
        (trips.length !== tr.length ? " von " + trips.length : "");
      $("emptyText").textContent = trips.length ? "Keine Fahrt gefunden" : "Noch keine Fahrt eingetragen";
      $("empty").hidden = tr.length > 0;
    }
    $("list").innerHTML = html;
  }

  // ---------- Karte ----------
  var bigMap = null, miniMap = null;

  function renderMap() {
    var c = coverage();
    if (!bigMap) {
      bigMap = ICEMap.create($("mapWrap"), {
        interactive: true,
        onSelect: function (nr) {
          state.mapSel = (nr && nr === state.mapSel) ? null : nr;
          bigMap.select(state.mapSel);
          renderMapInfo();
        }
      });
    }
    bigMap.update({ byLine: c.byLine, stns: c.stns, selected: state.mapSel });
    bigMap.resize();
    renderMapInfo();
  }

  function renderMapInfo() {
    var box = $("mapInfo");
    if (!state.mapSel || !netByNr[state.mapSel]) { box.hidden = true; return; }
    var n = netByNr[state.mapSel], lc = lineCov(n.nr);
    $("mapInfoBadge").innerHTML = lineBadge(n.nr, true);
    $("mapInfoName").textContent = "ICE " + n.nr + " · " + n.label;
    $("mapInfoSub").textContent = lc.trips
      ? lc.done + " von " + lc.total + " Abschnitten gefahren (" + Math.round(lc.pct) + " %)"
      : "noch nicht gefahren";
    box.hidden = false;
  }

  // ---------- Linien-Detail ----------
  var currentLine = null;
  function openLine(nr) {
    var n = netByNr[nr];
    if (!n) return;
    currentLine = nr;
    var lc = lineCov(nr), c = coverage(), b = c.byLine[nr] || { segs: {}, stns: {} };
    var html =
      '<div class="detail-top">' + lineBadge(nr) +
        '<div><div class="detail-name">' + esc(n.label) + '</div>' +
        '<div class="detail-sub">' + (n.line.sp ? "ICE Sprinter · " : "") +
          (n.line.fz ? esc(n.line.fz) : "ICE") + '</div></div>' +
      '</div>' +
      '<div class="kv-table">' +
        kv("Abschnitte gefahren", lc.done + " von " + lc.total + " (" + fmtPct(lc.pct) + ")") +
        kv("Halte besucht", Object.keys(b.stns).length + " von " + n.stns.length) +
        kv("Eigene Fahrten", String(lc.trips)) +
      '</div>' +
      '<div class="mapwrap map-mini" id="detailMap"></div>' +
      '<button class="big-btn" id="addOnLine">Fahrt auf dieser Linie eintragen</button>';

    n.line.v.forEach(function (v, vi) {
      if (n.line.v.length > 1) {
        html += '<div class="route-var">Laufweg ' + (vi + 1) + ": " +
          esc(stName(v[0][0])) + " – " + esc(stName(v[v.length - 1][0])) + '</div>';
      } else {
        html += '<div class="hist-title">Laufweg</div>';
      }
      html += '<div class="route">';
      v.forEach(function (p, i) {
        var visited = !!b.stns[p[0]];
        var inSeg = i > 0 && b.segs[segKey(v[i - 1][0], p[0])];
        var outSeg = i < v.length - 1 && b.segs[segKey(p[0], v[i + 1][0])];
        html += '<div class="stop' + (visited ? " visited" : "") + (p[1] ? " opt" : "") +
          (inSeg ? " rail-in" : "") + (outSeg ? " rail-out" : "") + '">' +
          '<div class="stop-rail"><span class="stop-dot"></span></div>' +
          '<div class="stop-name">' + esc(stName(p[0])) +
            (p[1] ? '<span class="optmark">nur einzelne Züge</span>' : "") + '</div>' +
        '</div>';
      });
      html += '</div>';
    });

    var mine = (c.tripsOfLine[nr] || []).slice().sort(function (x, y) { return x.d < y.d ? 1 : -1; });
    if (mine.length) {
      html += '<div class="hist-title">Meine Fahrten</div><div class="hist">';
      mine.forEach(function (t) {
        html += '<div class="trip-row" data-trip="' + esc(t.id) + '">' +
          '<div class="tr-main"><div>' + esc(stName(t.a)) + ' → ' + esc(stName(t.b)) + '</div>' +
          '<div class="tr-sub">' + fmtDate(t.d) + (t.z ? " · " + esc(t.z) : "") +
            " · " + t.k + ". Klasse" + '</div></div>' +
          '<span class="badge ' + (t.m === "g" ? "dienst" : "privat") + '">' +
            (t.m === "g" ? "Geschäftlich" : "Privat") + '</span>' +
        '</div>';
      });
      html += '</div>';
    }

    $("detailTitle").textContent = "ICE " + nr;
    $("detailContent").innerHTML = html;
    $("detailContent").scrollTop = 0;
    miniMap = ICEMap.create($("detailMap"), { interactive: false });
    miniMap.update({ byLine: c.byLine, stns: c.stns, selected: nr });
    miniMap.fitLine(nr);
    $("addOnLine").addEventListener("click", function () {
      hideSheet("detailSheet", "detailBackdrop");
      openEdit(null, nr);
    });
    showSheet("detailSheet", "detailBackdrop");
  }
  function kv(k, v) {
    return '<div class="kv"><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + '</span></div>';
  }

  // ---------- Fahrt eintragen / bearbeiten ----------
  var form = null;
  // zuletzt benutzte Klasse als Vorschlag für die nächste Fahrt
  var lastClass = (trips.length ? trips[trips.length - 1].k : "2") || "2";

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function candidateLines(a, b) {
    if (a == null || b == null) return [];
    var out = [];
    NET.forEach(function (n) {
      var best = tripPath({ l: n.nr, a: a, b: b });
      if (best) out.push({ nr: n.nr, span: best.hi - best.lo });
    });
    out.sort(function (x, y) { return x.span - y.span; });
    return out;
  }

  function openEdit(tripId, presetLine) {
    var t = tripId ? trips.filter(function (x) { return x.id === tripId; })[0] : null;
    form = t ? { id: t.id, d: t.d, z: t.z || "", l: t.l || "", a: t.a, b: t.b,
                 m: t.m || "p", k: t.k || "2" }
             : { id: null, d: todayISO(), z: "", l: presetLine || "", a: null, b: null,
                 m: "p", k: lastClass };
    $("editTitle").textContent = t ? "Fahrt bearbeiten" : "Fahrt eintragen";
    renderEdit();
    showSheet("editSheet", "editBackdrop");
  }

  function renderEdit() {
    var cands = candidateLines(form.a, form.b);
    if (form.a != null && form.b != null) {
      var ok = cands.some(function (c) { return c.nr === form.l; });
      if (!ok) form.l = cands.length ? cands[0].nr : "";
    }
    var html =
      '<div class="form-section">Abschnitt</div>' +
      '<div class="form-group">' +
        '<div class="form-row"><span class="k">Von</span>' +
          '<button class="picker-btn' + (form.a == null ? " empty" : "") + '" data-pick="a">' +
            (form.a == null ? "Bahnhof wählen" : esc(stName(form.a))) + '</button></div>' +
        '<div class="form-row"><span class="k">Nach</span>' +
          '<button class="picker-btn' + (form.b == null ? " empty" : "") + '" data-pick="b">' +
            (form.b == null ? "Bahnhof wählen" : esc(stName(form.b))) + '</button></div>' +
      '</div>' +

      '<div class="form-section">Zug</div>' +
      '<div class="form-group">' +
        '<div class="form-row"><span class="k">Datum</span>' +
          '<input type="date" id="fDate" value="' + form.d + '"></div>' +
        '<div class="form-row"><span class="k">Zugnummer</span>' +
          '<input type="text" id="fZug" value="' + esc(form.z) + '" placeholder="z. B. ICE 106"></div>' +
      '</div>' +

      '<div class="form-section">Anlass</div>' +
      '<div class="segmented" id="fMode">' +
        '<button data-m="p"' + (form.m === "p" ? ' class="active"' : "") + '>Privat</button>' +
        '<button data-m="g"' + (form.m === "g" ? ' class="active"' : "") + '>Geschäftlich</button>' +
      '</div>' +

      '<div class="form-section">Klasse</div>' +
      '<div class="segmented" id="fClass">' +
        '<button data-k="1"' + (form.k === "1" ? ' class="active"' : "") + '>1. Klasse</button>' +
        '<button data-k="2"' + (form.k === "2" ? ' class="active"' : "") + '>2. Klasse</button>' +
      '</div>' +

      '<div class="form-section">Linie</div>';

    if (form.a == null || form.b == null) {
      html += '<div class="linepick">' + (form.l
        ? '<button class="lp active" data-line="' + esc(form.l) + '">' +
            lineBadge(form.l, true) + esc(netByNr[form.l] ? netByNr[form.l].label : "") + '</button>'
        : "") + '</div>' +
        '<div class="hint">Wähle Von und Nach – die passenden Linien erscheinen dann automatisch.</div>';
    } else if (!cands.length) {
      html += '<div class="hint warn">Keine ICE-Linie verbindet diese beiden Bahnhöfe direkt. ' +
        'Die Fahrt lässt sich trotzdem speichern, zählt dann aber nicht zur Netzabdeckung. ' +
        'Bei Umstiegen am besten je Abschnitt eine Fahrt eintragen.</div>';
    } else {
      html += '<div class="linepick">';
      cands.forEach(function (c) {
        var n = netByNr[c.nr];
        html += '<button class="lp' + (form.l === c.nr ? " active" : "") + '" data-line="' + esc(c.nr) + '">' +
          lineBadge(c.nr, true) + esc(n.label) + '</button>';
      });
      html += '</div>';
      if (cands.length > 1) {
        html += '<div class="hint">' + cands.length + ' Linien bedienen diesen Abschnitt – ' +
          'die des gefahrenen Zuges auswählen.</div>';
      }
    }

    html += '<button class="big-btn" id="fSave"' +
      (form.a == null || form.b == null || form.a === form.b ? " disabled" : "") + '>Speichern</button>';
    if (form.id) html += '<button class="text-btn" id="fDelete">Fahrt löschen</button>';

    $("editContent").innerHTML = html;

    $("editContent").querySelectorAll("[data-pick]").forEach(function (btn) {
      btn.addEventListener("click", function () { openPicker(this.dataset.pick); });
    });
    $("fDate").addEventListener("change", function () { form.d = this.value || todayISO(); });
    $("fZug").addEventListener("input", function () { form.z = this.value; });
    $("fMode").addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-m]");
      if (!b) return;
      form.m = b.dataset.m;
      this.querySelectorAll("button").forEach(function (x) { x.classList.toggle("active", x === b); });
    });
    $("fClass").addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-k]");
      if (!b) return;
      form.k = b.dataset.k;
      this.querySelectorAll("button").forEach(function (x) { x.classList.toggle("active", x === b); });
    });
    $("editContent").querySelectorAll(".lp").forEach(function (btn) {
      btn.addEventListener("click", function () { form.l = this.dataset.line; renderEdit(); });
    });
    $("fSave").addEventListener("click", saveForm);
    if ($("fDelete")) $("fDelete").addEventListener("click", deleteForm);
  }

  function saveForm() {
    if (form.a == null || form.b == null || form.a === form.b) return;
    var z = form.z.trim();
    if (/^\d+$/.test(z)) z = "ICE " + z;
    var t = { id: form.id || newId(), d: form.d, z: z, l: form.l,
              a: form.a, b: form.b, m: form.m, k: form.k };
    lastClass = form.k;
    var i = -1;
    trips.forEach(function (x, k) { if (x.id === t.id) i = k; });
    if (i >= 0) trips[i] = t; else trips.push(t);
    saveTrips(); invalidate(); render();
    hideSheet("editSheet", "editBackdrop");
    toast(i >= 0 ? "Fahrt aktualisiert" : "Fahrt gespeichert");
  }

  function deleteForm() {
    var t = trips.filter(function (x) { return x.id === form.id; })[0];
    if (!t) return;
    confirmDialog({
      title: "Fahrt löschen?",
      text: stName(t.a) + " → " + stName(t.b) + " am " + fmtDate(t.d) +
        " wird entfernt. Das lässt sich nicht rückgängig machen.",
      ok: "Löschen", destructive: true
    }, function () {
      trips = trips.filter(function (x) { return x.id !== form.id; });
      saveTrips(); invalidate(); render();
      hideSheet("editSheet", "editBackdrop");
      toast("Fahrt gelöscht");
    });
  }

  // ---------- Bahnhofsauswahl ----------
  var pickTarget = null;
  function openPicker(target) {
    pickTarget = target;
    $("pickTitle").textContent = target === "a" ? "Von" : "Nach";
    $("pickSearch").value = "";
    renderPicker();
    showSheet("pickSheet", "pickBackdrop");
    setTimeout(function () { $("pickSearch").focus(); }, 320);
  }

  // Bahnhöfe, die mit dem bereits gewählten Bahnhof (bzw. der Linie) auf einem Laufweg liegen
  function relatedStations() {
    var other = pickTarget === "a" ? form.b : form.a;
    var set = {};
    if (other != null) {
      LINES.forEach(function (l) {
        l.v.forEach(function (v) {
          if (v.some(function (p) { return p[0] === other; })) {
            v.forEach(function (p) { set[p[0]] = 1; });
          }
        });
      });
      delete set[other];
      return set;
    }
    if (form.l && lineByNr[form.l]) {
      netByNr[form.l].stns.forEach(function (s) { set[s] = 1; });
      return set;
    }
    return null;
  }

  function renderPicker() {
    var q = norm($("pickSearch").value.trim());
    var rel = relatedStations();
    var cur = pickTarget === "a" ? form.a : form.b;
    var groups = [{ t: "", items: [] }];
    var idx = STATIONS.map(function (s, i) { return i; }).filter(function (i) {
      return !q || norm(STATIONS[i].name).indexOf(q) >= 0 || norm(STATIONS[i].id).indexOf(q) >= 0;
    }).sort(function (x, y) {
      return STATIONS[x].name.localeCompare(STATIONS[y].name, "de");
    });

    if (rel) {
      groups = [{ t: "Auf einem gemeinsamen Laufweg", items: [] },
                { t: "Weitere Bahnhöfe", items: [] }];
      idx.forEach(function (i) { groups[rel[i] ? 0 : 1].items.push(i); });
    } else {
      groups[0].items = idx;
    }

    var html = "";
    groups.forEach(function (g) {
      if (!g.items.length) return;
      if (g.t) html += '<div class="hist-title">' + g.t + " (" + g.items.length + ")</div>";
      g.items.forEach(function (i) {
        var ls = (LINES_AT[i] || []);
        html += '<div class="pick-row' + (i === cur ? " sel" : "") + '" data-st="' + i + '">' +
          '<div><div class="pn">' + esc(STATIONS[i].name) + '</div>' +
          '<div class="ps">ICE ' + ls.slice(0, 6).join(" · ") +
            (ls.length > 6 ? " · +" + (ls.length - 6) : "") + '</div></div>' +
          (i === cur ? '<span class="badge">gewählt</span>' : "") +
        '</div>';
      });
    });
    if (!html) html = '<div class="hint">Kein Bahnhof gefunden.</div>';
    $("pickContent").innerHTML = html;
  }

  // ---------- Statistik ----------
  function renderStats() {
    var c = coverage();
    var total = NET.length;
    var p = pct(c.nLines, total);
    var R = 80, C = 2 * Math.PI * R;

    var html =
      '<div class="ringwrap"><div class="ring">' +
        '<svg width="190" height="190" viewBox="0 0 190 190">' +
          '<circle cx="95" cy="95" r="' + R + '" fill="none" stroke="var(--chipbg)" stroke-width="16"/>' +
          '<circle cx="95" cy="95" r="' + R + '" fill="none" stroke="var(--accent)" stroke-width="16" ' +
            'stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' +
            (C * (1 - p / 100)) + '"/>' +
        '</svg>' +
        '<div class="ring-label">' +
          '<span class="ring-frac">' + c.nLines + '/' + total + '</span>' +
          '<span class="ring-pct">' + fmtPct(p) + '</span>' +
          '<span class="ring-sub">LINIEN</span>' +
        '</div>' +
      '</div></div>';

    var segP = pct(c.nSegs, TOTAL_SEGS);
    var full = NET.filter(function (n) { var lc = lineCov(n.nr); return lc.total && lc.done === lc.total; }).length;
    html += '<div class="tiles">' +
      '<div class="tile"><div class="tv">' + trips.length + '</div><div class="tl">Fahrten</div></div>' +
      '<div class="tile"><div class="tv">' + Math.round(segP) + '%</div>' +
        '<div class="tl">Netz<br>' + c.nSegs + '/' + TOTAL_SEGS + ' Abschnitte</div></div>' +
      '<div class="tile"><div class="tv">' + c.nStns + '</div>' +
        '<div class="tl">von ' + STATIONS.length + '<br>Bahnhöfen</div></div>' +
    '</div>';

    if (full) {
      html += '<div class="hint">' + full + (full === 1 ? " Linie" : " Linien") +
        ' komplett abgefahren.</div>';
    }

    // Anlass
    var np = trips.filter(function (t) { return t.m !== "g"; }).length;
    var n1 = trips.filter(function (t) { return t.k === "1"; }).length;
    html += '<div class="stat-section">Nach Anlass</div><div class="statcard">' +
      barRow("Privat", np, trips.length) +
      barRow("Geschäftlich", trips.length - np, trips.length) + '</div>';
    html += '<div class="stat-section">Nach Klasse</div><div class="statcard">' +
      barRow("1. Klasse", n1, trips.length) +
      barRow("2. Klasse", trips.length - n1, trips.length) + '</div>';

    // Fahrten je Monat
    var byMonth = {};
    trips.forEach(function (t) {
      var m = (t.d || "").slice(0, 7);
      if (m) byMonth[m] = (byMonth[m] || 0) + 1;
    });
    var months = [], now = new Date();
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      months.push({ n: byMonth[key] || 0,
        label: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][d.getMonth()] });
    }
    var maxM = Math.max.apply(null, months.map(function (m) { return m.n; }).concat([1]));
    html += '<div class="stat-section">Fahrten · letzte 12 Monate</div>' +
      '<div class="statcard"><div class="month-chart">';
    months.forEach(function (m) {
      html += '<div class="mc"><span class="mcn">' + (m.n || "") + '</span>' +
        '<div class="mcb" style="height:' + Math.round(m.n / maxM * 70 + (m.n ? 6 : 2)) +
          'px;opacity:' + (m.n ? 1 : .25) + '"></div>' +
        '<span class="mcl">' + m.label + '</span></div>';
    });
    html += '</div></div>';

    // Abdeckung je gefahrener Linie
    var driven = NET.map(function (n) { return { n: n, c: lineCov(n.nr) }; })
      .filter(function (x) { return x.c.trips; })
      .sort(function (x, y) { return y.c.pct - x.c.pct; });
    if (driven.length) {
      html += '<div class="stat-section">Abschnitte je Linie</div><div class="statcard">';
      driven.forEach(function (x) {
        html += barRow("ICE " + x.n.nr, x.c.done, x.c.total);
      });
      html += '</div>';
    }

    // Meistgenutzte Bahnhöfe (Ein- und Ausstiege)
    var byStation = {};
    trips.forEach(function (t) {
      [t.a, t.b].forEach(function (s) { if (s != null) byStation[s] = (byStation[s] || 0) + 1; });
    });
    var topSt = Object.keys(byStation).map(Number)
      .sort(function (x, y) { return byStation[y] - byStation[x]; }).slice(0, 6);
    if (topSt.length) {
      var maxS = byStation[topSt[0]];
      html += '<div class="stat-section">Ein- und Ausstiege</div><div class="statcard">';
      topSt.forEach(function (s) {
        html += '<div class="bar-row"><span class="bl">' + esc(stName(s)) + '</span>' +
          '<div class="bar"><div style="width:' + pct(byStation[s], maxS).toFixed(1) + '%"></div></div>' +
          '<span class="bn">' + byStation[s] + '×</span></div>';
      });
      html += '</div>';
    }

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
  function barRow(label, n, total) {
    var p = total && n ? Math.max(n / total * 100, 1.5) : 0;
    return '<div class="bar-row"><span class="bl">' + esc(label) + '</span>' +
      '<div class="bar"><div style="width:' + p.toFixed(1) + '%"></div></div>' +
      '<span class="bn">' + n + '/' + total + '</span></div>';
  }

  // ---------- Export / Import ----------
  function doExport() {
    var data = JSON.stringify({ v: 1, trips: trips.map(tripOut) });
    if (navigator.share) {
      navigator.share({ title: "ICE Verbindungen", text: data }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(data).then(function () { toast("In die Zwischenablage kopiert"); });
    } else {
      prompt("Fahrten kopieren:", data);
    }
  }
  function doImport() {
    var t = prompt("Exportierte Fahrten einfügen:");
    if (!t) return;
    try {
      var obj = JSON.parse(t);
      var arr = obj.trips || obj;
      var have = {}, n = 0;
      trips.forEach(function (x) { have[x.id] = 1; });
      arr.forEach(function (x) {
        var t = tripIn(x);
        if (!t || have[t.id]) return;
        have[t.id] = 1;
        trips.push(t);
        n++;
      });
      saveTrips(); invalidate(); render(); renderStats();
      toast(n + (n === 1 ? " Fahrt" : " Fahrten") + " importiert");
    } catch (e) { alert("Konnte die Daten nicht lesen."); }
  }
  function doReset() {
    confirmDialog({
      title: "Alles zurücksetzen?",
      text: "Alle " + trips.length + " Fahrten werden gelöscht. Das lässt sich nicht rückgängig machen.",
      ok: "Löschen", destructive: true
    }, function () {
      trips = []; saveTrips(); invalidate(); render(); renderStats();
      toast("Alle Fahrten gelöscht");
    });
  }

  // ---------- Sheets, Dialog, Toast ----------
  function showSheet(sheetId, backdropId) {
    var s = $(sheetId), b = $(backdropId);
    s.hidden = false; b.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { s.classList.add("show"); b.classList.add("show"); });
    });
  }
  function hideSheet(sheetId, backdropId) {
    var s = $(sheetId), b = $(backdropId);
    s.classList.remove("show"); b.classList.remove("show");
    setTimeout(function () { s.hidden = true; b.hidden = true; }, 300);
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
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1900);
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
    if (c.dataset.lf) state.lf = c.dataset.lf;
    if (c.dataset.ff) state.ff = c.dataset.ff;
    if (c.dataset.yf) state.yf = c.dataset.yf;
    render();
  });

  $("list").addEventListener("click", function (ev) {
    var card = ev.target.closest(".card");
    if (!card) return;
    if (card.dataset.line) openLine(card.dataset.line);
    else if (card.dataset.trip) openEdit(card.dataset.trip);
  });

  function switchView(v) {
    state.view = v;
    $("tabLinien").classList.toggle("active", v === "linien");
    $("tabKarte").classList.toggle("active", v === "karte");
    $("tabFahrten").classList.toggle("active", v === "fahrten");
    render();
    window.scrollTo({ top: 0 });
  }
  $("tabLinien").addEventListener("click", function () { switchView("linien"); });
  $("tabKarte").addEventListener("click", function () { switchView("karte"); });
  $("tabFahrten").addEventListener("click", function () { switchView("fahrten"); });
  $("tabAdd").addEventListener("click", function () { openEdit(null); });

  $("mapIn").addEventListener("click", function () { bigMap && bigMap.zoom(1 / 1.4); });
  $("mapOut").addEventListener("click", function () { bigMap && bigMap.zoom(1.4); });
  $("mapDE").addEventListener("click", function () { bigMap && bigMap.fitDefault(); });
  $("mapAll").addEventListener("click", function () { bigMap && bigMap.fitAll(); });
  $("mapInfo").addEventListener("click", function () {
    if (state.mapSel) openLine(state.mapSel);
  });
  window.addEventListener("resize", function () {
    if (bigMap && state.view === "karte") bigMap.resize();
  });

  $("statsBtn").addEventListener("click", function () {
    renderStats(); showSheet("statsSheet", "statsBackdrop");
  });
  $("statsClose").addEventListener("click", function () { hideSheet("statsSheet", "statsBackdrop"); });
  $("statsBackdrop").addEventListener("click", function () { hideSheet("statsSheet", "statsBackdrop"); });
  $("detailContent").addEventListener("click", function (ev) {
    var r = ev.target.closest("[data-trip]");
    if (r) { hideSheet("detailSheet", "detailBackdrop"); openEdit(r.dataset.trip); }
  });
  $("detailClose").addEventListener("click", function () { hideSheet("detailSheet", "detailBackdrop"); });
  $("detailBackdrop").addEventListener("click", function () { hideSheet("detailSheet", "detailBackdrop"); });
  $("editClose").addEventListener("click", function () { hideSheet("editSheet", "editBackdrop"); });
  $("editBackdrop").addEventListener("click", function () { hideSheet("editSheet", "editBackdrop"); });
  $("pickClose").addEventListener("click", function () { hideSheet("pickSheet", "pickBackdrop"); });
  $("pickBackdrop").addEventListener("click", function () { hideSheet("pickSheet", "pickBackdrop"); });
  $("pickSearch").addEventListener("input", renderPicker);
  $("pickContent").addEventListener("click", function (ev) {
    var r = ev.target.closest("[data-st]");
    if (!r) return;
    var i = parseInt(r.dataset.st, 10);
    if (pickTarget === "a") form.a = i; else form.b = i;
    if (form.a != null && form.a === form.b) {
      if (pickTarget === "a") form.b = null; else form.a = null;
    }
    hideSheet("pickSheet", "pickBackdrop");
    renderEdit();
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    if (openAlert) { openAlert(); return; }
    if (!$("pickSheet").hidden) { hideSheet("pickSheet", "pickBackdrop"); return; }
    if (!$("editSheet").hidden) { hideSheet("editSheet", "editBackdrop"); return; }
    if (!$("detailSheet").hidden) { hideSheet("detailSheet", "detailBackdrop"); return; }
    if (!$("statsSheet").hidden) { hideSheet("statsSheet", "statsBackdrop"); }
  });

  // Swipe-down zum Schließen
  [["detailSheet", "detailBackdrop"], ["editSheet", "editBackdrop"],
   ["pickSheet", "pickBackdrop"], ["statsSheet", "statsBackdrop"]].forEach(function (pair) {
    var el = $(pair[0]), startY = null;
    el.addEventListener("touchstart", function (ev) {
      var content = el.querySelector(".sheet-content");
      startY = content.scrollTop <= 0 ? ev.touches[0].clientY : null;
    }, { passive: true });
    el.addEventListener("touchmove", function (ev) {
      if (startY === null) return;
      if (ev.touches[0].clientY - startY > 70) {
        startY = null;
        hideSheet(pair[0], pair[1]);
      }
    }, { passive: true });
  });

  // ---------- Start ----------
  render();
})();
