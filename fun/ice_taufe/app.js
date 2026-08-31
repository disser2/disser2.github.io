/* ICE Taufnamen – Sammel-App */
(function () {
  "use strict";

  var STORE_KEY = "iceTaufeSeen.v1";

  // ---------- Persistenz ----------
  function loadSeen() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveSeen() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(seen)); } catch (e) {}
  }
  var seen = loadSeen(); // { id: { d: "YYYY-MM-DD" } }

  // ---------- Zustand ----------
  var state = {
    q: "",
    filter: "alle",       // alle | gesehen | fehlt
    kat: null,            // stadt | region | null
    aktiv: false,
    typ: null,            // Typ-Gruppe oder null
    sort: "name",         // name | datum | seen
  };

  // Typ-Gruppen für Filter-Chips und Statistik
  function typGroup(t) {
    if (!t) return "Sonstige";
    if (t === "ICE 1") return "ICE 1";
    if (t === "ICE 2") return "ICE 2";
    if (t.indexOf("ICE 3") === 0) return "ICE 3";
    if (t === "ICE 4") return "ICE 4";
    if (t === "ICE T" || t === "ICE-TD") return "ICE T/TD";
    if (t === "IC 2") return "IC 2";
    if (t === "ICE L") return "ICE L";
    return t;
  }
  function badgeClass(t) {
    var g = typGroup(t);
    if (g === "ICE 1") return "br-ice1";
    if (g === "ICE 2") return "br-ice2";
    if (g === "ICE 3") return "br-ice3";
    if (g === "ICE 4") return "br-ice4";
    if (g === "ICE T/TD") return "br-icet";
    if (g === "IC 2") return "br-ic2";
    if (g === "ICE L") return "br-icel";
    return "";
  }
  var TYP_ORDER = ["ICE 1", "ICE 2", "ICE 3", "ICE 4", "ICE T/TD", "ICE L", "IC 2"];

  // ---------- Helpers ----------
  function $(id) { return document.getElementById(id); }
  function fmtDate(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    return p[2] + "." + p[1] + "." + p[0];
  }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function placeholderShield(name) {
    var initials = name.split(/[\s\/-]+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
    return '<svg viewBox="0 0 60 70" aria-hidden="true">' +
      '<path d="M4 4h52v34c0 16-11 25-26 30C15 63 4 54 4 38Z" fill="none" stroke="currentColor" stroke-width="2.5" opacity=".35"/>' +
      '<text x="30" y="40" text-anchor="middle" font-size="20" font-weight="700" fill="currentColor" opacity=".45" font-family="-apple-system,Helvetica,sans-serif">' + esc(initials) + '</text></svg>';
  }
  function wappenHTML(e) {
    if (e.wappen) {
      return '<img src="' + esc(e.wappen) + '" alt="" loading="lazy" ' +
        'onerror="this.parentNode.innerHTML=this.parentNode.dataset.ph">';
    }
    return placeholderShield(e.name);
  }

  // ---------- Filter + Sortierung ----------
  function filtered() {
    var q = state.q.toLowerCase();
    var arr = TRAINS.filter(function (e) {
      if (state.filter === "gesehen" && !seen[e.id]) return false;
      if (state.filter === "fehlt" && seen[e.id]) return false;
      if (state.kat && e.kat !== state.kat) return false;
      if (state.aktiv && !e.aktiv) return false;
      if (state.typ && typGroup(e.typ) !== state.typ) return false;
      if (q) {
        var hay = (e.name + " " + (e.tz || "") + " " + (e.taufort || "") + " " + (e.typ || "") + " " + (e.baureihe || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    if (state.sort === "name") {
      arr.sort(function (a, b) { return a.name.localeCompare(b.name, "de"); });
    } else if (state.sort === "datum") {
      arr.sort(function (a, b) { return a.taufdatum < b.taufdatum ? -1 : 1; });
    } else {
      arr.sort(function (a, b) {
        var sa = seen[a.id] ? seen[a.id].d : "";
        var sb = seen[b.id] ? seen[b.id].d : "";
        if (sa !== sb) return sa > sb ? -1 : 1; // neueste Sichtung zuerst, Ungesehene ans Ende
        return a.name.localeCompare(b.name, "de");
      });
    }
    return arr;
  }

  // ---------- Liste rendern ----------
  function renderList() {
    var arr = filtered();
    var list = $("list");
    var html = "";
    for (var i = 0; i < arr.length; i++) {
      var e = arr[i];
      var s = seen[e.id];
      html += '<div class="card' + (s ? " seen" : "") + '" data-id="' + e.id + '">' +
        '<button class="seen-toggle" data-toggle="' + e.id + '" aria-label="Als gesehen markieren">✓</button>' +
        '<div class="card-body">' +
          '<div class="card-name">' + esc(e.name) + '</div>' +
          '<div class="card-sub">' +
            (e.typ ? '<span class="badge ' + badgeClass(e.typ) + '">' + esc(e.typ) + '</span>' : "") +
            (e.tz ? '<span class="badge">Tz ' + esc(e.tz) + '</span>' : "") +
            (!e.aktiv ? '<span class="badge inaktiv">ehemalig</span>' : "") +
            '<span>Taufe ' + fmtDate(e.taufdatum) + '</span>' +
            (s ? '<span class="seen-date">✓ ' + fmtDate(s.d) + '</span>' : "") +
          '</div>' +
        '</div>' +
        '<div class="wappen" data-ph="' + esc(placeholderShield(e.name).replace(/"/g, "'")) + '">' + wappenHTML(e) + '</div>' +
      '</div>';
    }
    list.innerHTML = html;
    $("empty").hidden = arr.length > 0;
    var nSeen = Object.keys(seen).length;
    $("headerCount").textContent = nSeen + "/" + TRAINS.length;
    $("listMeta").textContent = arr.length + " von " + TRAINS.length + " Taufnamen";
  }

  // ---------- Gesehen-Toggle ----------
  function toggleSeen(id) {
    if (seen[id]) { delete seen[id]; }
    else { seen[id] = { d: todayISO() }; }
    saveSeen();
    renderList();
  }

  // ---------- Detail-Sheet ----------
  var currentDetail = null;
  function openDetail(id) {
    var e = TRAINS.find(function (t) { return t.id === id; });
    if (!e) return;
    currentDetail = id;
    var s = seen[id];
    var kat = e.kat === "stadt" ? "Stadt / Gemeinde" : "Region / Landschaft";
    var html =
      '<div class="detail-top">' +
        '<div class="wappen" data-ph="' + esc(placeholderShield(e.name).replace(/"/g, "'")) + '">' + wappenHTML(e) + '</div>' +
        '<div><div class="detail-name">' + esc(e.name) + '</div>' +
        '<div class="detail-kat">' + kat + (e.nr ? " · Namensgebung Nr. " + e.nr : "") + '</div></div>' +
      '</div>' +
      '<button class="seen-big' + (s ? " is-seen" : "") + '" id="detailSeenBtn">' +
        (s ? "✓ Gesehen" : "Als gesehen markieren") + '</button>';
    if (s) {
      html += '<div class="seen-row"><span>Gesehen am</span>' +
        '<input type="date" id="detailSeenDate" value="' + s.d + '" max="' + todayISO() + '"></div>';
    }
    html += '<div class="kv-table">' +
      kv("Baureihe", e.baureihe ? "Baureihe " + e.baureihe + (e.typ ? " (" + e.typ + ")" : "") : (e.typ || "–")) +
      kv("Triebzug", e.tz ? "Tz " + e.tz : "–") +
      kv("Taufdatum", fmtDate(e.taufdatum)) +
      kv("Taufort", e.taufort || "–") +
      kv("Status", e.aktiv ? "Name aktuell vergeben" : "Name nicht mehr vergeben") +
      '</div>';
    if (e.history.length > 1) {
      html += '<div class="hist-title">Namensträger</div><div class="hist">';
      for (var i = 0; i < e.history.length; i++) {
        var h = e.history[i];
        var cur = !h.bis && e.aktiv;
        html += '<div class="hist-row' + (cur ? " current" : "") + '">' +
          '<div class="hr-main">' + (h.typ ? esc(h.typ) + " · " : "") + "Tz " + esc(h.tz) + '</div>' +
          '<div class="hr-sub">' + fmtDate(h.von) + (h.bis ? " – " + fmtDate(h.bis) : " – heute") + '</div></div>';
      }
      html += '</div>';
    }
    $("detailContent").innerHTML = html;
    $("detailSeenBtn").addEventListener("click", function () {
      toggleSeen(id);
      openDetail(id); // neu rendern
    });
    var dateInput = $("detailSeenDate");
    if (dateInput) {
      dateInput.addEventListener("change", function () {
        if (seen[id] && this.value) { seen[id].d = this.value; saveSeen(); renderList(); }
      });
    }
    showSheet("detailSheet", "detailBackdrop");
  }
  function kv(k, v) {
    return '<div class="kv"><span class="k">' + k + '</span><span class="v">' + esc(v) + '</span></div>';
  }

  // ---------- Statistik-Sheet ----------
  function renderStats() {
    var total = TRAINS.length;
    var nSeen = Object.keys(seen).length;
    var pct = total ? (nSeen / total * 100) : 0;
    var R = 80, C = 2 * Math.PI * R;

    var html =
      '<div class="ringwrap"><div class="ring">' +
        '<svg width="190" height="190" viewBox="0 0 190 190">' +
          '<circle cx="95" cy="95" r="' + R + '" fill="none" stroke="var(--chipbg)" stroke-width="16"/>' +
          '<circle cx="95" cy="95" r="' + R + '" fill="none" stroke="var(--accent)" stroke-width="16" stroke-linecap="round" ' +
            'stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - pct / 100)) + '"/>' +
        '</svg>' +
        '<div class="ring-label">' +
          '<span class="ring-frac">' + nSeen + '/' + total + '</span>' +
          '<span class="ring-pct">' + pct.toFixed(1).replace(".", ",") + '&nbsp;%</span>' +
          '<span class="ring-sub">GESEHEN</span>' +
        '</div>' +
      '</div></div>';

    // pro Typ-Gruppe
    var groups = {};
    TRAINS.forEach(function (e) {
      var g = typGroup(e.typ);
      groups[g] = groups[g] || { total: 0, seen: 0 };
      groups[g].total++;
      if (seen[e.id]) groups[g].seen++;
    });
    html += '<div class="stat-section">Nach Zugtyp</div><div class="statcard">';
    var keys = TYP_ORDER.filter(function (k) { return groups[k]; })
      .concat(Object.keys(groups).filter(function (k) { return TYP_ORDER.indexOf(k) === -1; }));
    keys.forEach(function (g) {
      var v = groups[g];
      html += barRow(g, v.seen, v.total);
    });
    html += '</div>';

    // Städte vs. Regionen
    var kats = { stadt: { total: 0, seen: 0 }, region: { total: 0, seen: 0 } };
    TRAINS.forEach(function (e) {
      kats[e.kat].total++;
      if (seen[e.id]) kats[e.kat].seen++;
    });
    html += '<div class="stat-section">Nach Kategorie</div><div class="statcard">' +
      barRow("Städte", kats.stadt.seen, kats.stadt.total) +
      barRow("Regionen", kats.region.seen, kats.region.total) + '</div>';

    // Verlauf: Sichtungen der letzten 12 Monate
    var byMonth = {};
    Object.keys(seen).forEach(function (id) {
      var m = (seen[id].d || "").slice(0, 7);
      if (m) byMonth[m] = (byMonth[m] || 0) + 1;
    });
    var months = [], now = new Date();
    for (var i = 11; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      months.push({ key: key, label: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][d.getMonth()], n: byMonth[key] || 0 });
    }
    var maxM = Math.max.apply(null, months.map(function (m) { return m.n; }).concat([1]));
    html += '<div class="stat-section">Sichtungen · letzte 12 Monate</div><div class="statcard"><div class="month-chart">';
    months.forEach(function (m) {
      html += '<div class="mc"><span class="mcn">' + (m.n || "") + '</span>' +
        '<div class="mcb" style="height:' + Math.round(m.n / maxM * 70 + (m.n ? 6 : 2)) + 'px;opacity:' + (m.n ? 1 : .25) + '"></div>' +
        '<span class="mcl">' + m.label + '</span></div>';
    });
    html += '</div></div>';

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

  function doExport() {
    var data = JSON.stringify(seen);
    if (navigator.share) {
      navigator.share({ title: "ICE Taufnamen Sammlung", text: data }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(data).then(function () { alert("Sammlung in die Zwischenablage kopiert."); });
    } else {
      prompt("Sammlung kopieren:", data);
    }
  }
  function doImport() {
    var t = prompt("Exportierte Sammlung einfügen:");
    if (!t) return;
    try {
      var obj = JSON.parse(t);
      var n = 0;
      Object.keys(obj).forEach(function (id) {
        if (obj[id] && obj[id].d && TRAINS.some(function (e) { return e.id === id; })) {
          seen[id] = { d: obj[id].d };
          n++;
        }
      });
      saveSeen(); renderList(); renderStats();
      alert(n + " Einträge importiert.");
    } catch (e) { alert("Konnte die Daten nicht lesen."); }
  }
  function doReset() {
    if (confirm("Wirklich die gesamte Sammlung löschen?")) {
      seen = {}; saveSeen(); renderList(); renderStats();
    }
  }

  // ---------- Sheets ----------
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

  // ---------- Events ----------
  $("search").addEventListener("input", function () {
    state.q = this.value.trim();
    $("clearSearch").hidden = !state.q;
    renderList();
  });
  $("clearSearch").addEventListener("click", function () {
    $("search").value = ""; state.q = ""; this.hidden = true;
    renderList(); $("search").focus();
  });

  // Typ-Chips erzeugen
  (function () {
    var present = {};
    TRAINS.forEach(function (e) { present[typGroup(e.typ)] = true; });
    var html = "";
    TYP_ORDER.forEach(function (g) {
      if (present[g]) html += '<button class="chip" data-typ="' + g + '">' + g + '</button>';
    });
    $("typChips").innerHTML = html;
  })();

  $("chips").addEventListener("click", function (ev) {
    var c = ev.target.closest(".chip");
    if (!c) return;
    if (c.dataset.filter) {
      state.filter = c.dataset.filter;
      this.querySelectorAll("[data-filter]").forEach(function (x) { x.classList.toggle("active", x === c); });
    } else if (c.dataset.kat) {
      state.kat = state.kat === c.dataset.kat ? null : c.dataset.kat;
      this.querySelectorAll("[data-kat]").forEach(function (x) { x.classList.toggle("active", x.dataset.kat === state.kat); });
    } else if (c.dataset.aktiv) {
      state.aktiv = !state.aktiv;
      c.classList.toggle("active", state.aktiv);
    } else if (c.dataset.typ) {
      state.typ = state.typ === c.dataset.typ ? null : c.dataset.typ;
      this.querySelectorAll("[data-typ]").forEach(function (x) { x.classList.toggle("active", x.dataset.typ === state.typ); });
    }
    renderList();
  });

  $("list").addEventListener("click", function (ev) {
    var t = ev.target.closest(".seen-toggle");
    if (t) { toggleSeen(t.dataset.toggle); ev.stopPropagation(); return; }
    var card = ev.target.closest(".card");
    if (card) openDetail(card.dataset.id);
  });

  [["sortName", "name"], ["sortDatum", "datum"], ["sortSeen", "seen"]].forEach(function (pair) {
    $(pair[0]).addEventListener("click", function () {
      state.sort = pair[1];
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("active"); });
      this.classList.add("active");
      renderList();
      window.scrollTo({ top: 0 });
    });
  });

  $("statsBtn").addEventListener("click", function () { renderStats(); showSheet("statsSheet", "statsBackdrop"); });
  $("statsClose").addEventListener("click", function () { hideSheet("statsSheet", "statsBackdrop"); });
  $("statsBackdrop").addEventListener("click", function () { hideSheet("statsSheet", "statsBackdrop"); });
  $("detailBackdrop").addEventListener("click", function () { hideSheet("detailSheet", "detailBackdrop"); });

  // Swipe-down zum Schließen der Sheets
  ["detailSheet", "statsSheet"].forEach(function (id) {
    var startY = null, el = $(id);
    el.addEventListener("touchstart", function (ev) {
      var content = el.querySelector(".sheet-content");
      if (content.scrollTop <= 0) startY = ev.touches[0].clientY;
      else startY = null;
    }, { passive: true });
    el.addEventListener("touchmove", function (ev) {
      if (startY === null) return;
      var dy = ev.touches[0].clientY - startY;
      if (dy > 70) {
        startY = null;
        hideSheet(id, id === "detailSheet" ? "detailBackdrop" : "statsBackdrop");
      }
    }, { passive: true });
  });

  // ---------- Start ----------
  renderList();
})();
