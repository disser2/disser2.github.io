/* Filmregal – Statistik: Kennzahlen und Diagramme zum aktuellen Filter.
   Jedes Diagramm zeigt die Filme unter allen *anderen* Filtern (Crossfilter)
   und hebt die eigene Auswahl hervor; ein Klick setzt bzw. löst den Filter.
   Jede Karte hat eine Tabellenansicht als zugängliche Alternative. */
(function () {
  "use strict";
  const FR = (window.FR = window.FR || {});
  const U = FR.util, M = FR.model;

  let root, tip, app;
  const ORDER = ["years", "types", "months", "genres", "rating", "runtime", "pub", "weekdays", "directors", "cast"];
  const cards = {};
  const tableMode = {};
  let metric = U.store.get("fr.stats.metric", "count"); // count | hours

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
  function kpis(films) {
    const seen = films.filter((b) => b.status === "watched");
    const s = M.summary(films);
    const years = {};
    seen.forEach((b) => b.watchYear != null && (years[b.watchYear] = (years[b.watchYear] || 0) + 1));
    const yk = Object.keys(years).map(Number);
    const span = yk.length ? Math.max(...yk) - Math.min(...yk) + 1 : 0;
    const now = new Date();
    // Laufendes Jahr nur anteilig zählen, sonst drückt es den Schnitt
    let yearsEff = span;
    if (yk.includes(now.getFullYear())) yearsEff = span - 1 + (now - new Date(now.getFullYear(), 0, 1)) / 31557600000;
    const perYear = yearsEff > 0 ? yk.reduce((a, y) => a + years[y], 0) / yearsEff : null;
    const directors = new Set(films.flatMap((b) => b.directors)).size;
    const timed = films.filter((b) => b.runtime);
    const longest = timed.reduce((m, b) => (!m || b.runtime > m.runtime ? b : m), null);
    const rated = films.filter((b) => b.rating);
    const best = rated.filter((b) => b.rating === 10).length;
    const rewatched = films.filter((b) => b.plays > 1).length;
    const tiles = [
      ["Filme", U.fmt(s.count), rewatched ? U.fmt(rewatched) + " davon mehrfach gesehen" : "im aktuellen Filter"],
      ["Stunden", s.runtime ? U.fmt(s.runtime / 60) : "–", s.runtime ? "≈ " + U.fmt1(s.runtime / 1440) + " Tage am Stück" : "Laufzeiten fehlen noch"],
      ["Ø Laufzeit", timed.length ? U.fmt(s.runtime / timed.length) + " min" : "–",
        longest ? "längster: " + longest.short + " (" + U.fmtDur(longest.runtime) + ")" : ""],
      ["Ø Bewertung", s.avgRating ? U.fmt2(s.avgRating) : "–", rated.length ? U.fmt(rated.length) + " bewertet" + (best ? " · " + best + "× die 10" : "") : "keine Bewertungen"],
      ["Filme pro Jahr", perYear ? U.fmt1(perYear) : "–", span ? "über " + span + (span === 1 ? " Jahr" : " Jahre") + " mit Datum" : "ohne Datum"],
      ["Regisseur:innen", directors ? U.fmt(directors) : "–", directors ? U.fmt1(films.filter((b) => b.director).length / directors) + " Filme je Person" : "Angaben fehlen noch"],
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

  // ---------- Filmjahre als Hüllenstapel ----------
  function yearsChart() {
    const c = cards.years;
    const films = app.slice("years").filter((b) => b.status === "watched");
    const sel = app.filters.years;
    const withYear = films.filter((b) => b.watchYear != null);
    const none = films.length - withYear.length;
    if (!withYear.length) {
      c.body.replaceChildren(U.el("p", { class: "vempty", text: "Keine Filme mit Datum im aktuellen Filter." }));
      setTable(c, ["Jahr", "Filme", "Stunden"], []);
      c.subEl.textContent = "";
      return;
    }
    const ys = withYear.map((b) => b.watchYear);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const cols = [];
    for (let y = y0; y <= y1; y++) cols.push({ y, films: [] });
    withYear.forEach((b) => cols[b.watchYear - y0].films.push(b));
    const hours = metric === "hours";
    const val = (b) => (hours ? (b.runtime || 0) / 60 : 1);
    cols.forEach((col) => {
      col.films.sort((a, b) => M.TYPE[a.type].order - M.TYPE[b.type].order || (a.watched || 0) - (b.watched || 0));
      col.total = col.films.reduce((a, b) => a + val(b), 0);
      col.runtime = col.films.reduce((a, b) => a + (b.runtime || 0), 0);
    });
    const ticks = niceTicks(Math.max(1, ...cols.map((x) => x.total)), 4);
    const top = ticks[ticks.length - 1] || 1;
    c.subEl.textContent = (hours ? "Stunden" : "Filme") + " je Jahr – jeder Block ist ein Film, die Farbe seine Ära" +
      (none ? " · " + none + " ohne Datum nicht dargestellt" : "");

    let wrap = c.body.querySelector(".ys");
    if (!wrap) {
      wrap = U.el("div", { class: "ys" }, U.el("div", { class: "ys__plot" }), U.el("div", { class: "ys__axis" }));
      c.body.replaceChildren(wrap, legend(M.TYPES));
    }
    const plot = wrap.firstChild, axis = wrap.lastChild;
    const g = grid(ticks);
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
        n.setAttribute("aria-label", col.y + ": " + col.films.length + " Filme" + (col.runtime ? ", " + U.fmtHours(col.runtime) : "") + (sel.has(String(col.y)) ? " (ausgewählt)" : ""));
        n.firstChild.textContent = col.total ? U.fmt(col.total) : "";
        n.firstChild.style.bottom = (col.total / top) * 100 + "%";
        const stack = n.lastChild;
        stack.style.height = (col.total / top) * 100 + "%";
        U.reconcile(stack, col.films, (b) => b.id,
          () => U.el("span", { class: "ys__slab" }),
          (s, b) => {
            s.style.flexGrow = Math.max(val(b), hours ? 0.01 : 0);
            s.style.background = "var(--t-" + b.type + ")";
            bindTip(s, () => [b.short, [b.year, b.runtime ? U.fmtDur(b.runtime) : null, b.rating ? "★ " + b.rating : null].filter(Boolean).join(" · "),
              { text: col.y + ": " + col.films.length + " Filme" + (col.runtime ? " · " + U.fmtHours(col.runtime) : "") }]);
          });
      });
    // Achsenbeschriftung: bei vielen Jahren nur jedes zweite
    const step = cols.length > 16 ? 2 : 1;
    U.reconcile(axis, cols, (x) => x.y, () => U.el("span"), (n, col) => {
      n.textContent = (col.y - y0) % step === 0 ? (cols.length > 10 ? "’" + String(col.y).slice(2) : String(col.y)) : "";
    });
    axis.style.setProperty("--n", cols.length);
    setTable(c, ["Jahr", "Filme", "Stunden"].concat(M.TYPES.map((t) => t.short)),
      cols.map((col) => [String(col.y), U.fmt(col.films.length), col.runtime ? U.fmt(col.runtime / 60) : "–"]
        .concat(M.TYPES.map((t) => U.fmt(col.films.filter((b) => b.type === t.key).length)))));
  }

  function legend(types) {
    return U.el("div", { class: "vlegend" }, types.map((t) =>
      U.el("span", { class: "vlegend__item" }, U.el("i", { style: "background:var(--t-" + t.key + ")" }), t.label)));
  }

  // ---------- Ären (Anteile) ----------
  function typesChart() {
    const c = cards.types;
    const films = app.slice("types");
    const sel = app.filters.types;
    const rows = M.TYPES.map((t) => ({ t, n: films.filter((b) => b.type === t.key).length })).filter((r) => r.n);
    const total = films.length || 1;
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
    setTable(c, ["Ära", "Filme", "Anteil"], rows.map((r) => [r.t.label, U.fmt(r.n), Math.round((r.n / total) * 100) + " %"]));
  }

  // ---------- Filmmonate (Heatmap) ----------
  function monthsChart() {
    const c = cards.months;
    const films = app.slice("years").filter((b) => b.watched);
    const sel = app.filters.years;
    if (!films.length) {
      c.body.replaceChildren(U.el("p", { class: "vempty", text: "Keine Filme mit Datum im aktuellen Filter." }));
      setTable(c, ["Jahr"], []);
      return;
    }
    const ys = films.map((b) => b.watchYear);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const cells = {};
    films.forEach((b) => {
      const k = b.watchYear + "-" + b.watchMonth;
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
          "aria-label": U.MONTHS_LONG[m] + " " + y + ": " + list.length + " Filme" });
        if (list.length) {
          cell.addEventListener("click", () => app.setQuery("gesehen:" + y + "-" + String(m + 1).padStart(2, "0")));
          bindTip(cell, () => [U.MONTHS_LONG[m] + " " + y + " · " + list.length + (list.length === 1 ? " Film" : " Filme")]
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

  // ---------- Horizontale Balken (Genres, Regie, Besetzung) ----------
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
      bindTip(n, () => [{ text: U.fmt(r.n) + (r.n === 1 ? " Film" : " Filme") + (r.avg ? " · Ø " + U.fmt1(r.avg) + " / 10" : "") }, { text: r.label }]);
    });
  }

  function genresChart() {
    const c = cards.genres;
    const films = app.slice("genres");
    const sel = app.filters.genres;
    const m = {};
    films.forEach((b) => b.themes.forEach((k) => {
      const e = (m[k] = m[k] || { key: k, label: M.GENRE[k].label, n: 0, sum: 0, rated: 0 });
      e.n++;
      if (b.rating) {
        e.sum += b.rating;
        e.rated++;
      }
    }));
    const rows = Object.values(m).map((e) => Object.assign(e, { avg: e.rated ? e.sum / e.rated : null }))
      .sort((a, b) => b.n - a.n || M.GENRE[a.key].order - M.GENRE[b.key].order).slice(0, 16);
    hbars(c, rows, sel, (k) => app.toggleFacet("genres", k), (r) => M.GENRE[r.key].pal[0]);
    c.subEl.textContent = rows.length === 1 && rows[0].key === "none"
      ? "Genres kommen aus Wikidata – sie erscheinen, sobald die Anreicherung gelaufen ist"
      : "Ein Film kann mehrere Genres haben · Punkt = typische Hüllenfarbe im Regal";
    setTable(c, ["Genre", "Filme", "Ø Bewertung"], rows.map((r) => [r.label, U.fmt(r.n), r.avg ? U.fmt1(r.avg) : "–"]));
  }

  // Personen: Regie (Facette) und Besetzung (Suche)
  function people(c, films, of, sel, onClick, head, emptyText) {
    const m = {};
    films.forEach((b) => of(b).forEach((name) => {
      const e = (m[name] = m[name] || { key: name, label: name, n: 0, sum: 0, rated: 0 });
      e.n++;
      if (b.rating) {
        e.sum += b.rating;
        e.rated++;
      }
    }));
    const rows = Object.values(m).map((e) => Object.assign(e, { avg: e.rated ? e.sum / e.rated : null }))
      .sort((a, b) => b.n - a.n || (b.avg || 0) - (a.avg || 0) || a.label.localeCompare(b.label, "de")).slice(0, 10);
    if (!rows.length) {
      c.body.replaceChildren(U.el("p", { class: "vempty", text: emptyText }));
      setTable(c, [head, "Filme", "Ø Bewertung"], []);
      return;
    }
    hbars(c, rows, sel, onClick, null);
    setTable(c, [head, "Filme", "Ø Bewertung"], rows.map((r) => [r.label, U.fmt(r.n), r.avg ? U.fmt1(r.avg) : "–"]));
  }
  function directorsChart() {
    people(cards.directors, app.slice("directors"), (b) => b.directors, app.filters.directors,
      (k) => app.toggleFacet("directors", k), "Regie", "Noch keine Angaben zur Regie – sie kommen aus Wikidata.");
  }
  function castChart() {
    const q = app.filters.q;
    const sel = new Set((q.match(/mit:"([^"]+)"/g) || []).map((x) => x.slice(5, -1)));
    people(cards.cast, app.slice("q"), (b) => b.cast, sel, (k) => {
      const tok = 'mit:"' + k + '"';
      app.setQuery(q.includes(tok) ? q.replace(tok, "").replace(/\s+/g, " ").trim() : (q + " " + tok).trim());
    }, "Schauspieler:in", "Noch keine Angaben zur Besetzung – sie kommen aus Wikidata.");
  }

  // ---------- Säulen (Laufzeit, Jahrzehnt, Bewertung, Wochentag) ----------
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
      n.setAttribute("aria-label", bin.label + ": " + bin.n + " Filme");
      bindTip(n, () => [{ text: U.fmt(bin.n) + (bin.n === 1 ? " Film" : " Filme") }, { text: bin.label }]);
    });
    const axis = wrap.lastChild;
    axis.style.setProperty("--n", bins.length);
    U.reconcile(axis, bins, (b) => b.key, () => U.el("span"), (n, bin) => (n.textContent = bin.tick));
    U.$$("span", axis).forEach((s, i) => (s.style.visibility = i % (labelEvery || 1) === 0 ? "" : "hidden"));
  }

  function runtimeChart() {
    const c = cards.runtime;
    const films = app.slice("runtime").filter((b) => b.runtime);
    const [lo, hi] = app.filters.runtime;
    if (!films.length) {
      c.body.replaceChildren(U.el("p", { class: "vempty", text: "Noch keine Laufzeiten – sie kommen aus Wikidata." }));
      c.subEl.textContent = "";
      setTable(c, ["Laufzeit", "Filme"], []);
      return;
    }
    // unter 80 · 80–89 · … · 170–179 · ab 180 Minuten
    const bins = [{ key: "r0", lo: null, hi: 79, n: 0, tick: "<80", label: "unter 80 Minuten" }];
    for (let v = 80; v < 180; v += 10) bins.push({ key: "r" + v, lo: v, hi: v + 9, n: 0, tick: String(v), label: v + "–" + (v + 9) + " Minuten" });
    bins.push({ key: "r180", lo: 180, hi: null, n: 0, tick: "180+", label: "ab 180 Minuten" });
    films.forEach((b) => bins[b.runtime < 80 ? 0 : Math.min(11, Math.floor((b.runtime - 80) / 10) + 1)].n++);
    const active = lo != null || hi != null;
    const isSel = (bin) => active && (lo == null || (bin.lo != null && bin.lo >= lo)) && (hi == null || (bin.hi != null && bin.hi <= hi));
    columns(c, bins, isSel, (bin) => {
      if (active && lo === bin.lo && hi === bin.hi) app.setRange("runtime", null, null);
      else app.setRange("runtime", bin.lo, bin.hi);
    }, innerWidth < 500 ? 2 : 1);
    const sorted = films.map((b) => b.runtime).sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    c.subEl.textContent = "Filme je 10 Minuten · Median " + U.fmtDur(med);
    setTable(c, ["Laufzeit", "Filme"], bins.map((b) => [b.label, U.fmt(b.n)]));
  }

  function pubChart() {
    const c = cards.pub;
    const films = app.slice("pub").filter((b) => b.year != null);
    const [lo, hi] = app.filters.pub;
    if (!films.length) {
      c.body.replaceChildren(U.el("p", { class: "vempty", text: "Keine Erscheinungsjahre im aktuellen Filter." }));
      return;
    }
    const decs = films.map((b) => Math.floor(b.year / 10) * 10);
    const d0 = Math.min(...decs), d1 = Math.max(...decs);
    const bins = [];
    for (let d = d0; d <= d1; d += 10)
      bins.push({ key: "d" + d, lo: d, hi: d + 9, n: 0, tick: "’" + String(d).slice(2), label: d + "er" });
    decs.forEach((d) => bins[(d - d0) / 10].n++);
    const active = lo != null || hi != null;
    const isSel = (bin) => active && (lo == null || bin.lo >= lo) && (hi == null || bin.hi <= hi);
    columns(c, bins, isSel, (bin) => {
      if (active && lo === bin.lo && hi === bin.hi) app.setRange("pub", null, null);
      else app.setRange("pub", bin.lo, bin.hi);
    }, bins.length > 9 ? 2 : 1);
    const old = films.reduce((m, b) => (!m || b.year < m.year ? b : m), null);
    c.subEl.textContent = "Filme je Jahrzehnt" + (old ? " · ältester: " + old.short + " (" + old.year + ")" : "");
    setTable(c, ["Jahrzehnt", "Filme"], bins.map((b) => [b.label, U.fmt(b.n)]));
  }

  // ---------- Meine Bewertungen (1–10) ----------
  function ratingChart() {
    const c = cards.rating;
    const all = app.slice("rating");
    const films = all.filter((b) => b.rating);
    const min = app.filters.rating;
    if (!films.length) {
      c.body.replaceChildren(U.el("p", { class: "vempty", text: "Keine bewerteten Filme im aktuellen Filter." }));
      c.subEl.textContent = "";
      setTable(c, ["Bewertung", "Filme"], []);
      return;
    }
    const bins = [];
    for (let v = 1; v <= 10; v++) bins.push({ key: "s" + v, v, n: 0, tick: String(v), label: v + " / 10 · " + M.RATING_TEXT[v] });
    films.forEach((b) => bins[b.rating - 1].n++);
    columns(c, bins, (bin) => min > 0 && bin.v >= min, (bin) => app.setRating(min === bin.v ? 0 : bin.v), 1);
    const avg = films.reduce((a, b) => a + b.rating, 0) / films.length;
    const sorted = films.map((b) => b.rating).sort((a, b) => a - b);
    c.subEl.textContent = "Ø " + U.fmt2(avg) + " · Median " + sorted[Math.floor(sorted.length / 2)] +
      (all.length - films.length ? " · " + (all.length - films.length) + " ohne Bewertung" : "") + " · Klick filtert „ab …“";
    setTable(c, ["Bewertung", "Filme"], bins.map((b) => [b.label, U.fmt(b.n)]));
  }

  // ---------- Wochentage ----------
  function weekdaysChart() {
    const c = cards.weekdays;
    const films = app.slice("q").filter((b) => b.watches.length);
    const q = app.filters.q;
    const cur = (q.match(/(?:^|\s)tag:(\S+)/) || [])[1];
    // Montag zuerst
    const bins = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ key: "w" + d, d, n: 0, tick: M.WEEKDAYS[d], label: M.WEEKDAYS_LONG[d] }));
    let total = 0;
    films.forEach((b) => b.watches.forEach((d) => {
      bins[(d.getDay() + 6) % 7].n++;
      total++;
    }));
    if (!total) {
      c.body.replaceChildren(U.el("p", { class: "vempty", text: "Keine Filme mit Datum im aktuellen Filter." }));
      c.subEl.textContent = "";
      setTable(c, ["Wochentag", "Sichtungen"], []);
      return;
    }
    const tokOf = (bin) => "tag:" + bin.label.toLowerCase();
    columns(c, bins, (bin) => !!cur && bin.label.toLowerCase().startsWith(cur.toLowerCase()), (bin) => {
      const rest = q.replace(/(?:^|\s)tag:\S+/g, " ").replace(/\s+/g, " ").trim();
      app.setQuery(cur && bin.label.toLowerCase().startsWith(cur.toLowerCase()) ? rest : (rest + " " + tokOf(bin)).trim());
    }, 1);
    const weekend = bins.filter((b) => b.d === 0 || b.d === 6 || b.d === 5).reduce((a, b) => a + b.n, 0);
    c.subEl.textContent = U.fmt(total) + " Sichtungen mit Datum · " + Math.round((weekend / total) * 100) + " % von Freitag bis Sonntag";
    setTable(c, ["Wochentag", "Sichtungen"], bins.map((b) => [b.label, U.fmt(b.n)]));
  }

  // ---------- Aufbau ----------
  function init(container, appApi) {
    root = container;
    app = appApi;
    tip = U.el("div", { class: "vtip", role: "tooltip", hidden: true });
    document.body.append(tip);
    const seg = U.el("div", { class: "seg seg--sm", role: "group", "aria-label": "Maß" },
      U.el("button", { type: "button", "data-m": "count", text: "Filme" }),
      U.el("button", { type: "button", "data-m": "hours", text: "Stunden" }));
    seg.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      metric = b.dataset.m;
      U.store.set("fr.stats.metric", metric);
      update();
    });
    card("years", "Filmjahre", "", { wide: true }).ctrl.append(seg);
    card("types", "Ären", "Die Hülle richtet sich nach dem Erscheinungsjahr");
    card("months", "Filmmonate", "Klick auf ein Feld sucht nach diesem Monat", { wide: true });
    card("genres", "Genres", "");
    card("rating", "Meine Bewertungen", "");
    card("runtime", "Laufzeit", "");
    card("pub", "Erscheinungsjahr", "");
    card("weekdays", "Wochentage", "");
    card("directors", "Meistgesehene Regie", "Klick filtert nach Regisseur:in");
    card("cast", "Meistgesehene Gesichter", "Klick sucht nach der Person");
    root.append(U.el("div", { class: "kpis" }), U.el("div", { class: "vgridcards" },
      ORDER.map((id) => cards[id].el)));
    root.addEventListener("scroll", hideTip, { passive: true });
    window.addEventListener("scroll", hideTip, { passive: true });
  }

  function update() {
    if (!root || root.closest("[hidden]")) return;
    hideTip();
    const seg = U.$(".seg--sm", cards.years.el);
    U.$$("button", seg).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.m === metric)));
    if (metric === "hours" && !app.films().some((b) => b.runtime)) metric = "count";
    kpis(app.slice(null));
    yearsChart();
    typesChart();
    monthsChart();
    genresChart();
    ratingChart();
    runtimeChart();
    pubChart();
    weekdaysChart();
    directorsChart();
    castChart();
    Object.keys(cards).forEach(showMode);
  }

  FR.stats = { init, update, hideTip };
})();
