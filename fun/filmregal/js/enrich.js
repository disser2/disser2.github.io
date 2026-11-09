/* Filmregal – Plakate & Metadaten von Wikidata und Wikipedia (kostenlos, ohne API-Key)

   Der Trakt-Export kennt nur Titel, Jahr und IDs. Alles Weitere kommt über die
   IMDb-ID aus Wikidata – stapelweise, ein Durchgang für die ganze Sammlung:
   1. query.wikidata.org (SPARQL): deutscher Titel, Laufzeit, Genres, Regie,
      Besetzung, Produktionsland, Sprache, Wikipedia-Artikel
   2. en.wikipedia.org (pageimages): das Filmplakat aus dem englischen Artikel
   Das Ergebnis wird im Browser gecacht; tools/build_movies.py schreibt dasselbe
   vorab nach data/movies.js, dann fragt der Browser gar nicht mehr nach. */
(function () {
  "use strict";
  const FR = (window.FR = window.FR || {});
  const U = FR.util;

  const CACHE_KEY = "fr.wd.v1";
  const SETTINGS_KEY = "fr.online";
  const RETRY_NONE_MS = 30 * 864e5; // "nichts gefunden" nach 30 Tagen erneut versuchen
  const BATCH = 40;
  const MAX_CAST = 30;
  const SPARQL = "https://query.wikidata.org/sparql";
  const WIKI_API = "https://en.wikipedia.org/w/api.php";

  let cache = U.store.get(CACHE_KEY, {}) || {};
  let seeded = {}; // aus data/movies.js (vorab angereichert)
  const failedImg = new Set();
  let current = null; // laufender Suchdurchgang

  const online = () => U.store.get(SETTINGS_KEY, true) !== false;
  function setOnline(v) {
    U.store.set(SETTINGS_KEY, !!v);
  }
  function seed(enrichment) {
    seeded = enrichment || {};
  }
  // movies.js geht vor: dort stehen auch lokale Plakate (img) und die Genres von Hand (th)
  function get(key) {
    return seeded[key] || cache[key] || null;
  }
  const saveCache = U.debounce(() => {
    if (!U.store.set(CACHE_KEY, cache)) {
      // Speicher voll: Besetzung kürzen und erneut versuchen
      for (const k in cache) if (cache[k].c) cache[k].c = cache[k].c.slice(0, 8);
      U.store.set(CACHE_KEY, cache);
    }
  }, 800);

  // ---------- Plakate ----------
  // Wikimedia liefert Vorschaubilder nur in festen Breiten; 250 px reichen fürs Regal.
  function sized(url, size) {
    if (size === "L") return url;
    return url.replace(/\/(\d+)px-([^\/]+)$/, (m, w, rest) => (+w > 250 ? "/250px-" + rest : m))
      .replace(/([?&]width=)\d+/, "$1250");
  }
  function posterUrls(film, size) {
    const rec = get(film.key);
    if (!rec || !rec.img || failedImg.has(rec.img)) return [];
    const remote = /^https?:/.test(rec.img);
    if (remote && !online()) return [];
    return [remote ? sized(rec.img, size || "M") : rec.img];
  }
  function posterUrl(film, size) {
    return posterUrls(film, size)[0] || null;
  }
  function markFailed(film) {
    const rec = get(film.key);
    if (rec && rec.img) failedImg.add(rec.img);
  }

  // ---------- Abfragen ----------
  async function fetchJson(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (res.status === 429) throw Object.assign(new Error("rate"), { rate: true });
      if (!res.ok) throw new Error("http " + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function sparql(ids) {
    return "SELECT ?imdb ?item ?p ?l WHERE { VALUES ?imdb { " + ids.map((i) => '"' + i + '"').join(" ") + " } " +
      "?item wdt:P345 ?imdb . " +
      '{ BIND("de" AS ?p) ?item rdfs:label ?l . FILTER(LANG(?l) = "de") } ' +
      'UNION { BIND("rt" AS ?p) ?item wdt:P2047 ?l . } ' +
      'UNION { BIND("po" AS ?p) ?item wdt:P3383 ?l . } ' +
      'UNION { VALUES (?p ?prop) { ("g" wdt:P136) ("d" wdt:P57) ("c" wdt:P161) ("co" wdt:P495) ("l" wdt:P364) } ' +
      '?item ?prop ?v . OPTIONAL { ?v rdfs:label ?lde . FILTER(LANG(?lde) = "de") } ' +
      'OPTIONAL { ?v rdfs:label ?len . FILTER(LANG(?len) = "en") } BIND(COALESCE(?lde, ?len) AS ?l) } ' +
      'UNION { BIND("en" AS ?p) ?l schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . } ' +
      'UNION { BIND("dw" AS ?p) ?l schema:about ?item ; schema:isPartOf <https://de.wikipedia.org/> . } }';
  }

  // SPARQL-Zeilen → ein Datensatz je IMDb-ID (identisch zu tools/build_movies.py)
  function collect(bindings) {
    const out = {};
    for (const b of bindings) {
      const imdb = b.imdb && b.imdb.value, item = b.item && b.item.value;
      if (!imdb || !item || !b.p || !b.l) continue;
      const r = (out[imdb] = out[imdb] || { item, de: "", rt: [], po: "", g: [], d: [], c: [], co: [], l: [], en: "", dw: "" });
      if (r.item !== item) continue; // selten: zwei Wikidata-Objekte zur selben IMDb-ID
      const p = b.p.value, v = b.l.value;
      if (p === "rt") r.rt.push(parseFloat(v));
      else if (Array.isArray(r[p])) r[p].includes(v) || r[p].push(v);
      else if (!r[p]) r[p] = v;
    }
    const recs = {};
    for (const imdb in out) {
      const r = out[imdb];
      // Laufzeit steht fast immer in Minuten; große Werte sind Sekunden
      const mins = r.rt.filter((x) => x > 0).map((x) => (x > 600 ? x / 60 : x)).filter((x) => x >= 1);
      const feature = mins.filter((x) => x >= 40);
      const rt = feature.length ? Math.min(...feature) : mins.length ? Math.max(...mins) : null;
      const rec = { q: r.item.split("/").pop(), t: Date.now() };
      if (r.de) rec.de = r.de;
      if (rt) rec.rt = Math.round(rt);
      if (r.g.length) rec.g = r.g.slice(0, 8);
      if (r.d.length) rec.d = r.d.slice(0, 4);
      if (r.c.length) rec.c = r.c.slice(0, MAX_CAST);
      if (r.co.length) rec.co = r.co.slice(0, 4);
      if (r.l.length) rec.l = r.l.slice(0, 3);
      if (r.dw || r.en) rec.wp = r.dw || r.en;
      if (r.po) rec.img = r.po.replace(/^http:/, "https:") + "?width=500";
      recs[imdb] = { rec, en: r.en };
    }
    return recs;
  }

  const wikiTitle = (url) => {
    try {
      return decodeURIComponent(url.split("/wiki/")[1] || "").replace(/_/g, " ");
    } catch (e) {
      return "";
    }
  };

  // Plakate aus den englischen Artikeln (dort als Bildzitat hinterlegt)
  async function posters(titles) {
    const out = {};
    if (!titles.length) return out;
    const url = WIKI_API + "?action=query&format=json&origin=*&redirects=1&prop=pageimages&piprop=thumbnail" +
      "&pithumbsize=500&pilicense=any&pilimit=50&titles=" + encodeURIComponent(titles.join("|"));
    const data = await fetchJson(url);
    const q = data.query || {};
    const alias = {};
    for (const m of (q.normalized || []).concat(q.redirects || [])) alias[m.to] = (alias[m.to] || []).concat(m.from);
    for (const id in q.pages || {}) {
      const pg = q.pages[id];
      if (!pg.thumbnail || !pg.thumbnail.source) continue;
      const names = [pg.title];
      for (let i = 0; i < names.length; i++) for (const a of alias[names[i]] || []) names.includes(a) || names.push(a);
      names.forEach((n) => (out[n] = pg.thumbnail.source));
    }
    return out;
  }

  async function lookupBatch(films) {
    const ids = films.map((f) => f.imdb).filter((i) => /^tt\d+$/.test(i));
    const data = ids.length ? await fetchJson(SPARQL + "?format=json&query=" + encodeURIComponent(sparql(ids))) : null;
    const recs = data ? collect((data.results && data.results.bindings) || []) : {};
    const need = Object.values(recs).filter((r) => !r.rec.img && r.en).map((r) => wikiTitle(r.en)).filter(Boolean);
    let imgs = {};
    try {
      imgs = await posters([...new Set(need)]);
    } catch (e) {
      if (e.rate) throw e; // ohne Plakate weitermachen, die Metadaten sind schon da
    }
    return films.map((f) => {
      const hit = recs[f.imdb];
      if (!hit) return { t: Date.now() };
      const img = !hit.rec.img && hit.en ? imgs[wikiTitle(hit.en)] : null;
      if (img) hit.rec.img = img;
      return hit.rec;
    });
  }

  function needs(film) {
    if (seeded[film.key]) return false; // schon von tools/build_movies.py nachgeschlagen
    const rec = cache[film.key];
    if (!rec) return true;
    return !rec.q && rec.t && Date.now() - rec.t > RETRY_NONE_MS;
  }

  // Stapelweise mit höflichem Abstand; bei 429 Pause, bei wiederholten Netzfehlern
  // (offline, blockiert) für diese Sitzung aufgeben.
  // onProgress(erledigt, gesamt, gestoppt, fertig) – gestoppt: "user" (Stopp-Knopf, Schalter,
  // neue Daten) oder "net" (Wikidata nicht erreichbar).
  async function run(films, onResult, onProgress) {
    if (!online() || !window.fetch) return;
    stop(); // ein älterer Durchgang läuft nach seiner letzten Anfrage aus
    const todo = films.filter(needs);
    if (!todo.length) return;
    const job = (current = { stop: false });
    let doneCount = 0, netFails = 0;
    const total = todo.length;
    onProgress && onProgress(0, total);
    while (todo.length && !job.stop) {
      const batch = todo.splice(0, BATCH);
      try {
        const recs = await lookupBatch(batch);
        if (job.stop) break;
        batch.forEach((film, i) => {
          cache[film.key] = recs[i];
          onResult && onResult(film, recs[i]);
        });
        saveCache();
        netFails = 0;
        doneCount += batch.length;
      } catch (e) {
        todo.unshift(...batch);
        if (e.rate) await U.wait(30000);
        else if (++netFails >= 3) job.stop = job.stop || "net";
        else await U.wait(1500);
      }
      onProgress && onProgress(doneCount, total, job.stop);
      if (todo.length && !job.stop) await U.wait(400);
    }
    if (current === job) current = null;
    onProgress && onProgress(doneCount, total, job.stop, true);
  }
  function stop() {
    if (current) current.stop = "user";
    current = null;
  }
  function clear() {
    cache = {};
    U.store.del(CACHE_KEY);
    failedImg.clear();
  }
  // Alles, was für die gegebenen Filme bekannt ist (für den movies.js-Export)
  function exportFor(films) {
    const out = {};
    for (const b of films) {
      const rec = get(b.key);
      if (rec) out[b.key] = rec;
    }
    return out;
  }

  FR.enrich = { seed, get, posterUrl, posterUrls, markFailed, run, stop, clear, exportFor, online, setOnline, collect, sparql };
})();
