/* Filmregal – Detailansicht: Die Hülle wird aus dem Regal gezogen, dreht sich
   vom Rücken zum Cover, fliegt in die Mitte und klappt auf. */
(function () {
  "use strict";
  const FR = (window.FR = window.FR || {});
  const U = FR.util, M = FR.model, S = FR.spine;

  let root, b3, coverEl, els = {};
  let current = null, origin = null, busy = false, geo = null;
  let navList = () => [];
  let onFilter = () => {};
  let lastFocus = null;

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
      '<button class="reader__btn reader__nav reader__nav--prev" type="button" aria-label="Vorheriger Film (←)"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<button class="reader__btn reader__nav reader__nav--next" type="button" aria-label="Nächster Film (→)"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
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
    for (let i = 1; i <= 10; i++) s += '<span class="star' + (i <= n ? " star--on" : "") + '" style="--i:' + i + '">★</span>';
    return s;
  }
  function fact(label, value) {
    return value ? "<dt>" + U.esc(label) + "</dt><dd>" + value + "</dd>" : "";
  }
  const filterBtn = (kind, value, cls, label) =>
    '<button type="button" class="' + cls + '" data-filter="' + kind + '" data-value="' + U.esc(value) + '">' + U.esc(label || value) + "</button>";

  function seenText(b) {
    if (b.status !== "watched") return "";
    const dates = b.watches.slice().reverse().map(U.fmtDate);
    if (!dates.length) return "Datum unbekannt" + (b.plays > 1 ? " · " + b.plays + "× gesehen" : "");
    const more = b.undated ? " und " + b.undated + "× früher ohne Datum" : "";
    return dates.slice(0, 4).join(" · ") + (dates.length > 4 ? " · …" : "") + more +
      (b.plays > 1 ? " (" + b.plays + "× gesehen)" : "");
  }

  function leftHTML(b) {
    const directors = b.directors.map((d) => filterBtn("director", d, "linkbtn")).join(", ");
    const chips = b.themes.filter((k) => k !== "none").map((k) =>
      '<button type="button" class="chip chip--theme" data-filter="genre" data-value="' + k + '" style="--sw:' +
      U.esc(M.GENRE[k].pal[0]) + '"><i></i>' + U.esc(M.GENRE[k].label) + "</button>").join("") +
      b.lists.map((s) => filterBtn("list", s, "chip chip--shelf", "#" + s)).join("");
    const cast = b.cast.slice(0, 10).map((n) => filterBtn("cast", n, "chip chip--tag")).join("");
    const tags = b.tags.map((t) => filterBtn("q", t, "chip chip--tag")).join("");
    const links = [["Trakt", M.traktLink(b)], ["IMDb", M.imdbLink(b)], ["Wikipedia", M.wikiLink(b)]].filter((l) => l[1])
      .map((l) => '<a href="' + U.esc(l[1]) + '" target="_blank" rel="noopener">' + l[0] + " ↗</a>").join("");
    return '<div class="pg pg--left">' +
      '<div class="ticket"><span class="ticket__t">Kinokarte</span>' +
      '<span class="ticket__n">' + (b.no ? "Film Nr. " + b.no : U.esc(M.statusLabel(b.status))) + "</span>" +
      "</div>" +
      '<dl class="facts">' +
      fact("Erschienen", b.year != null ? String(b.year) : "") +
      fact("Deutscher Titel", U.esc(b.de)) +
      fact("Regie", directors) +
      fact("Laufzeit", b.runtime ? U.fmtDur(b.runtime) : "") +
      fact("Land", U.esc(b.countries.join(", "))) +
      fact("Sprache", U.esc(b.langs.join(", "))) +
      fact("Hülle", U.esc(M.TYPE[b.type].short + " – nach Erscheinungsjahr")) +
      fact("IMDb", b.imdb ? '<span class="isbn">' + U.esc(b.imdb) + '</span> <button type="button" class="linkbtn" data-copy="' + U.esc(b.imdb) + '">kopieren</button>' : "") +
      fact("Gesehen", U.esc(seenText(b))) +
      fact("Bewertet", b.ratedAt && !isNaN(b.ratedAt) ? U.fmtDate(b.ratedAt) : "") +
      fact("Vorgemerkt", b.status === "watchlist" && b.listedAt ? U.fmtDate(b.listedAt) : "") +
      "</dl>" +
      (chips ? '<h3 class="pg__h">Genres &amp; Listen</h3><div class="pg__chips">' + chips + "</div>" : "") +
      (cast ? '<h3 class="pg__h">Besetzung</h3><div class="pg__chips">' + cast + "</div>" : "") +
      (tags ? '<h3 class="pg__h">Stichworte</h3><div class="pg__chips">' + tags + "</div>" : "") +
      '<p class="pg__links">' + links + "</p>" +
      "</div>";
  }

  function rightHTML(b, films) {
    const kicker = b.status === "watchlist" ? "Steht auf der Watchlist"
      : b.watched ? "Gesehen im " + U.fmtMonth(b.watched) : "Gesehen · Datum unbekannt";
    const sub = [];
    if (b.year != null) sub.push(String(b.year));
    if (b.directors.length) sub.push("Regie: " + U.esc(b.directors.join(", ")));
    if (b.runtime) sub.push(U.fmtDur(b.runtime));
    const rating = b.rating
      ? '<div class="stars stars--10" role="img" aria-label="' + b.rating + ' von 10 Punkten">' + stars(b.rating) + "</div>" +
        '<span class="pg__ratingtext">' + M.RATING_TEXT[b.rating] + "</span>" +
        '<span class="pg__avg">' + b.rating + " / 10</span>"
      : '<span class="pg__ratingtext pg__ratingtext--none">Ohne Bewertung</span>';
    const review = b.review
      ? '<div class="pg__review' + (b.spoiler ? " is-spoiler" : "") + '">' + b.review + "</div>" +
        (b.spoiler ? '<button type="button" class="linkbtn pg__spoilerbtn" data-spoiler>Spoiler anzeigen</button>' : "")
      : '<p class="pg__empty">' + (b.rating >= 9 ? "Kein Kommentar – " + b.rating + " von 10 sagen genug."
        : b.rating ? "Kein Kommentar geschrieben." : b.status === "watchlist" ? "Noch nicht gesehen." : "Kein Kommentar, keine Bewertung.") + "</p>";
    // "Mehr von …": gleiche Regie, sonst Filme aus demselben Erscheinungsjahr
    let others = b.director ? films.filter((x) => x.id !== b.id && x.directors.includes(b.director)) : [];
    let moreTitle = "Mehr von " + b.director;
    if (!others.length && b.year != null) {
      others = films.filter((x) => x.id !== b.id && x.year === b.year && x.status === "watched");
      moreTitle = "Auch von " + b.year;
    }
    others = others.sort((x, y) => (y.rating || 0) - (x.rating || 0)).slice(0, 6);
    const more = others.length
      ? '<div class="pg__more"><h3 class="pg__h">' + U.esc(moreTitle) + "</h3>" +
        others.map((o) => '<button type="button" class="pg__morebtn" data-open="' + U.esc(o.id) + '" style="' + S.styleVars(o) +
          '"><span class="pg__moredot"></span>' + U.esc(o.short) + (o.rating ? " <small>★ " + o.rating + "</small>" : "") + "</button>").join("") +
        "</div>"
      : "";
    return '<div class="pg pg--right">' +
      '<span class="pg__ribbon" aria-hidden="true"></span>' +
      '<p class="pg__kicker">' + U.esc(kicker) + (b.no ? " · Film Nr. " + b.no : "") + "</p>" +
      '<h2 class="pg__title" id="reader-title">' + U.esc(b.title) + "</h2>" +
      '<p class="pg__sub">' + sub.join(" · ") + "</p>" +
      '<div class="pg__rating">' + rating + "</div>" +
      '<h3 class="pg__h">Mein Kommentar</h3>' + review + more +
      "</div>";
  }

  function fill(b) {
    const all = FR.app.films();
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
      const b = FR.app.films().find((x) => x.id === t.dataset.open);
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
    FR.shelf.hideTip();
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
    const spineView = FR.shelf.mode === "spine" && !origin.closest(".hero, .list");
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
    let target = FR.shelf.el(b.id);
    if (target && !target.isConnected) target = null;
    if (origin && origin.isConnected && origin.closest(".hero, .list")) target = origin;
    if (motion) {
      await closeCover();
      const to = target ? target.getBoundingClientRect() : null;
      const visible = to && to.width && to.bottom > 0 && to.top < innerHeight;
      root.classList.add("is-closing");
      els.backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 560, easing: "ease-in", fill: "forwards" });
      if (visible) {
        const spineView = FR.shelf.mode === "spine" && !target.closest(".hero, .list");
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
    origin = FR.shelf.el(next.id) || null;
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

  FR.reader = { init, open, close, get current() { return current; }, isOpen: () => root && !root.hidden };
})();
