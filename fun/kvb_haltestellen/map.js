/* KVB Haltestellen – Netzkarte (SVG; Gleisverlauf, Grenzen und Rhein aus OpenStreetMap) */
var KVBMap = (function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  // Immer beschriftet: die großen Knoten der Innenstadt (Endhalte kommen automatisch dazu)
  var LAB1 = ["Neumarkt", "Heumarkt", "Dom/Hbf", "Ebertplatz", "Barbarossaplatz",
    "Rudolfplatz", "Friesenplatz", "Chlodwigplatz", "Bf Deutz/Messe",
    "Hans-Böckler-Platz/Bf West", "Bf Mülheim", "Bonn Hbf"];

  // Endhaltestellen und Umsteigehalte
  var TERM = {}, NLINES = {};
  LINES.forEach(function (l) {
    l.v.forEach(function (v) {
      TERM[v[0]] = 1; TERM[v[v.length - 1]] = 1;
    });
    var seen = {};
    l.v.forEach(function (v) { v.forEach(function (i) { seen[i] = 1; }); });
    Object.keys(seen).forEach(function (i) { NLINES[i] = (NLINES[i] || 0) + 1; });
  });

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    return e;
  }
  function flatD(f, close) {
    var d = "";
    for (var i = 0; i < f.length; i += 2) d += (i ? "L" : "M") + f[i] + " " + f[i + 1];
    return close ? d + "Z" : d;
  }
  function segKey(a, b) { return a < b ? a + "-" + b : b + "-" + a; }
  function segD(key) { return SEGS[key] ? flatD(SEGS[key]) : ""; }

  // Abschnitte je Linie (jeder Abschnitt einmal)
  var LINE_SEGS = {};
  LINES.forEach(function (l) {
    var s = {};
    l.v.forEach(function (v) {
      for (var k = 1; k < v.length; k++) s[segKey(v[k - 1], v[k])] = 1;
    });
    LINE_SEGS[l.nr] = Object.keys(s);
  });

  function create(host, opts) {
    opts = opts || {};
    var svg = el("svg", { class: "map-svg", preserveAspectRatio: "xMidYMid meet" });
    var layers = {};
    ["geo", "water", "bez", "geolab", "base", "cov", "sel", "dots", "lab", "hitl", "hits"].forEach(function (n) {
      layers[n] = el("g", { class: "m-" + n });
      svg.appendChild(layers[n]);
    });
    var old = host.querySelector(".map-svg");
    if (old) old.parentNode.removeChild(old);
    host.insertBefore(svg, host.firstChild);    // Bedienelemente im Host bleiben erhalten

    // --- Basiskarte ---
    if (typeof GEO !== "undefined") {
      GEO.orte.forEach(function (o) {
        var d = o.r.map(function (r) { return flatD(r, true); }).join("");
        layers.geo.appendChild(el("path", { d: d, class: "geo-ort" + (o.k ? " koeln" : "") }));
      });
      GEO.water.forEach(function (rings) {
        var d = rings.map(function (r) { return flatD(r, true); }).join("");
        layers.water.appendChild(el("path", { d: d, class: "geo-water", "fill-rule": "evenodd" }));
      });
      GEO.bez.forEach(function (b) {
        var d = b.r.map(function (r) { return flatD(r, true); }).join("");
        layers.bez.appendChild(el("path", { d: d, class: "geo-bez" }));
      });
    }
    var geoLabels = [];
    if (typeof GEO !== "undefined") {
      GEO.lab.forEach(function (g) {
        var t = el("text", { x: g.xy[0], y: g.xy[1], class: "gl g" + g.t, "text-anchor": "middle" });
        t.textContent = g.n;
        layers.geolab.appendChild(t);
        geoLabels.push({ el: t, tier: g.t });
      });
    }

    // --- Liniennetz ---
    LINES.forEach(function (l) {
      var d = LINE_SEGS[l.nr].map(segD).join("");
      layers.base.appendChild(el("path", { d: d, class: "mp", style: "--c:" + l.col }));
      if (opts.interactive) {
        layers.hitl.appendChild(el("path", { d: d, class: "mh", "data-line": l.nr }));
      }
    });

    var dots = [], hits = [], labels = [];
    STATIONS.forEach(function (s, i) {
      var c = el("circle", { cx: s.xy[0], cy: s.xy[1], r: 20,
        class: "md" + (NLINES[i] > 1 ? " hub" : "") + (TERM[i] ? " term" : "") });
      layers.dots.appendChild(c);
      dots.push({ el: c, i: i, hub: NLINES[i] > 1 });
      if (opts.interactive) {
        var h = el("circle", { cx: s.xy[0], cy: s.xy[1], r: 60, class: "hs", "data-st": i });
        layers.hits.appendChild(h);
        hits.push(h);
      }
      var tier = LAB1.indexOf(s.name) >= 0 || TERM[i] ? 1 : (NLINES[i] > 1 ? 2 : 3);
      var t = el("text", { x: s.xy[0], y: s.xy[1], class: "ml t" + tier });
      t.textContent = s.name;
      layers.lab.appendChild(t);
      labels.push({ el: t, tier: tier, x: s.xy[0], y: s.xy[1], i: i, len: s.name.length });
    });
    labels.sort(function (a, b) { return a.tier - b.tier || (NLINES[b.i] || 0) - (NLINES[a.i] || 0); });
    var labelOf = {};
    labels.forEach(function (l) { labelOf[l.i] = l; });

    // --- Ansicht ---
    var vb = { x: 0, y: 0, w: 10000, h: 10000 };
    function size() {
      var r = svg.getBoundingClientRect();
      return { w: r.width || 320, h: r.height || 240 };
    }
    var selSt = null;
    function applyVB() {
      svg.setAttribute("viewBox", vb.x + " " + vb.y + " " + vb.w + " " + vb.h);
      var s = size();
      var perPx = vb.w / (s.w || 1);                   // Meter pro Bildschirmpixel
      var px = perPx > 40 ? 2.1 : perPx > 15 ? 2.8 : 3.6;
      dots.forEach(function (d) {
        var r = px * (d.hub ? 1.3 : 1) * (d.el.classList.contains("got") ? 1.2 : 1);
        if (d.i === selSt) r *= 1.6;
        d.el.setAttribute("r", (perPx * r).toFixed(1));
      });
      hits.forEach(function (h) { h.setAttribute("r", (perPx * 11).toFixed(1)); });
      // Beschriftung: wichtige zuerst; rechts vom Punkt, sonst links, sonst weglassen
      var fs = perPx * 10.5, placed = [];
      var mx = vb.w * 0.1, my = vb.h * 0.1;
      function free(b) {
        for (var k = 0; k < placed.length; k++) {
          var p = placed[k];
          if (b[0] < p[2] && b[2] > p[0] && b[1] < p[3] && b[3] > p[1]) return false;
        }
        return true;
      }
      var rr = perPx * (px * 1.3 + 1.5);
      dots.forEach(function (d) {          // Punkte nicht überschreiben
        var x = +d.el.getAttribute("cx"), y = +d.el.getAttribute("cy");
        if (x > vb.x - mx && x < vb.x + vb.w + mx && y > vb.y - my && y < vb.y + vb.h + my) {
          placed.push([x - rr, y - rr, x + rr, y + rr]);
        }
      });
      var order = selSt != null && labelOf[selSt]
        ? [labelOf[selSt]].concat(labels.filter(function (l) { return l.i !== selSt; })) : labels;
      order.forEach(function (l) {
        var want = l.i === selSt || l.tier === 1 && perPx < 80 ||
          l.tier === 2 && perPx < 9 || l.tier === 3 && perPx < 4.5;
        var inView = l.x > vb.x - mx && l.x < vb.x + vb.w + mx && l.y > vb.y - my && l.y < vb.y + vb.h + my;
        var pos = null;
        if (want && inView) {
          var w = fs * 0.56 * l.len, gap = rr + perPx * 1.5;
          var y0 = l.y - fs * 0.72, y1 = l.y + fs * 0.42;
          var right = [l.x + gap, y0, l.x + gap + w, y1];
          var left = [l.x - gap - w, y0, l.x - gap, y1];
          if (l.i === selSt || free(right)) pos = right;
          else if (free(left)) pos = left;
        }
        if (!pos) { l.el.style.display = "none"; return; }
        placed.push(pos);
        l.el.style.display = "";
        l.el.setAttribute("font-size", fs.toFixed(1));
        l.el.setAttribute("x", pos[0].toFixed(1));
        l.el.setAttribute("y", (l.y + fs * 0.34).toFixed(1));
      });
      geoLabels.forEach(function (g) {
        var show = g.tier === 1 ? perPx < 160 : perPx < 26 && perPx > 3;
        g.el.style.display = show ? "" : "none";
        if (show) g.el.setAttribute("font-size", (perPx * (g.tier === 1 ? 11.5 : 10.5)).toFixed(1));
      });
    }
    function fitBox(x0, y0, x1, y1, pad) {
      var s = size(), asp = s.w / s.h;
      var w = Math.max(x1 - x0, 400) * (pad || 1.12);
      var h = Math.max(y1 - y0, 400) * (pad || 1.12);
      if (w / h < asp) w = h * asp; else h = w / asp;
      vb = { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w: w, h: h };
      applyVB();
    }
    function fitIdx(list, pad) {
      if (!list.length) return;
      var xs = list.map(function (i) { return STATIONS[i].xy[0]; });
      var ys = list.map(function (i) { return STATIONS[i].xy[1]; });
      fitBox(Math.min.apply(null, xs), Math.min.apply(null, ys),
             Math.max.apply(null, xs), Math.max.apply(null, ys), pad);
    }
    function fitAll() { fitIdx(STATIONS.map(function (s, i) { return i; }), 1.06); }
    function fitCenter() {
      // Innenstadt mit Deutz: Ring, Rhein und die Knoten links und rechts davon
      var ids = [];
      STATIONS.forEach(function (s, i) {
        if (s.bez === "Innenstadt" && s.ort === "Köln") ids.push(i);
      });
      fitIdx(ids, 1.08);
    }
    function fitLine(nr) {
      var set = {};
      LINES.forEach(function (l) {
        if (l.nr === nr) l.v.forEach(function (v) { v.forEach(function (i) { set[i] = 1; }); });
      });
      fitIdx(Object.keys(set).map(Number), 1.18);
    }
    function fitStation(i, radius) {
      var s = STATIONS[i], r = radius || 1300;
      fitBox(s.xy[0] - r, s.xy[1] - r, s.xy[0] + r, s.xy[1] + r, 1);
    }

    // --- Ebenen aktualisieren ---
    var lastSt = {};
    function update(st) {
      st = st || {};
      lastSt = st;
      var cov = st.cov || {};
      layers.cov.innerHTML = "";
      var paths = [];
      LINES.forEach(function (l) {
        var c = cov[l.nr];
        if (!c) return;
        var d = Object.keys(c).map(segD).join("");
        if (d) paths.push({ d: d, col: l.col });
      });
      // erst alle Konturen, dann die Farben – sonst überdecken sich Linien an Knoten
      paths.forEach(function (p) { layers.cov.appendChild(el("path", { d: p.d, class: "mc-halo" })); });
      paths.forEach(function (p) { layers.cov.appendChild(el("path", { d: p.d, class: "mc", stroke: p.col })); });
      dots.forEach(function (d) {
        d.el.classList.toggle("got", !!(st.got && st.got[d.i]));
      });
      svg.classList.toggle("colored", !!st.colored);
      select(st.sel || null);
    }
    function select(sel) {
      layers.sel.innerHTML = "";
      selSt = sel && sel.st != null ? sel.st : null;
      svg.classList.toggle("has-sel", !!(sel && sel.line));
      var l = null, onLine = null;
      if (sel && sel.line) {
        LINES.forEach(function (x) { if (x.nr === sel.line) l = x; });
        if (l) {
          onLine = {};
          l.v.forEach(function (v) { v.forEach(function (i) { onLine[i] = 1; }); });
        }
      }
      dots.forEach(function (d) {
        d.el.classList.toggle("sel", d.i === selSt);
        d.el.classList.toggle("off", !!onLine && !onLine[d.i]);
      });
      if (sel && sel.line) {
        if (l) {
          var d = LINE_SEGS[l.nr].map(segD).join("");
          layers.sel.appendChild(el("path", { d: d, class: "ms-halo" }));
          layers.sel.appendChild(el("path", { d: d, class: "ms", stroke: l.col }));
          var c = (lastSt.cov || {})[l.nr];
          if (c) {
            var dc = Object.keys(c).map(segD).join("");
            layers.sel.appendChild(el("path", { d: dc, class: "ms on", stroke: l.col }));
          }
        }
      }
      applyVB();
    }

    // --- Bedienung ---
    if (opts.interactive) {
      var pointers = {}, last = null, pinch = null, moved = 0;
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
        var s = size();
        vb.x -= dx * vb.w / s.w; vb.y -= dy * vb.h / s.h;
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
        var hs = ev.target.closest("[data-st]");
        if (hs) { opts.onSelect && opts.onSelect({ st: parseInt(hs.dataset.st, 10) }); return; }
        var hl = ev.target.closest("[data-line]");
        opts.onSelect && opts.onSelect(hl ? { line: hl.dataset.line } : null);
      });
    }

    function zoomTo(newW, clientX, clientY) {
      var s = size(), r = svg.getBoundingClientRect();
      newW = Math.min(Math.max(newW, 500), 90000);
      var newH = newW * vb.h / vb.w;
      var fx = clientX != null ? (clientX - r.left) / (s.w || 1) : 0.5;
      var fy = clientY != null ? (clientY - r.top) / (s.h || 1) : 0.5;
      vb.x += (vb.w - newW) * fx;
      vb.y += (vb.h - newH) * fy;
      vb.w = newW; vb.h = newH;
      applyVB();
    }

    fitCenter();
    return {
      svg: svg,
      update: update,
      select: select,
      fitCenter: fitCenter,
      fitAll: fitAll,
      fitLine: fitLine,
      fitStation: fitStation,
      zoom: function (f) { zoomTo(vb.w * f); },
      resize: applyVB
    };
  }

  return { create: create, segKey: segKey, TERM: TERM };
})();
