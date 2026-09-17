/* Plane Spotting – Weltkarte (SVG, aus den Flughafenkoordinaten gezeichnet)

   Gleiche Machart wie die Netzkarte der ICE-App, nur in Mercator statt
   Plattkarte: Flugrouten spannen sich über die halbe Erde, da wäre eine
   ungestreckte Karte unbrauchbar. Gezeichnet werden

     * die Basiskarte aus geo.js (Natural Earth),
     * ein blasser Punkt je grossem Flughafen zur Orientierung,
     * ein grüner Punkt je Flughafen mit eigener Sichtung,
     * die Routen der eingetragenen Flüge als Grosskreisbögen. */
var SpotMap = (function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var S = 100;                       // Weltmasstab (kleine SVG-Einheiten rendern unsauber)
  var LAT_CAP = 83;                  // Mercator kennt die Pole nicht
  var DEG = 180 / Math.PI;
  var DE = { lat0: 46.5, lat1: 55.5, lon0: 5.0, lon1: 16.0 };    // Startausschnitt

  function wx(lon) { return lon * S; }
  function wy(lat) {
    var l = Math.max(-LAT_CAP, Math.min(LAT_CAP, lat));
    return -DEG * Math.log(Math.tan(Math.PI / 4 + l / DEG / 2)) * S;
  }
  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    return e;
  }

  function geoPath(ring) {
    var d = "";
    for (var i = 0; i < ring.length; i++) {
      d += (i ? "L" : "M") + wx(ring[i][0]).toFixed(1) + " " + wy(ring[i][1]).toFixed(1) + " ";
    }
    return d + "Z";
  }

  // Grosskreis zwischen zwei Punkten, gestückelt - in Mercator ist die kürzeste
  // Strecke keine Gerade, und genau das macht die Fernstrecken erst erkennbar.
  function routePath(a, b) {
    var f1 = a[0] / DEG, l1 = a[1] / DEG, f2 = b[0] / DEG, l2 = b[1] / DEG;
    var d = 2 * Math.asin(Math.sqrt(
      Math.pow(Math.sin((f2 - f1) / 2), 2) +
      Math.cos(f1) * Math.cos(f2) * Math.pow(Math.sin((l2 - l1) / 2), 2)));
    var n = Math.max(12, Math.min(64, Math.round(d * DEG / 3)));
    var pts = [], prevLon = null, shift = 0;
    for (var i = 0; i <= n; i++) {
      var t = i / n, lat, lon;
      if (d < 1e-6) { lat = a[0]; lon = a[1]; }
      else {
        var A = Math.sin((1 - t) * d) / Math.sin(d), B = Math.sin(t * d) / Math.sin(d);
        var x = A * Math.cos(f1) * Math.cos(l1) + B * Math.cos(f2) * Math.cos(l2);
        var y = A * Math.cos(f1) * Math.sin(l1) + B * Math.cos(f2) * Math.sin(l2);
        var z = A * Math.sin(f1) + B * Math.sin(f2);
        lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * DEG;
        lon = Math.atan2(y, x) * DEG;
      }
      // Datumsgrenze: fortlaufend weiterzählen statt zu springen
      if (prevLon != null && Math.abs(lon + shift - prevLon) > 180) {
        shift += (lon + shift < prevLon) ? 360 : -360;
      }
      prevLon = lon + shift;
      pts.push([wx(lon + shift), wy(lat)]);
    }
    return pts.map(function (p, i) {
      return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
    }).join(" ");
  }

  function create(host, opts) {
    opts = opts || {};
    var svg = el("svg", { class: "map-svg", preserveAspectRatio: "xMidYMid meet" });
    var gGeo = el("g", { class: "m-geo" });
    var gRoute = el("g", { class: "m-route" });
    var gDots = el("g", { class: "m-dots" });
    var gLab = el("g", { class: "m-lab" });
    var gHit = el("g", { class: "m-hit" });
    [gGeo, gRoute, gDots, gLab, gHit].forEach(function (g) { svg.appendChild(g); });
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

    // --- blasse Orientierungspunkte: die grossen Flughäfen ---
    var faint = [];
    AIRPORTS.forEach(function (a) {
      if (a[7] < 2) return;
      var c = el("circle", { cx: wx(a[6]), cy: wy(a[5]), r: 1.5, class: "md other" });
      gDots.appendChild(c);
      faint.push(c);
    });

    // --- Ansicht ---
    var vb = { x: 0, y: 0, w: 10 * S, h: 10 * S };
    var dots = [], labels = [];

    function size() {
      var r = svg.getBoundingClientRect();
      return { w: r.width || 320, h: r.height || 240 };
    }
    function applyVB() {
      svg.setAttribute("viewBox", vb.x + " " + vb.y + " " + vb.w + " " + vb.h);
      var s = size();
      var perPx = vb.w / (s.w || 1);
      faint.forEach(function (c) { c.setAttribute("r", (perPx * 1.6).toFixed(3)); });
      dots.forEach(function (d) {
        d.el.setAttribute("r", (perPx * (3 + Math.min(d.n, 9) * 0.35)).toFixed(3));
        if (d.hit) d.hit.setAttribute("r", (perPx * 11).toFixed(3));
      });
      labels.forEach(function (l) {
        var show = vb.w < 40 * S;
        l.el.setAttribute("font-size", (perPx * 10.5).toFixed(3));
        l.el.setAttribute("x", (l.x + perPx * 7).toFixed(3));
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
      var w = Math.max(x1 - x0, 60) * (pad || 1.15);
      var h = Math.max(y1 - y0, 60) * (pad || 1.15);
      if (w / h < asp) w = h * asp; else h = w / asp;
      vb = { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w: w, h: h };
      applyVB();
    }
    function fitDefault() {
      fitPoints([[wx(DE.lon0), wy(DE.lat0)], [wx(DE.lon1), wy(DE.lat1)]], 1.04);
    }
    function fitWorld() {
      fitPoints([[wx(-170), wy(70)], [wx(179), wy(-55)]], 1.0);
    }
    function fitSpots() {
      var pts = dots.map(function (d) { return [d.x, d.y]; });
      routePts.forEach(function (p) { pts.push(p); });
      if (pts.length > 1) fitPoints(pts, 1.3); else if (pts.length === 1) {
        vb = { x: pts[0][0] - 6 * S, y: pts[0][1] - 6 * S, w: 12 * S, h: 12 * S };
        applyVB();
      } else fitDefault();
    }

    // --- Ebenen aktualisieren ---
    var selected = null, routePts = [];
    function update(st) {
      st = st || {};
      var spots = st.spots || {}, routes = st.routes || [];

      gRoute.innerHTML = "";
      gDots.querySelectorAll(".md:not(.other)").forEach(function (n) { n.remove(); });
      gLab.innerHTML = "";
      gHit.innerHTML = "";
      dots = []; labels = []; routePts = [];

      routes.forEach(function (r) {
        var a = st.pos(r[0]), b = st.pos(r[1]);
        if (!a || !b) return;
        gRoute.appendChild(el("path", { d: routePath(a, b), class: "mr", "data-ap": r[0] }));
        routePts.push([wx(a[1]), wy(a[0])], [wx(b[1]), wy(b[0])]);
      });

      Object.keys(spots).forEach(function (icao) {
        var p = st.pos(icao);
        if (!p) return;
        var x = wx(p[1]), y = wy(p[0]);
        var c = el("circle", { cx: x, cy: y, r: 3, class: "md" });
        gDots.appendChild(c);
        var h = el("circle", { cx: x, cy: y, r: 10, fill: "transparent",
                               style: "cursor:pointer", "data-ap": icao });
        gHit.appendChild(h);
        dots.push({ el: c, hit: h, icao: icao, n: spots[icao].n || 1, x: x, y: y });
        var t = el("text", { x: x, y: y, class: "ml" });
        t.textContent = spots[icao].label || icao;
        gLab.appendChild(t);
        labels.push({ el: t, x: x, y: y });
      });

      setSelected(st.selected !== undefined ? st.selected : selected);
      applyVB();
    }
    function setSelected(icao) {
      selected = icao || null;
      dots.forEach(function (d) { d.el.classList.toggle("on", d.icao === selected); });
      gRoute.querySelectorAll(".mr").forEach(function (n) {
        n.classList.toggle("on", !!selected && n.dataset.ap === selected);
      });
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
        var hit = ev.target.closest("[data-ap]");
        if (opts.onSelect) opts.onSelect(hit ? hit.dataset.ap : null);
      });
    }

    function zoomTo(newW, clientX, clientY) {
      var s = size(), r = svg.getBoundingClientRect();
      newW = Math.min(Math.max(newW, 0.4 * S), 420 * S);
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
      select: setSelected,
      fitDefault: fitDefault,
      fitWorld: fitWorld,
      fitSpots: fitSpots,
      zoom: function (f) { zoomTo(vb.w * f); },
      resize: applyVB
    };
  }

  return { create: create };
})();
