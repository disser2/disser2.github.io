/* Bücherregal – kleine Hilfsfunktionen (Hash, Farben, Text, DOM, Speicher) */
(function () {
  "use strict";
  const BS = (window.BS = window.BS || {});

  // ---------- Hash & deterministischer Zufall ----------
  // Jedes Buch bekommt aus seiner ID einen festen Seed: Farbe, Höhe und
  // Rückenstil bleiben dadurch bei jedem Laden gleich.
  function hash32(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Farben ----------
  function hexToRgb(hex) {
    const m = hex.replace("#", "");
    const n = parseInt(m.length === 3 ? m.replace(/./g, "$&$&") : m, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
    return "#" + c(r) + c(g) + c(b);
  }
  function mix(a, b, t) {
    const x = hexToRgb(a), y = hexToRgb(b);
    return rgbToHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
  }
  // amt > 0 heller, amt < 0 dunkler
  function shade(hex, amt) {
    return amt >= 0 ? mix(hex, "#ffffff", amt) : mix(hex, "#000000", -amt);
  }
  function luminance(hex) {
    const v = hexToRgb(hex).map((c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  // Schriftfarbe für einen farbigen Grund: cremeweiß oder fast schwarz
  const INK_LIGHT = "#fbf6ec", INK_DARK = "#221b2c";
  function inkFor(bg) {
    return contrast(bg, INK_LIGHT) >= contrast(bg, INK_DARK) ? INK_LIGHT : INK_DARK;
  }
  function hue(hex) {
    const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    const l = (max + min) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s, l };
  }

  // ---------- Text ----------
  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/ß/g, "ss")
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "");
  }
  // Schlüssel aus Buchstaben/Ziffern – identisch zu tools/build_books.py
  function keyNorm(s) {
    return norm(s).replace(/[^a-z0-9]+/g, "");
  }
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ESC[c]);
  }

  // ---------- Zahlen & Daten ----------
  const nf0 = new Intl.NumberFormat("de-DE");
  const nf1 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt = (n) => (n == null || isNaN(n) ? "–" : nf0.format(Math.round(n)));
  const fmt1 = (n) => (n == null || isNaN(n) ? "–" : nf1.format(n));
  const fmt2 = (n) => (n == null || isNaN(n) ? "–" : nf2.format(n));
  const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const MONTHS_LONG = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August",
    "September", "Oktober", "November", "Dezember"];
  function fmtDate(d) {
    if (!d) return "–";
    return d.getDate() + ". " + MONTHS_LONG[d.getMonth()] + " " + d.getFullYear();
  }
  function fmtMonth(d) {
    return d ? MONTHS_LONG[d.getMonth()] + " " + d.getFullYear() : "–";
  }
  // Goodreads: "2023/05/14" (ältere Exporte auch "2023-05-14" oder "05/14/2023")
  function parseDate(s) {
    s = String(s || "").trim();
    if (!s) return null;
    let m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/);
    if (m) return s.includes(".") ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(+m[3], +m[1] - 1, +m[2]);
    m = s.match(/^(\d{4})$/);
    if (m) return new Date(+m[1], 0, 1);
    return null;
  }
  function int(s) {
    const n = parseInt(String(s || "").replace(/[^\d\-]/g, ""), 10);
    return isNaN(n) ? null : n;
  }
  function num(s) {
    const n = parseFloat(String(s || "").replace(",", "."));
    return isNaN(n) ? null : n;
  }

  // ---------- DOM ----------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k === "html") node.innerHTML = v;
        else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
        else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
        else if (k === "dataset") Object.assign(node.dataset, v);
        else node.setAttribute(k, v === true ? "" : v);
      }
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      node.append(c.nodeType ? c : document.createTextNode(c));
    }
    return node;
  }
  // Schlüsselbasierter Abgleich einer Liste von Kindknoten (für Diagramme & Listen).
  // Bestehende Knoten bleiben erhalten, damit CSS-Transitions greifen.
  function reconcile(container, items, keyOf, create, update) {
    const old = new Map();
    for (const c of Array.from(container.children)) if (c.dataset.key != null) old.set(c.dataset.key, c);
    let prev = null;
    for (const item of items) {
      const key = String(keyOf(item));
      let node = old.get(key);
      if (node) old.delete(key);
      else {
        node = create(item);
        node.dataset.key = key;
      }
      update(node, item);
      const next = prev ? prev.nextSibling : container.firstChild;
      if (next !== node) container.insertBefore(node, next);
      prev = node;
    }
    for (const n of old.values()) n.remove();
  }

  // ---------- Verschiedenes ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }
  const motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const reducedMotion = () => !!(motionQuery && motionQuery.matches);
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // Animation abwarten, ohne bei abgebrochenen Animationen zu werfen
  const done = (anim) => (anim && anim.finished ? anim.finished.catch(() => {}) : Promise.resolve());

  // localStorage kann (privates Fenster, gesperrt) fehlen oder werfen
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
        return true;
      } catch (e) {
        return false;
      }
    },
    del(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
    },
  };

  function download(name, text, type) {
    const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    const a = el("a", { href: URL.createObjectURL(blob), download: name });
    document.body.append(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }

  BS.util = {
    hash32, rng, hexToRgb, rgbToHex, mix, shade, luminance, contrast, inkFor, hue,
    norm, keyNorm, esc, fmt, fmt1, fmt2, MONTHS, MONTHS_LONG, fmtDate, fmtMonth, parseDate, int, num,
    $, $$, el, reconcile, clamp, lerp, debounce, reducedMotion, nextFrame, wait, done, store, download,
  };
})();
