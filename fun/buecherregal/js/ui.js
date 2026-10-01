/* Bücherregal – Bedienelemente: Hero, Filter-Schublade, aktive Filter,
   Listenansicht, Daten-Menü, Hinweise */
(function () {
  "use strict";
  const BS = (window.BS = window.BS || {});
  const U = BS.util, M = BS.model, S = BS.spine;
  let app;

  // ---------- Hero: zuletzt gelesen, Autor:in, Lesejahr ----------
  function hero(books) {
    const read = books.filter((b) => b.status === "read");
    const s = M.summary(read);
    const years = read.map((b) => b.readYear).filter((y) => y != null);
    const since = years.length ? Math.min(...years) : null;
    U.$("#heroLead").textContent = read.length
      ? U.fmt(read.length) + " gelesene Bücher · " + U.fmt(s.pages) + " Seiten" + (since ? " · seit " + since : "")
      : "Noch keine gelesenen Bücher im Regal.";

    // Zuletzt gelesen
    const last = read.filter((b) => b.dateRead).sort((a, b) => b.dateRead - a.dateRead)[0] || read[0] || books[0];
    const hb = U.$("#heroBook");
    // Nur neu aufbauen, wenn sich etwas geändert hat (sonst flackert das Cover beim Nachladen)
    const sig = last ? last.id + "|" + (BS.covers.coverUrl(last, "L") || "") + "|" + last.vis.c : "";
    if (last && hb.dataset.sig !== sig) {
      hb.dataset.sig = sig;
      hb.hidden = false;
      hb.dataset.id = last.id;
      hb.style.cssText = S.styleVars(last);
      hb.innerHTML = '<span class="bk__body">' + S.coverHTML(last) + "</span>";
      hb.setAttribute("aria-label", "Zuletzt gelesen: " + last.short + " von " + last.author);
      S.attachCover(hb.querySelector(".cv"), last, "L");
      U.$("#heroBookMeta").textContent = last.dateRead ? U.MONTHS[last.dateRead.getMonth()] + " " + last.dateRead.getFullYear() : "";
    } else if (!last) hb.hidden = true;

    // Meistgelesene Autor:in
    const by = {};
    read.forEach((b) => {
      const e = (by[b.author] = by[b.author] || { name: b.author, n: 0, pages: 0, key: "", book: b });
      e.n++;
      e.pages += b.pages || 0;
      if (!e.key && b.ol && b.ol.a) e.key = b.ol.a;
    });
    const top = Object.values(by).sort((a, b) => b.n - a.n || b.pages - a.pages)[0];
    const ac = U.$("#authorCard");
    if (top) {
      ac.hidden = false;
      ac.dataset.author = top.name;
      const initials = top.name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
      const photo = BS.covers.online() ? BS.covers.authorPhotoUrl(top.key) : null;
      const ph = U.$(".hcard__photo", ac);
      ph.style.setProperty("--c", top.book.vis.c);
      ph.dataset.initials = initials;
      const img = ph.querySelector("img");
      if (photo && (!img || img.dataset.src !== photo)) {
        const im = new Image();
        im.alt = "";
        im.dataset.src = photo;
        im.referrerPolicy = "no-referrer";
        im.onload = () => (im.naturalWidth > 20 ? ph.classList.add("has-img") : im.remove());
        im.onerror = () => im.remove();
        im.src = photo;
        ph.replaceChildren(im);
      } else if (!photo) {
        ph.replaceChildren();
        ph.classList.remove("has-img");
      }
      U.$(".hcard__name", ac).textContent = top.name;
      U.$(".hcard__meta", ac).textContent = top.n + (top.n === 1 ? " Buch" : " Bücher") + " · " + U.fmt(top.pages) + " Seiten";
    } else ac.hidden = true;

    yearCard(read);
  }

  function yearCard(read) {
    const now = new Date();
    let year = now.getFullYear();
    if (!read.some((b) => b.readYear === year)) {
      const ys = read.map((b) => b.readYear).filter((y) => y != null);
      if (ys.length) year = Math.max(...ys);
    }
    const these = read.filter((b) => b.readYear === year);
    const prev = read.filter((b) => b.readYear === year - 1).length;
    const goal = U.store.get("bs.goal." + year, null) || Math.max(12, prev || 0) || 12;
    const n = these.length;
    const pages = these.reduce((a, b) => a + (b.pages || 0), 0);
    U.$("#yearLabel").textContent = "Lesejahr " + year;
    const card = U.$("#yearCard");
    const pct = Math.min(1, n / goal);
    const R = 30, C = 2 * Math.PI * R;
    // Erwarteter Stand, falls das laufende Jahr gezeigt wird
    const frac = year === now.getFullYear() ? (now - new Date(year, 0, 1)) / (new Date(year + 1, 0, 1) - new Date(year, 0, 1)) : 1;
    const months = new Array(12).fill(0);
    these.forEach((b) => b.readMonth != null && months[b.readMonth]++);
    const mmax = Math.max(1, ...months);
    const sig = [year, n, goal, pages, months.join()].join("|");
    if (card.dataset.sig === sig) return;
    card.dataset.sig = sig;
    card.innerHTML =
      '<div class="ring"><svg viewBox="0 0 76 76" aria-hidden="true"><circle class="ring__track" cx="38" cy="38" r="' + R + '"/>' +
      '<circle class="ring__exp" cx="38" cy="38" r="' + R + '" stroke-dasharray="1.5 ' + (C - 1.5) + '" stroke-dashoffset="' + (-(C * Math.min(1, frac)) + 0.75) + '"/>' +
      '<circle class="ring__val" cx="38" cy="38" r="' + R + '" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '" style="--to:' + C * (1 - pct) + '"/></svg>' +
      '<span class="ring__n">' + n + "</span></div>" +
      '<div class="hcard__body"><span class="hcard__name">' + n + " von " + goal + " Büchern</span>" +
      '<span class="hcard__meta">' + U.fmt(pages) + " Seiten" + (n >= goal ? " · Ziel erreicht ✨" : "") + "</span>" +
      '<button type="button" class="linkbtn hcard__goal">Ziel ändern</button></div>' +
      '<div class="months" aria-hidden="true">' + months.map((m, i) =>
        '<span style="--v:' + (m / mmax).toFixed(2) + '" title="' + U.MONTHS[i] + ": " + m + '"></span>').join("") + "</div>";
    card.setAttribute("aria-label", "Lesejahr " + year + ": " + n + " von " + goal + " Büchern gelesen");
    card.dataset.year = year;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const v = card.querySelector(".ring__val");
      v && (v.style.strokeDashoffset = v.style.getPropertyValue("--to"));
    }));
    U.$(".hcard__goal", card).addEventListener("click", (e) => {
      e.stopPropagation();
      const v = prompt("Leseziel für " + year + " (Anzahl Bücher):", goal);
      const g = parseInt(v, 10);
      if (g > 0) {
        U.store.set("bs.goal." + year, g);
        yearCard(read);
      }
    });
  }

  // ---------- Filter-Schublade ----------
  let drawer, drawerBody, lastFocus;
  function initDrawer() {
    drawer = U.$("#drawer");
    drawerBody = U.$(".drawer__body", drawer);
    drawer.addEventListener("click", (e) => {
      if (e.target.matches(".drawer__backdrop, [data-close]")) closeDrawer();
      const chip = e.target.closest("[data-facet]");
      if (chip) app.toggleFacet(chip.dataset.facet, chip.dataset.value);
      const star = e.target.closest("[data-minrating]");
      if (star) {
        const v = +star.dataset.minrating;
        app.setRating(app.filters.rating === v ? 0 : v);
      }
      if (e.target.closest("[data-reset]")) app.resetFilters();
    });
    drawer.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });
  }
  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.hidden = false;
    renderDrawer();
    requestAnimationFrame(() => drawer.classList.add("is-open"));
    U.$("#filterBtn").setAttribute("aria-expanded", "true");
    setTimeout(() => U.$(".drawer__close", drawer).focus(), 50);
  }
  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.classList.remove("is-open");
    U.$("#filterBtn").setAttribute("aria-expanded", "false");
    setTimeout(() => (drawer.hidden = true), U.reducedMotion() ? 0 : 380);
    if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
  }
  const drawerOpen = () => drawer && !drawer.hidden;

  function chipList(facet, items, sel) {
    return U.el("div", { class: "chips" }, items.map((it) => {
      const on = sel.has(it.value);
      return U.el("button", {
        type: "button", class: "chip" + (on ? " is-on" : "") + (it.n === 0 && !on ? " is-empty" : ""),
        "data-facet": facet, "data-value": it.value, "aria-pressed": String(on),
        style: it.swatch ? "--sw:" + it.swatch : null,
      }, it.swatch ? U.el("i") : null, it.icon ? U.el("span", { class: "chip__icon", html: it.icon }) : null,
      it.label, U.el("span", { class: "chip__n", text: U.fmt(it.n) }));
    }));
  }
  function counts(facet, keyFn) {
    const m = new Map();
    for (const b of app.slice(facet)) for (const k of [].concat(keyFn(b))) m.set(k, (m.get(k) || 0) + 1);
    return m;
  }

  function renderDrawer() {
    if (!drawerOpen()) return;
    const f = app.filters;
    const all = app.books();
    const scroll = drawerBody.scrollTop;
    const secs = [];
    const sec = (title, ...content) => U.el("section", { class: "fsec" }, U.el("h3", { class: "fsec__title", text: title }), ...content);

    // Lesejahr
    const yc = counts("years", M.yearKey);
    const yearsAll = [...new Set(all.map(M.yearKey))].sort((a, b) => (a === "none" ? 1 : b === "none" ? -1 : b - a));
    secs.push(sec("Lesejahr", chipList("years", yearsAll.map((y) => ({ value: y, label: y === "none" ? "ohne Datum" : y, n: yc.get(y) || 0 })), f.years)));

    // Buchtyp
    const tc = counts("types", (b) => b.type);
    secs.push(sec("Buchtyp", chipList("types", M.TYPES.filter((t) => all.some((b) => b.type === t.key))
      .map((t) => ({ value: t.key, label: t.label, n: tc.get(t.key) || 0, icon: S.ICONS[t.key] })), f.types)));

    // Thema
    const gc = counts("genres", (b) => b.themes);
    const present = M.GENRES.filter((g) => all.some((b) => b.themes.includes(g.key)));
    secs.push(sec("Thema", chipList("genres", present.map((g) => ({ value: g.key, label: g.label, n: gc.get(g.key) || 0, swatch: g.pal[0] }))
      .sort((a, b) => b.n - a.n), f.genres)));

    // Seitenzahl & Erscheinungsjahr
    secs.push(sec("Seitenzahl", rangeSlider("pages", 0, 1000, 25, f.pages, all.map((b) => b.pages), (v) => U.fmt(v), "1000+")));
    const pys = all.map((b) => b.origYear).filter((y) => y != null);
    if (pys.length) {
      const lo = Math.max(1800, Math.floor(Math.min(...pys) / 10) * 10);
      const hi = Math.max(new Date().getFullYear(), Math.max(...pys));
      secs.push(sec("Erscheinungsjahr", rangeSlider("pub", lo, hi, 1, f.pub, pys, String, null, "≤" + lo)));
    }

    // Bewertung
    const stars = U.el("div", { class: "minstars", role: "group", "aria-label": "Mindestbewertung" },
      [1, 2, 3, 4, 5].map((i) => U.el("button", {
        type: "button", class: "minstar" + (f.rating && i <= f.rating ? " is-on" : ""), "data-minrating": i,
        "aria-label": "mindestens " + i + " Stern" + (i > 1 ? "e" : ""), "aria-pressed": String(f.rating === i), text: "★",
      })), U.el("span", { class: "minstars__label", text: f.rating ? "ab " + f.rating + " Stern" + (f.rating > 1 ? "en" : "") : "alle" }));
    secs.push(sec("Meine Bewertung", stars));

    // Autor:innen
    const ac = counts("authors", (b) => b.author);
    const authors = [...new Set(all.map((b) => b.author))];
    const topA = authors.map((a) => ({ value: a, label: a, n: ac.get(a) || 0 }))
      .filter((a) => a.n > 1 || f.authors.has(a.value)).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, "de")).slice(0, 14);
    f.authors.forEach((a) => !topA.some((t) => t.value === a) && topA.unshift({ value: a, label: a, n: ac.get(a) || 0 }));
    const input = U.el("input", { type: "search", class: "finput", list: "authorList", placeholder: "Autor:in hinzufügen …", "aria-label": "Autor:in suchen" });
    const dl = U.el("datalist", { id: "authorList" }, authors.sort((a, b) => a.localeCompare(b, "de")).map((a) => U.el("option", { value: a })));
    input.addEventListener("change", () => {
      if (authors.includes(input.value)) app.toggleFacet("authors", input.value);
    });
    secs.push(sec("Autor:in", input, dl, chipList("authors", topA, f.authors)));

    // Eigene Goodreads-Regale
    const shelves = [...new Set(all.flatMap((b) => b.shelves))];
    if (shelves.length) {
      const sc = counts("shelves", (b) => b.shelves);
      secs.push(sec("Eigene Regale (Goodreads)", chipList("shelves", shelves.map((s) => ({ value: s, label: "#" + s, n: sc.get(s) || 0 }))
        .sort((a, b) => b.n - a.n), f.shelves)));
    }

    // Status
    const stc = counts("status", (b) => b.status);
    const statuses = [...new Set(all.map((b) => b.status))];
    if (statuses.length > 1)
      secs.push(sec("Status", chipList("status", statuses.map((s) => ({ value: s, label: M.statusLabel(s), n: stc.get(s) || 0 })), f.status)));

    drawerBody.replaceChildren(...secs);
    drawerBody.scrollTop = scroll;
    const n = app.visible().length;
    U.$("[data-close].btn--primary", drawer).textContent = n === 1 ? "1 Buch zeigen" : U.fmt(n) + " Bücher zeigen";
  }

  // Doppelregler mit Mini-Histogramm; linke/rechte Endstellung = offen
  function rangeSlider(kind, min, max, step, val, values, fmtV, maxLabel, minLabel) {
    const bins = 24, hist = new Array(bins).fill(0);
    values.forEach((v) => {
      if (v == null) return;
      const i = Math.floor(((U.clamp(v, min, max) - min) / (max - min || 1)) * (bins - 1e-9));
      hist[U.clamp(i, 0, bins - 1)]++;
    });
    const hmax = Math.max(1, ...hist);
    const lo = U.el("input", { type: "range", min, max, step, value: val[0] != null ? val[0] : min, "aria-label": "von" });
    const hi = U.el("input", { type: "range", min, max, step, value: val[1] != null ? val[1] : max, "aria-label": "bis" });
    const out = U.el("output", { class: "range__out" });
    const fill = U.el("span", { class: "range__fill" });
    const histEl = U.el("div", { class: "range__hist", "aria-hidden": "true" },
      hist.map((h) => U.el("span", { style: "height:" + (h / hmax) * 100 + "%" })));
    const read = () => {
      let a = +lo.value, b = +hi.value;
      if (a > b) [a, b] = [b, a];
      return [a <= min ? null : a, b >= max ? null : b, a, b];
    };
    const paint = () => {
      const [a, b, ra, rb] = read();
      const pa = ((ra - min) / (max - min)) * 100, pb = ((rb - min) / (max - min)) * 100;
      fill.style.left = pa + "%";
      fill.style.right = 100 - pb + "%";
      U.$$("span", histEl).forEach((s, i) => s.classList.toggle("is-in", ((i + 0.5) / bins) * 100 >= pa && ((i + 0.5) / bins) * 100 <= pb));
      out.textContent = a == null && b == null ? "alle"
        : a == null ? "bis " + fmtV(b) : b == null ? "ab " + fmtV(a) : fmtV(a) + " – " + fmtV(b);
    };
    const commit = U.debounce(() => {
      const [a, b] = read();
      app.setRange(kind, a, b);
    }, 120);
    [lo, hi].forEach((inp) => inp.addEventListener("input", () => {
      paint();
      commit();
    }));
    paint();
    return U.el("div", { class: "range" }, out, U.el("div", { class: "range__box" }, histEl,
      U.el("div", { class: "range__track" }, fill), lo, hi),
      U.el("div", { class: "range__ends" }, U.el("span", { text: minLabel || fmtV(min) }), U.el("span", { text: maxLabel || fmtV(max) })));
  }

  // ---------- Aktive Filter als Chips unter der Leiste ----------
  function activeChips() {
    const f = app.filters, box = U.$("#activeChips");
    const chips = [];
    const add = (label, onRemove) => chips.push({ label, onRemove });
    if (f.q.trim()) add("„" + f.q.trim() + "“", () => app.setQuery(""));
    f.years.forEach((y) => add(y === "none" ? "ohne Lesedatum" : "gelesen " + y, () => app.toggleFacet("years", y)));
    f.types.forEach((t) => add(M.TYPE[t].label, () => app.toggleFacet("types", t)));
    f.genres.forEach((g) => add(M.GENRE[g].label, () => app.toggleFacet("genres", g)));
    f.shelves.forEach((s) => add("#" + s, () => app.toggleFacet("shelves", s)));
    f.authors.forEach((a) => add(a, () => app.toggleFacet("authors", a)));
    if (f.pages[0] != null || f.pages[1] != null)
      add((f.pages[0] != null ? f.pages[0] : "0") + "–" + (f.pages[1] != null ? f.pages[1] : "∞") + " Seiten", () => app.setRange("pages", null, null));
    if (f.pub[0] != null || f.pub[1] != null)
      add("erschienen " + (f.pub[0] != null ? f.pub[0] : "…") + "–" + (f.pub[1] != null ? f.pub[1] : "heute"), () => app.setRange("pub", null, null));
    if (f.rating) add("ab " + "★".repeat(f.rating), () => app.setRating(0));
    const def = app.statusDefault();
    const statusChanged = f.status.size !== def.length || def.some((s) => !f.status.has(s));
    if (statusChanged) add("Status: " + ([...f.status].map(M.statusLabel).join(", ") || "keiner"), () => app.resetStatus());
    box.replaceChildren(...chips.map((c) => {
      const b = U.el("button", { type: "button", class: "achip", "aria-label": c.label + " entfernen" }, c.label, U.el("span", { "aria-hidden": "true", text: "×" }));
      b.addEventListener("click", c.onRemove);
      return b;
    }));
    if (chips.length > 1) {
      const r = U.el("button", { type: "button", class: "achip achip--reset", text: "Alle zurücksetzen" });
      r.addEventListener("click", () => app.resetFilters());
      box.append(r);
    }
    box.hidden = !chips.length;
    const n = M.activeCount(f, def);
    const badge = U.$("#filterCount");
    badge.textContent = n ? String(n) : "";
    badge.hidden = !n;
  }

  // ---------- Listenansicht (Tabelle) ----------
  const COLS = [
    { key: "title", label: "Titel", sort: "title" },
    { key: "pages", label: "Seiten", sort: "pages", num: true },
    { key: "pub", label: "Erschienen", sort: "pub", num: true },
    { key: "read", label: "Gelesen", sort: "read", num: true },
    { key: "rating", label: "Sterne", sort: "rating", num: true },
    { key: "type", label: "Typ" },
    { key: "genre", label: "Thema" },
  ];
  function renderList(order, sortKey, dir, animate) {
    const box = U.$("#list");
    let table = box.querySelector("table");
    if (!table) {
      table = U.el("table", { class: "ltable" },
        U.el("caption", { class: "sr-only", text: "Bücher als Liste" }),
        U.el("thead", null, U.el("tr", null, COLS.map((c) => {
          const th = U.el("th", { scope: "col", class: c.num ? "num" : "" });
          if (c.sort) {
            const btn = U.el("button", { type: "button", "data-sort": c.sort, text: c.label });
            btn.addEventListener("click", () => app.setSort(c.sort, sortKey === c.sort ? (app.state.dir === "asc" ? "desc" : "asc") : M.SORTS[c.sort].dir));
            th.append(btn);
          } else th.textContent = c.label;
          return th;
        }))), U.el("tbody"));
      box.append(table);
      table.tBodies[0].addEventListener("click", (e) => {
        const tr = e.target.closest("tr[data-key]");
        if (tr) app.openBook(tr.dataset.key, tr.querySelector(".lcover"));
      });
      table.tBodies[0].addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target.matches("tr[data-key]")) {
          e.preventDefault();
          app.openBook(e.target.dataset.key, e.target.querySelector(".lcover"));
        }
      });
    }
    U.$$("th button", table).forEach((b) => {
      const on = b.dataset.sort === sortKey;
      b.parentNode.setAttribute("aria-sort", on ? (dir === "asc" ? "ascending" : "descending") : "none");
      b.classList.toggle("is-on", on);
      b.dataset.dir = on ? dir : "";
    });
    const tbody = table.tBodies[0];
    const before = new Map();
    if (animate && !U.reducedMotion()) U.$$("tr", tbody).forEach((tr) => before.set(tr.dataset.key, tr.getBoundingClientRect().top));
    U.reconcile(tbody, order, (b) => b.id, (b) => {
      const tr = U.el("tr", { tabindex: "0" });
      tr.innerHTML =
        '<td class="lt-title"><span class="lcover" style="' + S.styleVars(b) + '">' + S.coverHTML(b) + "</span>" +
        '<span class="lt-tt"><strong>' + U.esc(b.title) + "</strong><span>" + U.esc(b.author) + "</span></span></td>" +
        '<td class="num">' + (b.pages ? U.fmt(b.pages) : "–") + "</td>" +
        '<td class="num">' + (b.origYear != null ? b.origYear : "–") + "</td>" +
        '<td class="num">' + (b.dateRead ? U.MONTHS[b.dateRead.getMonth()] + " " + b.dateRead.getFullYear() : b.readYear || "–") + "</td>" +
        '<td class="num lt-stars" aria-label="' + (b.rating || 0) + ' Sterne">' + (b.rating ? "★".repeat(b.rating) : "–") + "</td>" +
        "<td>" + U.esc(M.TYPE[b.type].label) + "</td>" +
        '<td><span class="lt-genre" style="--sw:' + M.GENRE[b.genre].pal[0] + '"><i></i>' + U.esc(M.GENRE[b.genre].label) + "</span></td>";
      return tr;
    }, (tr, b) => {
      tr.setAttribute("aria-label", b.short + " von " + b.author);
    });
    if (before.size) {
      U.$$("tr", tbody).forEach((tr, i) => {
        const was = before.get(tr.dataset.key);
        const now = tr.getBoundingClientRect().top;
        if (was == null) {
          if (now < innerHeight) tr.animate([{ opacity: 0, transform: "translateX(-12px)" }, { opacity: 1, transform: "none" }], { duration: 300, delay: Math.min(i * 12, 240), fill: "backwards" });
        } else if (Math.abs(was - now) > 1 && (now < innerHeight + 100 || was < innerHeight + 100))
          tr.animate([{ transform: "translateY(" + (was - now) + "px)" }, { transform: "none" }], { duration: 480, easing: "cubic-bezier(.3,1.3,.5,1)" });
      });
    }
    // Cover erst laden, wenn die Zeile sichtbar wird
    if (!renderList.io && "IntersectionObserver" in window) {
      renderList.io = new IntersectionObserver((ens) => ens.forEach((en) => {
        if (!en.isIntersecting) return;
        const b = app.byId(en.target.dataset.key);
        if (b) S.attachCover(en.target.querySelector(".cv"), b, "S");
        renderList.io.unobserve(en.target);
      }), { rootMargin: "300px 0px" });
    }
    if (renderList.io) U.$$("tr", tbody).forEach((tr) => !tr.querySelector(".cv__img") && renderList.io.observe(tr));
  }

  // ---------- Hinweis-Toast ----------
  let toastTimer;
  function toast(html, opts) {
    opts = opts || {};
    const t = U.$("#toast");
    clearTimeout(toastTimer);
    t.innerHTML = html;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add("is-on"));
    if (opts.ms) toastTimer = setTimeout(hideToast, opts.ms);
    return t;
  }
  function hideToast() {
    const t = U.$("#toast");
    t.classList.remove("is-on");
    setTimeout(() => (t.hidden = !t.classList.contains("is-on") ? true : t.hidden), 350);
  }

  BS.ui = {
    init(appApi) {
      app = appApi;
      initDrawer();
    },
    hero, openDrawer, closeDrawer, drawerOpen, renderDrawer, activeChips, renderList, toast, hideToast,
  };
})();
