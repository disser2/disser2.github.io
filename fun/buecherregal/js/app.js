/* Bücherregal – Zustand, Datenquelle, Rendering und Verdrahtung */
(function () {
  "use strict";
  const BS = (window.BS = window.BS || {});
  const U = BS.util, M = BS.model, S = BS.spine;

  const PREFS_KEY = "bs.prefs";
  const IMPORT_KEY = "bs.import.v1";
  const GR_HEADERS = ["Book Id", "Title", "Author", "Author l-f", "Additional Authors", "ISBN", "ISBN13", "My Rating",
    "Average Rating", "Publisher", "Binding", "Number of Pages", "Year Published", "Original Publication Year",
    "Date Read", "Date Added", "Bookshelves", "Bookshelves with positions", "Exclusive Shelf", "My Review", "Spoiler",
    "Private Notes", "Read Count", "Owned Copies"];

  let books = [], byId = new Map(), source = { kind: "demo" };
  let visible = [], order = [], groups = [];
  let statusDefault = ["read", "currently-reading"];
  const prefs = U.store.get(PREFS_KEY, {}) || {};
  const state = {
    view: prefs.view || "spine",
    group: prefs.group || "year",
    sort: prefs.sort || "read",
    dir: prefs.dir || "desc",
    filters: M.emptyFilters(),
    stats: false,
  };

  // ---------- Daten laden ----------
  async function loadSource() {
    // Cover, Seitenzahlen und Themen aus books.js gelten auch für einen lokalen Import
    // (gleiche Schlüssel) – sonst sucht der Browser alles noch einmal bei Open Library.
    const pub = window.BOOKSHELF_DATA;
    if (pub && pub.enrichment) BS.covers.seed(pub.enrichment);
    const imp = U.store.get(IMPORT_KEY, null);
    if (imp && imp.csv) return { kind: "import", rows: BS.csv.toObjects(imp.csv), name: imp.name, date: imp.date };
    if (pub && pub.rows && pub.rows.length) return { kind: "published", rows: pub.rows, date: pub.generated };
    if (/^https?:/.test(location.protocol)) {
      try {
        const r = await fetch("data/goodreads_library_export.csv", { cache: "no-cache" });
        if (r.ok) {
          const t = await r.text();
          if (/(^|,)"?Title"?(,|$)/m.test(t.slice(0, 600))) return { kind: "csv", rows: BS.csv.toObjects(t) };
        }
      } catch (e) {}
    }
    return { kind: "demo", rows: BS.csv.toObjects(window.BOOKSHELF_DEMO_CSV || "") };
  }

  function setBooks(rows) {
    books = rows.map((r, i) => M.fromRow(r, i)).filter((b) => b.title);
    // Doppelte IDs (z. B. zusammengeführte Exporte) eindeutig machen
    const seen = new Set();
    books.forEach((b) => {
      while (seen.has(b.id)) b.id += "_";
      seen.add(b.id);
    });
    books.forEach((b) => {
      const rec = BS.covers.get(b.olKey);
      if (rec) M.derive(b, rec);
      S.decorate(b);
    });
    M.number(books);
    byId = new Map(books.map((b) => [b.id, b]));
    const statuses = [...new Set(books.map((b) => b.status))];
    statusDefault = statuses.filter((s) => s !== "to-read");
    if (!statusDefault.length) statusDefault = statuses;
    BS.shelf.setBooks(books);
  }

  // ---------- Filtern, sortieren, rendern ----------
  function apply(opts) {
    opts = opts || {};
    const f = M.makeFilter(state.filters);
    visible = books.filter(f);
    const sorted = M.sortBooks(visible, state.sort, state.dir);
    groups = M.groupBooks(sorted, state.group, state.sort, state.dir);
    order = groups.flatMap((g) => g.books);
    const animate = opts.animate !== false;
    if (state.view === "list") BS.ui.renderList(order, state.sort, state.dir, animate);
    else BS.shelf.render(groups, shelfOpts({ animate }));
    const empty = !visible.length;
    U.$("#empty").hidden = !empty;
    U.$("#case").classList.toggle("is-empty", empty);
    updateCount();
    BS.ui.activeChips();
    BS.ui.renderDrawer();
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
      case "author": return key !== "~" && toggleFacet("authors", key);
      case "rating": return setRating(+key || 0);
      case "decade":
        if (key === "pre") return setRange("pub", null, 1899);
        if (key !== "none") return setRange("pub", +key, +key + 9);
    }
  }
  const statsLater = U.debounce(() => state.stats && BS.stats.update(), 160);

  function updateCount() {
    const s = M.summary(visible);
    U.$("#resultCount").textContent = visible.length === books.length
      ? U.fmt(s.count) + " Bücher · " + U.fmt(s.pages) + " Seiten"
      : U.fmt(s.count) + " von " + U.fmt(books.length) + " Büchern · " + U.fmt(s.pages) + " Seiten";
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
    if (state.sort !== "read") p.set("s", state.sort);
    if (state.dir !== M.SORTS[state.sort].dir) p.set("d", state.dir);
    if (f.q.trim()) p.set("q", f.q.trim());
    if (f.years.size) p.set("y", [...f.years].join(","));
    if (f.types.size) p.set("t", [...f.types].join(","));
    if (f.genres.size) p.set("th", [...f.genres].join(","));
    if (f.shelves.size) p.set("sh", [...f.shelves].join("|"));
    if (f.authors.size) p.set("a", [...f.authors].join("|"));
    if (f.pages[0] != null || f.pages[1] != null) p.set("p", (f.pages[0] ?? "") + "-" + (f.pages[1] ?? ""));
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
    list("sh", "|").forEach((v) => f.shelves.add(v));
    list("a", "|").forEach((v) => f.authors.add(v));
    f.pages = range("p");
    f.pub = range("py");
    f.rating = U.clamp(+p.get("r") || 0, 0, 5);
    if (p.has("st")) f.status = new Set(list("st"));
    state.filters = f;
    state.stats = p.get("stats") === "1";
    return p.get("b");
  }

  // ---------- Aktionen (auch für Diagramme & Schublade) ----------
  function toggleFacet(kind, value) {
    const map = { years: "years", types: "types", genres: "genres", genre: "genres", shelves: "shelves", shelf: "shelves", authors: "authors", status: "status" };
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
    if (key === "random") books.forEach((b) => (b.shuffle = Math.random()));
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
      await BS.shelf.setMode(v, groups, shelfOpts());
      apply({ animate: false });
      return;
    }
    await BS.shelf.setMode(v, groups, shelfOpts());
    saveHash();
  }

  function openBook(id, fromEl) {
    const b = byId.get(id);
    if (!b) return;
    let el = fromEl;
    if (!el && state.view !== "list") el = BS.shelf.el(id);
    if (!el && state.view === "list") {
      const tr = U.$('#list tr[data-key="' + CSS.escape(id) + '"]');
      el = tr && tr.querySelector(".lcover");
    }
    if (el && el.isConnected) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) el = null;
    } else el = null;
    BS.reader.open(b, el);
  }

  async function randomBook() {
    if (!order.length) return;
    const b = order[Math.floor(Math.random() * order.length)];
    if (state.view === "list") return openBook(b.id);
    const el = BS.shelf.el(b.id);
    if (!el) return;
    el.scrollIntoView({ behavior: U.reducedMotion() ? "auto" : "smooth", block: "center" });
    await U.wait(U.reducedMotion() ? 50 : 520);
    BS.shelf.wiggle(b.id);
    await U.wait(U.reducedMotion() ? 0 : 640);
    openBook(b.id, el);
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
    U.$("#filterBtn").addEventListener("click", () => (BS.ui.drawerOpen() ? BS.ui.closeDrawer() : BS.ui.openDrawer()));
    U.$("#statsBtn").addEventListener("click", toggleStats);
    U.$("#randomBtn").addEventListener("click", randomBook);
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
    U.$("#heroBook").addEventListener("click", (e) => openBook(e.currentTarget.dataset.id, e.currentTarget));
    U.$("#authorCard").addEventListener("click", (e) => {
      const a = e.currentTarget.dataset.author;
      if (!a) return;
      if (!state.filters.authors.has(a)) toggleFacet("authors", a);
      U.$("#toolbar").scrollIntoView({ behavior: U.reducedMotion() ? "auto" : "smooth" });
    });
    U.$("#yearCard").addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      const y = e.currentTarget.dataset.year;
      state.filters.years = new Set([y]);
      apply();
      U.$("#toolbar").scrollIntoView({ behavior: U.reducedMotion() ? "auto" : "smooth" });
    });

    // Theme (Leselampe)
    U.$("#themeBtn").addEventListener("click", () => {
      const dark = document.documentElement.dataset.theme === "dark" ||
        (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
      const next = dark ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      U.store.set("bs.theme", next);
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
      U.store.set("bs.wide", wide);
      syncWide();
      // Bretter neu füllen: die Bücher hüpfen an ihren neuen Platz
      if (state.view !== "list") apply();
      if (state.stats) BS.stats.update();
    });

    // Laufende Cover-Suche anhalten / fortsetzen (Knöpfe in der Meldung unten links)
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
    U.$("#demoImport").addEventListener("click", () => U.$("#fileInput").click());

    // Drag & Drop einer CSV
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
      if (BS.reader.isOpen()) return;
      const typing = e.target.closest("input, select, textarea, [contenteditable]");
      if (e.key === "Escape") {
        if (BS.ui.drawerOpen()) BS.ui.closeDrawer();
        U.$("#syntaxPop").hidden = true;
        closeMenu();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        U.$("#search").focus();
      } else if (e.key === "f") BS.ui.drawerOpen() ? BS.ui.closeDrawer() : BS.ui.openDrawer();
      else if (e.key === "s") toggleStats();
      else if (e.key === "r") randomBook();
      else if (e.key === "v") setView({ spine: "cover", cover: "list", list: "spine" }[state.view]);
    });

    window.addEventListener("resize", U.debounce(() => {
      if (state.view !== "list") BS.shelf.relayoutIfResized();
      if (state.stats) BS.stats.update();
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
      BS.stats.update();
      if (!U.reducedMotion()) {
        const h = panel.scrollHeight;
        panel.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" });
      }
      // Scroll-Anchoring hält sonst das Regal fest und die Statistik landet oberhalb des Bildschirms
      const top = panel.getBoundingClientRect().top;
      if (top < 0 || top > innerHeight * 0.6) panel.scrollIntoView({ behavior: U.reducedMotion() ? "auto" : "smooth", block: "start" });
    } else {
      BS.stats.hideTip();
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
      demo: "Gerade zu sehen: Beispieldaten.",
      import: "Gerade zu sehen: lokaler Import" + (source.name ? " „" + source.name + "“" : "") + (when ? " vom " + U.fmtDate(when) : "") + " (nur in diesem Browser).",
      published: "Gerade zu sehen: data/books.js" + (when ? " (Stand " + U.fmtDate(when) + ")" : "") + ".",
      csv: "Gerade zu sehen: data/goodreads_library_export.csv.",
    }[source.kind];
    U.$("[data-act=unimport]", menu).hidden = source.kind !== "import";
    U.$("[data-act=online]", menu).setAttribute("aria-checked", String(BS.covers.online()));
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
    else if (act === "booksjs") exportBooksJs();
    else if (act === "online") {
      BS.covers.setOnline(!BS.covers.online());
      t.setAttribute("aria-checked", String(BS.covers.online()));
      if (BS.covers.online()) enrich();
      else BS.covers.stop();
      return;
    } else if (act === "clearcache") {
      BS.covers.clear();
      BS.ui.toast("Cover-Cache geleert – beim nächsten Laden wird neu gesucht.", { ms: 3000 });
    } else if (act === "unimport") {
      U.store.del(IMPORT_KEY);
      location.reload();
    }
    closeMenu();
  }

  function importFile(file) {
    if (!/\.(csv|txt)$/i.test(file.name) && !/csv|text/.test(file.type)) {
      BS.ui.toast("Bitte eine CSV-Datei aus dem Goodreads-Export wählen.", { ms: 4000 });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const rows = BS.csv.toObjects(text);
      if (!rows.length || !("Title" in rows[0])) {
        BS.ui.toast("Das sieht nicht nach einem Goodreads-Export aus (Spalte „Title“ fehlt).", { ms: 5000 });
        return;
      }
      // Private Notizen gar nicht erst speichern
      const clean = rows.map((r) => {
        const o = Object.assign({}, r);
        delete o["Private Notes"];
        return o;
      });
      const csv = BS.csv.stringify(clean, Object.keys(clean[0]));
      const ok = U.store.set(IMPORT_KEY, { csv, name: file.name, date: new Date().toISOString() });
      source = { kind: "import", name: file.name, date: new Date().toISOString() };
      reloadBooks(clean);
      BS.ui.toast("<strong>" + U.fmt(books.length) + " Bücher</strong> eingeräumt" +
        (ok ? " – gespeichert in diesem Browser." : " – zu groß zum Speichern, gilt nur bis zum Neuladen."), { ms: 5000 });
    };
    reader.readAsText(file, "utf-8");
  }

  function reloadBooks(rows) {
    BS.covers.stop();
    U.$("#case").replaceChildren();
    setBooks(rows);
    state.filters = M.emptyFilters(statusDefault);
    U.$("#search").value = U.$("#heroSearch").value = "";
    U.$("#demoBanner").hidden = source.kind !== "demo";
    BS.ui.hero(books);
    apply({ animate: false });
    // Bücher fallen einmal sichtbar ins Regal
    if (!U.reducedMotion() && state.view !== "list")
      U.$$("#case .bk").forEach((el, i) => {
        if (el.getBoundingClientRect().top < innerHeight)
          el.animate([{ transform: "translateY(-120px) rotate(-8deg)", opacity: 0 }, { transform: "translateY(4px)", opacity: 1, offset: 0.7 }, { transform: "none", opacity: 1 }],
            { duration: 620, delay: Math.min(i * 14, 900), easing: "cubic-bezier(.3,.7,.4,1)", fill: "backwards" });
      });
    enrich();
  }

  function exportCsv() {
    const rows = order.map((b) => {
      const r = Object.assign({}, b.row);
      delete r["Private Notes"];
      return r;
    });
    const head = GR_HEADERS.filter((h) => h !== "Private Notes");
    U.download("buecherregal_auswahl.csv", BS.csv.stringify(rows, head), "text/csv;charset=utf-8");
  }

  function exportBooksJs() {
    const rows = books.map((b) => {
      const r = Object.assign({}, b.row);
      delete r["Private Notes"];
      return r;
    });
    const data = { generated: new Date().toISOString(), source: "goodreads", rows, enrichment: BS.covers.exportFor(books) };
    const js = "// Erzeugt vom Bücherregal (Daten → books.js erzeugen). Ohne private Notizen.\n" +
      "// Diese Datei nach fun/buecherregal/data/books.js legen.\n" +
      "window.BOOKSHELF_DATA = " + JSON.stringify(data) + ";\n";
    U.download("books.js", js, "text/javascript;charset=utf-8");
  }

  // ---------- Open-Library-Anreicherung ----------
  let lookup = null; // Stand des laufenden Suchdurchgangs (für Stopp/Fortsetzen)
  function enrich() {
    if (!BS.covers.online()) return;
    const pending = [];
    let found = 0;
    const me = (lookup = { done: 0, total: 0, paused: false });
    const flush = U.debounce(() => {
      if (!pending.length) return;
      let relayout = false;
      const batch = pending.splice(0);
      for (const [b, rec] of batch) {
        const prevVis = b.vis, prevGenre = b.genre, prevThemes = b.themes.join();
        M.derive(b, rec);
        S.decorate(b);
        if (BS.shelf.refreshBook(b, prevVis)) relayout = true;
        if (b.genre !== prevGenre || b.themes.join() !== prevThemes) {
          if (state.group === "genre" || state.filters.genres.size || state.sort === "color") relayout = true;
        }
      }
      if (relayout && !BS.reader.isOpen()) apply();
      else {
        statsLater();
        BS.ui.renderDrawer();
      }
      BS.ui.hero(books);
    }, 900);
    BS.covers.run(state.view === "spine" ? books : order.concat(books.filter((b) => !order.includes(b))),
      (b, rec) => {
        if (rec.c) found++;
        pending.push([b, rec]);
        flush();
      },
      (doneN, total, stopped, finished) => {
        if (lookup !== me) return; // inzwischen läuft ein neuer Durchgang
        me.done = doneN;
        me.total = total;
        me.found = found;
        if (stopped === "user") {
          // Stopp-Knopf zeigt selbst eine Meldung; beim Schalter im Daten-Menü nur aufräumen
          if (finished && !me.paused) BS.ui.hideToast();
          return;
        }
        if (finished) {
          if (stopped && found === 0) BS.ui.toast("Open Library ist gerade nicht erreichbar – die Einbände bleiben selbst gestaltet.", { ms: 5000 });
          else if (total > 5) BS.ui.toast("Fertig: <strong>" + found + " Cover</strong> gefunden" + (total - found > 0 ? ", " + (total - found) + " Einbände selbst gestaltet." : "."), { ms: 4000 });
          else BS.ui.hideToast();
          return;
        }
        if (total <= 5) return;
        // Nur Zahl und Balken nachführen – sonst tauscht jeder Schritt den Stopp-Knopf unter dem Mauszeiger aus
        let label = U.$("#toast.is-on [data-progress]");
        if (!label) {
          BS.ui.toast('<span class="toast__spin" aria-hidden="true"></span><span>Suche Cover &amp; Themen bei Open Library … <span data-progress></span></span>' +
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
    BS.covers.stop();
    BS.ui.toast("Suche angehalten bei " + lookup.done + " von " + lookup.total + " Büchern." +
      '<button type="button" class="toast__btn" data-toast="resume">Fortsetzen</button>', { ms: 12000 });
  }

  // ---------- Start ----------
  async function start() {
    const theme = U.store.get("bs.theme", null);
    if (theme) document.documentElement.dataset.theme = theme;
    BS.shelf.init(U.$("#case"), { onOpen: (b, el) => openBook(b.id, el), onGroup });
    BS.reader.init({ navList: () => order, onFilter: (kind, value) => {
      if (kind === "genre") toggleFacet("genres", value);
      else if (kind === "shelf") toggleFacet("shelves", value);
      else if (kind === "q") setQuery('"' + value.replace(/"/g, "") + '"');
      U.$("#toolbar").scrollIntoView({ behavior: U.reducedMotion() ? "auto" : "smooth" });
    } });
    BS.ui.init(api);
    BS.stats.init(U.$("#stats"), api);
    buildControls();

    source = await loadSource();
    setBooks(source.rows);
    const bookParam = loadHash();
    if (!books.length) {
      source = { kind: "demo", rows: BS.csv.toObjects(window.BOOKSHELF_DEMO_CSV || "") };
      setBooks(source.rows);
    }
    U.$("#demoBanner").hidden = source.kind !== "demo";
    const caseEl = U.$("#case");
    caseEl.classList.toggle("case--cover", state.view === "cover");
    caseEl.classList.toggle("case--spine", state.view !== "cover");
    BS.shelf.setMode(state.view === "cover" ? "cover" : "spine", [], {});
    caseEl.hidden = state.view === "list";
    U.$("#list").hidden = state.view !== "list";
    U.$("#search").value = U.$("#heroSearch").value = state.filters.q;
    syncControls();
    BS.ui.hero(books);
    apply({ animate: false });
    if (state.stats) {
      U.$("#stats").hidden = false;
      BS.stats.update();
    }
    document.body.classList.add("is-ready");
    if (bookParam && byId.has(bookParam)) setTimeout(() => openBook(bookParam), 400);
    setTimeout(enrich, 600);
  }

  const api = {
    state,
    get filters() { return state.filters; },
    books: () => books,
    visible: () => visible,
    order: () => order,
    byId: (id) => byId.get(id),
    statusDefault: () => statusDefault,
    // Bücher unter allen Filtern außer `skip` (für Facetten-Zähler und Diagramme)
    slice: (skip) => books.filter(M.makeFilter(state.filters, skip)),
    toggleFacet, setRange, setRating, setQuery, resetFilters, resetStatus, setSort, setGroup, setView, openBook,
  };
  BS.app = api;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
