/* Bücherregal – Statistik: Kennzahlen und Diagramme zum aktuellen Filter.
   Jedes Diagramm zeigt die Bücher unter allen *anderen* Filtern (Crossfilter)
   und hebt die eigene Auswahl hervor; ein Klick setzt bzw. löst den Filter.
   Jede Karte hat eine Tabellenansicht als zugängliche Alternative. */
(function () {
  "use strict";
  const BS = (window.BS = window.BS || {});
  const U = BS.util, M = BS.model;

  let root, tip, app;
  const cards = {};
  const tableMode = {};
  let metric = U.store.get("bs.stats.metric", "count"); // count | pages

  // ---------- Tooltip ----------
  function showTip(e, lines) {
    tip.replaceChildren(...lines.map((l, i) => {
      const n = U.el(i === 0 ? "strong" : "span", { text: l.text != null ? l.text : l });
      if (l.key) n.prepend(U.el("i", { class: "vtip__key", style: "background:" + l.key }));
      return n;
    }));
    tip.hidden = false;
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX != null && e.clientX ? e.clientX : r.left + r.width / 2;
    const py = e.clientY != null && e.clientY ? e.clientY : r.top;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    const x = U.clamp(px - tw / 2, 8, innerWidth - tw - 8);
    const y = py - th - 14 < 8 ? py + 18 : py - th - 14;
    tip.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
  }
  function hideTip() {
    if (tip) tip.hidden = true;
  }
  function bindTip(node, lines) {
    node._tip = lines;
    if (node._tipBound) return;
    node._tipBound = true;
    const on = (e) => showTip(e, node._tip());
    node.addEventListener("pointermove", on);
    node.addEventListener("focus", on);
    node.addEventListener("pointerleave", hideTip);
    node.addEventListener("blur", hideTip);
  }

  // ---------- Karten ----------
  function card(id, title, sub, opts) {
    opts = opts || {};
    const body = U.el("div", { class: "vcard__body" });
    const tableBox = U.el("div", { class: "vcard__table", hidden: true });
    const subEl = U.el("p", { class: "vcard__sub", text: sub || "" });
    const ctrl = U.el("div", { class: "vcard__ctrl" });
    const tbtn = U.el("button", { type: "button", class: "vcard__tbtn", "aria-pressed": "false", text: "Tabelle" });
    tbtn.addEventListener("click", () => {
      tableMode[id] = !tableMode[id];
      tbtn.setAttribute("aria-pressed", String(!!tableMode[id]));
      tbtn.textContent = tableMode[id] ? "Diagramm" : "Tabelle";
      update();
    });
    const el = U.el("section", { class: "vcard vcard--" + id + (opts.wide ? " vcard--wide" : ""), "aria-labelledby": "vc-" + id },
      U.el("header", { class: "vcard__head" },
        U.el("div", null, U.el("h3", { class: "vcard__title", id: "vc-" + id, text: title }), subEl),
        U.el("div", { class: "vcard__tools" }, ctrl, tbtn)),
      body, tableBox, U.el("div", { class: "vcard__foot" }));
    cards[id] = { el, body, tableBox, subEl, ctrl, foot: el.lastChild };
    return cards[id];
  }
  function setTable(c, head, rows) {
    const t = U.el("table", null,
      U.el("thead", null, U.el("tr", null, head.map((h, i) => U.el("th", { scope: "col", class: i ? "num" : "", text: h })))),
      U.el("tbody", null, rows.map((r) => U.el("tr", null, r.map((v, i) => U.el(i ? "td" : "th", { class: i ? "num" : "", scope: i ? null : "row", text: v }))))));
    c.tableBox.replaceChildren(t);
  }
  function showMode(id) {
    const c = cards[id];
    c.body.hidden = !!tableMode[id];
    c.tableBox.hidden = !tableMode[id];
  }

  function niceTicks(max, n) {
    if (max <= 0) return [0];
    const raw = max / n;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw && s >= 1) || Math.max(1, raw);
    const out = [];
    for (let v = 0; v <= max + step * 0.001; v += step) out.push(Math.round(v * 100) / 100);
    if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
    return out;
  }
  function grid(ticks, fmtTick) {
    const top = ticks[ticks.length - 1] || 1;
    return U.el("div", { class: "vgrid", "aria-hidden": "true" },
      ticks.map((t) => U.el("span", { class: "vgrid__line" + (t === 0 ? " vgrid__line--base" : ""), style: "bottom:" + (t / top) * 100 + "%" },
        U.el("em", { text: fmtTick ? fmtTick(t) : U.fmt(t) }))));
  }

  // ---------- Kennzahlen ----------
  function kpis(books) {
    const read = books.filter((b) => b.status === "read");
    const s = M.summary(books);
    const years = {};
    read.forEach((b) => b.readYear != null && (years[b.readYear] = (years[b.readYear] || 0) + 1));
    const yk = Object.keys(years).map(Number);
    const span = yk.length ? Math.max(...yk) - Math.min(...yk) + 1 : 0;
    const now = new Date();
    // Laufendes Jahr nur anteilig zählen, sonst drückt es den Schnitt
    let yearsEff = span;
    if (yk.includes(now.getFullYear())) yearsEff = span - 1 + (now - new Date(now.getFullYear(), 0, 1)) / 31557600000;
    const perYear = yearsEff > 0 ? yk.reduce((a, y) => a + years[y], 0) / yearsEff : null;
    const authors = new Set(books.map((b) => b.author)).size;
    // Regalmeter: Seiten × 0,06 mm + Einband (nur Papierbücher)
    let mm = 0;
    books.forEach((b) => {
      if (b.type === "ebook" || b.type === "audio") return;
      mm += (b.pages || 300) * 0.06 + (b.type === "hard" ? 5 : 2);
    });
    const longest = books.reduce((m, b) => (b.pages && (!m || b.pages > m.pages) ? b : m), null);
    const rated = books.filter((b) => b.rating);
    const tiles = [
      ["Bücher", U.fmt(s.count), read.length !== s.count ? U.fmt(read.length) + " davon gelesen" : "im aktuellen Filter"],
      ["Seiten", U.fmt(s.pages), mm ? "≈ " + U.fmt1(mm / 1000) + " m Regal (nur Papier)" : "—"],
      ["Ø Seiten", s.count ? U.fmt(s.pages / Math.max(1, books.filter((b) => b.pages).length)) : "–",
        longest ? "längstes: " + longest.short + " (" + U.fmt(longest.pages) + ")" : ""],
      ["Ø Sterne", s.avgRating ? U.fmt2(s.avgRating) : "–", rated.length ? U.fmt(rated.length) + " bewertet" : "keine Bewertungen"],
      ["Bücher pro Jahr", perYear ? U.fmt1(perYear) : "–", span ? "über " + span + (span === 1 ? " Jahr" : " Jahre") : "ohne Lesedaten"],
      ["Autor:innen", U.fmt(authors), books.length ? U.fmt1(books.length / Math.max(1, authors)) + " Bücher je Person" : ""],
    ];
    const box = U.$(".kpis", root);
    U.reconcile(box, tiles, (t) => t[0], (t) =>
      U.el("div", { class: "kpi" }, U.el("span", { class: "kpi__label" }), U.el("span", { class: "kpi__value" }), U.el("span", { class: "kpi__sub" })),
    (n, t) => {
      n.children[0].textContent = t[0];
      if (n.children[1].textContent !== t[1]) {
        n.children[1].textContent = t[1];
        if (!U.reducedMotion()) n.children[1].animate([{ opacity: 0.2, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "ease-out" });
      }
      n.children[2].textContent = t[2];
    });
  }

  // ---------- Lesejahre als Bücherstapel ----------
  function yearsChart() {
    const c = cards.years;
    const books = app.slice("years").filter((b) => b.status === "read");
    const sel = app.filters.years;
    const withYear = books.filter((b) => b.readYear != null);
    const none = books.length - withYear.length;
    if (!withYear.length) {
      c.body.replaceChildren(U.el("p", { class: "vempty", text: "Keine Bücher mit Lesedatum im aktuellen Filter." }));
      setTable(c, ["Jahr", "Bücher", "Seiten"], []);
      c.subEl.textContent = "";
      return;
    }
    const ys = withYear.map((b) => b.readYear);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const cols = [];
    for (let y = y0; y <= y1; y++) cols.push({ y, books: [] });
    withYear.forEach((b) => cols[b.readYear - y0].books.push(b));
    const val = (b) => (metric === "pages" ? b.pages || 0 : 1);
    cols.forEach((col) => {
      col.books.sort((a, b) => M.TYPE[a.type].order - M.TYPE[b.type].order || (a.dateRead || 0) - (b.dateRead || 0));
      col.total = col.books.reduce((a, b) => a + val(b), 0);
      col.pages = col.books.reduce((a, b) => a + (b.pages || 0), 0);
    });
    const ticks = niceTicks(Math.max(...cols.map((x) => x.total)), 4);
    const top = ticks[ticks.length - 1] || 1;
    c.subEl.textContent = (metric === "pages" ? "Seiten" : "Bücher") + " je Lesejahr – jeder Block ist ein Buch" +
      (none ? " · " + none + " ohne Lesedatum nicht dargestellt" : "");

    let wrap = c.body.querySelector(".ys");
    if (!wrap) {
      wrap = U.el("div", { class: "ys" }, U.el("div", { class: "ys__plot" }), U.el("div", { class: "ys__axis" }));
      c.body.replaceChildren(wrap, legend(M.TYPES.filter((t) => t.key !== "other" || books.some((b) => b.type === "other"))));
    }
    const plot = wrap.firstChild, axis = wrap.lastChild;
    const g = grid(ticks, metric === "pages" ? (t) => (t >= 1000 ? U.fmt(t / 1000) + "k" : U.fmt(t)) : null);
    const old = plot.querySelector(".vgrid");
    old ? old.replaceWith(g) : plot.prepend(g);
    let colsEl = plot.querySelector(".ys__cols");
    if (!colsEl) plot.append((colsEl = U.el("div", { class: "ys__cols" })));
    colsEl.style.setProperty("--n", cols.length);
    U.reconcile(colsEl, cols, (x) => x.y,
      () => {
        const n = U.el("button", { type: "button", class: "ys__col" },
          U.el("span", { class: "ys__val" }), U.el("span", { class: "ys__stack" }));
        n.addEventListener("click", () => app.toggleFacet("years", n.dataset.key));
        return n;
      },
      (n, col) => {
        n.classList.toggle("is-sel", sel.has(String(col.y)));
        n.classList.toggle("is-dim", sel.size > 0 && !sel.has(String(col.y)));
        n.setAttribute("aria-label", col.y + ": " + col.books.length + " Bücher, " + U.fmt(col.pages) + " Seiten" + (sel.has(String(col.y)) ? " (ausgewählt)" : ""));
        n.firstChild.textContent = col.total ? (metric === "pages" ? (col.total >= 1000 ? U.fmt1(col.total / 1000) + "k" : U.fmt(col.total)) : col.total) : "";
        n.firstChild.style.bottom = (col.total / top) * 100 + "%";
        const stack = n.lastChild;
        stack.style.height = (col.total / top) * 100 + "%";
        U.reconcile(stack, col.books, (b) => b.id,
          () => U.el("span", { class: "ys__slab" }),
          (s, b) => {
            s.style.flexGrow = Math.max(val(b), metric === "pages" ? 1 : 0);
            s.style.background = "var(--t-" + b.type + ")";
            bindTip(s, () => [b.short, b.author, (b.pages ? U.fmt(b.pages) + " Seiten · " : "") + M.TYPE[b.type].label,
              { text: col.y + ": " + col.books.length + " Bücher · " + U.fmt(col.pages) + " S." }]);
          });
      });
    // Achsenbeschriftung: bei vielen Jahren nur jedes zweite
    const step = cols.length > 16 ? 2 : 1;
    U.reconcile(axis, cols, (x) => x.y, () => U.el("span"), (n, col) => {
      n.textContent = (col.y - y0) % step === 0 ? (cols.length > 10 ? "’" + String(col.y).slice(2) : String(col.y)) : "";
    });
    axis.style.setProperty("--n", cols.length);
    setTable(c, ["Jahr", "Bücher", "Seiten"].concat(M.TYPES.map((t) => t.label)),
      cols.map((col) => [String(col.y), U.fmt(col.books.length), U.fmt(col.pages)]
        .concat(M.TYPES.map((t) => U.fmt(col.books.filter((b) => b.type === t.key).length)))));
  }

  function legend(types) {
    return U.el("div", { class: "vlegend" }, types.map((t) =>
      U.el("span", { class: "vlegend__item" }, U.el("i", { style: "background:var(--t-" + t.key + ")" }), t.label)));
  }

  // ---------- Buchtypen (Anteile) ----------
  function typesChart() {
    const c = cards.types;
    const books = app.slice("types");
    const sel = app.filters.types;
    const rows = M.TYPES.map((t) => ({ t, n: books.filter((b) => b.type === t.key).length })).filter((r) => r.n);
    const total = books.length || 1;
    let bar = c.body.querySelector(".tb");
    if (!bar) c.body.replaceChildren((bar = U.el("div", { class: "tb" })), U.el("div", { class: "tb__rows" }));
    U.reconcile(bar, rows, (r) => r.t.key, () => {
      const n = U.el("button", { type: "button", class: "tb__seg" });
      n.addEventListener("click", () => app.toggleFacet("types", n.dataset.key));
      return n;
    }, (n, r) => {
      n.style.flexGrow = r.n;
      n.style.background = "var(--t-" + r.t.key + ")";
      n.classList.toggle("is-dim", sel.size > 0 && !sel.has(r.t.key));
      n.setAttribute("aria-label", r.t.label + ": " + r.n);
      bindTip(n, () => [{ text: U.fmt(r.n) + " · " + Math.round((r.n / total) * 100) + " %" }, { text: r.t.label, key: "var(--t-" + r.t.key + ")" }]);
    });
    U.reconcile(bar.nextSibling, rows, (r) => r.t.key, () => {
      const n = U.el("button", { type: "button", class: "tb__row" },
        U.el("i", { class: "tb__key" }), U.el("span", { class: "tb__label" }), U.el("span", { class: "tb__n" }), U.el("span", { class: "tb__pct" }));
      n.addEventListener("click", () => app.toggleFacet("types", n.dataset.key));
      return n;
    }, (n, r) => {
      n.children[0].style.background = "var(--t-" + r.t.key + ")";
      n.children[1].textContent = r.t.label;
      n.children[2].textContent = U.fmt(r.n);
      n.children[3].textContent = Math.round((r.n / total) * 100) + " %";
      n.classList.toggle("is-sel", sel.has(r.t.key));
      n.classList.toggle("is-dim", sel.size > 0 && !sel.has(r.t.key));
    });
    setTable(c, ["Buchtyp", "Bücher", "Anteil"], rows.map((r) => [r.t.label, U.fmt(r.n), Math.round((r.n / total) * 100) + " %"]));
  }

  // ---------- Lesemonate (Heatmap) ----------
  function monthsChart() {
    const c = cards.months;
    const books = app.slice("years").filter((b) => b.dateRead);
    const sel = app.filters.years;
    if (!books.length) {
      c.body.replaceChildren(U.el("p", { class: "vempty", text: "Keine Lesedaten im aktuellen Filter." }));
      setTable(c, ["Jahr"], []);
      return;
    }
    const ys = books.map((b) => b.readYear);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const cells = {};
    books.forEach((b) => {
      const k = b.readYear + "-" + b.readMonth;
      (cells[k] = cells[k] || []).push(b);
    });
    const max = Math.max(...Object.values(cells).map((a) => a.length));
    const step = (n) => (n ? Math.max(1, Math.ceil((n / max) * 6)) : 0);
    const years = [];
    for (let y = y1; y >= y0; y--) years.push(y);
    const head = U.el("div", { class: "hm__row hm__row--head", "aria-hidden": "true" }, U.el("span"),
      U.MONTHS.map((m) => U.el("span", { class: "hm__m", text: m.slice(0, 1), title: m })), U.el("span", { class: "hm__sum", text: "Σ" }));
    const rows = years.map((y) => {
      let sum = 0;
      const row = U.el("div", { class: "hm__row" + (sel.size && !sel.has(String(y)) ? " is-dim" : "") });
      const lab = U.el("button", { type: "button", class: "hm__y", text: String(y) });
      lab.addEventListener("click", () => app.toggleFacet("years", String(y)));
      row.append(lab);
      for (let m = 0; m < 12; m++) {
        const list = cells[y + "-" + m] || [];
        sum += list.length;
        const cell = U.el("button", { type: "button", class: "hm__c hm--s" + step(list.length),
          "aria-label": U.MONTHS_LONG[m] + " " + y + ": " + list.length + " Bücher" });
        if (list.length) {
          cell.addEventListener("click", () => app.setQuery("gelesen:" + y + "-" + String(m + 1).padStart(2, "0")));
          bindTip(cell, () => [U.MONTHS_LONG[m] + " " + y + " · " + list.length + (list.length === 1 ? " Buch" : " Bücher")]
            .concat(list.slice(0, 5).map((b) => ({ text: b.short }))).concat(list.length > 5 ? [{ text: "…" }] : []));
        } else cell.tabIndex = -1;
        row.append(cell);
      }
      row.append(U.el("span", { class: "hm__sum", text: sum ? String(sum) : "" }));
      return row;
    });
    const scale = U.el("div", { class: "hm__scale", "aria-hidden": "true" }, U.el("span", { text: "weniger" }),
      [1, 2, 3, 4, 5, 6].map((s) => U.el("i", { class: "hm--s" + s })), U.el("span", { text: "mehr (max. " + max + ")" }));
    c.body.replaceChildren(U.el("div", { class: "hm" }, head, rows), scale);
    setTable(c, ["Jahr"].concat(U.MONTHS).concat(["Summe"]), years.map((y) => {
      const r = [String(y)];
      let s = 0;
      for (let m = 0; m < 12; m++) {
        const n = (cells[y + "-" + m] || []).length;
        s += n;
        r.push(n ? String(n) : "");
      }
      return r.concat([String(s)]);
    }));
  }

  // ---------- Horizontale Balken (Themen, Autor:innen) ----------
  function hbars(c, rows, sel, onClick, swatch) {
    const max = Math.max(1, ...rows.map((r) => r.n));
    let box = c.body.querySelector(".hb");
    if (!box) c.body.replaceChildren((box = U.el("div", { class: "hb" })));
    U.reconcile(box, rows, (r) => r.key, () => {
      const n = U.el("button", { type: "button", class: "hb__row" },
        U.el("span", { class: "hb__label" }, U.el("i", { class: "hb__dot" }), U.el("span")),
        U.el("span", { class: "hb__track" }, U.el("span", { class: "hb__bar" })),
        U.el("span", { class: "hb__n" }));
      n.addEventListener("click", () => onClick(n.dataset.key));
      return n;
    }, (n, r) => {
      const dot = n.querySelector(".hb__dot");
      dot.hidden = !swatch;
      if (swatch) dot.style.background = swatch(r);
      n.querySelector(".hb__label span").textContent = r.label;
      n.querySelector(".hb__bar").style.width = (r.n / max) * 100 + "%";
      n.querySelector(".hb__n").textContent = U.fmt(r.n);
      n.classList.toggle("is-sel", sel.has(r.key));
      n.classList.toggle("is-dim", sel.size > 0 && !sel.has(r.key));
      n.setAttribute("aria-pressed", String(sel.has(r.key)));
      bindTip(n, () => [{ text: U.fmt(r.n) + (r.n === 1 ? " Buch" : " Bücher") + (r.pages ? " · " + U.fmt(r.pages) + " Seiten" : "") }, { text: r.label }]);
    });
  }

  function genresChart() {
    const c = cards.genres;
    const books = app.slice("genres");
    const sel = app.filters.genres;
    const counts = {};
    books.forEach((b) => b.themes.forEach((k) => (counts[k] = (counts[k] || 0) + 1)));
    const rows = Object.keys(counts).map((k) => ({ key: k, label: M.GENRE[k].label, n: counts[k] }))
      .sort((a, b) => b.n - a.n || M.GENRE[a.key].order - M.GENRE[b.key].order).slice(0, 16);
    hbars(c, rows, sel, (k) => app.toggleFacet("genres", k), (r) => M.GENRE[r.key].pal[0]);
    c.subEl.textContent = "Ein Buch kann mehrere Themen haben · Punkt = typische Einbandfarbe im Regal";
    setTable(c, ["Thema", "Bücher"], rows.map((r) => [r.label, U.fmt(r.n)]));
  }

  function authorsChart() {
    const c = cards.authors;
    const books = app.slice("authors");
    const sel = app.filters.authors;
    const m = {};
    books.forEach((b) => {
      const e = (m[b.author] = m[b.author] || { key: b.author, label: b.author, n: 0, pages: 0 });
      e.n++;
      e.pages += b.pages || 0;
    });
    const rows = Object.values(m).sort((a, b) => b.n - a.n || b.pages - a.pages).slice(0, 8);
    hbars(c, rows, sel, (k) => app.toggleFacet("authors", k), null);
    setTable(c, ["Autor:in", "Bücher", "Seiten"], rows.map((r) => [r.label, U.fmt(r.n), U.fmt(r.pages)]));
  }

  // ---------- Säulen (Seitenzahl, Erscheinungsjahrzehnt) ----------
  function columns(c, bins, isSel, onClick, labelEvery) {
    const max = Math.max(1, ...bins.map((b) => b.n));
    const ticks = niceTicks(max, 3);
    const top = ticks[ticks.length - 1];
    const anySel = bins.some(isSel);
    let wrap = c.body.querySelector(".vc");
    if (!wrap) {
      wrap = U.el("div", { class: "vc" }, U.el("div", { class: "vc__plot" }, U.el("div", { class: "vc__cols" })), U.el("div", { class: "vc__axis" }));
      c.body.replaceChildren(wrap);
    }
    const plot = wrap.firstChild;
    const g = grid(ticks);
    const old = plot.querySelector(".vgrid");
    old ? old.replaceWith(g) : plot.prepend(g);
    const colsEl = plot.querySelector(".vc__cols");
    colsEl.style.setProperty("--n", bins.length);
    U.reconcile(colsEl, bins, (b) => b.key, () => {
      const n = U.el("button", { type: "button", class: "vc__col" }, U.el("span", { class: "vc__bar" }));
      n.addEventListener("click", () => onClick(n._bin));
      return n;
    }, (n, bin) => {
      n._bin = bin;
      n.firstChild.style.height = (bin.n / top) * 100 + "%";
      n.classList.toggle("is-sel", isSel(bin));
      n.classList.toggle("is-dim", anySel && !isSel(bin));
      n.setAttribute("aria-label", bin.label + ": " + bin.n + " Bücher");
      bindTip(n, () => [{ text: U.fmt(bin.n) + (bin.n === 1 ? " Buch" : " Bücher") }, { text: bin.label }]);
    });
    const axis = wrap.lastChild;
    axis.style.setProperty("--n", bins.length);
    U.reconcile(axis, bins, (b) => b.key, () => U.el("span"), (n, bin) => (n.textContent = bin.tick));
    U.$$("span", axis).forEach((s, i) => (s.style.visibility = i % (labelEvery || 1) === 0 ? "" : "hidden"));
  }

  function pagesChart() {
    const c = cards.pages;
    const books = app.slice("pages").filter((b) => b.pages);
    const [lo, hi] = app.filters.pages;
    const bins = [];
    for (let i = 0; i < 10; i++) bins.push({ key: "p" + i, lo: i * 100, hi: i * 100 + 99, n: 0, tick: String(i * 100), label: i * 100 + "–" + (i * 100 + 99) + " Seiten" });
    bins.push({ key: "p10", lo: 1000, hi: null, n: 0, tick: "1000+", label: "ab 1000 Seiten" });
    books.forEach((b) => bins[Math.min(10, Math.floor(b.pages / 100))].n++);
    const active = lo != null || hi != null;
    const isSel = (bin) => active && (lo == null || bin.lo >= lo) && (hi == null || (bin.hi != null && bin.hi <= hi));
    columns(c, bins, isSel, (bin) => {
      if (active && lo === bin.lo && hi === bin.hi) app.setRange("pages", null, null);
      else app.setRange("pages", bin.lo, bin.hi);
    }, innerWidth < 500 ? 2 : 1);
    const sorted = books.map((b) => b.pages).sort((a, b) => a - b);
    const med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
    c.subEl.textContent = "Bücher je 100 Seiten" + (med ? " · Median " + U.fmt(med) + " Seiten" : "");
    setTable(c, ["Seiten", "Bücher"], bins.map((b) => [b.label, U.fmt(b.n)]));
  }

  function pubChart() {
    const c = cards.pub;
    const books = app.slice("pub").filter((b) => b.origYear != null);
    const [lo, hi] = app.filters.pub;
    if (!books.length) {
      c.body.replaceChildren(U.el("p", { class: "vempty", text: "Keine Erscheinungsjahre im aktuellen Filter." }));
      return;
    }
    const decs = books.map((b) => (b.origYear < 1900 ? 1890 : Math.floor(b.origYear / 10) * 10));
    const d0 = Math.min(...decs), d1 = Math.max(...decs);
    const bins = [];
    for (let d = d0; d <= d1; d += 10)
      bins.push({ key: "d" + d, lo: d === 1890 ? null : d, hi: d === 1890 ? 1899 : d + 9, n: 0,
        tick: d === 1890 ? "<1900" : "’" + String(d).slice(2), label: d === 1890 ? "vor 1900" : d + "er" });
    decs.forEach((d) => bins[(d - d0) / 10].n++);
    const active = lo != null || hi != null;
    const isSel = (bin) => active && (lo == null || (bin.lo != null && bin.lo >= lo)) && (hi == null || bin.hi <= hi) && !(bin.lo == null && lo != null);
    columns(c, bins, isSel, (bin) => {
      if (active && lo === bin.lo && hi === bin.hi) app.setRange("pub", null, null);
      else app.setRange("pub", bin.lo, bin.hi);
    }, bins.length > 9 ? 2 : 1);
    const old = books.reduce((m, b) => (!m || b.origYear < m.origYear ? b : m), null);
    c.subEl.textContent = "Bücher je Jahrzehnt der Erstveröffentlichung" + (old ? " · ältestes: " + old.short + " (" + old.origYear + ")" : "");
    setTable(c, ["Jahrzehnt", "Bücher"], bins.map((b) => [b.label, U.fmt(b.n)]));
  }

  // ---------- Meine Sterne vs. Goodreads-Schnitt ----------
  function ratingChart() {
    const c = cards.rating;
    const books = app.slice("rating").filter((b) => b.rating && b.avgRating);
    if (books.length < 3) {
      c.body.replaceChildren(U.el("p", { class: "vempty", text: "Zu wenige bewertete Bücher für einen Vergleich." }));
      c.subEl.textContent = "";
      setTable(c, ["Titel", "Meine", "Goodreads"], []);
      return;
    }
    const W = 320, H = 220, ml = 30, mr = 10, mt = 10, mb = 30;
    const xs = books.map((b) => b.avgRating);
    const x0 = Math.min(3, Math.floor(Math.min(...xs) * 2) / 2), x1 = Math.max(4.75, Math.ceil(Math.max(...xs) * 4) / 4);
    const X = (v) => ml + ((v - x0) / (x1 - x0)) * (W - ml - mr);
    const Y = (v) => mt + (1 - (v - 0.5) / 5) * (H - mt - mb);
    const n = books.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = books.reduce((a, b) => a + b.rating, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    books.forEach((b) => {
      sxy += (b.avgRating - mx) * (b.rating - my);
      sxx += (b.avgRating - mx) ** 2;
      syy += (b.rating - my) ** 2;
    });
    const r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
    const diff = my - mx;
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("class", "sc");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Streudiagramm: meine Bewertung gegen Goodreads-Durchschnitt, " + n + " Bücher");
    let s = "";
    for (let v = 1; v <= 5; v++) s += '<line class="sc__grid" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text class="sc__tick" x="' + (ml - 8) + '" y="' + (Y(v) + 3.5) + '" text-anchor="end">' + v + "★</text>";
    for (let v = Math.ceil(x0 * 2) / 2; v <= x1 + 1e-9; v += 0.5) s += '<text class="sc__tick" x="' + X(v) + '" y="' + (H - mb + 16) + '" text-anchor="middle">' + U.fmt1(v) + "</text>";
    const lx0 = Math.max(x0, 0.5), lx1 = Math.min(x1, 5.5);
    s += '<line class="sc__diag" x1="' + X(lx0) + '" y1="' + Y(lx0) + '" x2="' + X(lx1) + '" y2="' + Y(lx1) + '"/>';
    s += '<text class="sc__note" x="' + (X(lx1) - 4) + '" y="' + (Y(lx1) + 14) + '" text-anchor="end">gleiche Wertung</text>';
    s += '<text class="sc__axis" x="' + (W - mr) + '" y="' + (H - 2) + '" text-anchor="end">Goodreads-Schnitt →</text>';
    svg.innerHTML = s;
    books.forEach((b) => {
      const jy = (U.rng(b.seed)() - 0.5) * 0.36;
      const g = document.createElementNS(ns, "g");
      g.setAttribute("class", "sc__pt");
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", b.short + ": " + b.rating + " Sterne, Goodreads " + U.fmt2(b.avgRating));
      const cx = X(b.avgRating), cy = Y(b.rating + jy);
      g.innerHTML = '<circle class="sc__hit" cx="' + cx + '" cy="' + cy + '" r="11"/><circle class="sc__dot" cx="' + cx + '" cy="' + cy + '" r="4.5"/>';
      g.addEventListener("click", () => app.openBook(b.id));
      g.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), app.openBook(b.id)));
      bindTip(g, () => [b.short, b.author, { text: "Ich: " + "★".repeat(b.rating) + " · Goodreads Ø " + U.fmt2(b.avgRating) }]);
      svg.append(g);
    });
    c.body.replaceChildren(svg, U.el("p", { class: "sc__facts" },
      U.el("span", null, U.el("strong", { text: (diff >= 0 ? "+" : "−") + U.fmt2(Math.abs(diff)) + " ★" }), " im Schnitt " + (diff >= 0 ? "großzügiger" : "strenger") + " als Goodreads"),
      U.el("span", null, U.el("strong", { text: "r = " + U.fmt2(r) }), " Korrelation (n = " + n + ")")));
    c.subEl.textContent = "Jeder Punkt ein Buch – klicken zum Aufschlagen";
    setTable(c, ["Titel", "Meine Sterne", "Goodreads Ø"], books.slice().sort((a, b) => b.rating - a.rating || b.avgRating - a.avgRating)
      .map((b) => [b.short, String(b.rating), U.fmt2(b.avgRating)]));
  }

  // ---------- Aufbau ----------
  function init(container, appApi) {
    root = container;
    app = appApi;
    tip = U.el("div", { class: "vtip", role: "tooltip", hidden: true });
    document.body.append(tip);
    const seg = U.el("div", { class: "seg seg--sm", role: "group", "aria-label": "Maß" },
      U.el("button", { type: "button", "data-m": "count", text: "Bücher" }),
      U.el("button", { type: "button", "data-m": "pages", text: "Seiten" }));
    seg.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      metric = b.dataset.m;
      U.store.set("bs.stats.metric", metric);
      update();
    });
    card("years", "Lesejahre", "", { wide: true }).ctrl.append(seg);
    card("types", "Buchtypen", "Gebunden, Taschenbuch, E-Book oder Hörbuch");
    card("months", "Lesemonate", "Klick auf ein Feld sucht nach diesem Monat", { wide: true });
    card("genres", "Themen", "");
    card("pages", "Seitenzahl", "");
    card("pub", "Erscheinungsjahr", "");
    card("rating", "Meine Sterne vs. Goodreads", "");
    card("authors", "Meistgelesene Autor:innen", "Klick filtert nach Autor:in");
    root.append(U.el("div", { class: "kpis" }), U.el("div", { class: "vgridcards" },
      ["years", "types", "months", "genres", "pages", "pub", "rating", "authors"].map((id) => cards[id].el)));
    root.addEventListener("scroll", hideTip, { passive: true });
    window.addEventListener("scroll", hideTip, { passive: true });
  }

  function update() {
    if (!root || root.closest("[hidden]")) return;
    hideTip();
    const seg = U.$(".seg--sm", cards.years.el);
    U.$$("button", seg).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.m === metric)));
    kpis(app.slice(null));
    yearsChart();
    typesChart();
    monthsChart();
    genresChart();
    pagesChart();
    pubChart();
    ratingChart();
    authorsChart();
    Object.keys(cards).forEach(showMode);
  }

  BS.stats = { init, update, hideTip };
})();
