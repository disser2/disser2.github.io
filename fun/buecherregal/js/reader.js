/* Bücherregal – Detailansicht: Das Buch wird aus dem Regal gezogen, dreht sich
   vom Rücken zum Cover, fliegt in die Mitte und klappt auf. */
(function () {
  "use strict";
  const BS = (window.BS = window.BS || {});
  const U = BS.util, M = BS.model, S = BS.spine;

  let root, b3, coverEl, els = {};
  let current = null, origin = null, busy = false, geo = null;
  let navList = () => [];
  let onFilter = () => {};
  let lastFocus = null;

  const RATING_TEXT = ["", "Nicht meins", "Na ja", "Gut", "Sehr gut", "Fantastisch"];

  function init(opts) {
    navList = opts.navList || navList;
    onFilter = opts.onFilter || onFilter;
    root = U.el("div", { class: "reader", hidden: true, role: "dialog", "aria-modal": "true", "aria-labelledby": "reader-title" });
    root.innerHTML =
      '<div class="reader__backdrop"></div>' +
      '<div class="reader__stage"><div class="b3">' +
      '<div class="b3__back"></div>' +
      '<div class="b3__edge b3__edge--fore"></div><div class="b3__edge b3__edge--head"></div><div class="b3__edge b3__edge--tail"></div>' +
      '<div class="b3__page b3__page--right"><div class="pg__scroll" tabindex="-1"></div></div>' +
      '<div class="b3__spine"></div>' +
      '<div class="b3__hinge"><div class="b3__cover">' +
      '<div class="b3__face b3__face--front"></div>' +
      '<div class="b3__face b3__face--inside"><div class="pg__scroll pg__scroll--left" tabindex="-1"></div></div>' +
      "</div></div>" +
      "</div></div>" +
      '<button class="reader__btn reader__close" type="button" aria-label="Schließen (Esc)"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>' +
      '<button class="reader__btn reader__nav reader__nav--prev" type="button" aria-label="Vorheriges Buch (←)"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<button class="reader__btn reader__nav reader__nav--next" type="button" aria-label="Nächstes Buch (→)"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
    document.body.append(root);
    b3 = U.$(".b3", root);
    coverEl = U.$(".b3__cover", root);
    els = {
      backdrop: U.$(".reader__backdrop", root),
      front: U.$(".b3__face--front", root),
      spine: U.$(".b3__spine", root),
      left: U.$(".pg__scroll--left", root),
      right: U.$(".b3__page--right .pg__scroll", root),
      prev: U.$(".reader__nav--prev", root),
      next: U.$(".reader__nav--next", root),
      close: U.$(".reader__close", root),
    };
    els.backdrop.addEventListener("click", close);
    els.close.addEventListener("click", close);
    els.prev.addEventListener("click", () => go(-1));
    els.next.addEventListener("click", () => go(1));
    root.addEventListener("click", onContentClick);
    document.addEventListener("keydown", (e) => {
      if (root.hidden) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowLeft" && !e.target.closest("input")) go(-1);
      else if (e.key === "ArrowRight" && !e.target.closest("input")) go(1);
      else if (e.key === "Tab") trapFocus(e);
    });
    window.addEventListener("resize", U.debounce(() => {
      if (!root.hidden && !busy && current) {
        geo = geometry(current);
        applyGeo(geo);
      }
    }, 150));
  }

  function trapFocus(e) {
    const f = U.$$("button, a[href], [tabindex='0']", root).filter((n) => n.offsetParent !== null && !n.disabled);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // ---------- Maße ----------
  function geometry(b) {
    const vw = innerWidth, vh = innerHeight;
    const spread = vw >= 880 && vh >= 520;
    let H, W;
    if (spread) {
      H = Math.min(vh - 120, 640);
      W = Math.min(H * 0.7, (vw - 140) / 2);
      H = Math.min(H, W / 0.62);
    } else {
      W = Math.min(vw - 28, 460);
      H = Math.min(vh - 96, W * 1.62);
    }
    const D = U.clamp((b.vis.w / b.vis.h) * H, 10, 64);
    return { W: Math.round(W), H: Math.round(H), D: Math.round(D), spread, k: H / b.vis.h };
  }
  function applyGeo(g) {
    b3.style.setProperty("--W", g.W + "px");
    b3.style.setProperty("--H", g.H + "px");
    b3.style.setProperty("--D", g.D + "px");
    b3.style.setProperty("--shift", g.spread ? g.W / 2 + "px" : "0px");
    els.spine.style.setProperty("--k", g.k.toFixed(3));
    root.classList.toggle("reader--spread", g.spread);
    root.classList.toggle("reader--single", !g.spread);
  }
  const T = (x, y, z, s, ry, rx) =>
    "translate3d(" + x + "px," + y + "px," + z + "px) scale3d(" + s + "," + s + "," + s + ") rotateY(" + ry + "deg) rotateX(" + (rx || 0) + "deg)";

  // ---------- Inhalt ----------
  function stars(n) {
    let s = "";
    for (let i = 1; i <= 5; i++) s += '<span class="star' + (i <= n ? " star--on" : "") + '" style="--i:' + i + '">★</span>';
    return s;
  }
  function fact(label, value) {
    return value ? "<dt>" + U.esc(label) + "</dt><dd>" + value + "</dd>" : "";
  }

  function leftHTML(b) {
    const isbn = b.isbn13 || b.isbn10;
    const edition = [b.publisher, b.year, b.binding].filter(Boolean).map(U.esc).join(" · ");
    const read = b.dateRead
      ? U.fmtDate(b.dateRead) + (b.readCount > 1 ? " · " + b.readCount + "× gelesen" : "")
      : b.readYear ? b.readYear + (b.readYearSrc === "shelf" ? " (aus Regalname)" : "") : b.status === "read" ? "Datum unbekannt" : "";
    const chips = b.themes.filter((k) => k !== "none").map((k) =>
      '<button type="button" class="chip chip--theme" data-filter="genre" data-value="' + k + '" style="--sw:' +
      U.esc(M.GENRE[k].pal[0]) + '"><i></i>' + U.esc(M.GENRE[k].label) + "</button>").join("") +
      b.shelves.map((s) => '<button type="button" class="chip chip--shelf" data-filter="shelf" data-value="' + U.esc(s) + '">#' + U.esc(s) + "</button>").join("");
    return '<div class="pg pg--left">' +
      '<div class="exlibris"><span class="exlibris__t">Ex Libris</span>' +
      (b.no ? '<span class="exlibris__n">Nr. ' + b.no + "</span>" : '<span class="exlibris__n">' + U.esc(M.statusLabel(b.status)) + "</span>") +
      "</div>" +
      '<dl class="facts">' +
      fact("Erstveröffentlichung", b.origYear != null ? String(b.origYear) : "") +
      fact("Diese Ausgabe", edition) +
      fact("Seiten", b.pages ? U.fmt(b.pages) + (b.grPages ? "" : " (laut Open Library)") : "") +
      fact("Buchtyp", U.esc(M.TYPE[b.type].label)) +
      fact("ISBN", isbn ? '<span class="isbn">' + U.esc(isbn) + '</span> <button type="button" class="linkbtn" data-copy="' + U.esc(isbn) + '">kopieren</button>' : "") +
      fact("Gelesen", U.esc(read)) +
      fact("Ins Regal gestellt", b.dateAdded ? U.fmtDate(b.dateAdded) : "") +
      "</dl>" +
      (chips ? '<div class="pg__chips">' + chips + "</div>" : "") +
      '<p class="pg__links"><a href="' + U.esc(M.grLink(b)) + '" target="_blank" rel="noopener">Goodreads ↗</a>' +
      '<a href="' + U.esc(M.olLink(b)) + '" target="_blank" rel="noopener">Open Library ↗</a></p>' +
      "</div>";
  }

  function rightHTML(b, books) {
    const kicker = b.status === "currently-reading" ? "Liegt gerade auf dem Nachttisch"
      : b.dateRead ? "Gelesen im " + U.fmtMonth(b.dateRead) : b.readYear ? "Gelesen " + b.readYear : M.statusLabel(b.status);
    const sub = [U.esc(b.author)];
    if (b.additional.length) sub.push("mit " + U.esc(b.additional.join(", ")));
    if (b.series) sub.push("<em>" + U.esc(b.series) + (b.seriesNo != null ? " #" + String(b.seriesNo).replace(".", ",") : "") + "</em>");
    const rating = b.rating
      ? '<div class="stars" role="img" aria-label="' + b.rating + ' von 5 Sternen">' + stars(b.rating) + "</div>" +
        '<span class="pg__ratingtext">' + RATING_TEXT[b.rating] + "</span>"
      : '<span class="pg__ratingtext pg__ratingtext--none">Ohne Bewertung</span>';
    const avg = b.avgRating ? '<span class="pg__avg">Goodreads Ø ' + U.fmt2(b.avgRating) + "</span>" : "";
    const review = b.review
      ? '<div class="pg__review' + (b.spoiler ? " is-spoiler" : "") + '">' + b.review + "</div>" +
        (b.spoiler ? '<button type="button" class="linkbtn pg__spoilerbtn" data-spoiler>Spoiler anzeigen</button>' : "")
      : '<p class="pg__empty">' + (b.rating >= 4 ? "Keine Rezension – aber " + b.rating + " Sterne sagen auch einiges."
        : b.rating ? "Keine Rezension geschrieben." : "Noch keine Rezension, noch keine Sterne.") + "</p>";
    const others = books.filter((x) => x.author === b.author && x.id !== b.id).slice(0, 6);
    const more = others.length
      ? '<div class="pg__more"><h3 class="pg__h">Mehr von ' + U.esc(b.author) + "</h3>" +
        others.map((o) => '<button type="button" class="pg__morebtn" data-open="' + U.esc(o.id) + '" style="' + S.styleVars(o) +
          '"><span class="pg__moredot"></span>' + U.esc(o.short) + (o.readYear ? " <small>" + o.readYear + "</small>" : "") + "</button>").join("") +
        "</div>"
      : "";
    return '<div class="pg pg--right">' +
      '<span class="pg__ribbon" aria-hidden="true"></span>' +
      '<p class="pg__kicker">' + U.esc(kicker) + (b.no ? " · Buch Nr. " + b.no : "") + "</p>" +
      '<h2 class="pg__title" id="reader-title">' + U.esc(b.title) + "</h2>" +
      '<p class="pg__sub">' + sub.join(" · ") + "</p>" +
      '<div class="pg__rating">' + rating + avg + "</div>" +
      '<h3 class="pg__h">Meine Rezension</h3>' + review + more +
      "</div>";
  }

  function fill(b) {
    const all = BS.app.books();
    els.front.innerHTML = S.coverHTML(b);
    els.front.style.cssText = S.styleVars(b);
    S.attachCover(els.front.querySelector(".cv"), b, "L");
    els.spine.style.cssText = S.styleVars(b);
    els.spine.innerHTML = S.spineHTML(b);
    b3.style.setProperty("--c", b.vis.c);
    b3.style.setProperty("--paper-tint", U.mix("#fbf6ec", b.vis.c, 0.06));
    if (geo && geo.spread) {
      els.left.innerHTML = leftHTML(b);
      els.right.innerHTML = rightHTML(b, all);
    } else {
      els.left.innerHTML = "";
      els.right.innerHTML = '<div class="pg__single">' +
        '<div class="pg__thumb" style="' + S.styleVars(b) + '">' + S.coverHTML(b) + "</div>" +
        rightHTML(b, all) + leftHTML(b) + "</div>";
      S.attachCover(els.right.querySelector(".pg__thumb .cv"), b, "M");
    }
    els.left.scrollTop = 0;
    els.right.scrollTop = 0;
    const list = navList();
    const i = list.findIndex((x) => x.id === b.id);
    els.prev.disabled = i <= 0;
    els.next.disabled = i < 0 || i >= list.length - 1;
  }

  function onContentClick(e) {
    const t = e.target.closest("[data-copy],[data-spoiler],[data-filter],[data-open],.spoiler-inline");
    if (!t) return;
    if (t.matches(".spoiler-inline")) t.classList.add("is-shown");
    else if (t.dataset.copy) {
      navigator.clipboard && navigator.clipboard.writeText(t.dataset.copy).then(() => {
        t.textContent = "kopiert ✓";
        setTimeout(() => (t.textContent = "kopieren"), 1400);
      }, () => {});
    } else if (t.hasAttribute("data-spoiler")) {
      const r = t.previousElementSibling;
      r && r.classList.remove("is-spoiler");
      t.remove();
    } else if (t.dataset.filter) {
      const kind = t.dataset.filter, value = t.dataset.value;
      close().then(() => onFilter(kind, value));
    } else if (t.dataset.open) {
      const b = BS.app.books().find((x) => x.id === t.dataset.open);
      if (b) swapTo(b, 1);
    }
  }

  // ---------- Öffnen ----------
  async function open(b, fromEl) {
    if (busy || !b) return;
    busy = true;
    lastFocus = document.activeElement;
    current = b;
    origin = fromEl && fromEl.isConnected ? fromEl : null;
    geo = geometry(b);
    applyGeo(geo);
    fill(b);
    BS.shelf.hideTip();
    root.hidden = false;
    root.classList.remove("is-open", "is-closing");
    document.body.classList.add("reading");
    const from = origin ? origin.getBoundingClientRect() : null;
    const motion = !U.reducedMotion();
    if (!motion || !from || !from.width) {
      setOpenState(true);
      root.classList.add("is-open");
      if (motion) U.$(".reader__stage", root).animate([{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 380, easing: "ease-out" });
      busy = false;
      els.close.focus({ preventScroll: true });
      return;
    }
    setOpenState(false);
    const spineView = BS.shelf.mode === "spine" && !origin.closest(".hero, .list");
    const cx = innerWidth / 2, cy = innerHeight / 2;
    const fx = from.left + from.width / 2 - cx, fy = from.top + from.height / 2 - cy;
    const s0 = from.height / geo.H;
    const ry = spineView ? 90 : 0;
    const z0 = spineView ? (-geo.W / 2) * s0 : 0;
    origin.classList.add("bk--out");
    els.backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, easing: "ease-out", fill: "backwards" });
    const fly = b3.animate([
      { transform: T(fx, fy, z0, s0, ry), offset: 0 },
      { transform: T(fx, fy - 10, z0 + 70, s0 * 1.04, ry), offset: 0.2 },
      { transform: T(fx * 0.4, fy * 0.4 - 26, 90, U.lerp(s0, 1, 0.55), ry * 0.45, -5), offset: 0.6 },
      { transform: T(0, 0, 0, 1, 0, 0), offset: 1 },
    ], { duration: 920, easing: "cubic-bezier(.45,.05,.25,1)" });
    await U.done(fly);
    if (current !== b) return;
    await U.wait(60);
    await openCover();
    busy = false;
    els.close.focus({ preventScroll: true });
  }

  function setOpenState(isOpen) {
    root.classList.toggle("is-cover-open", isOpen);
  }

  async function openCover() {
    const shift = geo.spread ? geo.W / 2 : 0;
    const dur = 880;
    const a = b3.animate([{ transform: "translate3d(0,0,0)" }, { transform: "translate3d(" + shift + "px,0,0)" }],
      { duration: dur, easing: "cubic-bezier(.6,0,.25,1)" });
    const c = coverEl.animate(geo.spread
      ? [{ transform: "rotateY(0deg)" }, { transform: "rotateY(-180deg)" }]
      : [{ transform: "rotateY(0deg)", opacity: 1 }, { transform: "rotateY(-110deg)", opacity: 1, offset: 0.55 }, { transform: "rotateY(-180deg)", opacity: 0 }],
      { duration: dur, easing: "cubic-bezier(.55,0,.2,1)" });
    setTimeout(() => root.classList.add("is-open"), dur * 0.55);
    await Promise.all([U.done(a), U.done(c)]);
    setOpenState(true);
    a.cancel();
    c.cancel();
  }

  async function closeCover(fast) {
    root.classList.remove("is-open");
    const shift = geo.spread ? geo.W / 2 : 0;
    const dur = fast ? 420 : 620;
    setOpenState(false);
    const a = b3.animate([{ transform: "translate3d(" + shift + "px,0,0)" }, { transform: "translate3d(0,0,0)" }],
      { duration: dur, easing: "cubic-bezier(.5,0,.3,1)" });
    const c = coverEl.animate(geo.spread
      ? [{ transform: "rotateY(-180deg)" }, { transform: "rotateY(0deg)" }]
      : [{ transform: "rotateY(-180deg)", opacity: 0 }, { transform: "rotateY(-110deg)", opacity: 1, offset: 0.45 }, { transform: "rotateY(0deg)", opacity: 1 }],
      { duration: dur, easing: "cubic-bezier(.5,0,.3,1)" });
    await Promise.all([U.done(a), U.done(c)]);
    a.cancel();
    c.cancel();
  }

  // ---------- Schließen: zurück an den Platz im Regal ----------
  async function close() {
    if (root.hidden || busy) return;
    busy = true;
    const b = current;
    const motion = !U.reducedMotion();
    let target = BS.shelf.el(b.id);
    if (target && !target.isConnected) target = null;
    if (origin && origin.isConnected && origin.closest(".hero, .list")) target = origin;
    if (motion) {
      await closeCover();
      const to = target ? target.getBoundingClientRect() : null;
      const visible = to && to.width && to.bottom > 0 && to.top < innerHeight;
      root.classList.add("is-closing");
      els.backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 560, easing: "ease-in", fill: "forwards" });
      if (visible) {
        const spineView = BS.shelf.mode === "spine" && !target.closest(".hero, .list");
        const cx = innerWidth / 2, cy = innerHeight / 2;
        const tx = to.left + to.width / 2 - cx, ty = to.top + to.height / 2 - cy;
        const s1 = to.height / geo.H;
        const ry = spineView ? 90 : 0;
        const z1 = spineView ? (-geo.W / 2) * s1 : 0;
        if (target !== origin && origin) origin.classList.remove("bk--out");
        target.classList.add("bk--out");
        const back = b3.animate([
          { transform: T(0, 0, 0, 1, 0) },
          { transform: T(tx * 0.5, ty * 0.5 - 30, 80, U.lerp(1, s1, 0.5), ry * 0.6, -4), offset: 0.5 },
          { transform: T(tx, ty - 8, z1 + 50, s1 * 1.03, ry), offset: 0.82 },
          { transform: T(tx, ty, z1, s1, ry) },
        ], { duration: 820, easing: "cubic-bezier(.45,.05,.3,1)", fill: "forwards" });
        await U.done(back);
        target.classList.remove("bk--out");
        target.firstElementChild.animate([{ transform: "translateY(-5px)" }, { transform: "translateY(1px)" }, { transform: "none" }],
          { duration: 260, easing: "ease-out" });
        back.cancel();
      } else {
        const out = b3.animate([{ transform: T(0, 0, 0, 1, 0), opacity: 1 }, { transform: T(0, 40, -200, 0.8, 0), opacity: 0 }],
          { duration: 420, easing: "ease-in", fill: "forwards" });
        await U.done(out);
        out.cancel();
      }
    }
    if (origin) origin.classList.remove("bk--out");
    if (target) target.classList.remove("bk--out");
    root.hidden = true;
    root.classList.remove("is-open", "is-closing");
    setOpenState(false);
    els.backdrop.getAnimations().forEach((a) => a.cancel());
    document.body.classList.remove("reading");
    const focusTo = target || (lastFocus && lastFocus.isConnected ? lastFocus : null);
    if (focusTo) focusTo.focus({ preventScroll: true });
    current = null;
    busy = false;
  }

  // ---------- Blättern ----------
  async function go(delta) {
    if (busy || !current) return;
    const list = navList();
    const i = list.findIndex((x) => x.id === current.id);
    const next = list[i + delta];
    if (!next) return;
    await swapTo(next, delta);
  }
  async function swapTo(next, delta) {
    if (busy) return;
    busy = true;
    const motion = !U.reducedMotion();
    if (motion) await closeCover(true);
    if (motion) {
      const out = b3.animate([{ transform: "translate3d(0,0,0)", opacity: 1 }, { transform: "translate3d(" + -delta * 60 + "px,0,-80px) rotateY(" + delta * 14 + "deg)", opacity: 0 }],
        { duration: 240, easing: "ease-in", fill: "forwards" });
      await U.done(out);
      out.cancel();
    }
    if (origin) origin.classList.remove("bk--out");
    origin = BS.shelf.el(next.id) || null;
    if (origin && !origin.isConnected) origin = null;
    if (origin) origin.classList.add("bk--out");
    current = next;
    geo = geometry(next);
    applyGeo(geo);
    fill(next);
    if (motion) {
      const inn = b3.animate([{ transform: "translate3d(" + delta * 60 + "px,0,-80px) rotateY(" + -delta * 14 + "deg)", opacity: 0 }, { transform: "translate3d(0,0,0)", opacity: 1 }],
        { duration: 300, easing: "cubic-bezier(.2,.7,.3,1)" });
      await U.done(inn);
      await openCover();
    } else {
      setOpenState(true);
      root.classList.add("is-open");
    }
    busy = false;
  }

  BS.reader = { init, open, close, get current() { return current; }, isOpen: () => root && !root.hidden };
})();
