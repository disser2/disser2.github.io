/* Filmregal – Datenmodell: Trakt-Zeilen → Filme, Genres, Ären,
   Suche mit Feldsyntax, Facettenfilter, Sortierung und Gruppierung */
(function () {
  "use strict";
  const FR = (window.FR = window.FR || {});
  const U = FR.util;

  // ---------- Genres ----------
  // Reihenfolge = Anzeige-Reihenfolge. Schlüssel stehen auch in data/genres.csv und in der URL.
  // Die Paletten sind Hüllenfarben (Deko auf dem Regal), keine Diagrammfarben.
  // rx trifft Wortstämme in den Genre-Bezeichnungen von Wikidata (deutsch und englisch),
  // z. B. "Filmkomödie", "romantic comedy", "Science-Fiction-Film".
  const GENRES = [
    { key: "action", label: "Action",
      pal: ["#c1272d", "#9d1c20", "#e0552b", "#7a1a1a", "#d9412f", "#2b2d33"],
      rx: /action|martial arts|kampfkunst|katastrophen|disaster/ },
    { key: "abenteuer", label: "Abenteuer",
      pal: ["#c9713f", "#b86434", "#8a5a2b", "#d4844f", "#6b7a3a", "#a5562b"],
      rx: /abenteuer|adventure|roadmovie|road movie|swashbuckler|mantel und degen/ },
    { key: "animation", label: "Animation",
      pal: ["#f2a541", "#45b69c", "#ee964b", "#3a86ff", "#f06543", "#e9c53d"],
      rx: /animat|zeichentrick|trickfilm|anime|stop motion|cartoon/ },
    { key: "komoedie", label: "Komödie",
      pal: ["#f2b632", "#ef476f", "#06a77d", "#f78c6b", "#e9a92a", "#ff9f1c"],
      rx: /komodie|comedy|parod|satire|slapstick|buddy|farce|humor/ },
    { key: "krimi", label: "Krimi",
      pal: ["#1f1f24", "#2b2d33", "#7a1f1f", "#3a3f47", "#1b2333", "#8c2f2f"],
      rx: /krimi|crime|gangster|heist|mafia|detektiv|detective|noir|gerichts|courtroom|justiz/ },
    { key: "doku", label: "Dokumentation",
      pal: ["#2a9d8f", "#264653", "#3a7d7c", "#287271", "#40798c", "#52796f"],
      rx: /doku|documentary|konzertfilm|concert film/ },
    { key: "drama", label: "Drama", generic: true,
      pal: ["#3d405b", "#5c6784", "#7a3e48", "#2b3a55", "#8e5572", "#4a5a7a", "#6f4e37"],
      rx: /drama|tragod|tragikom|tragedy|coming of age|melodram/ },
    { key: "familie", label: "Familie & Kinder",
      pal: ["#4f8a3c", "#f2a541", "#6a9f4d", "#3a86c8", "#e76f51", "#7bab5a"],
      rx: /famil|kinder|children|jugendfilm|teen film|teenager|weihnacht|christmas|marchen|fairy tale/ },
    { key: "fantasy", label: "Fantasy",
      pal: ["#4b2e83", "#5a3d8a", "#6a4c93", "#3c2a6e", "#7b4b94", "#2e3a87"],
      rx: /fantasy|sword and sorcery|magical|magisch/ },
    { key: "historie", label: "Historie",
      pal: ["#7f5539", "#9c6644", "#6b4f3a", "#8a5a44", "#a47148", "#5e503f"],
      rx: /histor|kostum|period|monumental|epic film|sandalen|peplum|mittelalter/ },
    { key: "horror", label: "Horror",
      pal: ["#141216", "#3b0d0d", "#5c1010", "#1d1a1f", "#2a0f1f", "#40121a"],
      rx: /horror|zombie|vampir|slasher|splatter|grusel|monster|ghost|geister|ubernatur|supernatural/ },
    { key: "musik", label: "Musik & Tanz",
      pal: ["#d6336c", "#c2255c", "#9f9cc7", "#e64980", "#8d7fbf", "#f06595"],
      rx: /musi[ck]|tanz|dance|opernfilm|(^| )oper( |$)/ },
    { key: "romanze", label: "Romanze",
      pal: ["#e5989b", "#d16d8a", "#e8a3b5", "#c75c7c", "#d98fb3", "#b5577a"],
      rx: /romant|romance|liebes|love|erotik|erotic/ },
    { key: "scifi", label: "Science-Fiction",
      pal: ["#1f4e79", "#2a6f97", "#014f86", "#3d5a80", "#0f6e7d", "#16425b"],
      rx: /science fiction|sci fi|scifi|dystop|utopi|cyberpunk|zeitreise|time travel|alien|ausserird|postapokal|post apocal|space|weltraum|endzeit/ },
    { key: "thriller", label: "Thriller",
      pal: ["#22303c", "#31465a", "#5b2333", "#1d3b4a", "#44355b", "#263238"],
      rx: /thriller|spionage|agenten|spy|mystery|suspense|verschworung|conspiracy/ },
    { key: "krieg", label: "Krieg",
      pal: ["#606c38", "#283618", "#4a5d23", "#6b705c", "#414833", "#73683b"],
      rx: /krieg|(^| )war( |$)|militar|military/ },
    { key: "western", label: "Western",
      pal: ["#b5894a", "#bc6c25", "#8a6a3a", "#a98250", "#7d6238", "#c2a06a"],
      rx: /western/ },
    { key: "superhelden", label: "Superhelden",
      pal: ["#e63946", "#1d3557", "#f4a259", "#fb8500", "#2a6fdb", "#191919"],
      rx: /superhel|superhero|comicverfilmung|based on comics|comic book/ },
    { key: "sport", label: "Sport",
      pal: ["#0a9a84", "#2f86d6", "#e0703c", "#1b998b", "#3a7ca5", "#d9a441"],
      rx: /sport|boxing|box(er)?film|fussball|football|baseball|basketball|racing|rennfahr/ },
    { key: "biografie", label: "Biografie",
      pal: ["#b07d8c", "#9d6b84", "#a985b0", "#7d5a6b", "#c99595", "#a26769"],
      rx: /biogra|biopic/ },
    { key: "none", label: "Unsortiert",
      pal: ["#3d5a80", "#c8553d", "#2f8f83", "#8e4585", "#d9a441", "#5b4bc4", "#6f4e37", "#2b2d33", "#d4507f",
        "#40798c", "#bc6c25", "#4a5568"],
      rx: null },
  ];
  const GENRE = {};
  GENRES.forEach((g, i) => {
    g.order = i;
    GENRE[g.key] = g;
  });

  function termNorm(s) {
    return U.norm(s).replace(/[^a-z0-9]+/g, " ").trim();
  }
  // Genre aus den Wikidata-Bezeichnungen; frühe Einträge zählen etwas mehr.
  // Von Hand vergebene Genres (data/genres.csv) gehen vor, s. derive().
  function classify(labels) {
    const score = {};
    (labels || []).forEach((s, i) => {
      const t = termNorm(s);
      if (!t) return;
      for (const g of GENRES) {
        if (g.rx && g.rx.test(t)) score[g.key] = (score[g.key] || 0) + (g.generic ? 0.45 : 1) / (1 + 0.1 * i);
      }
    });
    const keys = Object.keys(score).sort((a, b) => score[b] - score[a] || GENRE[a].order - GENRE[b].order);
    if (!keys.length) return { genre: "none", themes: ["none"] };
    return { genre: keys[0], themes: keys.slice(0, 4) };
  }

  // ---------- Ären ----------
  // Das Trakt-Protokoll kennt kein Medium. Die Hülle richtet sich deshalb nach dem
  // Erscheinungsjahr: So hätte der Film damals im Regal gestanden.
  const TYPES = [
    { key: "vhs", label: "VHS-Ära (bis 1996)", short: "VHS", to: 1996 },
    { key: "dvd", label: "DVD-Ära (1997–2007)", short: "DVD", to: 2007 },
    { key: "bd", label: "Blu-ray-Ära (2008–2015)", short: "Blu-ray", to: 2015 },
    { key: "uhd", label: "Streaming-Ära (ab 2016)", short: "4K", to: Infinity },
  ];
  const TYPE = {};
  TYPES.forEach((t, i) => ((t.order = i), (TYPE[t.key] = t)));
  function typeOf(year) {
    if (year == null) return "dvd";
    return TYPES.find((t) => year <= t.to).key;
  }

  // ---------- Status & Bewertung ----------
  function statusLabel(s) {
    if (s === "watched") return "Gesehen";
    if (s === "watchlist") return "Watchlist";
    return String(s).replace(/[-_]+/g, " ");
  }
  // Trakt bewertet von 1 bis 10
  const RATING_TEXT = ["", "Grottig", "Furchtbar", "Schlecht", "Schwach", "Na ja", "Okay", "Gut", "Sehr gut",
    "Herausragend", "Meisterwerk"];
  const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const WEEKDAYS_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

  // ---------- Kommentar säubern ----------
  function sanitize(text) {
    text = String(text || "").trim();
    if (!text) return "";
    return U.esc(text)
      .replace(/\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi, '<span class="spoiler-inline" tabindex="0">$1</span>')
      .replace(/\r?\n/g, "<br>");
  }

  // ---------- Trakt-Zeilen → Filme ----------
  // Ab so vielen Filmen an einem Tag gilt der Tag als Sammelimport (z. B. beim Anlegen des
  // Kontos): Diese Einträge zählen als gesehen, aber ohne Datum.
  const BULK_DAY = 8;
  const dayKey = (d) => d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();

  function fromRows(rows) {
    const perDay = {};
    const parsed = rows.map((row) => (row.w || []).map((s) => new Date(s)).filter((d) => !isNaN(d)));
    parsed.forEach((ds) => ds.forEach((d) => {
      const k = dayKey(d);
      perDay[k] = (perDay[k] || 0) + 1;
    }));
    return rows.map((row, i) => fromRow(row, i, parsed[i], perDay));
  }

  function fromRow(row, i, dates, perDay) {
    const id = String(row.id != null ? row.id : "x" + i);
    const title = String(row.t || "").trim();
    // Trakt setzt 1970 für "irgendwann"; Sammelimporte haben ebenfalls kein echtes Datum
    const real = dates.filter((d) => d.getFullYear() > 1970 && perDay[dayKey(d)] < BULK_DAY).sort((a, b) => a - b);
    const watched = real.length ? real[real.length - 1] : null;
    const rating = Math.round(+row.r || 0);
    const status = row.st || "watched";
    const b = {
      id, row, idx: i,
      title, short: title.split(/:\s/)[0].trim() || title,
      year: U.int(row.y),
      imdb: String(row.imdb || ""), tmdb: row.tmdb || null, slug: String(row.slug || ""),
      watches: real, undated: dates.length - real.length,
      plays: Math.max(dates.length, status === "watched" ? 1 : 0),
      watched, watchYear: watched ? watched.getFullYear() : null,
      watchMonth: watched ? watched.getMonth() : null,
      rating: rating >= 1 && rating <= 10 ? rating : 0,
      ratedAt: row.ra ? new Date(row.ra) : null,
      listedAt: row.la ? new Date(row.la) : null,
      status,
      lists: (row.lists || []).slice(),
      review: sanitize(row.c),
      spoiler: !!row.cs,
    };
    b.key = b.imdb || "t:" + id;
    b.type = typeOf(b.year);
    b.sortTitle = U.norm(b.title).replace(/^(the|a|an|der|die|das|ein|eine|le|la|les|el) /, "");
    b.shuffle = Math.random();
    b.seed = U.hash32(id + "|" + b.title);
    derive(b, null);
    return b;
  }

  // Felder, die von der Wikidata-Anreicherung abhängen (bei Updates neu berechnen)
  function derive(b, rec) {
    b.rec = rec || null;
    b.de = (rec && rec.de && U.norm(rec.de) !== U.norm(b.title) && rec.de) || "";
    b.runtime = (rec && rec.rt) || null;
    b.directors = (rec && rec.d) || [];
    b.director = b.directors[0] || "";
    b.directorLast = b.director.split(" ").slice(-1)[0] || "";
    b.directorSort = b.director ? U.norm(b.directorLast + " " + b.director) : null;
    b.cast = (rec && rec.c) || [];
    b.countries = (rec && rec.co) || [];
    b.langs = (rec && rec.l) || [];
    // Genres von Hand (data/genres.csv → movies.js) gehen vor der automatischen Zuordnung
    const manual = rec && Array.isArray(rec.th) ? rec.th.filter((k) => GENRE[k] && k !== "none") : [];
    const c = manual.length ? { genre: manual[0], themes: manual.slice(0, 4) } : classify(rec && rec.g);
    b.genre = c.genre;
    b.themes = c.themes;
    b.tags = ((rec && rec.g) || []).slice(0, 6);
    b.hay = U.norm([
      b.title, b.de, b.directors.join(" "), b.cast.join(" "), b.countries.join(" "), b.imdb,
      b.lists.join(" "), b.themes.map((k) => GENRE[k].label).join(" "), TYPE[b.type].short, b.tags.join(" "),
      b.year,
    ].join(" | "));
    return b;
  }

  function traktLink(b) {
    return b.slug ? "https://trakt.tv/movies/" + b.slug : "https://trakt.tv/search?query=" + encodeURIComponent(b.title);
  }
  function imdbLink(b) {
    return b.imdb ? "https://www.imdb.com/title/" + b.imdb + "/" : "";
  }
  function wikiLink(b) {
    return (b.rec && b.rec.wp) || "";
  }

  // Laufende Nummer in der Reihenfolge des Sehens ("Film Nr. 143"). Filme ohne Datum
  // stehen ungezählt davor.
  function number(films) {
    const seen = films.filter((b) => b.status === "watched");
    const dated = seen.filter((b) => b.watched).sort((a, b) => a.watched - b.watched);
    const offset = seen.length - dated.length;
    dated.forEach((b, i) => (b.no = offset + i + 1));
    return seen.length;
  }

  // ---------- Suche mit Feldsyntax ----------
  // Freitext + Felder: regie:nolan  laufzeit>150  jahr:1990-1999  gesehen:2024-05
  // genre:scifi  bewertung>=8  mit:"tom hanks"  land:frankreich  -genre:horror
  const FIELDS = {
    titel: "title", title: "title", t: "title",
    regie: "director", director: "director", von: "director", regisseur: "director", regisseurin: "director",
    mit: "cast", cast: "cast", darsteller: "cast", darstellerin: "cast", schauspieler: "cast", schauspielerin: "cast",
    laufzeit: "runtime", dauer: "runtime", min: "runtime", minuten: "runtime", runtime: "runtime", l: "runtime",
    jahr: "pub", erschienen: "pub", year: "pub", j: "pub",
    gesehen: "seen", watched: "seen", seen: "seen",
    tag: "weekday", wochentag: "weekday", weekday: "weekday",
    imdb: "imdb",
    genre: "genre", thema: "genre", g: "genre",
    "ära": "type", aera: "type", typ: "type", type: "type", format: "type",
    bewertung: "rating", punkte: "rating", sterne: "rating", rating: "rating", r: "rating",
    liste: "list", list: "list",
    land: "country", country: "country",
    mal: "plays", plays: "plays",
  };
  const NUMERIC = new Set(["runtime", "pub", "rating", "plays"]);

  function tokenize(q) {
    const out = [];
    const rx = /(-?)([a-zäöü]+)(:|>=|<=|>|<|=)("([^"]*)"|\S+)|"([^"]*)"|(\S+)/gi;
    let m;
    while ((m = rx.exec(q))) {
      const field = m[2] && FIELDS[m[2].toLowerCase()];
      if (field) {
        out.push({ neg: m[1] === "-", field, op: m[3], value: m[5] != null ? m[5] : m[4] });
      } else {
        const raw = m[6] != null ? m[6] : m[0];
        const neg = raw.startsWith("-") && raw.length > 1;
        out.push({ neg, field: "text", value: neg ? raw.slice(1) : raw });
      }
    }
    return out;
  }

  function numMatch(v, op, value) {
    if (v == null) return false;
    if (op === ":") {
      // Bereiche: 1990-2000 · 1990- · -2000 · 1990..2000
      const r = value.match(/^(\d+(?:[.,]\d+)?)?(?:-|\.\.|–)(\d+(?:[.,]\d+)?)?$/);
      if (r && (r[1] != null || r[2] != null)) {
        const lo = r[1] != null ? U.num(r[1]) : -Infinity;
        const hi = r[2] != null ? U.num(r[2]) : Infinity;
        return v >= lo && v <= hi;
      }
      // Präfix: jahr:19* → 1900–1999
      if (/^\d+\*$/.test(value)) return String(v).startsWith(value.slice(0, -1));
    }
    const n = U.num(value);
    if (n == null) return false;
    switch (op) {
      case ">": return v > n;
      case "<": return v < n;
      case ">=": return v >= n;
      case "<=": return v <= n;
      default: return v === n;
    }
  }

  // Treffer ab Wortanfang: "scott" findet Ridley Scott, aber nicht Prescott
  const wordRx = (v) => new RegExp("(?:^|[^a-z0-9])" + v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  function tokenMatch(b, tk) {
    const v = tk.v != null ? tk.v : (tk.v = U.norm(tk.value));
    const rx = tk.rx || (tk.rx = wordRx(v));
    switch (tk.field) {
      case "text": return rx.test(b.hay);
      case "title": return rx.test(U.norm(b.title + " | " + b.de));
      case "director": return b.directors.some((d) => rx.test(U.norm(d)));
      case "cast": return b.cast.some((d) => rx.test(U.norm(d)));
      case "country": return b.countries.some((d) => rx.test(U.norm(d)));
      case "list": return b.lists.some((s) => rx.test(U.norm(s)));
      case "imdb": return !!v && b.imdb.includes(v);
      case "genre":
        return b.themes.some((k) => k.startsWith(v) || rx.test(U.norm(GENRE[k].label)));
      case "type":
        return b.type.startsWith(v) || rx.test(U.norm(TYPE[b.type].label)) || rx.test(U.norm(TYPE[b.type].short));
      case "weekday":
        return b.watches.some((d) => U.norm(WEEKDAYS_LONG[d.getDay()]).startsWith(v));
      case "seen": {
        // gesehen:2023  gesehen:2023-05  gesehen>2020  gesehen:2019-2021  gesehen:ohne
        const ym = tk.value.match(/^(\d{4})[-\/.](\d{1,2})$/);
        if (tk.op === ":" && ym) return b.watches.some((d) => d.getFullYear() === +ym[1] && d.getMonth() === +ym[2] - 1);
        if (/^(keins?|ohne|none|unbekannt)$/.test(v)) return b.status === "watched" && b.watchYear == null;
        return b.watches.some((d) => numMatch(d.getFullYear(), tk.op, tk.value));
      }
      default:
        if (NUMERIC.has(tk.field)) {
          const val = tk.field === "runtime" ? b.runtime : tk.field === "pub" ? b.year
            : tk.field === "plays" ? b.plays : b.rating || null;
          return numMatch(val, tk.op, tk.value);
        }
        return true;
    }
  }

  function compileQuery(q) {
    const tokens = tokenize(String(q || "").trim());
    if (!tokens.length) return null;
    return (b) => tokens.every((tk) => tokenMatch(b, tk) !== tk.neg);
  }

  // ---------- Facettenfilter ----------
  function emptyFilters(statusDefault) {
    return {
      q: "",
      years: new Set(), types: new Set(), genres: new Set(), lists: new Set(), directors: new Set(),
      status: new Set(statusDefault || ["watched"]),
      runtime: [null, null], pub: [null, null], rating: 0,
    };
  }
  function activeCount(f, statusDefault) {
    let n = f.years.size + f.types.size + f.genres.size + f.lists.size + f.directors.size;
    if (f.runtime[0] != null || f.runtime[1] != null) n++;
    if (f.pub[0] != null || f.pub[1] != null) n++;
    if (f.rating) n++;
    const def = new Set(statusDefault);
    if (f.status.size !== def.size || [...f.status].some((s) => !def.has(s))) n++;
    return n;
  }
  const yearKey = (b) => (b.watchYear == null ? "none" : String(b.watchYear));

  // skip: diese Facette ignorieren (für Facetten-Zähler und Diagramme)
  function makeFilter(f, skip) {
    const qf = skip === "q" ? null : compileQuery(f.q);
    return (b) => {
      if (skip !== "status" && f.status.size && !f.status.has(b.status)) return false;
      if (skip !== "years" && f.years.size && !f.years.has(yearKey(b))) return false;
      if (skip !== "types" && f.types.size && !f.types.has(b.type)) return false;
      if (skip !== "genres" && f.genres.size && !b.themes.some((g) => f.genres.has(g))) return false;
      if (skip !== "lists" && f.lists.size && !b.lists.some((s) => f.lists.has(s))) return false;
      if (skip !== "directors" && f.directors.size && !b.directors.some((d) => f.directors.has(d))) return false;
      if (skip !== "runtime" && (f.runtime[0] != null || f.runtime[1] != null)) {
        if (b.runtime == null) return false;
        if (f.runtime[0] != null && b.runtime < f.runtime[0]) return false;
        if (f.runtime[1] != null && b.runtime > f.runtime[1]) return false;
      }
      if (skip !== "pub" && (f.pub[0] != null || f.pub[1] != null)) {
        if (b.year == null) return false;
        if (f.pub[0] != null && b.year < f.pub[0]) return false;
        if (f.pub[1] != null && b.year > f.pub[1]) return false;
      }
      if (skip !== "rating" && f.rating && b.rating < f.rating) return false;
      if (qf && !qf(b)) return false;
      return true;
    };
  }

  // ---------- Sortierung ----------
  const SORTS = {
    watched: { label: "Gesehen am", dir: "desc", key: (b) => (b.watched ? +b.watched : null) },
    title: { label: "Titel", dir: "asc", key: (b) => b.sortTitle, str: true },
    director: { label: "Regie", dir: "asc", key: (b) => b.directorSort, str: true },
    runtime: { label: "Laufzeit", dir: "desc", key: (b) => b.runtime },
    pub: { label: "Erscheinungsjahr", dir: "asc", key: (b) => b.year },
    rating: { label: "Meine Bewertung", dir: "desc", key: (b) => b.rating || null },
    plays: { label: "Wie oft gesehen", dir: "desc", key: (b) => b.plays },
    color: { label: "Farbe", dir: "asc", key: (b) => b.vis && b.vis.hueKey },
    random: { label: "Zufall", dir: "asc", key: (b) => b.shuffle },
  };
  function sortFilms(list, sortKey, dir) {
    const s = SORTS[sortKey] || SORTS.watched;
    const sign = dir === "asc" ? 1 : -1;
    const keyed = list.map((b) => [s.key(b), b]);
    keyed.sort((x, y) => {
      const a = x[0], c = y[0];
      if (a == null && c == null) return x[1].sortTitle.localeCompare(y[1].sortTitle, "de");
      if (a == null) return 1;
      if (c == null) return -1;
      const r = s.str ? a.localeCompare(c, "de") : a - c;
      return r ? r * sign : x[1].sortTitle.localeCompare(y[1].sortTitle, "de");
    });
    return keyed.map((k) => k[1]);
  }

  // ---------- Gruppierung (ein Brett pro Gruppe) ----------
  const GROUPS = {
    none: { label: "Ohne" },
    year: { label: "Jahr gesehen" },
    genre: { label: "Genre" },
    type: { label: "Ära" },
    rating: { label: "Bewertung" },
    decade: { label: "Jahrzehnt" },
    director: { label: "Regie" },
  };
  function groupFilms(sorted, groupKey, sortKey, dir) {
    if (!groupKey || groupKey === "none") return [{ key: "all", label: "", films: sorted }];
    let of, labelOf, order;
    const counts = {};
    if (groupKey === "director") sorted.forEach((b) => b.director && (counts[b.director] = (counts[b.director] || 0) + 1));
    switch (groupKey) {
      case "year": {
        of = (b) => (b.status === "watchlist" ? "list" : yearKey(b));
        labelOf = (k) => (k === "none" ? "Früher gesehen · ohne Datum" : k === "list" ? "Auf der Watchlist" : k);
        const asc = sortKey === "watched" && dir === "asc";
        const v = (k) => (k === "list" ? (asc ? 1e5 : -1e5) : k === "none" ? (asc ? -1e5 : 1e5) : asc ? +k : -k);
        order = (a, b) => v(a) - v(b);
        break;
      }
      case "genre":
        of = (b) => b.genre;
        labelOf = (k) => GENRE[k].label;
        break;
      case "type":
        of = (b) => b.type;
        labelOf = (k) => TYPE[k].label;
        order = (a, b) => TYPE[a].order - TYPE[b].order;
        break;
      case "rating":
        of = (b) => String(b.rating || 0);
        labelOf = (k) => (k === "0" ? "Ohne Bewertung" : k + " / 10 · " + RATING_TEXT[+k]);
        order = (a, b) => b - a;
        break;
      case "decade":
        of = (b) => (b.year == null ? "none" : String(Math.floor(b.year / 10) * 10));
        labelOf = (k) => (k === "none" ? "Erscheinungsjahr unbekannt" : k + "er");
        order = (a, b) => {
          const v = (k) => (k === "none" ? 99999 : +k);
          return v(a) - v(b);
        };
        break;
      case "director":
        of = (b) => (!b.director ? "none" : counts[b.director] >= 2 ? b.director : "~");
        labelOf = (k) => (k === "~" ? "Weitere Regisseur:innen" : k === "none" ? "Regie unbekannt" : k);
        order = null;
        break;
    }
    const map = new Map();
    for (const b of sorted) {
      const k = of(b);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(b);
    }
    const keys = [...map.keys()];
    const tail = (k) => (k === "none" ? 2 : k === "~" ? 1 : 0);
    if (order) keys.sort(order);
    else
      keys.sort((a, b) => tail(a) - tail(b) ||
        map.get(b).length - map.get(a).length || String(a).localeCompare(String(b), "de"));
    return keys.map((k) => ({ key: k, label: labelOf(k), films: map.get(k) }));
  }

  function summary(films) {
    let runtime = 0, rated = 0, rsum = 0;
    for (const b of films) {
      runtime += b.runtime || 0;
      if (b.rating) {
        rated++;
        rsum += b.rating;
      }
    }
    return { count: films.length, runtime, avgRating: rated ? rsum / rated : null };
  }

  FR.model = {
    GENRES, GENRE, TYPES, TYPE, SORTS, GROUPS, RATING_TEXT, WEEKDAYS, WEEKDAYS_LONG, statusLabel,
    fromRows, derive, number, traktLink, imdbLink, wikiLink, sanitize, classify, typeOf,
    emptyFilters, activeCount, makeFilter, compileQuery, tokenize, yearKey, sortFilms, groupFilms, summary,
  };
})();
