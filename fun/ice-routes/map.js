/* ICE Verbindungen – Netzkarte (SVG, aus den Bahnhofskoordinaten gezeichnet) */
var ICEMap = (function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var K = Math.cos(51 * Math.PI / 180);          // grobe Laengengrad-Stauchung
  var S = 100;                                   // Weltmasstab (kleine SVG-Einheiten rendern unsauber)
  var DE = { lat0: 46.6, lat1: 55.3, lon0: 5.3, lon1: 15.8 };   // Startausschnitt

  // Beschriftete Bahnhöfe: Stufe 1 immer, Stufe 2 erst beim Hineinzoomen
  var LAB1 = ["Hamburg", "Berlin", "Köln", "Frankfurt", "München", "Stuttgart",
    "Hannover", "Leipzig", "Nürnberg", "Dortmund", "Bremen", "Dresden",
    "Basel SBB", "Wien", "Amsterdam", "Zürich", "Paris Est", "Milano"];
  var LAB2 = ["Kiel", "Rostock", "Erfurt", "Kassel-Wilhelmshöhe", "Karlsruhe",
    "Mannheim", "Düsseldorf", "Essen", "Würzburg", "Ulm", "Saarbrücken",
    "Innsbruck", "Freiburg", "Halle", "Braunschweig", "Münster", "Osnabrück",
    "Augsburg", "Regensburg", "Passau", "Salzburg", "Bruxelles-Midi",
    "Budapest Keleti", "Marseille-Saint-Charles", "Westerland", "Binz",
    "Oldenburg (Oldb)", "Koblenz", "Bonn", "Aachen", "Mainz", "Wiesbaden"];

  function wx(lon) { return lon * K * S; }
  function wy(lat) { return -lat * S; }
  function pt(i) {
    var s = STATIONS[i];
    return s && s.ll ? [wx(s.ll[1]), wy(s.ll[0])] : null;
  }
  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    return e;
  }
  function pathD(idxList) {
    var d = "", first = true;
    idxList.forEach(function (i) {
      var p = pt(i);
      if (!p) return;
      d += (first ? "M" : "L") + p[0].toFixed(2) + " " + p[1].toFixed(2) + " ";
      first = false;
    });
    return d.trim();
  }

  // Basiskarte (Natural Earth) als Pfad-Daten im Weltkoordinatensystem
  function geoPath(ring) {
    var d = "";
    for (var i = 0; i < ring.length; i++) {
      d += (i ? "L" : "M") + wx(ring[i][0]).toFixed(1) + " " + wy(ring[i][1]).toFixed(1) + " ";
    }
    return d + "Z";
  }

  function create(host, opts) {
    opts = opts || {};
    var svg = el("svg", { class: "map-svg", preserveAspectRatio: "xMidYMid meet" });
    var gGeo = el("g", { class: "m-geo" });
    var gBase = el("g", { class: "m-base" });
    var gCov = el("g", { class: "m-cov" });
    var gSel = el("g", { class: "m-sel" });
    var gDots = el("g", { class: "m-dots" });
    var gLab = el("g", { class: "m-lab" });
    var gHit = el("g", { class: "m-hit" });
    [gGeo, gBase, gCov, gSel, gDots, gLab, gHit].forEach(function (g) { svg.appendChild(g); });
    var old = host.querySelector(".map-svg");
    if (old) old.parentNode.removeChild(old);
    host.insertBefore(svg, host.firstChild);   // Bedienelemente im Host bleiben erhalten

    // --- Basiskarte ---
    if (typeof GEO !== "undefined") {
      GEO.land.forEach(function (ring) {
        gGeo.appendChild(el("path", { d: geoPath(ring), class: "geo-land" }));
      });
      GEO.lakes.forEach(function (ring) {
        gGeo.appendChild(el("path", { d: geoPath(ring), class: "geo-lake" }));
      });
    }

    // --- statische Ebenen ---
    LINES.forEach(function (l) {
      l.v.forEach(function (v) {
        var d = pathD(v.map(function (p) { return p[0]; }));
        if (!d) return;
        gBase.appendChild(el("path", { d: d, class: "mp" }));
        if (opts.interactive) {
          gHit.appendChild(el("path", { d: d, class: "mh", "data-line": l.nr }));
        }
      });
    });

    var dots = [];
    STATIONS.forEach(function (s, i) {
      var p = pt(i);
      if (!p) return;
      var c = el("circle", { cx: p[0], cy: p[1], r: 2, class: "md" });
      gDots.appendChild(c);
      dots.push({ el: c, i: i });
    });

    var labels = [];
    STATIONS.forEach(function (s, i) {
      var tier = LAB1.indexOf(s.name) >= 0 ? 1 : (LAB2.indexOf(s.name) >= 0 ? 2 : 0);
      if (!tier) return;
      var p = pt(i);
      if (!p) return;
      var t = el("text", { x: p[0] + 6, y: p[1] + 3, class: "ml t" + tier });
      t.textContent = s.name;
      gLab.appendChild(t);
      labels.push({ el: t, tier: tier, x: p[0], y: p[1] });
    });

    // --- Ansicht ---
    var vb = { x: 0, y: 0, w: 10 * S, h: 10 * S };
    function size() {
      var r = svg.getBoundingClientRect();
      return { w: r.width || 320, h: r.height || 240 };
    }
    function applyVB() {
      svg.setAttribute("viewBox", vb.x + " " + vb.y + " " + vb.w + " " + vb.h);
      var s = size();
      var perPx = vb.w / (s.w || 1);
      dots.forEach(function (d) { d.el.setAttribute("r", (perPx * 2.1).toFixed(3)); });
      labels.forEach(function (l) {
        var show = l.tier === 1 || vb.w < 5.2 * S;
        l.el.setAttribute("font-size", (perPx * 10.5).toFixed(3));
        l.el.setAttribute("x", (l.x + perPx * 5).toFixed(3));
        l.el.setAttribute("y", (l.y + perPx * 3.5).toFixed(3));
        l.el.style.display = show ? "" : "none";
      });
    }
    function fitPoints(pts, pad) {
      if (!pts.length) return;
      var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
      var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      var s = size(), asp = s.w / s.h;
      var w = Math.max(x1 - x0, 30) * (pad || 1.15);
      var h = Math.max(y1 - y0, 30) * (pad || 1.15);
      if (w / h < asp) w = h * asp; else h = w / asp;
      vb = { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w: w, h: h };
      applyVB();
    }
    function fitDefault() {
      fitPoints([[wx(DE.lon0), wy(DE.lat0)], [wx(DE.lon1), wy(DE.lat1)]], 1.02);
    }
    function fitAll() {
      var pts = [];
      STATIONS.forEach(function (s, i) { var p = pt(i); if (p) pts.push(p); });
      fitPoints(pts, 1.06);
    }
    function fitLine(nr) {
      var pts = [];
      LINES.forEach(function (l) {
        if (l.nr !== nr) return;
        l.v.forEach(function (v) {
          v.forEach(function (p) { var q = pt(p[0]); if (q) pts.push(q); });
        });
      });
      if (pts.length) fitPoints(pts, 1.25); else fitDefault();
    }

    // --- Ebenen aktualisieren ---
    var selected = null, lastCov = {};
    function update(st) {
      st = st || {};
      var cov = lastCov = st.byLine || {};
      gCov.innerHTML = "";
      var segs = [];
      Object.keys(cov).forEach(function (nr) {
        var line = null;
        LINES.forEach(function (l) { if (l.nr === nr) line = l; });
        if (!line) return;
        var col = line.col || "var(--green)";
        Object.keys(cov[nr].segs).forEach(function (key) {
          var d = pathD(key.split("-").map(Number));
          if (d) segs.push({ d: d, col: col });
        });
      });
      // erst alle Konturen, dann die Farben – sonst überdecken sich Linien an Knoten
      segs.forEach(function (s) { gCov.appendChild(el("path", { d: s.d, class: "mc-halo" })); });
      segs.forEach(function (s) { gCov.appendChild(el("path", { d: s.d, class: "mc", stroke: s.col })); });
      dots.forEach(function (d) {
        d.el.classList.toggle("vis", !!(st.stns && st.stns[d.i]));
      });
      setSelected(st.selected != null ? st.selected : selected, cov);
    }
    function setSelected(nr, cov) {
      selected = nr || null;
      gSel.innerHTML = "";
      svg.classList.toggle("has-sel", !!selected);
      if (!selected) return;
      var line = null;
      LINES.forEach(function (l) { if (l.nr === selected) line = l; });
      if (!line) return;
      var col = line.col || "var(--accent)";
      line.v.forEach(function (v) {
        var d = pathD(v.map(function (p) { return p[0]; }));
        if (d) gSel.appendChild(el("path", { d: d, class: "ms", stroke: col }));
      });
      var b = (cov || {})[selected];
      if (b) {
        var ds = Object.keys(b.segs).map(function (key) {
          return pathD(key.split("-").map(Number));
        }).filter(Boolean);
        ds.forEach(function (d) { gSel.appendChild(el("path", { d: d, class: "ms-halo" })); });
        ds.forEach(function (d) { gSel.appendChild(el("path", { d: d, class: "ms on", stroke: col })); });
      }
    }

    // --- Bedienung ---
    if (opts.interactive) {
      var pointers = {}, last = null, pinch = null, moved = 0;

      function toWorld(dxPx, dyPx) {
        var s = size();
        return [dxPx * vb.w / s.w, dyPx * vb.h / s.h];
      }
      svg.addEventListener("pointerdown", function (ev) {
        svg.setPointerCapture(ev.pointerId);
        pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
        var ids = Object.keys(pointers);
        moved = 0;
        if (ids.length === 1) last = { x: ev.clientX, y: ev.clientY };
        else if (ids.length === 2) {
          var a = pointers[ids[0]], b = pointers[ids[1]];
          pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), w: vb.w };
        }
      });
      svg.addEventListener("pointermove", function (ev) {
        if (!pointers[ev.pointerId]) return;
        pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
        var ids = Object.keys(pointers);
        if (ids.length >= 2 && pinch) {
          var a = pointers[ids[0]], b = pointers[ids[1]];
          var d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > 4) zoomTo(pinch.w * pinch.d / d, (a.x + b.x) / 2, (a.y + b.y) / 2);
          moved = 99;
          return;
        }
        if (!last) return;
        var dx = ev.clientX - last.x, dy = ev.clientY - last.y;
        moved += Math.abs(dx) + Math.abs(dy);
        var w = toWorld(dx, dy);
        vb.x -= w[0]; vb.y -= w[1];
        last = { x: ev.clientX, y: ev.clientY };
        applyVB();
      });
      function end(ev) {
        delete pointers[ev.pointerId];
        if (!Object.keys(pointers).length) { last = null; pinch = null; }
      }
      svg.addEventListener("pointerup", end);
      svg.addEventListener("pointercancel", end);

      svg.addEventListener("wheel", function (ev) {
        ev.preventDefault();
        zoomTo(vb.w * (ev.deltaY > 0 ? 1.15 : 1 / 1.15), ev.clientX, ev.clientY);
      }, { passive: false });

      svg.addEventListener("click", function (ev) {
        if (moved > 8) return;
        var hit = ev.target.closest("[data-line]");
        var nr = hit ? hit.dataset.line : null;
        if (opts.onSelect) opts.onSelect(nr);
      });
    }

    function zoomTo(newW, clientX, clientY) {
      var s = size(), r = svg.getBoundingClientRect();
      newW = Math.min(Math.max(newW, 0.25 * S), 26 * S);
      var newH = newW * vb.h / vb.w;
      var fx = clientX != null ? (clientX - r.left) / (s.w || 1) : 0.5;
      var fy = clientY != null ? (clientY - r.top) / (s.h || 1) : 0.5;
      vb.x += (vb.w - newW) * fx;
      vb.y += (vb.h - newH) * fy;
      vb.w = newW; vb.h = newH;
      applyVB();
    }

    fitDefault();
    return {
      svg: svg,
      update: update,
      select: function (nr) { setSelected(nr, lastCov); },
      fitDefault: fitDefault,
      fitAll: fitAll,
      fitLine: fitLine,
      zoom: function (f) { zoomTo(vb.w * f); },
      resize: applyVB
    };
  }

  return { create: create };
})();
