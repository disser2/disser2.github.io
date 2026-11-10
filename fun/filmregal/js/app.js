/* Filmregal – Zustand, Datenquelle, Rendering und Verdrahtung */
(function () {
  "use strict";
  const FR = (window.FR = window.FR || {});
  const U = FR.util, M = FR.model, S = FR.spine;

  const PREFS_KEY = "fr.prefs";
  const IMPORT_KEY = "fr.import.v1";

  let films = [], byId = new Map(), source = { kind: "empty" };
  let visible = [], order = [], groups = [];
  let statusDefault = ["watched"];
  const prefs = U.store.get(PREFS_KEY, {}) || {};
  const state = {
    view: prefs.view || "spine",
    group: prefs.group || "year",
    sort: prefs.sort || "watched",
    dir: prefs.dir || "desc",
    filters: M.emptyFilters(),
    stats: false,
  };

  // ---------- Daten laden ----------
  function loadSource() {
    // Plakate, Laufzeiten und Genres aus movies.js gelten auch für einen lokalen Import
    // (gleiche Schlüssel) – sonst fragt der Browser alles noch einmal bei Wikidata ab.
    const pub = window.FILMREGAL_DATA;
    if (pub && pub.enrichment) FR.enrich.seed(pub.enrichment);
    const imp = U.store.get(IMPORT_KEY, null);
    if (imp && imp.rows && imp.rows.length) return { kind: "import", rows: imp.rows, name: imp.name, date: imp.date };
    if (pub && pub.movies && pub.movies.length) return { kind: "published", rows: pub.movies, date: pub.generated };
    return { kind: "empty", rows: [] };
  }

  function setFilms(rows) {
    films = M.fromRows(rows).filter((b) => b.title);
    // Doppelte IDs (z. B. zusammengeführte Exporte) eindeutig machen
    const seen = new Set();
    films.forEach((b) => {
      while (seen.has(b.id)) b.id += "_";
      seen.add(b.id);
    });
    films.forEach((b) => {
      const rec = FR.enrich.get(b.key);
      if (rec) M.derive(b, rec);
      S.decorate(b);
    });
    M.number(films);
    byId = new Map(films.map((b) => [b.id, b]));
    const statuses = [...new Set(films.map((b) => b.status))];
    statusDefault = statuses.filter((s) => s !== "watchlist");
    if (!statusDefault.length) statusDefault = statuses;
    FR.shelf.setFilms(films);
  }

  // ---------- Filtern, sortieren, rendern ----------
  function apply(opts) {
    opts = opts || {};
    const f = M.makeFilter(state.filters);
    visible = films.filter(f);
    const sorted = M.sortFilms(visible, state.sort, state.dir);
    groups = M.groupFilms(sorted, state.group, state.sort, state.dir);
    order = groups.flatMap((g) => g.films);
    const animate = opts.animate !== false;
    if (state.view === "list") FR.ui.renderList(order, state.sort, state.dir, animate);
    else FR.shelf.render(groups, shelfOpts({ animate }));
    const empty = !visible.length;
    U.$("#empty").hidden = !empty;
    U.$("#case").classList.toggle("is-empty", empty);
    updateCount();
    FR.ui.activeChips();
    FR.ui.renderDrawer();
    statsLater();
    saveHash();
  }
  function shelfOpts(extra) {
    return Object.assign({ grouped: state.group !== "none", share: state.group !== "none" && state.group !== "year" }, extra);
  }
  // Klick auf eine Trennkarte: nur diese Gruppe zeigen
  function onGroup(key) {
    switch (state.group) {
      case "genre": return toggleFacet("genres", key);
      case "type": return toggleFacet("types", key);
      case "director": return key !== "~" && key !== "none" && toggleFacet("directors", key);
      case "rating": return setRating(+key || 0);
      case "decade":
        if (key !== "none") return setRange("pub", +key, +key + 9);
    }
  }
  const statsLater = U.debounce(() => state.stats && FR.stats.update(), 160);

  function updateCount() {
    const s = M.summary(visible);
    const time = s.runtime ? " · " + U.fmtHours(s.runtime) : "";
    // Die Watchlist ist standardmäßig ausgeblendet und zählt dann nicht als "gefiltert"
    const base = films.filter((b) => !state.filters.status.size || state.filters.status.has(b.status)).length;
    U.$("#resultCount").textContent = visible.length === base
      ? U.fmt(s.count) + " Filme" + time
      : U.fmt(s.count) + " von " + U.fmt(base) + " Filmen" + time;
  }

  function savePrefs() {
    U.store.set(PREFS_KEY, { view: state.view, group: state.group, sort: state.sort, dir: state.dir });
  }

  // ---------- URL-Zustand (#…) ----------
  function saveHash() {
    const p = new URLSearchParams();
    const f = state.filters;
    if (state.view !== "spine") p.set("v", state.view);
    if (state.group !== "year") p.set("g", state.group);
    if (state.sort !== "watched") p.set("s", state.sort);
    if (state.dir !== M.SORTS[state.sort].dir) p.set("d", state.dir);
    if (f.q.trim()) p.set("q", f.q.trim());
    if (f.years.size) p.set("y", [...f.years].join(","));
    if (f.types.size) p.set("t", [...f.types].join(","));
    if (f.genres.size) p.set("th", [...f.genres].join(","));
    if (f.lists.size) p.set("li", [...f.lists].join("|"));
    if (f.directors.size) p.set("a", [...f.directors].join("|"));
    if (f.runtime[0] != null || f.runtime[1] != null) p.set("rt", (f.runtime[0] ?? "") + "-" + (f.runtime[1] ?? ""));
    if (f.pub[0] != null || f.pub[1] != null) p.set("py", (f.pub[0] ?? "") + "-" + (f.pub[1] ?? ""));
    if (f.rating) p.set("r", f.rating);
    const def = statusDefault;
    if (f.status.size !== def.length || def.some((s) => !f.status.has(s))) p.set("st", [...f.status].join(","));
    if (state.stats) p.set("stats", "1");
    const str = p.toString();
    const url = location.pathname + location.search + (str ? "#" + str : "");
    if (url !== location.pathname + location.search + location.hash) history.replaceState(null, "", url);
  }
  function loadHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const f = M.emptyFilters(statusDefault);
    const list = (k, sep) => (p.get(k) ? p.get(k).split(sep || ",").filter(Boolean) : []);
    const range = (k) => {
      const m = (p.get(k) || "").match(/^(-?\d*)-(-?\d*)$/);
      return m ? [m[1] === "" ? null : +m[1], m[2] === "" ? null : +m[2]] : [null, null];
    };
    if (p.get("v") && ["spine", "cover", "list"].includes(p.get("v"))) state.view = p.get("v");
    if (p.get("g") && M.GROUPS[p.get("g")]) state.group = p.get("g");
    if (p.get("s") && M.SORTS[p.get("s")]) {
      state.sort = p.get("s");
      state.dir = M.SORTS[state.sort].dir;
    }
    if (p.get("d") === "asc" || p.get("d") === "desc") state.dir = p.get("d");
    f.q = p.get("q") || "";
    list("y").forEach((v) => f.years.add(v));
    list("t").forEach((v) => M.TYPE[v] && f.types.add(v));
    list("th").forEach((v) => M.GENRE[v] && f.genres.add(v));
    list("li", "|").forEach((v) => f.lists.add(v));
    list("a", "|").forEach((v) => f.directors.add(v));
    f.runtime = range("rt");
    f.pub = range("py");
    f.rating = U.clamp(+p.get("r") || 0, 0, 10);
    if (p.has("st")) f.status = new Set(list("st"));
    state.filters = f;
    state.stats = p.get("stats") === "1";
    return p.get("b");
  }

  // ---------- Aktionen (auch für Diagramme & Schublade) ----------
  function toggleFacet(kind, value) {
    const map = { years: "years", types: "types", genres: "genres", genre: "genres", lists: "lists", list: "lists", directors: "directors", director: "directors", status: "status" };
    const set = state.filters[map[kind]];
    if (!set) return;
    value = String(value);
    set.has(value) ? set.delete(value) : set.add(value);
    apply();
  }
  function setRange(kind, lo, hi) {
    state.filters[kind] = [lo, hi];
    apply();
  }
  function setRating(v) {
    state.filters.rating = v;
    apply();
  }
  function setQuery(q) {
    state.filters.q = q;
    U.$("#search").value = q;
    U.$("#heroSearch").value = q;
    apply();
  }
  function resetFilters() {
    state.filters = M.emptyFilters(statusDefault);
    U.$("#search").value = "";
    U.$("#heroSearch").value = "";
    apply();
  }
  function resetStatus() {
    state.filters.status = new Set(statusDefault);
    apply();
  }
  function setSort(key, dir) {
    state.sort = key;
    state.dir = dir || M.SORTS[key].dir;
    if (key === "random") films.forEach((b) => (b.shuffle = Math.random()));
    syncControls();
    savePrefs();
    apply();
  }
  function setGroup(g) {
    state.group = g;
    syncControls();
    savePrefs();
    apply();
  }

  async function setView(v) {
    if (v === state.view) return;
    const prev = state.view;
    state.view = v;
    savePrefs();
    syncControls();
    const caseEl = U.$("#case"), listEl = U.$("#list");
    if (v === "list") {
      caseEl.hidden = true;
      listEl.hidden = false;
      apply({ animate: false });
      if (!U.reducedMotion()) listEl.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "ease-out" });
      return;
    }
    if (prev === "list") {
      listEl.hidden = true;
      caseEl.hidden = false;
      await FR.shelf.setMode(v, groups, shelfOpts());
      apply({ animate: false });
      return;
    }
    await FR.shelf.setMode(v, groups, shelfOpts());
    saveHash();
  }

  function openFilm(id, fromEl) {
    const b = byId.get(id);
    if (!b) return;
    let el = fromEl;
    if (!el && state.view !== "list") el = FR.shelf.el(id);
    if (!el && state.view === "list") {
      const tr = U.$('#list tr[data-key="' + CSS.escape(id) + '"]');
      el = tr && tr.querySelector(".lcover");
    }
    if (el && el.isConnected) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) el = null;
    } else el = null;
    FR.reader.open(b, el);
  }

  async function randomFilm() {
    if (!order.length) return;
    const b = order[Math.floor(Math.random() * order.length)];
    if (state.view === "list") return openFilm(b.id);
    const el = FR.shelf.el(b.id);
    if (!el) return;
    el.scrollIntoView({ behavior: U.reducedMotion() ? "auto" : "smooth", block: "center" });
    await U.wait(U.reducedMotion() ? 50 : 520);
    FR.shelf.wiggle(b.id);
    await U.wait(U.reducedMotion() ? 0 : 640);
    openFilm(b.id, el);
  }

  // ---------- Steuerelemente ----------
  function syncControls() {
    U.$$("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === state.view)));
    U.$("#groupSel").value = state.group;
    U.$("#sortSel").value = state.sort;
    const dirBtn = U.$("#dirBtn");
    dirBtn.dataset.dir = state.dir;
    dirBtn.setAttribute("aria-label", state.dir === "asc" ? "Aufsteigend sortiert – umdrehen" : "Absteigend sortiert – umdrehen");
    dirBtn.title = state.dir === "asc" ? "aufsteigend" : "absteigend";
    U.$("#statsBtn").setAttribute("aria-expanded", String(state.stats));
  }

  function buildControls() {
    const gs = U.$("#groupSel");
    Object.entries(M.GROUPS).forEach(([k, g]) => gs.append(U.el("option", { value: k, text: k === "none" ? "ohne" : g.label })));
    const ss = U.$("#sortSel");
    Object.entries(M.SORTS).forEach(([k, s]) => ss.append(U.el("option", { value: k, text: s.label })));
    gs.addEventListener("change", () => setGroup(gs.value));
    ss.addEventListener("change", () => setSort(ss.value));
    U.$("#dirBtn").addEventListener("click", () => {
      state.dir = state.dir === "asc" ? "desc" : "asc";
      syncControls();
      savePrefs();
      apply();
    });
    U.$$("[data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
    U.$("#filterBtn").addEventListener("click", () => (FR.ui.drawerOpen() ? FR.ui.closeDrawer() : FR.ui.openDrawer()));
    U.$("#statsBtn").addEventListener("click", toggleStats);
    U.$("#randomBtn").addEventListener("click", randomFilm);
    U.$("#emptyReset").addEventListener("click", resetFilters);

    // Suche (Hero und Leiste sind gekoppelt)
    const onSearch = U.debounce((v) => {
      state.filters.q = v;
      apply();
    }, 140);
    ["#search", "#heroSearch"].forEach((sel, i, arr) => {
      const inp = U.$(sel), other = U.$(arr[1 - i]);
      inp.addEventListener("input", () => {
        other.value = inp.value;
        onSearch(inp.value);
      });
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && sel === "#heroSearch") U.$("#toolbar").scrollIntoView({ behavior: U.reducedMotion() ? "auto" : "smooth" });
        if (e.key === "Escape") {
          inp.value = other.value = "";
          setQuery("");
          inp.blur();
        }
      });
    });
    U.$$(".qex").forEach((b) => b.addEventListener("click", () => {
      setQuery(b.textContent.trim());
      U.$("#toolbar").scrollIntoView({ behavior: U.reducedMotion() ? "auto" : "smooth" });
    }));
    const help = U.$("#syntaxBtn"), pop = U.$("#syntaxPop");
    help.addEventListener("click", (e) => {
      e.stopPropagation();
      pop.hidden = !pop.hidden;
      help.setAttribute("aria-expanded", String(!pop.hidden));
      if (!pop.hidden) {
        const r = help.getBoundingClientRect();
        pop.style.top = r.bottom + 10 + "px";
        pop.style.left = U.clamp(r.left - 20, 12, innerWidth - pop.offsetWidth - 12) + "px";
      }
    });
    pop.addEventListener("click", (e) => {
      const c = e.target.closest("code");
      if (c) {
        setQuery(((U.$("#search").value + " ").trimStart() + c.textContent).trim());
        pop.hidden = true;
      }
    });
    document.addEventListener("click", (e) => {
      if (!pop.hidden && !pop.contains(e.target) && e.target !== help) pop.hidden = true;
      const menu = U.$("#dataMenu");
      if (!menu.hidden && !menu.contains(e.target) && !e.target.closest("#dataBtn")) closeMenu();
    });

    // Hero
    U.$("#heroFilm").addEventListener("click", (e) => openFilm(e.currentTarget.dataset.id, e.currentTarget));
    U.$("#directorCard").addEventListener("click", (e) => {
      const kind = e.currentTarget.dataset.kind, v = e.currentTarget.dataset.value;
      if (!v) return;
      if (kind === "decade") setRange("pub", +v, +v + 9);
      else if (!state.filters.directors.has(v)) toggleFacet("directors", v);
      U.$("#toolbar").scrollIntoView({ behavior: U.reducedMotion() ? "auto" : "smooth" });
    });
    U.$("#yearCard").addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      const y = e.currentTarget.dataset.year;
      state.filters.years = new Set([y]);
      apply();
      U.$("#toolbar").scrollIntoView({ behavior: U.reducedMotion() ? "auto" : "smooth" });
    });

    // Theme (Saallicht)
    U.$("#themeBtn").addEventListener("click", () => {
      const dark = document.documentElement.dataset.theme === "dark" ||
        (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
      const next = dark ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      U.store.set("fr.theme", next);
      if (!U.reducedMotion()) document.body.animate([{ filter: "brightness(" + (next === "dark" ? 1.25 : 0.7) + ")" }, { filter: "none" }], { duration: 500, easing: "ease-out" });
    });

    // Breite Ansicht: Regal über die ganze Fensterbreite
    const wideBtn = U.$("#wideBtn");
    const syncWide = () => {
      const wide = document.documentElement.dataset.wide === "1";
      wideBtn.setAttribute("aria-pressed", String(wide));
      wideBtn.title = wide ? "Normale Breite" : "Ganze Bildschirmbreite nutzen";
    };
    syncWide();
    wideBtn.addEventListener("click", () => {
      const wide = document.documentElement.dataset.wide !== "1";
      if (wide) document.documentElement.dataset.wide = "1";
      else delete document.documentElement.dataset.wide;
      U.store.set("fr.wide", wide);
      syncWide();
      // Bretter neu füllen: die Hüllen hüpfen an ihren neuen Platz
      if (state.view !== "list") apply();
      if (state.stats) FR.stats.update();
    });

    // Laufende Wikidata-Abfrage anhalten / fortsetzen (Knöpfe in der Meldung unten links)
    U.$("#toast").addEventListener("click", (e) => {
      const t = e.target.closest("[data-toast]");
      if (!t) return;
      if (t.dataset.toast === "stop") stopEnrich();
      else if (t.dataset.toast === "resume") enrich();
    });

    // Daten-Menü
    U.$("#dataBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      U.$("#dataMenu").hidden ? openMenu() : closeMenu();
    });
    U.$("#dataMenu").addEventListener("click", onMenu);
    U.$("#fileInput").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) importFile(file);
      e.target.value = "";
    });
    U.$("#emptyImport").addEventListener("click", () => U.$("#fileInput").click());

    // Drag & Drop des Trakt-Exports
    let dragDepth = 0;
    const dz = U.$("#dropzone");
    window.addEventListener("dragenter", (e) => {
      if (![...(e.dataTransfer.types || [])].includes("Files")) return;
      dragDepth++;
      dz.hidden = false;
    });
    window.addEventListener("dragleave", () => {
      if (--dragDepth <= 0) {
        dragDepth = 0;
        dz.hidden = true;
      }
    });
    window.addEventListener("dragover", (e) => e.preventDefault());
    window.addEventListener("drop", (e) => {
      e.preventDefault();
      dragDepth = 0;
      dz.hidden = true;
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) importFile(file);
    });

    // Tastatur
    document.addEventListener("keydown", (e) => {
      if (FR.reader.isOpen()) return;
      const typing = e.target.closest("input, select, textarea, [contenteditable]");
      if (e.key === "Escape") {
        if (FR.ui.drawerOpen()) FR.ui.closeDrawer();
        U.$("#syntaxPop").hidden = true;
        closeMenu();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        U.$("#search").focus();
      } else if (e.key === "f") FR.ui.drawerOpen() ? FR.ui.closeDrawer() : FR.ui.openDrawer();
      else if (e.key === "s") toggleStats();
      else if (e.key === "r") randomFilm();
      else if (e.key === "v") setView({ spine: "cover", cover: "list", list: "spine" }[state.view]);
    });

    window.addEventListener("resize", U.debounce(() => {
      if (state.view !== "list") FR.shelf.relayoutIfResized();
      if (state.stats) FR.stats.update();
    }, 180));
    window.addEventListener("hashchange", () => {
      const before = JSON.stringify([state.view, state.group, state.sort, state.dir]);
      loadHash();
      syncControls();
      U.$("#search").value = U.$("#heroSearch").value = state.filters.q;
      if (JSON.stringify([state.view, state.group, state.sort, state.dir]) !== before) location.reload();
      else apply();
    });
  }

  async function toggleStats() {
    state.stats = !state.stats;
    syncControls();
    const panel = U.$("#stats");
    if (state.stats) {
      panel.hidden = false;
      FR.stats.update();
      if (!U.reducedMotion()) {
        const h = panel.scrollHeight;
        panel.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" });
      }
      // Scroll-Anchoring hält sonst das Regal fest und die Statistik landet oberhalb des Bildschirms
      const top = panel.getBoundingClientRect().top;
      if (top < 0 || top > innerHeight * 0.6) panel.scrollIntoView({ behavior: U.reducedMotion() ? "auto" : "smooth", block: "start" });
    } else {
      FR.stats.hideTip();
      if (!U.reducedMotion()) {
        const a = panel.animate([{ height: panel.offsetHeight + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 360, easing: "cubic-bezier(.4,0,.6,1)" });
        await U.done(a);
      }
      panel.hidden = !state.stats;
    }
    saveHash();
  }

  // ---------- Daten-Menü: Import / Export ----------
  function openMenu() {
    const menu = U.$("#dataMenu");
    const src = U.$("#sourceInfo", menu);
    const when = source.date ? new Date(source.date) : null;
    src.textContent = {
      empty: "Noch keine Daten geladen.",
      import: "Gerade zu sehen: lokaler Import" + (source.name ? " „" + source.name + "“" : "") + (when ? " vom " + U.fmtDate(when) : "") + " (nur in diesem Browser).",
      published: "Gerade zu sehen: data/movies.js" + (when ? " (Stand " + U.fmtDate(when) + ")" : "") + ".",
    }[source.kind];
    U.$("[data-act=unimport]", menu).hidden = source.kind !== "import";
    U.$("[data-act=online]", menu).setAttribute("aria-checked", String(FR.enrich.online()));
    menu.hidden = false;
    U.$("#dataBtn").setAttribute("aria-expanded", "true");
    const first = menu.querySelector("button, label");
    first && first.focus();
  }
  function closeMenu() {
    const menu = U.$("#dataMenu");
    if (menu.hidden) return;
    menu.hidden = true;
    U.$("#dataBtn").setAttribute("aria-expanded", "false");
  }
  function onMenu(e) {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const act = t.dataset.act;
    if (act === "import") U.$("#fileInput").click();
    else if (act === "csv") exportCsv();
    else if (act === "moviesjs") exportMoviesJs();
    else if (act === "online") {
      FR.enrich.setOnline(!FR.enrich.online());
      t.setAttribute("aria-checked", String(FR.enrich.online()));
      if (FR.enrich.online()) enrich();
      else FR.enrich.stop();
      return;
    } else if (act === "clearcache") {
      FR.enrich.clear();
      FR.ui.toast("Cache geleert – beim nächsten Laden wird neu abgefragt.", { ms: 3000 });
    } else if (act === "unimport") {
      U.store.del(IMPORT_KEY);
      location.reload();
    }
    closeMenu();
  }

  async function importFile(file) {
    if (!/\.zip$/i.test(file.name) && !/zip/.test(file.type)) {
      FR.ui.toast("Bitte die ZIP-Datei aus dem Trakt-Export wählen.", { ms: 4000 });
      return;
    }
    if (!FR.trakt.supported()) {
      FR.ui.toast("Dieser Browser kann die ZIP-Datei nicht entpacken – bitte tools/build_movies.py benutzen.", { ms: 6000 });
      return;
    }
    let rows = [];
    try {
      rows = await FR.trakt.importFile(file);
    } catch (e) {}
    if (!rows.length) {
      FR.ui.toast("Das sieht nicht nach einem Trakt-Export aus (keine watched-movies-Dateien gefunden).", { ms: 5000 });
      return;
    }
    const date = new Date().toISOString();
    const ok = U.store.set(IMPORT_KEY, { rows, name: file.name, date });
    source = { kind: "import", name: file.name, date };
    reloadFilms(rows);
    FR.ui.toast("<strong>" + U.fmt(films.length) + " Filme</strong> eingeräumt" +
      (ok ? " – gespeichert in diesem Browser." : " – zu groß zum Speichern, gilt nur bis zum Neuladen."), { ms: 5000 });
  }

  function reloadFilms(rows) {
    FR.enrich.stop();
    U.$("#case").replaceChildren();
    setFilms(rows);
    state.filters = M.emptyFilters(statusDefault);
    U.$("#search").value = U.$("#heroSearch").value = "";
    U.$("#emptyBanner").hidden = source.kind !== "empty";
    FR.ui.hero(films);
    apply({ animate: false });
    // Hüllen fallen einmal sichtbar ins Regal
    if (!U.reducedMotion() && state.view !== "list")
      U.$$("#case .bk").forEach((el, i) => {
        if (el.getBoundingClientRect().top < innerHeight)
          el.animate([{ transform: "translateY(-120px) rotate(-8deg)", opacity: 0 }, { transform: "translateY(4px)", opacity: 1, offset: 0.7 }, { transform: "none", opacity: 1 }],
            { duration: 620, delay: Math.min(i * 14, 900), easing: "cubic-bezier(.3,.7,.4,1)", fill: "backwards" });
      });
    enrich();
  }

  function exportCsv() {
    const head = ["Titel", "Deutscher Titel", "Jahr", "Regie", "Laufzeit (min)", "Genres", "Gesehen", "Wie oft", "Bewertung", "IMDb"];
    const q = (v) => {
      const t = String(v == null ? "" : v);
      return /[",;\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    };
    const iso = (d) => (d ? d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") : "");
    const lines = [head.join(",")].concat(order.map((b) => [
      b.title, b.de, b.year, b.directors.join("; "), b.runtime, b.themes.filter((k) => k !== "none").map((k) => M.GENRE[k].label).join("; "),
      iso(b.watched), b.plays, b.rating || "", b.imdb,
    ].map(q).join(",")));
    U.download("filmregal_auswahl.csv", "﻿" + lines.join("\r\n"), "text/csv;charset=utf-8");
  }

  function exportMoviesJs() {
    const data = { generated: new Date().toISOString(), source: "trakt", movies: films.map((b) => b.row), enrichment: FR.enrich.exportFor(films) };
    const js = "// Erzeugt vom Filmregal (Daten → movies.js erzeugen).\n" +
      "// Diese Datei nach fun/filmregal/data/movies.js legen.\n" +
      "window.FILMREGAL_DATA = " + JSON.stringify(data) + ";\n";
    U.download("movies.js", js, "text/javascript;charset=utf-8");
  }

  // ---------- Wikidata-Anreicherung ----------
  let lookup = null; // Stand des laufenden Durchgangs (für Stopp/Fortsetzen)
  function enrich() {
    if (!FR.enrich.online()) return;
    const pending = [];
    const seenKeys = new Map(); // ein Film kann in beiden Durchgängen (Daten, Plakat) vorkommen
    const me = (lookup = { done: 0, total: 0, paused: false });
    const flush = U.debounce(() => {
      if (!pending.length) return;
      const batch = pending.splice(0);
      for (const [b, rec] of batch) {
        const prevVis = b.vis;
        M.derive(b, rec);
        S.decorate(b);
        FR.shelf.refreshFilm(b, prevVis);
      }
      // Breiten, Farben und Genres ändern sich für viele Filme zugleich: neu einräumen
      if (!FR.reader.isOpen()) apply();
      else statsLater();
      FR.ui.hero(films);
    }, 700);
    FR.enrich.run(state.view === "spine" ? films : order.concat(films.filter((b) => !order.includes(b))),
      (b, rec) => {
        seenKeys.set(b.key, rec);
        pending.push([b, rec]);
        flush();
      },
      (doneN, total, stopped, finished) => {
        if (lookup !== me) return; // inzwischen läuft ein neuer Durchgang
        me.done = doneN;
        me.total = total;
        if (stopped === "user") {
          // Stopp-Knopf zeigt selbst eine Meldung; beim Schalter im Daten-Menü nur aufräumen
          if (finished && !me.paused) FR.ui.hideToast();
          return;
        }
        if (finished) {
          const recs = [...seenKeys.values()];
          const found = recs.filter((r) => r.q).length, posters = recs.filter((r) => r.img).length;
          if (stopped && found === 0) FR.ui.toast("Wikidata ist gerade nicht erreichbar – die Hüllen bleiben selbst gestaltet.", { ms: 5000 });
          else if (total > 5) FR.ui.toast("Fertig: <strong>" + posters + " Plakate</strong> und Daten zu " + found + " Filmen geholt.", { ms: 5000 });
          else FR.ui.hideToast();
          return;
        }
        if (total <= 5) return;
        // Nur Zahl und Balken nachführen – sonst tauscht jeder Schritt den Stopp-Knopf unter dem Mauszeiger aus
        let label = U.$("#toast.is-on [data-progress]");
        if (!label) {
          FR.ui.toast('<span class="toast__spin" aria-hidden="true"></span><span>Hole Plakate, Laufzeiten &amp; Genres von Wikidata … <span data-progress></span></span>' +
            '<button type="button" class="toast__btn" data-toast="stop">Stopp</button><span class="toast__bar"></span>');
          label = U.$("#toast [data-progress]");
        }
        label.textContent = doneN + "/" + total;
        U.$("#toast .toast__bar").style.setProperty("--p", (doneN / total).toFixed(3));
      });
  }
  function stopEnrich() {
    if (!lookup) return;
    lookup.paused = true;
    FR.enrich.stop();
    FR.ui.toast("Abfrage angehalten bei " + lookup.done + " von " + lookup.total + " Filmen." +
      '<button type="button" class="toast__btn" data-toast="resume">Fortsetzen</button>', { ms: 12000 });
  }

  // ---------- Start ----------
  async function start() {
    const theme = U.store.get("fr.theme", null);
    if (theme) document.documentElement.dataset.theme = theme;
    FR.shelf.init(U.$("#case"), { onOpen: (b, el) => openFilm(b.id, el), onGroup });
    FR.reader.init({ navList: () => order, onFilter: (kind, value) => {
      const quoted = '"' + value.replace(/"/g, "") + '"';
      if (kind === "genre") toggleFacet("genres", value);
      else if (kind === "list") toggleFacet("lists", value);
      else if (kind === "director") state.filters.directors.has(value) || toggleFacet("directors", value);
      else if (kind === "cast") setQuery("mit:" + quoted);
      else if (kind === "q") setQuery(quoted);
      U.$("#toolbar").scrollIntoView({ behavior: U.reducedMotion() ? "auto" : "smooth" });
    } });
    FR.ui.init(api);
    FR.stats.init(U.$("#stats"), api);
    buildControls();

    source = loadSource();
    setFilms(source.rows);
    const filmParam = loadHash();
    U.$("#emptyBanner").hidden = source.kind !== "empty";
    const caseEl = U.$("#case");
    caseEl.classList.toggle("case--cover", state.view === "cover");
    caseEl.classList.toggle("case--spine", state.view !== "cover");
    FR.shelf.setMode(state.view === "cover" ? "cover" : "spine", [], {});
    caseEl.hidden = state.view === "list";
    U.$("#list").hidden = state.view !== "list";
    U.$("#search").value = U.$("#heroSearch").value = state.filters.q;
    syncControls();
    FR.ui.hero(films);
    apply({ animate: false });
    if (state.stats) {
      U.$("#stats").hidden = false;
      FR.stats.update();
    }
    document.body.classList.add("is-ready");
    if (filmParam && byId.has(filmParam)) setTimeout(() => openFilm(filmParam), 400);
    setTimeout(enrich, 600);
  }

  const api = {
    state,
    get filters() { return state.filters; },
    films: () => films,
    visible: () => visible,
    order: () => order,
    byId: (id) => byId.get(id),
    statusDefault: () => statusDefault,
    // Filme unter allen Filtern außer `skip` (für Facetten-Zähler und Diagramme)
    slice: (skip) => films.filter(M.makeFilter(state.filters, skip)),
    toggleFacet, setRange, setRating, setQuery, resetFilters, resetStatus, setSort, setGroup, setView, openFilm,
  };
  FR.app = api;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
