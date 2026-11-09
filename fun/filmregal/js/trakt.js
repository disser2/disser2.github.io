/* Filmregal – Trakt-Export lesen: ZIP entpacken (ohne Bibliothek) und die
   Film-Dateien zu kompakten Zeilen zusammenführen. Serien, Netzwerk, Einstellungen
   und alles andere im Export bleiben ungelesen.

   Zeile: { id, t, y, imdb, tmdb, slug, w: [ISO-Zeiten], r, ra, st, la, lists, c, cs }
   (gleiches Format wie tools/build_movies.py → data/movies.js) */
(function () {
  "use strict";
  const FR = (window.FR = window.FR || {});

  // ---------- ZIP ----------
  const WANTED = /(^|\/)(watched-movies|watched-history|ratings-movies|lists-watchlist|lists-favorites|lists-lists|lists-list-|comments-movies)[^\/]*\.json$/;

  async function inflate(bytes) {
    const ds = new DecompressionStream("deflate-raw");
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  // Liefert { Dateiname: geparstes JSON } für die Film-Dateien des Exports
  async function readZip(buffer) {
    const u8 = new Uint8Array(buffer);
    const dv = new DataView(buffer);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) throw new Error("kein ZIP");
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const td = new TextDecoder("utf-8");
    const out = {};
    for (let n = 0; n < count && dv.getUint32(p, true) === 0x02014b50; n++) {
      const method = dv.getUint16(p + 10, true);
      const csize = dv.getUint32(p + 20, true);
      const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
      const local = dv.getUint32(p + 42, true);
      const name = td.decode(u8.subarray(p + 46, p + 46 + nameLen));
      p += 46 + nameLen + extraLen + commentLen;
      if (!WANTED.test(name) || (method !== 0 && method !== 8)) continue;
      const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      const raw = u8.subarray(start, start + csize);
      const data = method === 8 ? await inflate(raw) : raw;
      try {
        out[name.split("/").pop()] = JSON.parse(td.decode(data));
      } catch (e) {}
    }
    return out;
  }

  // ---------- Export → Zeilen ----------
  function toRows(files) {
    const names = Object.keys(files).sort();
    const all = (prefix) => names.filter((n) => n.startsWith(prefix)).flatMap((n) => (Array.isArray(files[n]) ? files[n] : []));
    const rows = new Map();
    const row = (m, status) => {
      const id = String(m.ids && m.ids.trakt != null ? m.ids.trakt : m.title + "|" + m.year);
      let r = rows.get(id);
      if (!r) {
        r = { id, t: m.title || "", y: m.year || null, imdb: (m.ids && m.ids.imdb) || "", tmdb: (m.ids && m.ids.tmdb) || null,
          slug: (m.ids && m.ids.slug) || "", w: [], st: status };
        rows.set(id, r);
      } else if (status === "watched") r.st = "watched";
      return r;
    };
    const last = {};
    for (const e of all("watched-movies")) {
      if (!e.movie) continue;
      const r = row(e.movie, "watched");
      last[r.id] = e.last_watched_at;
    }
    for (const e of all("watched-history")) {
      if (e.type !== "movie" || !e.movie || !e.watched_at) continue;
      row(e.movie, "watched").w.push(e.watched_at);
    }
    for (const r of rows.values()) {
      if (!r.w.length && last[r.id]) r.w.push(last[r.id]);
      r.w.sort();
    }
    for (const e of all("ratings-movies")) {
      if (!e.movie || !e.rating) continue;
      const r = rows.get(String(e.movie.ids.trakt));
      if (r) {
        r.r = e.rating;
        r.ra = e.rated_at || undefined;
      }
    }
    for (const e of all("lists-watchlist")) {
      if (e.type !== "movie" || !e.movie) continue;
      const r = row(e.movie, "watchlist");
      r.la = e.listed_at || undefined;
    }
    const addList = (entries, name) => {
      for (const e of entries) {
        if (e.type !== "movie" || !e.movie) continue;
        const r = rows.get(String(e.movie.ids.trakt)) || row(e.movie, "watchlist");
        (r.lists = r.lists || []).includes(name) || r.lists.push(name);
      }
    };
    addList(all("lists-favorites"), "Favoriten");
    const listNames = {};
    for (const l of all("lists-lists")) if (l.ids) listNames[l.ids.trakt] = l.name;
    for (const n of names) {
      const m = n.match(/^lists-list-(\d+)-(.+)\.json$/);
      if (m && Array.isArray(files[n])) addList(files[n], listNames[m[1]] || m[2].replace(/-/g, " "));
    }
    for (const e of all("comments-movies")) {
      const c = e.comment;
      if (!e.movie || !c || !c.comment || c.parent_id) continue;
      const r = rows.get(String(e.movie.ids.trakt));
      if (r && !r.c) {
        r.c = c.comment;
        if (c.spoiler) r.cs = true;
      }
    }
    return [...rows.values()];
  }

  async function importFile(file) {
    const files = await readZip(await file.arrayBuffer());
    return toRows(files);
  }

  FR.trakt = { readZip, toRows, importFile, supported: () => "DecompressionStream" in window };
})();
