/* Filmregal – das Regal: Bretter füllen, Hüllen per FLIP an ihren neuen Platz
   hüpfen lassen, Rücken ↔ Cover drehen, Deko & angelehnte Hüllen */
(function () {
  "use strict";
  const FR = (window.FR = window.FR || {});
  const U = FR.util, M = FR.model, S = FR.spine;

  const COVER_SCALE = 0.82;
  const PAD = 18; // Innenabstand je Brettseite (× k)
  const GAP = { spine: 1, cover: 18 };
  const DIV_W = 32, DIV_GAP = 19; // Trennkarte + Abstände (× k)

  // Deko: Popcorn, Filmklappe, Filmrolle, Pflanze, schlafende Katze …
  const DECOR = {
    plant: [70, 112, '<svg viewBox="0 0 70 112"><g class="dc-sway"><path d="M35 72C21 56 9 41 6 21c13 9 25 27 29 51z" fill="#2f8f83"/><path d="M35 72c3-21 9-41 23-58 2 21-8 41-23 58z" fill="#3aa597"/><path d="M35 72c-7-20-9-41-2-66 9 20 9 44 2 66z" fill="#257a70"/><path d="M35 74C22 68 10 63 2 52c14-2 26 6 33 22z" fill="#1f6f69"/><path d="M35 74c13-8 23-12 33-24-14-2-26 8-33 24z" fill="#2f8f83"/></g><path d="M14 74h42l-5 37H19z" fill="#5b3fa8"/><path d="M35 74h21l-5 37H35z" fill="#c2457a" opacity=".5"/><rect x="11" y="70" width="48" height="8" rx="2" fill="#6e52c0"/></svg>'],
    cactus: [40, 70, '<svg viewBox="0 0 40 70"><rect x="15" y="8" width="11" height="42" rx="5.5" fill="#3aa597"/><path d="M15 30h-5a4 4 0 0 1-4-4v-8" stroke="#3aa597" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M26 24h4a4 4 0 0 0 4-4v-6" stroke="#2f8f83" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="20" cy="7" r="3" fill="#e2689a"/><path d="M8 48h24l-3 21H11z" fill="#d4507f"/><rect x="6" y="45" width="28" height="6" rx="2" fill="#e2689a"/></svg>'],
    mug: [46, 72, '<svg viewBox="0 0 46 72"><path class="dc-steam" d="M15 28c-4-5 4-8 0-13s2-7 0-11" stroke="#b9aee0" stroke-width="2" fill="none" stroke-linecap="round"/><path class="dc-steam dc-steam--2" d="M24 28c-4-5 4-8 0-13s2-7 0-11" stroke="#b9aee0" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M32 42h4a7 7 0 0 1 0 14h-4" fill="none" stroke="#3b2a8f" stroke-width="4"/><rect x="5" y="34" width="28" height="36" rx="5" fill="#3b2a8f"/><path d="M20 34h8a5 5 0 0 1 5 5v26a5 5 0 0 1-5 5h-8z" fill="#5b3fa8"/><ellipse cx="19" cy="35" rx="14" ry="2.6" fill="#24195e"/></svg>'],
    cat: [124, 60, '<svg viewBox="0 0 124 60"><path class="dc-tail" d="M100 50c15 0 20-14 9-21" stroke="#3d3a6b" stroke-width="7" fill="none" stroke-linecap="round"/><g class="dc-breathe"><ellipse cx="68" cy="43" rx="40" ry="16" fill="#3d3a6b"/><ellipse cx="80" cy="36" rx="20" ry="7" fill="#4a467d" opacity=".7"/><ellipse cx="54" cy="48" rx="18" ry="8" fill="#f3eefe"/></g><circle cx="32" cy="37" r="15" fill="#3d3a6b"/><path d="M19 28l2-15 9 11z" fill="#3d3a6b"/><path d="M35 23l9-11v16z" fill="#3d3a6b"/><path d="M21 26l1-8 5 6z" fill="#c2457a" opacity=".75"/><path d="M24 38q3 2.5 6 0M35 38q3 2.5 6 0" stroke="#f3eefe" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="32.5" cy="44" rx="6" ry="4" fill="#f3eefe"/><path d="M31 42.5l1.5 1.2 1.5-1.2" stroke="#c2457a" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M26 45l-9 1M26 47l-8 3M39 45l9 1M39 47l8 3" stroke="#f3eefe" stroke-width=".8" opacity=".7"/><text class="dc-z" x="44" y="16" fill="#8b7ff0" font-size="11" font-family="Fraunces,Georgia,serif" font-style="italic">z</text><text class="dc-z dc-z--2" x="52" y="9" fill="#e2689a" font-size="8" font-family="Fraunces,Georgia,serif" font-style="italic">z</text></svg>'],
    pig: [62, 58, '<svg viewBox="0 0 62 58"><ellipse cx="31" cy="40" rx="25" ry="17" fill="#f2a7b8"/><ellipse cx="18" cy="52" rx="6" ry="3.5" fill="#ec93a8"/><ellipse cx="44" cy="52" rx="6" ry="3.5" fill="#ec93a8"/><circle cx="31" cy="25" r="16" fill="#f5b5c4"/><path d="M17 14l-2-11 10 7zM45 14l2-11-10 7z" fill="#ec93a8"/><ellipse cx="31" cy="30" rx="7.5" ry="5.2" fill="#ea8ea4"/><circle cx="28.4" cy="30" r="1.4" fill="#b5577a"/><circle cx="33.6" cy="30" r="1.4" fill="#b5577a"/><path d="M21 22q2.6 2 5.2 0M35.8 22q2.6 2 5.2 0" stroke="#7a3550" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M26 37q5 3.4 10 0" stroke="#b5577a" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="20" cy="29" r="2.6" fill="#ef8fa8" opacity=".6"/><circle cx="42" cy="29" r="2.6" fill="#ef8fa8" opacity=".6"/></svg>'],
    candle: [28, 70, '<svg viewBox="0 0 28 70"><circle class="dc-glow" cx="14" cy="14" r="13" fill="#ffd38a" opacity=".35"/><path class="dc-flame" d="M14 5c4 6 5 9 0 14-5-5-4-8 0-14z" fill="#ffb347"/><path d="M14 11c2 3 2 5 0 7-2-2-2-4 0-7z" fill="#fff1c9"/><rect x="13.3" y="18" width="1.4" height="5" fill="#3b2a3f"/><rect x="7" y="22" width="14" height="38" rx="2" fill="#f6ead7"/><rect x="14" y="22" width="7" height="38" rx="2" fill="#e8d6bd"/><path d="M2 60h24l-3 8H5z" fill="#c2457a"/></svg>'],
    popcorn: [52, 84, '<svg viewBox="0 0 52 84"><g fill="#fff3d6"><circle cx="13" cy="26" r="8"/><circle cx="26" cy="20" r="9.5"/><circle cx="39" cy="26" r="8"/><circle cx="19" cy="15" r="6.5"/><circle cx="33" cy="13" r="7"/><circle cx="26" cy="30" r="8"/></g><g fill="#f2cf7a"><circle cx="17" cy="23" r="2.6"/><circle cx="31" cy="19" r="2.6"/><circle cx="38" cy="28" r="2.2"/><circle cx="24" cy="12" r="2"/></g><path d="M5 30h42l-5 53H10z" fill="#f6ead7"/><path d="M5 30h7l3 53h-5zM19.5 30h6.5v53h-5zM33 30h7l-3 53h-5.5z" fill="#d4507f"/><path d="M40 30h7l-5 53h-5z" fill="#c2457a"/><rect x="3" y="27" width="46" height="6" rx="2" fill="#e2689a"/></svg>'],
    clapper: [78, 66, '<svg viewBox="0 0 78 66"><g class="dc-clap"><path d="M5 22L70 6l3 11L8 33z" fill="#2a2233"/><path d="M14 20l9-2 5 10-9 2zM32 15.5l9-2 5 10-9 2zM50 11l9-2 5 10-9 2z" fill="#f3eefe"/></g><rect x="6" y="32" width="68" height="33" rx="3" fill="#2a2233"/><path d="M12 33l8 0-6 9-8 0zM30 33l8 0-6 9-8 0zM48 33l8 0-6 9-8 0zM66 33l8 0 0 3-4 6-8 0z" fill="#f3eefe"/><path d="M12 49h56M12 56h34" stroke="#8b7ff0" stroke-width="2" stroke-linecap="round"/><circle cx="8" cy="31" r="3" fill="#57507a"/></svg>'],
    reel: [70, 76, '<svg viewBox="0 0 70 76"><path d="M35 70h30v5H12" fill="none" stroke="#3b2a3f" stroke-width="3" stroke-linecap="round"/><g class="dc-spin"><circle cx="35" cy="38" r="33" fill="#57507a"/><circle cx="35" cy="38" r="33" fill="none" stroke="#3a3550" stroke-width="3"/><g fill="#241f40"><circle cx="35" cy="19" r="8.5"/><circle cx="35" cy="57" r="8.5"/><circle cx="16" cy="38" r="8.5"/><circle cx="54" cy="38" r="8.5"/></g><circle cx="35" cy="38" r="4.5" fill="#e3a857"/></g></svg>'],
    tapes: [96, 50, '<svg viewBox="0 0 96 50"><rect x="6" y="33" width="86" height="16" rx="2" fill="#2a2233"/><rect x="14" y="37" width="46" height="8" rx="1" fill="#f3e9d2"/><path d="M18 41h30" stroke="#d4507f" stroke-width="2"/><rect x="2" y="17" width="84" height="16" rx="2" fill="#3a3550"/><rect x="10" y="21" width="40" height="8" rx="1" fill="#f3e9d2"/><path d="M14 25h22" stroke="#2f8f83" stroke-width="2"/><rect x="10" y="1" width="80" height="16" rx="2" fill="#241f40"/><rect x="18" y="5" width="44" height="8" rx="1" fill="#f3e9d2"/><path d="M22 9h28" stroke="#5b4bc4" stroke-width="2"/></svg>'],
    bookend: [18, 128, '<svg viewBox="0 0 18 128"><path d="M2 4h6v116h8v6H2z" fill="#3a3550"/><path d="M5 4h3v116H5z" fill="#57507a"/></svg>'],
  };
  const DECOR_POOL = ["popcorn", "clapper", "reel", "tapes", "plant", "mug", "cactus", "popcorn", "candle", "bookend"];

  let caseEl, ghostEl, tipEl;
  const nodes = new Map(); // id → Element (wird wiederverwendet, damit FLIP funktioniert)
  let byId = new Map();
  let mode = "spine";
  let lastGroups = [], lastGrouped = false, lastShare = false, lastWidth = 0;
  let onOpen = () => {}, onGroup = () => {};
  let io = null;

  function init(container, opts) {
    caseEl = container;
    onOpen = opts.onOpen || onOpen;
    onGroup = opts.onGroup || onGroup;
    ghostEl = U.el("div", { class: "case__ghosts", "aria-hidden": "true" });
    tipEl = U.el("div", { class: "filmtip", role: "tooltip", hidden: true });
    document.body.append(tipEl);
    caseEl.addEventListener("click", (e) => {
      const dv = e.target.closest(".divider");
      if (dv) return onGroup(dv.dataset.gkey);
      const el = e.target.closest(".bk");
      if (!el || el.classList.contains("bk--ghost")) return;
      hideTip();
      const b = byId.get(el.dataset.id);
      if (b) onOpen(b, el);
    });
    caseEl.addEventListener("keydown", onKey);
    caseEl.addEventListener("pointerover", onOver);
    caseEl.addEventListener("pointerout", (e) => {
      if (!e.relatedTarget || !e.relatedTarget.closest || e.relatedTarget.closest(".bk") !== e.target.closest(".bk")) hideTip();
    });
    caseEl.addEventListener("focusin", (e) => {
      const el = e.target.closest(".bk");
      if (el && el.matches(":focus-visible")) showTip(el, 0);
    });
    caseEl.addEventListener("focusout", hideTip);
    window.addEventListener("scroll", hideTip, { passive: true });
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const b = byId.get(en.target.dataset.id);
          if (b) S.attachCover(en.target.querySelector(".cv"), b, "M");
          io.unobserve(en.target);
        }
      }, { rootMargin: "400px 0px" });
    }
  }

  function setFilms(films) {
    byId = new Map(films.map((b) => [b.id, b]));
    for (const id of [...nodes.keys()]) if (!byId.has(id)) nodes.delete(id);
  }

  function ariaLabel(b) {
    const parts = [b.short];
    if (b.director) parts.push("Regie " + b.director);
    if (b.year != null) parts.push("erschienen " + b.year);
    if (b.runtime) parts.push(b.runtime + " Minuten");
    if (b.watched) parts.push("gesehen " + U.fmtMonth(b.watched));
    if (b.rating) parts.push(b.rating + " von 10 Punkten");
    return parts.join(", ");
  }

  function filmEl(b) {
    let el = nodes.get(b.id);
    if (el) return el;
    el = document.createElement("button");
    el.type = "button";
    el.className = "bk bk--" + b.type + (b.status === "watchlist" ? " bk--todo" : "");
    el.dataset.id = b.id;
    el.style.cssText = S.styleVars(b);
    el.innerHTML = '<span class="bk__body">' + S.spineHTML(b) + S.coverHTML(b) + "</span>";
    el.setAttribute("aria-label", ariaLabel(b));
    nodes.set(b.id, el);
    return el;
  }

  // Nach der Wikidata-Anreicherung: Farben/Stil/Maße nachziehen
  function refreshFilm(b, prevVis) {
    const el = nodes.get(b.id);
    if (!el) return false;
    const v = b.vis;
    const sizeChanged = !prevVis || prevVis.w !== v.w;
    const lookChanged = !prevVis || prevVis.style !== v.style || prevVis.font !== v.font ||
      prevVis.cover !== v.cover || prevVis.wrap !== v.wrap;
    el.style.cssText = S.styleVars(b);
    el.setAttribute("aria-label", ariaLabel(b));
    if (lookChanged) {
      el.querySelector(".bk__body").innerHTML = S.spineHTML(b) + S.coverHTML(b);
      if (mode === "cover" && io) io.observe(el);
    } else if (mode === "cover" && io && !el.querySelector(".cv__img")) io.observe(el);
    return sizeChanged;
  }

  const scaleFor = (W) => U.clamp(W / 1000, 0.74, 1);
  const widthOf = (b, k) =>
    mode === "cover" ? b.vis.h * COVER_SCALE * b.vis.ratio * k + GAP.cover * k : b.vis.w * k + GAP.spine;

  function inView(r, margin) {
    margin = margin || 80;
    return r.bottom > -margin && r.top < innerHeight + margin && r.right > -margin && r.left < innerWidth + margin;
  }

  function snapshot() {
    const m = new Map();
    for (const [id, el] of nodes) {
      if (!el.isConnected) continue;
      const r = el.getBoundingClientRect();
      if (r.width) m.set(id, r);
    }
    return m;
  }

  function stopAnims(el) {
    for (const a of el.getAnimations()) if (!a.id || a.id !== "keep") a.cancel();
  }

  // ---------- Bretter füllen ----------
  // share: kleine Gruppen teilen sich ein Brett, getrennt durch Trennkarten
  // (beim Jahr nicht – dort ist ein Brett pro Jahr die Zeitachse)
  function build(groups, grouped, share) {
    const W = caseEl.clientWidth;
    lastWidth = W;
    const k = scaleFor(W);
    caseEl.style.setProperty("--k", k.toFixed(3));
    const avail = W - 2 * PAD * k - 2;
    const divW = share ? (DIV_W + DIV_GAP) * k : 0;
    const rows = [];
    let row = null;
    for (const g of groups) {
      if (share && row && row.items.length) {
        const gw = g.films.reduce((a, b) => a + widthOf(b, k), divW);
        if (row.used + gw <= avail) {
          row.parts.push({ g, start: row.items.length });
          g.films.forEach((b) => row.items.push(b));
          row.used += gw;
          continue;
        }
      }
      if (row && row.items.length) rows.push(row);
      row = { g, first: true, items: [], used: divW, parts: [{ g, start: 0 }] };
      for (const b of g.films) {
        const bw = widthOf(b, k);
        if (row.items.length && row.used + bw > avail) {
          rows.push(row);
          row = { g, first: false, items: [], used: divW, parts: [{ g, start: 0 }] };
        }
        row.items.push(b);
        row.used += bw;
      }
    }
    if (row && row.items.length) rows.push(row);

    const frag = document.createDocumentFragment();
    let catPlaced = false, pigPlaced = false;
    rows.forEach((row, ri) => {
      const sharedRow = row.parts.length > 1;
      if (grouped && row.first && !sharedRow) frag.append(groupHead(row.g));
      const shelf = U.el("div", { class: "shelf" + (row.first ? " shelf--first" : "") });
      const rowEl = U.el("div", { class: "shelf__row" });
      for (let i = 0; i < row.items.length; i++) {
        const b = row.items[i];
        if (sharedRow) {
          const part = row.parts.find((p) => p.start === i);
          if (part) rowEl.append(divider(part.g, i === 0));
        }
        const el = filmEl(b);
        el.classList.remove("bk--ghost", "bk--lean");
        el.style.removeProperty("margin-left");
        el.style.removeProperty("--lean");
        rowEl.append(el);
        if (mode === "cover" && io && !el.querySelector(".cv__img")) io.observe(el);
      }
      let left = avail - row.used + (sharedRow ? 0 : divW);
      const last = row.items[row.items.length - 1];
      const r = U.rng(U.hash32(row.g.key + "|" + ri + "|" + mode + "|" + row.items.length));
      // Letzte Hülle anlehnen, wenn Platz ist (Kippen um die untere linke Ecke)
      if (mode === "spine" && last && row.items.length > 1 && left > 70 * k && last.vis.lean < 0.55) {
        const deg = 5 + last.vis.lean * 9;
        const m = last.vis.h * k * Math.sin((deg * Math.PI) / 180);
        if (left > m + 16 * k) {
          const el = nodes.get(last.id);
          el.classList.add("bk--lean");
          el.style.setProperty("--lean", (-deg).toFixed(1) + "deg");
          el.style.marginLeft = m.toFixed(1) + "px";
          left -= m;
        }
      }
      // Deko in die Lücke: ggf. Buchstütze direkt an den Hüllen, dann ein
      // Hauptstück (einmalig Katze und Schwein) und bei viel Platz ein zweites
      const placeDecor = (name, off) => {
        const [dw, dh, svg] = DECOR[name];
        rowEl.append(U.el("span", {
          class: "decor decor--" + name, "aria-hidden": "true", html: svg,
          style: "--dw:" + dw + ";--dh:" + dh + ";margin-left:" + Math.max(0, off).toFixed(0) + "px",
        }));
        left -= dw * k + Math.max(0, off) + 1;
      };
      const fits = (name) => DECOR[name][0] * k + 16 * k < left;
      const leaning = mode === "spine" && last && nodes.get(last.id).classList.contains("bk--lean");
      if (mode === "spine" && !leaning && left > 160 * k && r() < 0.4) placeDecor("bookend", 1);
      let pick = null;
      if (!catPlaced && ri >= 1 && fits("cat")) {
        pick = "cat";
        catPlaced = true;
      } else if (!pigPlaced && ri >= 3 && fits("pig") && r() < 0.7) {
        pick = "pig";
        pigPlaced = true;
      } else if (left > 60 * k && r() < 0.7) {
        const cand = DECOR_POOL.filter((d) => d !== "bookend" && fits(d));
        if (cand.length) pick = cand[Math.floor(r() * cand.length)];
      }
      if (pick) {
        const room = left - DECOR[pick][0] * k - 12 * k;
        const big = left > 420 * k;
        placeDecor(pick, room * (big ? 0.1 + r() * 0.35 : 0.15 + r() * 0.7));
        if (big && r() < 0.8) {
          const cand2 = DECOR_POOL.filter((d) => d !== pick && d !== "bookend" && fits(d));
          if (cand2.length) {
            const p2 = cand2[Math.floor(r() * cand2.length)];
            placeDecor(p2, (left - DECOR[p2][0] * k - 14 * k) * (0.35 + r() * 0.6));
          }
        }
      }
      shelf.append(rowEl, U.el("div", { class: "shelf__board", "aria-hidden": "true" }));
      frag.append(shelf);
    });
    caseEl.replaceChildren(frag, ghostEl);
    return rows.length;
  }

  function divider(g, first) {
    const n = g.films.length;
    return U.el("button", {
      type: "button", class: "divider" + (first ? " divider--first" : ""), "data-gkey": g.key,
      "aria-label": g.label + ", " + n + (n === 1 ? " Film" : " Filme") + " – nur diese zeigen",
    }, U.el("span", { class: "divider__t", text: g.label }), U.el("span", { class: "divider__n", text: String(n) }));
  }

  function groupHead(g) {
    const s = M.summary(g.films);
    const bits = [U.fmt(s.count) + (s.count === 1 ? " Film" : " Filme")];
    if (s.runtime) bits.push(U.fmtHours(s.runtime));
    if (s.avgRating) bits.push("Ø " + U.fmt1(s.avgRating) + " / 10");
    return U.el("div", { class: "shelf-head" },
      U.el("h3", { class: "shelf-head__title", text: g.label }),
      U.el("p", { class: "shelf-head__meta", text: bits.join(" · ") }));
  }

  // ---------- Animationen ----------
  function hop(el, dx, dy, delay) {
    const dist = Math.hypot(dx, dy);
    const lift = Math.min(64, 6 + dist * 0.11);
    const rot = -Math.sign(dx || 1) * Math.min(7, 0.6 + dist * 0.012);
    const dur = 520 + Math.min(320, dist * 0.32);
    el.animate([
      { transform: "translate(" + dx + "px," + dy + "px)", easing: "cubic-bezier(.2,.65,.4,1)" },
      { transform: "translate(" + dx * 0.5 + "px," + (dy * 0.5 - lift) + "px) rotate(" + rot + "deg)", offset: 0.45, easing: "cubic-bezier(.55,0,.8,.4)" },
      { transform: "translate(0,0) rotate(0)", offset: 0.86, easing: "ease-out" },
      { transform: "translate(0,-2px) rotate(0)", offset: 0.93, easing: "ease-in" },
      { transform: "none" },
    ], { duration: dur, delay, fill: "backwards" });
  }
  function drop(el, delay) {
    el.animate([
      { transform: "translateY(-90px) rotate(-7deg)", opacity: 0, easing: "cubic-bezier(.55,0,.85,.4)" },
      { transform: "translateY(0) rotate(0)", opacity: 1, offset: 0.6, easing: "cubic-bezier(.2,.7,.4,1)" },
      { transform: "translateY(-9px) rotate(1.2deg)", offset: 0.8, easing: "cubic-bezier(.55,0,.85,.4)" },
      { transform: "none", opacity: 1 },
    ], { duration: 640, delay, fill: "backwards" });
  }
  function ghostOut(el, rect, caseRect, i) {
    el.classList.add("bk--ghost");
    el.classList.remove("bk--lean");
    el.style.removeProperty("margin-left");
    el.style.setProperty("--gx", rect.left - caseRect.left + "px");
    el.style.setProperty("--gy", rect.top - caseRect.top + "px");
    ghostEl.append(el);
    const rot = (i % 2 ? 1 : -1) * (6 + (i % 5) * 2);
    const a = el.animate([
      { opacity: 1, transform: "none" },
      { opacity: 0, transform: "translateY(36px) rotate(" + rot + "deg) scale(.82)" },
    ], { duration: 360, delay: Math.min(i * 10, 160), easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" });
    U.done(a).then(() => {
      if (el.parentNode === ghostEl) {
        el.remove();
        el.classList.remove("bk--ghost");
        a.cancel();
      }
    });
  }

  // Hauptfunktion: neu anordnen, optional animiert (FLIP mit Hüpfer)
  function render(groups, opts) {
    opts = opts || {};
    const grouped = !!opts.grouped, share = !!opts.share;
    const animate = opts.animate !== false && !U.reducedMotion() && lastGroups.length > 0;
    const before = animate ? snapshot() : null;
    for (const el of nodes.values()) if (el.isConnected) stopAnims(el);
    lastGroups = groups;
    lastGrouped = grouped;
    lastShare = share;
    build(groups, grouped, share);
    if (!animate) {
      fadeIn();
      return;
    }
    const caseRect = caseEl.getBoundingClientRect();
    const ids = new Set();
    let i = 0;
    for (const g of groups) {
      for (const b of g.films) {
        ids.add(b.id);
        const el = nodes.get(b.id);
        const a = el.getBoundingClientRect();
        const p = before.get(b.id);
        if (p) {
          const dx = p.left - a.left, dy = p.top - a.top;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
          if (!inView(a) && !inView(p)) continue;
          hop(el, dx, dy, Math.min(i++ * 7, 260));
        } else if (inView(a)) drop(el, 80 + Math.min(i++ * 9, 300));
      }
    }
    let gi = 0;
    for (const [id, rect] of before) {
      if (ids.has(id)) continue;
      const el = nodes.get(id);
      if (el && inView(rect)) ghostOut(el, rect, caseRect, gi++);
    }
    fadeIn();
  }
  function fadeIn() {
    if (U.reducedMotion()) return;
    U.$$(".shelf-head, .decor, .divider", caseEl).forEach((d, i) =>
      d.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
        { duration: 420, delay: 260 + Math.min(i * 30, 300), easing: "ease-out", fill: "backwards" }));
  }

  function relayoutIfResized() {
    if (!caseEl || Math.abs(caseEl.clientWidth - lastWidth) < 2) return;
    render(lastGroups, { grouped: lastGrouped, share: lastShare, animate: false });
  }

  function visibleFilmEls() {
    const out = [];
    for (const el of caseEl.querySelectorAll(".shelf .bk")) if (inView(el.getBoundingClientRect(), 0)) out.push(el);
    return out;
  }

  // Rücken ↔ Cover: jede sichtbare Hülle dreht sich nacheinander um 90°
  async function setMode(newMode, groups, opts) {
    const grouped = !!(opts && opts.grouped), share = !!(opts && opts.share);
    if (newMode === mode) return;
    const swap = () => {
      mode = newMode;
      caseEl.classList.toggle("case--cover", mode === "cover");
      caseEl.classList.toggle("case--spine", mode === "spine");
    };
    if (U.reducedMotion() || !lastGroups.length) {
      swap();
      render(groups, { grouped, share, animate: false });
      return;
    }
    const vis = visibleFilmEls().slice(0, 140);
    const out = vis.map((el, i) =>
      el.firstElementChild.animate([{ transform: "rotateY(0)" }, { transform: "rotateY(-90deg)" }],
        { duration: 190, delay: Math.min(i * 8, 320), easing: "cubic-bezier(.55,0,.9,.5)", fill: "forwards" }));
    await Promise.all(out.map(U.done));
    swap();
    lastGroups = groups;
    lastGrouped = grouped;
    lastShare = share;
    for (const el of nodes.values()) if (el.isConnected) stopAnims(el);
    build(groups, grouped, share);
    out.forEach((a) => a.cancel());
    visibleFilmEls().slice(0, 160).forEach((el, i) =>
      el.firstElementChild.animate([
        { transform: "rotateY(90deg)" },
        { transform: "rotateY(-10deg)", offset: 0.7 },
        { transform: "rotateY(0)" },
      ], { duration: 460, delay: Math.min(i * 8, 340), easing: "cubic-bezier(.25,.7,.35,1)", fill: "backwards" }));
    fadeIn();
  }

  // Einen Film hervorheben (Zufallsfilm, Sprung aus der Statistik)
  function wiggle(id) {
    const el = nodes.get(id);
    if (!el || !el.isConnected) return null;
    if (!U.reducedMotion())
      el.firstElementChild.animate([
        { transform: "none" }, { transform: "translateY(-14px) rotate(-4deg)" }, { transform: "translateY(-6px) rotate(3deg)" },
        { transform: "translateY(-12px) rotate(-2deg)" }, { transform: "none" },
      ], { duration: 700, easing: "ease-in-out" });
    return el;
  }

  // ---------- Hover-Schild ----------
  let tipTimer = null;
  function onOver(e) {
    const el = e.target.closest(".bk");
    if (!el || el.classList.contains("bk--ghost") || e.pointerType === "touch") return;
    showTip(el, 220);
  }
  function showTip(el, delay) {
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => {
      const b = byId.get(el.dataset.id);
      if (!b || document.body.classList.contains("reading")) return;
      const meta = [b.year != null ? String(b.year) : null, b.runtime ? U.fmtDur(b.runtime) : null,
        b.watched ? "gesehen " + U.MONTHS[b.watched.getMonth()] + " " + b.watched.getFullYear() : null]
        .filter(Boolean).join(" · ");
      tipEl.replaceChildren(
        U.el("strong", { text: b.short }),
        b.director ? U.el("span", { class: "filmtip__a", text: b.director }) : null,
        U.el("span", { class: "filmtip__m", text: meta }),
        b.rating ? U.el("span", { class: "filmtip__r", text: "★ " + b.rating + " / 10" }) : null);
      tipEl.hidden = false;
      const r = el.getBoundingClientRect();
      const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
      let x = r.left + r.width / 2 - tw / 2;
      x = U.clamp(x, 8, innerWidth - tw - 8);
      let y = r.top - th - 12;
      if (y < 8) y = r.bottom + 12;
      tipEl.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
      tipEl.classList.add("is-on");
    }, delay);
  }
  function hideTip() {
    clearTimeout(tipTimer);
    if (!tipEl) return;
    tipEl.classList.remove("is-on");
    tipEl.hidden = true;
  }

  // ---------- Tastatur: Pfeile wandern durchs Regal ----------
  function onKey(e) {
    const el = e.target.closest(".bk");
    if (!el || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
    const all = U.$$(".shelf .bk", caseEl);
    const i = all.indexOf(el);
    let next = null;
    if (e.key === "ArrowLeft") next = all[i - 1];
    else if (e.key === "ArrowRight") next = all[i + 1];
    else if (e.key === "Home") next = all[0];
    else if (e.key === "End") next = all[all.length - 1];
    else {
      const lists = U.$$(".shelf", caseEl);
      const si = lists.indexOf(el.closest(".shelf"));
      const target = lists[si + (e.key === "ArrowDown" ? 1 : -1)];
      if (target) {
        const x = el.getBoundingClientRect().left;
        let best = null, bd = Infinity;
        for (const c of target.querySelectorAll(".bk")) {
          const d = Math.abs(c.getBoundingClientRect().left - x);
          if (d < bd) (bd = d), (best = c);
        }
        next = best;
      }
    }
    if (next) {
      e.preventDefault();
      next.focus();
      next.scrollIntoView({ block: "nearest", behavior: U.reducedMotion() ? "auto" : "smooth" });
    }
  }

  FR.shelf = {
    init, setFilms, render, setMode, refreshFilm, relayoutIfResized, wiggle, hideTip,
    el: (id) => nodes.get(id),
    get mode() { return mode; },
    DECOR,
  };
})();
