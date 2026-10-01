/* Bücherregal – Cover & Metadaten von Open Library (kostenlos, ohne API-Key)

   Ablauf je Buch (Ergebnis wird im Browser gecacht):
   1. search.json?q=isbn:…   → Treffer nur übernehmen, wenn der Titel passt
   2. search.json?title=…&author=…  (Goodreads-Exporte haben oft keine ISBN)
   → cover_i (Cover-ID), Schlagwörter, Erscheinungsjahr, Seitenzahl, Autor-ID

   Cover per Cover-ID sind nicht limitiert; Cover per ISBN schon
   (≈100 Anfragen / 5 min) – darum wird die ID bevorzugt und die ISBN-URL nur
   als Notnagel benutzt. */
(function () {
  "use strict";
  const BS = (window.BS = window.BS || {});
  const U = BS.util;

  const CACHE_KEY = "bs.ol.v1";
  const SETTINGS_KEY = "bs.online";
  const FIELDS = "key,title,author_name,author_key,cover_i,subject,first_publish_year,number_of_pages_median";
  const RETRY_NONE_MS = 30 * 864e5; // "nichts gefunden" nach 30 Tagen erneut versuchen

  let cache = U.store.get(CACHE_KEY, {}) || {};
  let seeded = {}; // aus data/books.js (vorab angereichert)
  const failedImg = new Set();
  let running = false, stopFlag = false;

  const online = () => U.store.get(SETTINGS_KEY, true) !== false;
  function setOnline(v) {
    U.store.set(SETTINGS_KEY, !!v);
  }

  function seed(enrichment) {
    seeded = enrichment || {};
  }
  function get(key) {
    return cache[key] || seeded[key] || null;
  }
  const saveCache = U.debounce(() => {
    if (!U.store.set(CACHE_KEY, cache)) {
      // Speicher voll: Schlagwörter kürzen und erneut versuchen
      for (const k in cache) if (cache[k].s) cache[k].s = cache[k].s.slice(0, 8);
      U.store.set(CACHE_KEY, cache);
    }
  }, 800);

  function coverUrl(book, size) {
    size = size || "M";
    const rec = get(book.olKey);
    if (rec && rec.c) return "https://covers.openlibrary.org/b/id/" + rec.c + "-" + size + ".jpg";
    if (rec && rec.c === 0 && rec.t) return null; // gesucht, nichts gefunden
    const isbn = book.isbn13 || book.isbn10;
    if (isbn && online() && !failedImg.has(isbn))
      return "https://covers.openlibrary.org/b/isbn/" + isbn + "-" + size + ".jpg?default=false";
    return null;
  }
  function markFailed(book) {
    const isbn = book.isbn13 || book.isbn10;
    if (isbn) failedImg.add(isbn);
  }
  function authorPhotoUrl(authorKey) {
    return authorKey ? "https://covers.openlibrary.org/a/olid/" + authorKey + "-M.jpg?default=false" : null;
  }

  // ---------- Titelvergleich ----------
  const STOP = new Set(["the", "a", "an", "der", "die", "das", "ein", "eine", "and", "und", "of", "von"]);
  function words(s) {
    return U.norm(s).replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter((w) => w && !STOP.has(w));
  }
  function similar(a, b) {
    const x = words(a), y = words(b);
    if (!x.length || !y.length) return 0;
    const sx = new Set(x), sy = new Set(y);
    let inter = 0;
    sx.forEach((w) => sy.has(w) && inter++);
    // Untertitel tolerieren: Anteil der Wörter des kürzeren Titels
    return inter / Math.min(sx.size, sy.size);
  }

  async function fetchJson(url, signal) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    if (signal) signal.addEventListener("abort", () => ctrl.abort());
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (res.status === 429) throw Object.assign(new Error("rate"), { rate: true });
      if (!res.ok) throw new Error("http " + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function pick(docs, book) {
    let best = null, bestScore = 0;
    for (const d of docs || []) {
      const sim = similar(d.title, book.short);
      const auth = (d.author_name || []).some((n) => U.norm(n).includes(U.norm(book.authorLast)));
      const score = sim + (auth ? 0.5 : 0) + (d.cover_i ? 0.15 : 0);
      if (sim >= 0.6 && score > bestScore) {
        best = d;
        bestScore = score;
      }
    }
    return best;
  }

  async function lookup(book) {
    const base = "https://openlibrary.org/search.json?fields=" + FIELDS + "&limit=";
    let doc = null;
    const isbn = book.isbn13 || book.isbn10;
    if (isbn) {
      const r = await fetchJson(base + "3&q=isbn:" + isbn);
      doc = pick(r.docs, book);
    }
    if (!doc || !doc.cover_i) {
      const q = "&title=" + encodeURIComponent(book.short) +
        (book.authorLast && book.authorLast !== "Unbekannt" ? "&author=" + encodeURIComponent(book.authorLast) : "");
      const r = await fetchJson(base + "5" + q);
      doc = pick(r.docs, book) || doc;
    }
    if (!doc) return { c: 0, t: Date.now() };
    const subj = (doc.subject || []).filter((s) => s.length < 60).slice(0, 25);
    return {
      c: doc.cover_i || 0,
      w: doc.key || "",
      a: (doc.author_key || [])[0] || "",
      s: subj,
      y: doc.first_publish_year || null,
      p: doc.number_of_pages_median || null,
      t: Date.now(),
    };
  }

  function needs(book) {
    const rec = get(book.olKey);
    if (!rec) return true;
    if (!rec.c && rec.t && Date.now() - rec.t > RETRY_NONE_MS) return true;
    return false;
  }

  // Warteschlange: 2 parallel, höflicher Abstand, bei 429 Pause, bei
  // wiederholten Netzfehlern (offline, blockiert) für diese Sitzung aufgeben.
  async function run(books, onResult, onProgress) {
    if (running || !online() || !window.fetch) return;
    const todo = books.filter(needs);
    if (!todo.length) return;
    running = true;
    stopFlag = false;
    let doneCount = 0, netFails = 0;
    const total = todo.length;
    onProgress && onProgress(0, total);
    const worker = async () => {
      while (todo.length && !stopFlag) {
        const book = todo.shift();
        try {
          const rec = await lookup(book);
          cache[book.olKey] = rec;
          saveCache();
          netFails = 0;
          onResult && onResult(book, rec);
        } catch (e) {
          if (e.rate) {
            todo.unshift(book);
            await U.wait(30000);
            continue;
          }
          if (++netFails >= 4) stopFlag = true;
        }
        doneCount++;
        onProgress && onProgress(doneCount, total, stopFlag);
        await U.wait(350);
      }
    };
    await Promise.all([worker(), worker()]);
    running = false;
    onProgress && onProgress(total, total, stopFlag, true);
  }
  function stop() {
    stopFlag = true;
  }
  function clear() {
    cache = {};
    U.store.del(CACHE_KEY);
    failedImg.clear();
  }
  // Alles, was für die gegebenen Bücher bekannt ist (für den books.js-Export)
  function exportFor(books) {
    const out = {};
    for (const b of books) {
      const rec = get(b.olKey);
      if (rec) out[b.olKey] = rec;
    }
    return out;
  }

  BS.covers = { seed, get, coverUrl, markFailed, authorPhotoUrl, run, stop, clear, exportFor, online, setOnline, similar };
})();
