/* Plane Spotting – Sichtungen sammeln

   Eingetippt wird nur der Code: Kennzeichen (D-AIMA) oder Flugnummer (LH400).
   Zeitpunkt, Position und Flughafen setzt die App selbst – die Uhr aus dem
   Gerät, die Position aus dem GPS, den Flughafen aus der Koordinate (nächster
   Platz aus AIRPORTS). Alles bleibt änderbar, nichts muss eingegeben werden. */
(function () {
  "use strict";

  var STORE_KEY = "planeSpotting.v1";
  var OPT_KEY = "planeSpotting.opt.v1";
  var GEO_MAX_AGE = 10 * 60 * 1000;      // so lange gilt eine einmal geholte Position
  var NEAR_LIMIT = 250;                  // km, weiter weg gilt kein Flughafen mehr als "hier"

  // ---------- Indexe ----------
  var AP_BY_ID = {};
  AIRPORTS.forEach(function (a) { AP_BY_ID[a[0]] = a; });
  var TYPE_BY_ID = {};
  TYPES.forEach(function (t) { TYPE_BY_ID[t[0]] = t; });
  var TYPE_CATS = [];
  TYPES.forEach(function (t) { if (TYPE_CATS.indexOf(t[3]) < 0) TYPE_CATS.push(t[3]); });

  // ---------- Persistenz ----------
  // Sichtung: { id, ts "YYYY-MM-DDTHH:MM", code, kind "reg"|"flt", ap ICAO,
  //             ll [lat,lon], reg, typ, typn, man, al, alc, cty, ctyn,
  //             fr, to, photo, note }
  function loadSpots() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORE_KEY));
      var arr = (raw && raw.spots) || [];
      return arr.map(spotIn).filter(Boolean);
    } catch (e) { return []; }
  }
  function spotIn(x) {
    if (!x || !x.code) return null;
    var s = { id: x.id || newId(), ts: x.ts || todayISO() + "T12:00",
              code: String(x.code).toUpperCase(), kind: x.kind || Lookup.kindOf(x.code) };
    ["ap", "reg", "typ", "typn", "man", "al", "alc", "cty", "ctyn", "fr", "to",
     "photo", "note"].forEach(function (k) { if (x[k]) s[k] = x[k]; });
    if (x.ll && x.ll.length === 2) s.ll = [+x.ll[0], +x.ll[1]];
    return s;
  }
  function saveSpots() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, spots: spots }));
    } catch (e) {}
  }
  var spots = loadSpots();

  function loadOpts() {
    try {
      var o = JSON.parse(localStorage.getItem(OPT_KEY)) || {};
      return { online: o.online !== false };
    } catch (e) { return { online: true }; }
  }
  function saveOpts() {
    try { localStorage.setItem(OPT_KEY, JSON.stringify(opts)); } catch (e) {}
  }
  var opts = loadOpts();

  // ---------- Zustand ----------
  var state = {
    view: "sicht",      // sicht | samml | karte
    sub: "flz",         // flz | typ | al   (in der Sammlung)
    q: "",
    yf: "alle",         // Jahr
    kf: "alle",         // alle | reg | flt
    tf: "alle",         // alle | ok | miss
    cat: "alle",        // Typ-Kategorie
    mapSel: null
  };

  // ---------- Helpers ----------
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function nowISO() {
    var d = new Date();
    return todayISO() + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function fmtDate(ts) {
    var p = String(ts || "").slice(0, 10).split("-");
    return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : "";
  }
  function fmtTime(ts) { return String(ts || "").slice(11, 16); }
  function fmtWhen(ts) {
    var d = String(ts || "").slice(0, 10), t = fmtTime(ts);
    var today = todayISO();
    var yest = new Date(Date.now() - 86400000);
    var y = yest.getFullYear() + "-" + pad(yest.getMonth() + 1) + "-" + pad(yest.getDate());
    var day = d === today ? "Heute" : (d === y ? "Gestern" : fmtDate(ts));
    return t ? day + ", " + t + " Uhr" : day;
  }
  function pct(n, total) { return total ? n / total * 100 : 0; }
  function fmtPct(p) { return p.toFixed(p >= 10 ? 0 : 1).replace(".", ",") + " %"; }
  function norm(s) {
    return String(s || "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe")
      .replace(/ü/g, "ue").replace(/ß/g, "ss");
  }
  function flag(iso) {
    if (!iso || iso.length !== 2) return "";
    return String.fromCodePoint(0x1F1E6 + iso.charCodeAt(0) - 65,
                                0x1F1E6 + iso.charCodeAt(1) - 65);
  }
  function fmtKm(km) {
    if (km == null) return "";
    return km < 10 ? km.toFixed(1).replace(".", ",") + " km" : Math.round(km) + " km";
  }

  // ---------- Flughäfen ----------
  function ap(icao) { return AP_BY_ID[icao] || null; }
  function apName(icao) {
    var a = ap(icao);
    if (!a) return icao || "";
    return a[3] || a[2];
  }
  function apFull(icao) {
    var a = ap(icao);
    return a ? a[2] : (icao || "");
  }
  function apCode(icao) {
    var a = ap(icao);
    if (!a) return icao || "";
    return a[1] ? a[1] + " / " + a[0] : a[0];
  }
  function apPos(icao) {
    var a = ap(icao);
    return a ? [a[5], a[6]] : null;
  }
  function distKm(a, b) {
    var R = 6371, dLat = (b[0] - a[0]) * Math.PI / 180, dLon = (b[1] - a[1]) * Math.PI / 180;
    var la1 = a[0] * Math.PI / 180, la2 = b[0] * Math.PI / 180;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  // Nächste Flughäfen zu einer Position. Grosse Plätze bekommen einen kleinen
  // Bonus: wer am Rand von Frankfurt steht, meint EDDF und nicht den Segelflug-
  // platz nebenan.
  function nearestAirports(ll, n) {
    var out = [];
    AIRPORTS.forEach(function (a) {
      var d = distKm(ll, [a[5], a[6]]);
      if (d > NEAR_LIMIT) return;
      out.push({ icao: a[0], d: d, rank: d - a[7] * 1.5 });
    });
    out.sort(function (x, y) { return x.rank - y.rank; });
    return out.slice(0, n || 4);
  }

  // ---------- Auswertung ----------
  function sortedSpots() {
    return spots.slice().sort(function (a, b) {
      return a.ts === b.ts ? (a.id < b.id ? 1 : -1) : (a.ts < b.ts ? 1 : -1);
    });
  }
  function planeKey(s) { return s.reg || s.code; }

  var AGG = null;
  function agg() {
    if (AGG) return AGG;
    var planes = {}, types = {}, airlines = {}, airports = {}, countries = {};
    sortedSpots().forEach(function (s) {
      var pk = planeKey(s);
      var p = planes[pk] = planes[pk] || { key: pk, n: 0, last: "", spots: [] };
      p.n++; p.spots.push(s);
      if (s.ts > p.last) p.last = s.ts;
      ["reg", "typ", "typn", "man", "al", "cty", "ctyn", "photo", "kind"].forEach(function (k) {
        if (s[k] && !p[k]) p[k] = s[k];
      });
      if (s.typ) {
        var t = types[s.typ] = types[s.typ] || { n: 0, last: "", planes: {} };
        t.n++; t.planes[pk] = 1;
        if (s.ts > t.last) t.last = s.ts;
      }
      if (s.al) {
        var a = airlines[s.al] = airlines[s.al] || { n: 0, last: "", planes: {}, alc: s.alc || "" };
        a.n++; a.planes[pk] = 1;
        if (s.ts > a.last) a.last = s.ts;
      }
      if (s.ap) {
        var f = airports[s.ap] = airports[s.ap] || { n: 0, last: "" };
        f.n++;
        if (s.ts > f.last) f.last = s.ts;
      }
      if (s.cty) countries[s.cty] = (countries[s.cty] || 0) + 1;
    });
    var listed = Object.keys(types).filter(function (t) { return !!TYPE_BY_ID[t]; });
    AGG = { planes: planes, types: types, airlines: airlines, airports: airports,
            countries: countries,
            nPlanes: Object.keys(planes).length,
            nTypes: Object.keys(types).length,
            nListed: listed.length,
            nAirlines: Object.keys(airlines).length };
    return AGG;
  }
  function invalidate() { AGG = null; }

  // ---------- Filter ----------
  function spotYears() {
    var seen = {};
    spots.forEach(function (s) { if (s.ts) seen[s.ts.slice(0, 4)] = 1; });
    return Object.keys(seen).sort().reverse();
  }
  function spotHay(s) {
    return norm([s.code, s.reg, s.al, s.typ, s.typn, s.man, s.ctyn, s.note,
                 s.ap, apFull(s.ap), apName(s.ap), s.fr, s.to, fmtDate(s.ts)].join(" "));
  }
  function filteredSpots() {
    var q = norm(state.q);
    return sortedSpots().filter(function (s) {
      if (state.yf !== "alle" && s.ts.slice(0, 4) !== state.yf) return false;
      if (state.kf !== "alle" && s.kind !== state.kf) return false;
      if (q && spotHay(s).indexOf(q) < 0) return false;
      return true;
    });
  }

  // ---------- Chips ----------
  function renderChips() {
    var html = "";
    function chip(attr, val, label, on) {
      return '<button class="chip' + (on ? " active" : "") + '" data-' + attr + '="' +
        val + '">' + label + '</button>';
    }
    if (state.view === "sicht") {
      html += chip("kf", "alle", "Alle", state.kf === "alle");
      html += chip("kf", "reg", "Kennzeichen", state.kf === "reg");
      html += chip("kf", "flt", "Flugnummern", state.kf === "flt");
      var years = spotYears();
      if (years.length > 1) {
        html += '<span class="chip-sep"></span>';
        html += chip("yf", "alle", "Alle&nbsp;Jahre", state.yf === "alle");
        years.forEach(function (y) { html += chip("yf", y, y, state.yf === y); });
      }
    } else if (state.view === "samml") {
      html += chip("sub", "flz", "Flugzeuge", state.sub === "flz");
      html += chip("sub", "typ", "Typen", state.sub === "typ");
      html += chip("sub", "al", "Airlines", state.sub === "al");
      if (state.sub === "typ") {
        html += '<span class="chip-sep"></span>';
        html += chip("tf", "alle", "Alle", state.tf === "alle");
        html += chip("tf", "ok", "Gesammelt", state.tf === "ok");
        html += chip("tf", "miss", "Fehlt", state.tf === "miss");
        html += '<span class="chip-sep"></span>';
        html += chip("cat", "alle", "Alle&nbsp;Kategorien", state.cat === "alle");
        TYPE_CATS.forEach(function (c) {
          html += chip("cat", c, esc(c), state.cat === c);
        });
      }
    }
    $("chips").innerHTML = html;
  }

  // ---------- Rendern ----------
  function render() {
    var a = agg();
    var isMap = state.view === "karte";
    $("headerCount").textContent = a.nListed + "/" + TYPES.length;
    $("title").innerHTML = isMap ? "Karte"
      : (state.view === "sicht" ? "Plane&nbsp;Spotting" : "Sammlung");
    $("search").placeholder = state.view === "sicht"
      ? "Kennzeichen, Airline oder Flughafen" : "Typ, Kennzeichen oder Airline";
    document.querySelector(".searchwrap").hidden = isMap;
    $("chips").hidden = isMap || state.view === "karte";
    $("mapView").hidden = !isMap;
    $("listMeta").hidden = isMap;
    $("list").hidden = isMap;
    document.querySelector(".credits").hidden = isMap;
    if (isMap) { $("empty").hidden = true; renderMap(); return; }

    if (state.yf !== "alle" && spotYears().indexOf(state.yf) < 0) state.yf = "alle";
    renderChips();
    if (state.view === "sicht") renderSpotList();
    else renderCollection();
  }

  function spotCard(s) {
    var title = s.reg || s.code;
    var sub = [];
    if (s.al) sub.push('<span class="badge">' + esc(s.al) + '</span>');
    if (s.typ) {
      sub.push('<span class="badge soft">' + esc(Lookup.typeName(s.typ)) + '</span>');
    } else if (s.typn) {
      sub.push('<span class="badge soft">' + esc(s.typn) + '</span>');
    }
    if (s.kind === "flt" && s.code !== title) sub.push('<span>' + esc(s.code) + '</span>');
    if (s.fr && s.to) {
      sub.push('<span class="badge route">' + esc(apName(s.fr)) + ' → ' + esc(apName(s.to)) + '</span>');
    }
    if (s.ap) sub.push('<span>' + esc(apName(s.ap)) + '</span>');
    return '<div class="card" data-spot="' + esc(s.id) + '">' +
      '<div class="regbadge">' + (s.cty ? '<span class="flag">' + flag(s.cty) + '</span>' : "") +
        esc(title) + '</div>' +
      '<div class="card-body">' +
        '<div class="card-name">' + esc(s.typn || Lookup.typeName(s.typ) || s.al || "Sichtung") + '</div>' +
        '<div class="card-sub">' + sub.join("") + '</div>' +
      '</div>' +
      '<div class="card-right"><b>' + fmtTime(s.ts) + '</b>' + fmtDate(s.ts) + '</div>' +
    '</div>';
  }

  function renderSpotList() {
    var arr = filteredSpots();
    $("list").innerHTML = arr.map(spotCard).join("");
    $("listMeta").textContent = arr.length + (arr.length === 1 ? " Sichtung" : " Sichtungen") +
      (spots.length !== arr.length ? " von " + spots.length : "");
    $("emptyText").textContent = spots.length ? "Keine Sichtung gefunden"
      : "Noch nichts gespottet – tippe auf ✈︎ Spotten";
    $("empty").hidden = arr.length > 0;
  }

  function renderCollection() {
    var a = agg(), q = norm(state.q), html = "", meta = "", empty = "Nichts gefunden";
    if (state.sub === "flz") {
      var keys = Object.keys(a.planes).filter(function (k) {
        if (!q) return true;
        var p = a.planes[k];
        return norm([k, p.reg, p.al, p.typ, p.typn, p.man, p.ctyn].join(" ")).indexOf(q) >= 0;
      }).sort(function (x, y) { return a.planes[y].last < a.planes[x].last ? -1 : 1; });
      keys.forEach(function (k) {
        var p = a.planes[k];
        html += '<div class="card" data-plane="' + esc(k) + '">' +
          '<div class="regbadge">' + (p.cty ? '<span class="flag">' + flag(p.cty) + '</span>' : "") +
            esc(k) + '</div>' +
          '<div class="card-body">' +
            '<div class="card-name">' + esc(p.typn || Lookup.typeName(p.typ) || p.al || "Flugzeug") + '</div>' +
            '<div class="card-sub">' +
              (p.al ? '<span class="badge">' + esc(p.al) + '</span>' : "") +
              (p.typ ? '<span class="badge soft">' + esc(p.typ) + '</span>' : "") +
              '<span>zuletzt ' + esc(fmtDate(p.last)) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="card-right"><b>' + p.n + '</b>' + (p.n === 1 ? "Sichtung" : "Sichtungen") + '</div>' +
        '</div>';
      });
      meta = keys.length + (keys.length === 1 ? " Flugzeug" : " Flugzeuge");
      empty = spots.length ? "Kein Flugzeug gefunden" : "Noch kein Flugzeug gesammelt";
    } else if (state.sub === "typ") {
      var list = TYPES.filter(function (t) {
        var seen = a.types[t[0]];
        if (state.tf === "ok" && !seen) return false;
        if (state.tf === "miss" && seen) return false;
        if (state.cat !== "alle" && t[3] !== state.cat) return false;
        if (q && norm(t.join(" ")).indexOf(q) < 0) return false;
        return true;
      });
      list.forEach(function (t) {
        var seen = a.types[t[0]];
        html += '<div class="card' + (seen ? " done" : " miss") + '" data-type="' + esc(t[0]) + '">' +
          '<div class="regbadge type sm">' + esc(t[0]) + '</div>' +
          '<div class="card-body">' +
            '<div class="card-name">' + esc(t[1]) + '</div>' +
            '<div class="card-sub"><span>' + esc(t[2]) + '</span>' +
              '<span class="badge soft">' + esc(t[3]) + '</span>' +
              (seen ? '<span>zuletzt ' + esc(fmtDate(seen.last)) + '</span>' : "") +
            '</div>' +
          '</div>' +
          (seen ? '<div class="card-right"><b>' + seen.n + '</b>' +
                  Object.keys(seen.planes).length + ' Flz.</div>'
                : '<div class="card-right">fehlt</div>') +
        '</div>';
      });
      meta = a.nListed + " von " + TYPES.length + " Typen gesammelt";
      empty = "Kein Typ gefunden";
    } else {
      var als = Object.keys(a.airlines).filter(function (k) {
        return !q || norm(k + " " + a.airlines[k].alc).indexOf(q) >= 0;
      }).sort(function (x, y) { return a.airlines[y].n - a.airlines[x].n; });
      als.forEach(function (k) {
        var al = a.airlines[k];
        html += '<div class="card" data-airline="' + esc(k) + '">' +
          '<div class="regbadge sm">' + esc(al.alc || k.slice(0, 3).toUpperCase()) + '</div>' +
          '<div class="card-body">' +
            '<div class="card-name">' + esc(k) + '</div>' +
            '<div class="card-sub">' +
              '<span>' + Object.keys(al.planes).length + ' Flugzeug' +
                (Object.keys(al.planes).length === 1 ? "" : "e") + '</span>' +
              '<span>· zuletzt ' + esc(fmtDate(al.last)) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="card-right"><b>' + al.n + '</b>' + (al.n === 1 ? "Sichtung" : "Sichtungen") + '</div>' +
        '</div>';
      });
      meta = als.length + (als.length === 1 ? " Airline" : " Airlines");
      empty = spots.length ? "Keine Airline gefunden" : "Noch keine Airline gesammelt";
    }
    $("list").innerHTML = html;
    $("listMeta").textContent = meta;
    $("emptyText").textContent = empty;
    $("empty").hidden = !!html;
  }

  // ---------- Karte ----------
  var bigMap = null;
  function mapState() {
    var a = agg(), sp = {}, routes = [], seen = {};
    Object.keys(a.airports).forEach(function (icao) {
      if (!ap(icao)) return;
      sp[icao] = { n: a.airports[icao].n, label: apName(icao) };
    });
    spots.forEach(function (s) {
      if (!s.fr || !s.to || !ap(s.fr) || !ap(s.to)) return;
      var key = s.fr + ">" + s.to;
      if (seen[key]) return;
      seen[key] = 1;
      routes.push([s.fr, s.to]);
    });
    return { spots: sp, routes: routes, pos: apPos, selected: state.mapSel };
  }
  function renderMap() {
    if (!bigMap) {
      bigMap = SpotMap.create($("mapWrap"), {
        interactive: true,
        onSelect: function (icao) {
          state.mapSel = (icao && icao === state.mapSel) ? null : icao;
          bigMap.select(state.mapSel);
          renderMapInfo();
        }
      });
    }
    bigMap.update(mapState());
    bigMap.resize();
    renderMapInfo();
  }
  function renderMapInfo() {
    var box = $("mapInfo"), icao = state.mapSel;
    if (!icao || !ap(icao)) { box.hidden = true; return; }
    var a = agg().airports[icao];
    $("mapInfoBadge").innerHTML = '<div class="regbadge sm">' + esc(ap(icao)[1] || icao) + '</div>';
    $("mapInfoName").textContent = apFull(icao);
    $("mapInfoSub").textContent = a
      ? a.n + (a.n === 1 ? " Sichtung" : " Sichtungen") + " · zuletzt " + fmtDate(a.last)
      : "keine Sichtung";
    box.hidden = false;
  }

  // ---------- Sichtung eintragen ----------
  // form: { id, code, ts, ap, ll, info, note, manualAp, more }
  var form = null, lookupTimer = null, lookupSeq = 0;
  var geo = { pos: null, t: 0, state: "idle" };   // idle | wait | ok | deny | off

  function openEdit(id, presetCode) {
    var s = id ? spots.filter(function (x) { return x.id === id; })[0] : null;
    if (s) {
      form = { id: s.id, code: s.code, ts: s.ts, ap: s.ap || "", ll: s.ll || null,
               note: s.note || "", info: infoOf(s), manualAp: true, more: true };
    } else {
      form = { id: null, code: presetCode || "", ts: nowISO(), ap: lastAirport(),
               ll: null, note: "", info: null, manualAp: false, more: false };
    }
    $("editTitle").textContent = s ? "Sichtung bearbeiten" : "Sichtung eintragen";
    renderEdit();
    showSheet("editSheet", "editBackdrop");
    if (!s) {
      locate();
      if (presetCode) runLookup(presetCode);
      setTimeout(function () { var f = $("fCode"); if (f) f.focus(); }, 380);
    }
  }
  function infoOf(s) {
    var info = { code: s.code, kind: s.kind, src: "gespeichert" };
    ["reg", "typ", "typn", "man", "al", "alc", "cty", "ctyn", "fr", "to", "photo"]
      .forEach(function (k) { if (s[k]) info[k] = s[k]; });
    return info;
  }
  function lastAirport() {
    var arr = sortedSpots();
    for (var i = 0; i < arr.length; i++) if (arr[i].ap) return arr[i].ap;
    return "";
  }

  function renderEdit() {
    var html =
      '<input type="text" id="fCode" value="' + esc(form.code) + '" ' +
        'placeholder="D-AIMA" autocomplete="off" autocorrect="off" ' +
        'autocapitalize="characters" spellcheck="false" enterkeyhint="done">' +
      '<div class="code-hint">Kennzeichen oder Flugnummer – mehr braucht es nicht</div>' +
      '<div id="lkBox"></div>' +
      '<div class="form-section">Automatisch' +
        '<span class="fs-right" id="toggleMore">' + (form.more ? "fertig" : "ändern") + '</span>' +
      '</div>' +
      '<div id="autoBox"></div>' +
      '<button class="big-btn" id="fSave">Speichern</button>' +
      (form.id ? '<button class="text-btn" id="fDelete">Sichtung löschen</button>' : "");
    $("editContent").innerHTML = html;
    $("editContent").scrollTop = 0;

    var inp = $("fCode");
    inp.addEventListener("input", function () {
      var v = Lookup.normalize(this.value);
      if (v !== this.value) {
        var at = this.selectionStart;
        this.value = v;
        try { this.setSelectionRange(at, at); } catch (e) {}
      }
      form.code = v;
      updateSave();
      clearTimeout(lookupTimer);
      lookupTimer = setTimeout(function () { runLookup(form.code); }, 420);
    });
    inp.addEventListener("change", function () { runLookup(form.code); });
    inp.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); this.blur(); runLookup(form.code); }
    });
    $("toggleMore").addEventListener("click", function () {
      form.more = !form.more;
      renderEdit();
    });
    $("fSave").addEventListener("click", saveForm);
    if ($("fDelete")) $("fDelete").addEventListener("click", deleteForm);

    updateLookup();
    updateAuto();
    updateSave();
  }

  function updateSave() {
    var b = $("fSave");
    if (b) b.disabled = !form.code;
  }

  // --- Code auflösen ---
  function runLookup(code) {
    if (!code) { form.info = null; updateLookup(); return; }
    var seq = ++lookupSeq;
    Lookup.resolve(code, opts.online, function (info, final) {
      if (seq !== lookupSeq) return;          // inzwischen weitergetippt
      form.info = info;
      form.pending = !final;
      updateLookup();
      // Bei einer Flugnummer mit bekannter Route: steht man an Start oder Ziel,
      // ist das der Flughafen der Sichtung.
      if (final && !form.manualAp && geo.pos && (info.fr || info.to)) {
        [info.fr, info.to].forEach(function (icao) {
          if (!icao || !apPos(icao)) return;
          if (distKm(geo.pos, apPos(icao)) < 30) { form.ap = icao; }
        });
        updateAuto();
      }
    });
  }

  function updateLookup() {
    var box = $("lkBox");
    if (!box) return;
    var i = form.info;
    if (!form.code) {
      box.innerHTML = '<div class="lookup waiting"><div class="lk-body">' +
        '<div class="lk-name">Code eingeben</div>' +
        '<div class="lk-sub">z.&nbsp;B. D-AIMA, HB-JHA, N12345 oder LH400</div>' +
        '</div></div>';
      return;
    }
    if (!i || !i.kind) {
      box.innerHTML = '<div class="lookup"><div class="lk-body">' +
        '<div class="lk-name">' + esc(form.code) + '</div>' +
        '<div class="lk-sub">Kein bekanntes Muster – wird als Notiz gespeichert.</div>' +
        '</div></div>';
      return;
    }
    var name = i.typn || Lookup.typeName(i.typ) || i.al ||
      (i.kind === "reg" ? "Kennzeichen" : "Flugnummer");
    var sub = [];
    if (i.al && (i.typn || i.typ)) sub.push(esc(i.al));
    if (i.kind === "reg") {
      if (i.ctyn) sub.push(flag(i.cty) + " " + esc(i.ctyn));
      if (i.dcls) sub.push(esc(i.dcls));
      if (i.typ) sub.push(esc(i.typ));
    } else {
      if (i.fr && i.to) {
        sub.push(esc(apName(i.fr) || i.fr) + " → " + esc(apName(i.to) || i.to));
      }
      if (i.aln) sub.push(esc(i.aln));
    }
    if (form.pending) sub.push("wird online ergänzt …");
    else if (i.src === "offline" && opts.online && i.kind) sub.push("offline erkannt");

    box.innerHTML = '<div class="lookup">' +
      (form.pending ? '<div class="spinner"></div>' : "") +
      (i.photo ? '<img class="lk-photo" src="' + esc(i.photo) + '" alt="">' : "") +
      '<div class="lk-body"><div class="lk-name">' + esc(name) + '</div>' +
      '<div class="lk-sub">' + sub.join(" · ") + '</div></div></div>';
  }

  // --- Zeit, Ort, Flughafen ---
  function locate() {
    if (geo.pos && Date.now() - geo.t < GEO_MAX_AGE) { applyPos(geo.pos); return; }
    if (!navigator.geolocation) { geo.state = "off"; updateAuto(); return; }
    geo.state = "wait";
    updateAuto();
    navigator.geolocation.getCurrentPosition(function (p) {
      geo.pos = [p.coords.latitude, p.coords.longitude];
      geo.t = Date.now();
      geo.state = "ok";
      applyPos(geo.pos);
    }, function (err) {
      geo.state = err && err.code === 1 ? "deny" : "off";
      updateAuto();
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: GEO_MAX_AGE });
  }
  function applyPos(pos) {
    if (!form) return;
    form.ll = pos;
    if (!form.manualAp) {
      var near = nearestAirports(pos, 1);
      if (near.length) form.ap = near[0].icao;
    }
    updateAuto();
  }

  function updateAuto() {
    var box = $("autoBox");
    if (!box) return;
    var html = "";
    if (!form.more) {
      var apLine = form.ap
        ? esc(apFull(form.ap)) + " (" + esc(form.ap) + ")"
        : (geo.state === "wait" ? "wird bestimmt …" : "kein Flughafen");
      var dist = form.ll && form.ap && apPos(form.ap)
        ? fmtKm(distKm(form.ll, apPos(form.ap))) : "";
      html = '<div class="form-group">' +
        '<div class="form-row"><span class="k">Zeit</span><span class="v">' +
          esc(fmtWhen(form.ts)) + '</span></div>' +
        '<div class="form-row"><span class="k">Flughafen</span><span class="v">' +
          apLine + '</span></div>' +
        (dist ? '<div class="form-row"><span class="k">Entfernung</span><span class="v">' +
          esc(dist) + '</span></div>' : "") +
      '</div>';
      html += geoHint();
    } else {
      html = '<div class="form-group">' +
        '<div class="form-row"><span class="k">Datum</span>' +
          '<input type="date" id="fDate" value="' + esc(form.ts.slice(0, 10)) + '"></div>' +
        '<div class="form-row"><span class="k">Uhrzeit</span>' +
          '<input type="time" id="fTime" value="' + esc(fmtTime(form.ts) || "12:00") + '"></div>' +
        '<div class="form-row"><span class="k">Flughafen</span>' +
          '<button class="picker-btn' + (form.ap ? "" : " empty") + '" id="fAp">' +
            (form.ap ? esc(apFull(form.ap)) : "Flughafen wählen") + '</button></div>' +
        '<div class="form-row"><span class="k">Notiz</span>' +
          '<input type="text" id="fNote" value="' + esc(form.note) + '" placeholder="optional"></div>' +
      '</div>';
      if (geo.pos) {
        html += '<div class="form-section">In der Nähe</div><div class="nearby">';
        nearestAirports(geo.pos, 4).forEach(function (n) {
          html += '<button class="nb' + (n.icao === form.ap ? " active" : "") +
            '" data-near="' + esc(n.icao) + '">' + esc(apName(n.icao)) +
            '<span class="dist">' + esc(fmtKm(n.d)) + '</span></button>';
        });
        html += '</div>';
      }
      html += geoHint();
    }
    box.innerHTML = html;

    if ($("fDate")) $("fDate").addEventListener("change", function () {
      form.ts = (this.value || todayISO()) + "T" + (fmtTime(form.ts) || "12:00");
    });
    if ($("fTime")) $("fTime").addEventListener("change", function () {
      form.ts = form.ts.slice(0, 10) + "T" + (this.value || "12:00");
    });
    if ($("fNote")) $("fNote").addEventListener("input", function () { form.note = this.value; });
    if ($("fAp")) $("fAp").addEventListener("click", openAirportPicker);
    box.querySelectorAll("[data-near]").forEach(function (b) {
      b.addEventListener("click", function () {
        form.ap = this.dataset.near;
        form.manualAp = true;
        updateAuto();
      });
    });
    if ($("geoRetry")) $("geoRetry").addEventListener("click", function () {
      geo.pos = null; form.manualAp = false; locate();
    });
  }
  function geoHint() {
    if (geo.state === "wait") return '<div class="hint">Position wird bestimmt …</div>';
    if (geo.state === "deny") {
      return '<div class="hint warn">Ohne Standortfreigabe rät die App nicht mit – ' +
        'Flughafen bitte über „ändern“ wählen. ' +
        '<span class="fs-right" id="geoRetry">nochmal versuchen</span></div>';
    }
    if (geo.state === "off") {
      return '<div class="hint">Kein Standort verfügbar. ' +
        '<span class="fs-right" id="geoRetry">nochmal versuchen</span></div>';
    }
    return "";
  }

  function saveForm() {
    var code = Lookup.normalize(form.code);
    if (!code) return;
    var i = form.info && form.info.code === code ? form.info : Lookup.offline(code);
    var s = { id: form.id || newId(), ts: form.ts, code: code,
              kind: i.kind || Lookup.kindOf(code) };
    if (form.ap) s.ap = form.ap;
    if (form.ll) s.ll = form.ll;
    if (form.note) s.note = form.note;
    ["reg", "typ", "typn", "man", "al", "alc", "cty", "ctyn", "fr", "to", "photo"]
      .forEach(function (k) { if (i[k]) s[k] = i[k]; });

    var idx = -1;
    spots.forEach(function (x, k) { if (x.id === s.id) idx = k; });
    if (idx >= 0) spots[idx] = s; else spots.push(s);
    saveSpots(); invalidate(); render();
    hideSheet("editSheet", "editBackdrop");
    toast(idx >= 0 ? "Sichtung aktualisiert" : "Sichtung gespeichert");
  }

  function deleteForm() {
    var s = spots.filter(function (x) { return x.id === form.id; })[0];
    if (!s) return;
    confirmDialog({
      title: "Sichtung löschen?",
      text: (s.reg || s.code) + " vom " + fmtDate(s.ts) +
        " wird entfernt. Das lässt sich nicht rückgängig machen.",
      ok: "Löschen", destructive: true
    }, function () {
      spots = spots.filter(function (x) { return x.id !== form.id; });
      saveSpots(); invalidate(); render();
      hideSheet("editSheet", "editBackdrop");
      toast("Sichtung gelöscht");
    });
  }

  // ---------- Flughafen- und Typauswahl ----------
  var pickMode = null, pickCb = null;
  function openAirportPicker() {
    pickMode = "ap";
    $("pickTitle").textContent = "Flughafen";
    $("pickSearch").placeholder = "Name, Stadt, ICAO oder IATA";
    $("pickSearch").value = "";
    renderPicker();
    showSheet("pickSheet", "pickBackdrop");
    setTimeout(function () { $("pickSearch").focus(); }, 320);
  }
  function renderPicker() {
    var q = norm($("pickSearch").value.trim()), html = "";
    if (pickMode !== "ap") return;
    var list = [];
    if (!q && geo.pos) {
      html += '<div class="hist-title">In der Nähe</div>';
      nearestAirports(geo.pos, 8).forEach(function (n) { list.push([n.icao, n.d]); });
    } else if (!q) {
      html += '<div class="hist-title">Zuletzt benutzt</div>';
      var seen = {};
      sortedSpots().forEach(function (s) {
        if (s.ap && !seen[s.ap] && list.length < 12) { seen[s.ap] = 1; list.push([s.ap, null]); }
      });
      if (!list.length) {
        AIRPORTS.forEach(function (a) {
          if (a[4] === "DE" && a[7] === 2 && list.length < 14) list.push([a[0], null]);
        });
      }
    } else {
      AIRPORTS.forEach(function (a) {
        if (list.length >= 60) return;
        var hay = norm(a[0] + " " + a[1] + " " + a[2] + " " + a[3]);
        if (hay.indexOf(q) >= 0) list.push([a[0], null]);
      });
      list.sort(function (x, y) {
        var ax = ap(x[0]), ay = ap(y[0]);
        return (ay[7] - ax[7]) || ax[2].localeCompare(ay[2], "de");
      });
    }
    list.forEach(function (e) {
      var a = ap(e[0]);
      if (!a) return;
      html += '<div class="pick-row' + (e[0] === (form && form.ap) ? " sel" : "") +
        '" data-ap="' + esc(e[0]) + '">' +
        '<div><div class="pn">' + esc(a[2]) + '</div>' +
        '<div class="ps">' + esc(apCode(e[0])) + (a[3] ? " · " + esc(a[3]) : "") +
          " · " + flag(a[4]) + (e[1] != null ? " · " + esc(fmtKm(e[1])) : "") + '</div></div>' +
        (e[0] === (form && form.ap) ? '<span class="badge">gewählt</span>' : "") +
      '</div>';
    });
    if (!list.length) html = '<div class="hint">Kein Flughafen gefunden.</div>';
    $("pickContent").innerHTML = html;
  }

  // ---------- Detailansichten ----------
  function kv(k, v) {
    return '<div class="kv"><span class="k">' + esc(k) + '</span><span class="v">' +
      esc(v) + '</span></div>';
  }
  function spotRows(list) {
    return '<div class="hist">' + list.map(function (s) {
      var bits = [fmtWhen(s.ts)];
      if (s.ap) bits.push(apName(s.ap));
      if (s.note) bits.push(s.note);
      return '<div class="trip-row" data-spot="' + esc(s.id) + '">' +
        '<div class="tr-main"><div>' + esc(s.reg || s.code) +
          (s.kind === "flt" && s.reg ? " · " + esc(s.code) : "") + '</div>' +
        '<div class="tr-sub">' + esc(bits.join(" · ")) + '</div></div>' +
        (s.fr && s.to ? '<span class="badge route">' + esc(ap(s.fr) ? ap(s.fr)[1] || s.fr : s.fr) +
          '→' + esc(ap(s.to) ? ap(s.to)[1] || s.to : s.to) + '</span>' : "") +
      '</div>';
    }).join("") + '</div>';
  }

  function openPlane(key) {
    var p = agg().planes[key];
    if (!p) return;
    var html =
      '<div class="detail-top">' +
        '<div class="regbadge big">' + (p.cty ? '<span class="flag">' + flag(p.cty) + '</span>' : "") +
          esc(key) + '</div>' +
        '<div><div class="detail-name">' + esc(p.typn || Lookup.typeName(p.typ) || "Flugzeug") + '</div>' +
        '<div class="detail-sub">' + esc([p.al, p.ctyn].filter(Boolean).join(" · ")) + '</div></div>' +
      '</div>';
    if (p.photo) {
      html += '<img class="detail-photo" id="planePhoto" src="' + esc(p.photo) + '" alt="">';
    }
    html += '<div class="kv-table">' +
      (p.reg ? kv("Kennzeichen", p.reg) : "") +
      (p.typ ? kv("Typ", p.typ + " · " + Lookup.typeName(p.typ)) : "") +
      (p.man ? kv("Hersteller", p.man) : "") +
      (p.al ? kv("Halter", p.al) : "") +
      (p.ctyn ? kv("Staat", p.ctyn) : "") +
      kv("Sichtungen", String(p.n)) +
      kv("Zuletzt", fmtWhen(p.last)) +
    '</div>' +
    '<button class="big-btn" id="againBtn">Nochmal gesehen</button>' +
    '<div class="hist-title">Meine Sichtungen</div>' + spotRows(p.spots);

    $("detailTitle").textContent = key;
    $("detailContent").innerHTML = html;
    $("detailContent").scrollTop = 0;
    $("againBtn").addEventListener("click", function () {
      hideSheet("detailSheet", "detailBackdrop");
      setTimeout(function () { openEdit(null, key); }, 180);
    });
    if ($("planePhoto")) {
      $("planePhoto").addEventListener("click", function () {
        openLightbox(this.src, key, p.typn || Lookup.typeName(p.typ));
      });
    }
    showSheet("detailSheet", "detailBackdrop");
  }

  function openType(code) {
    var t = TYPE_BY_ID[code], a = agg(), seen = a.types[code];
    if (!t) return;
    var mine = spots.filter(function (s) { return s.typ === code; })
      .sort(function (x, y) { return x.ts < y.ts ? 1 : -1; });
    var html =
      '<div class="detail-top">' +
        '<div class="regbadge big type">' + esc(t[0]) + '</div>' +
        '<div><div class="detail-name">' + esc(t[1]) + '</div>' +
        '<div class="detail-sub">' + esc(t[2] + " · " + t[3]) + '</div></div>' +
      '</div>' +
      '<div class="kv-table">' +
        kv("Status", seen ? "gesammelt" : "fehlt noch") +
        kv("Sichtungen", String(seen ? seen.n : 0)) +
        kv("Flugzeuge", String(seen ? Object.keys(seen.planes).length : 0)) +
        (seen ? kv("Zuletzt", fmtWhen(seen.last)) : "") +
      '</div>';
    if (mine.length) html += '<div class="hist-title">Meine Sichtungen</div>' + spotRows(mine);
    else html += '<div class="hint">Diesen Typ hast du noch nicht eingetragen.</div>';
    $("detailTitle").textContent = t[1];
    $("detailContent").innerHTML = html;
    $("detailContent").scrollTop = 0;
    showSheet("detailSheet", "detailBackdrop");
  }

  function openAirline(name) {
    var al = agg().airlines[name];
    if (!al) return;
    var mine = spots.filter(function (s) { return s.al === name; })
      .sort(function (x, y) { return x.ts < y.ts ? 1 : -1; });
    var byType = {};
    mine.forEach(function (s) { if (s.typ) byType[s.typ] = (byType[s.typ] || 0) + 1; });
    var html =
      '<div class="detail-top">' +
        '<div class="regbadge big">' + esc(al.alc || name.slice(0, 3).toUpperCase()) + '</div>' +
        '<div><div class="detail-name">' + esc(name) + '</div>' +
        '<div class="detail-sub">' + al.n + (al.n === 1 ? " Sichtung" : " Sichtungen") + '</div></div>' +
      '</div>' +
      '<div class="kv-table">' +
        kv("Flugzeuge", String(Object.keys(al.planes).length)) +
        kv("Typen", String(Object.keys(byType).length)) +
        kv("Zuletzt", fmtWhen(al.last)) +
      '</div>';
    var tk = Object.keys(byType).sort(function (x, y) { return byType[y] - byType[x]; });
    if (tk.length) {
      html += '<div class="stat-section">Typen</div><div class="statcard">';
      var max = byType[tk[0]];
      tk.forEach(function (t) {
        html += '<div class="bar-row"><span class="bl">' + esc(Lookup.typeName(t)) + '</span>' +
          '<div class="bar"><div style="width:' + pct(byType[t], max).toFixed(1) + '%"></div></div>' +
          '<span class="bn">' + byType[t] + '×</span></div>';
      });
      html += '</div>';
    }
    html += '<div class="hist-title">Meine Sichtungen</div>' + spotRows(mine);
    $("detailTitle").textContent = name;
    $("detailContent").innerHTML = html;
    $("detailContent").scrollTop = 0;
    showSheet("detailSheet", "detailBackdrop");
  }

  function openAirport(icao) {
    var a = ap(icao);
    if (!a) return;
    var mine = spots.filter(function (s) { return s.ap === icao; })
      .sort(function (x, y) { return x.ts < y.ts ? 1 : -1; });
    var html =
      '<div class="detail-top">' +
        '<div class="regbadge big">' + esc(a[1] || icao) + '</div>' +
        '<div><div class="detail-name">' + esc(a[2]) + '</div>' +
        '<div class="detail-sub">' + esc(apCode(icao)) + '</div></div>' +
      '</div>' +
      '<div class="kv-table">' +
        (a[3] ? kv("Stadt", a[3]) : "") +
        kv("Land", flag(a[4]) + " " + a[4]) +
        kv("Sichtungen", String(mine.length)) +
      '</div>';
    if (mine.length) html += '<div class="hist-title">Meine Sichtungen</div>' + spotRows(mine);
    $("detailTitle").textContent = a[1] || icao;
    $("detailContent").innerHTML = html;
    $("detailContent").scrollTop = 0;
    showSheet("detailSheet", "detailBackdrop");
  }

  // ---------- Lightbox ----------
  function openLightbox(src, name, sub) {
    $("lbImg").innerHTML = '<img src="' + esc(src) + '" alt="">';
    $("lbCap").innerHTML = '<div class="lb-name">' + esc(name) + '</div>' +
      (sub ? '<div class="lb-sub">' + esc(sub) + '</div>' : "");
    var lb = $("lightbox");
    lb.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { lb.classList.add("show"); });
    });
  }
  function closeLightbox() {
    var lb = $("lightbox");
    lb.classList.remove("show");
    setTimeout(function () { lb.hidden = true; }, 220);
  }

  // ---------- Statistik ----------
  function renderStats() {
    var a = agg();
    var p = pct(a.nListed, TYPES.length);
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
          '<span class="ring-frac">' + a.nListed + '/' + TYPES.length + '</span>' +
          '<span class="ring-pct">' + fmtPct(p) + '</span>' +
          '<span class="ring-sub">TYPEN</span>' +
        '</div>' +
      '</div></div>';

    html += '<div class="tiles">' +
      '<div class="tile"><div class="tv">' + spots.length + '</div><div class="tl">Sichtungen</div></div>' +
      '<div class="tile"><div class="tv">' + a.nPlanes + '</div><div class="tl">verschiedene<br>Flugzeuge</div></div>' +
      '<div class="tile"><div class="tv">' + a.nAirlines + '</div><div class="tl">Airlines</div></div>' +
    '</div>';

    var extra = a.nTypes - a.nListed;
    if (extra > 0) {
      html += '<div class="hint">Dazu ' + extra + ' Typ' + (extra === 1 ? "" : "en") +
        ' ausserhalb der Sammelliste.</div>';
    }

    html += barBlock("Top-Typen", a.types, function (k, v) {
      return { label: Lookup.typeName(k) || k, n: v.n };
    });
    html += barBlock("Top-Airlines", a.airlines, function (k, v) {
      return { label: k, n: v.n };
    });
    html += barBlock("Top-Flughäfen", a.airports, function (k, v) {
      return { label: apName(k) || k, n: v.n };
    });
    html += barBlock("Staaten", a.countries, function (k, v) {
      return { label: flag(k) + " " + k, n: v };
    });

    // Sichtungen je Monat
    var byMonth = {};
    spots.forEach(function (s) {
      var m = (s.ts || "").slice(0, 7);
      if (m) byMonth[m] = (byMonth[m] || 0) + 1;
    });
    var months = [], now = new Date();
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var key = d.getFullYear() + "-" + pad(d.getMonth() + 1);
      months.push({ n: byMonth[key] || 0,
        label: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][d.getMonth()] });
    }
    var maxM = Math.max.apply(null, months.map(function (m) { return m.n; }).concat([1]));
    html += '<div class="stat-section">Sichtungen · letzte 12 Monate</div>' +
      '<div class="statcard"><div class="month-chart">';
    months.forEach(function (m) {
      html += '<div class="mc"><span class="mcn">' + (m.n || "") + '</span>' +
        '<div class="mcb" style="height:' + Math.round(m.n / maxM * 70 + (m.n ? 6 : 2)) +
          'px;opacity:' + (m.n ? 1 : .25) + '"></div>' +
        '<span class="mcl">' + m.label + '</span></div>';
    });
    html += '</div></div>';

    html += '<div class="stat-section">Einstellungen</div>' +
      '<div class="switch-row"><div class="sw-text">' +
        '<div class="sw-name">Online-Abfrage</div>' +
        '<div class="sw-sub">Fragt zu jedem Code Typ, Halter, Foto und Flugroute bei ' +
          'adsbdb.com ab. Aus heisst: nur die Tabellen aus data.js.</div></div>' +
      '<button class="switch' + (opts.online ? " on" : "") + '" id="swOnline" ' +
        'role="switch" aria-checked="' + (opts.online ? "true" : "false") + '"></button></div>';

    html += '<div class="io-row">' +
      '<button id="exportBtn">Exportieren</button>' +
      '<button id="importBtn">Importieren</button>' +
      '<button id="resetBtn" class="danger">Zurücksetzen</button>' +
    '</div>';

    $("statsContent").innerHTML = html;
    $("swOnline").addEventListener("click", function () {
      opts.online = !opts.online;
      saveOpts();
      this.classList.toggle("on", opts.online);
      this.setAttribute("aria-checked", opts.online ? "true" : "false");
      toast(opts.online ? "Online-Abfrage an" : "Online-Abfrage aus");
    });
    $("exportBtn").addEventListener("click", doExport);
    $("importBtn").addEventListener("click", doImport);
    $("resetBtn").addEventListener("click", doReset);
  }

  function barBlock(title, obj, mapFn) {
    var keys = Object.keys(obj);
    if (!keys.length) return "";
    var rows = keys.map(function (k) { return mapFn(k, obj[k]); })
      .sort(function (x, y) { return y.n - x.n; }).slice(0, 6);
    var max = rows[0].n;
    var html = '<div class="stat-section">' + esc(title) + '</div><div class="statcard">';
    rows.forEach(function (r) {
      html += '<div class="bar-row"><span class="bl">' + esc(r.label) + '</span>' +
        '<div class="bar"><div style="width:' + Math.max(pct(r.n, max), 3).toFixed(1) + '%"></div></div>' +
        '<span class="bn">' + r.n + '×</span></div>';
    });
    return html + '</div>';
  }

  // ---------- Export / Import ----------
  function doExport() {
    var data = JSON.stringify({ v: 1, spots: spots });
    if (navigator.share) {
      navigator.share({ title: "Plane Spotting", text: data }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(data).then(function () { toast("In die Zwischenablage kopiert"); });
    } else {
      prompt("Sichtungen kopieren:", data);
    }
  }
  function doImport() {
    var t = prompt("Exportierte Sichtungen einfügen:");
    if (!t) return;
    try {
      var obj = JSON.parse(t);
      var arr = obj.spots || obj;
      var have = {}, n = 0;
      spots.forEach(function (x) { have[x.id] = 1; });
      arr.forEach(function (x) {
        var s = spotIn(x);
        if (!s || have[s.id]) return;
        have[s.id] = 1;
        spots.push(s);
        n++;
      });
      saveSpots(); invalidate(); render(); renderStats();
      toast(n + (n === 1 ? " Sichtung" : " Sichtungen") + " importiert");
    } catch (e) { alert("Konnte die Daten nicht lesen."); }
  }
  function doReset() {
    confirmDialog({
      title: "Alles zurücksetzen?",
      text: "Alle " + spots.length + " Sichtungen werden gelöscht. " +
        "Das lässt sich nicht rückgängig machen.",
      ok: "Löschen", destructive: true
    }, function () {
      spots = []; saveSpots(); invalidate(); Lookup.cacheClear();
      render(); renderStats();
      toast("Alle Sichtungen gelöscht");
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
  function confirmDialog(o, onOk) {
    document.querySelectorAll(".alert-backdrop").forEach(function (x) { x.remove(); });
    openAlert = null;
    var wrap = document.createElement("div");
    wrap.className = "alert-backdrop";
    wrap.innerHTML = '<div class="alert" role="alertdialog" aria-modal="true">' +
      '<div class="alert-title">' + esc(o.title) + '</div>' +
      (o.text ? '<div class="alert-text">' + esc(o.text) + '</div>' : "") +
      '<div class="alert-actions">' +
        '<button class="alert-btn" data-act="cancel">' + esc(o.cancel || "Abbrechen") + '</button>' +
        '<button class="alert-btn ' + (o.destructive ? "destructive" : "primary") +
          '" data-act="ok">' + esc(o.ok || "OK") + '</button>' +
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
    ["kf", "yf", "sub", "tf", "cat"].forEach(function (k) {
      if (c.dataset[k] != null) state[k] = c.dataset[k];
    });
    render();
  });

  $("list").addEventListener("click", function (ev) {
    var card = ev.target.closest(".card");
    if (!card) return;
    if (card.dataset.spot) openEdit(card.dataset.spot);
    else if (card.dataset.plane) openPlane(card.dataset.plane);
    else if (card.dataset.type) openType(card.dataset.type);
    else if (card.dataset.airline) openAirline(card.dataset.airline);
  });

  function switchView(v) {
    state.view = v;
    $("tabSicht").classList.toggle("active", v === "sicht");
    $("tabSamm").classList.toggle("active", v === "samml");
    $("tabKarte").classList.toggle("active", v === "karte");
    render();
    window.scrollTo({ top: 0 });
  }
  $("tabSicht").addEventListener("click", function () { switchView("sicht"); });
  $("tabSamm").addEventListener("click", function () { switchView("samml"); });
  $("tabKarte").addEventListener("click", function () { switchView("karte"); });
  $("tabAdd").addEventListener("click", function () { openEdit(null); });

  $("mapIn").addEventListener("click", function () { bigMap && bigMap.zoom(1 / 1.4); });
  $("mapOut").addEventListener("click", function () { bigMap && bigMap.zoom(1.4); });
  $("mapDE").addEventListener("click", function () { bigMap && bigMap.fitDefault(); });
  $("mapAll").addEventListener("click", function () { bigMap && bigMap.fitWorld(); });
  $("mapInfo").addEventListener("click", function () {
    if (state.mapSel) openAirport(state.mapSel);
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
    var r = ev.target.closest("[data-spot]");
    if (r) { hideSheet("detailSheet", "detailBackdrop"); setTimeout(function () {
      openEdit(r.dataset.spot);
    }, 180); }
  });
  $("detailClose").addEventListener("click", function () { hideSheet("detailSheet", "detailBackdrop"); });
  $("detailBackdrop").addEventListener("click", function () { hideSheet("detailSheet", "detailBackdrop"); });
  $("editClose").addEventListener("click", function () { hideSheet("editSheet", "editBackdrop"); });
  $("editBackdrop").addEventListener("click", function () { hideSheet("editSheet", "editBackdrop"); });
  $("pickClose").addEventListener("click", function () { hideSheet("pickSheet", "pickBackdrop"); });
  $("pickBackdrop").addEventListener("click", function () { hideSheet("pickSheet", "pickBackdrop"); });
  $("pickSearch").addEventListener("input", renderPicker);
  $("pickContent").addEventListener("click", function (ev) {
    var r = ev.target.closest("[data-ap]");
    if (!r || !form) return;
    form.ap = r.dataset.ap;
    form.manualAp = true;
    hideSheet("pickSheet", "pickBackdrop");
    updateAuto();
  });
  $("lbClose").addEventListener("click", closeLightbox);
  $("lightbox").addEventListener("click", function (ev) {
    if (ev.target === this || ev.target.closest(".lb-img")) closeLightbox();
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    if (openAlert) { openAlert(); return; }
    if (!$("lightbox").hidden) { closeLightbox(); return; }
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
