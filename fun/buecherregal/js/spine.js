/* Bücherregal – Aussehen der Bücher: Maße, Einbandfarbe, Rückenstil,
   generierter Buchrücken und generiertes Cover (wenn Open Library nichts hat) */
(function () {
  "use strict";
  const BS = (window.BS = window.BS || {});
  const U = BS.util, M = BS.model;

  const GOLD = "#d8b45f", CREAM = "#f3e9d2";
  const HEIGHTS = { hard: [216, 13], paper: [194, 11], ebook: [202, 9], audio: [190, 9], other: [198, 12] };
  const STYLES = {
    hard: ["classic", "label", "block", "foil", "modern", "classic"],
    paper: ["penguin", "modern", "stripe", "block", "label", "modern"],
    ebook: ["modern", "stripe", "block", "label"],
    audio: ["modern", "block", "stripe", "penguin"],
    other: ["modern", "label", "stripe", "block", "penguin"],
  };
  const FONTS = ["serif", "sans", "cond"];
  const COVER_VARIANTS = ["circle", "frame", "band", "type", "dots"];

  // Maße & Farben. Breite ∝ Seitenzahl, Höhe nach Buchtyp mit etwas Streuung.
  function decorate(b) {
    const r = U.rng(b.seed);
    const hb = b.massMarket ? [172, 6] : HEIGHTS[b.type] || HEIGHTS.other;
    const h = Math.round(hb[0] + (r() * 2 - 1) * hb[1]);
    const pagesForWidth = b.pages || 300;
    const w = Math.round(U.clamp(10 + pagesForWidth * 0.056, 14, 66));
    const ratio = b.massMarket ? 0.6 : b.type === "hard" ? 0.67 : 0.65;

    const g = M.GENRE[b.genre] || M.GENRE.none;
    let c = g.pal[Math.floor(r() * g.pal.length)];
    c = U.shade(c, (r() - 0.5) * 0.2);
    const ink = U.inkFor(c);
    const dark = U.luminance(c) < 0.18;
    const styles = STYLES[b.type] || STYLES.other;
    let style = styles[Math.floor(r() * styles.length)];
    if (b.genre === "klassiker" && r() < 0.6) style = r() < 0.5 ? "classic" : "foil";
    if (style === "foil" && !dark) style = "classic";
    let font = FONTS[Math.floor(r() * FONTS.length)];
    if (style === "classic" || style === "foil" || style === "penguin") font = "serif";
    if (style === "stripe" && font === "serif") font = "cond";
    // Zweitfarbe: Gold auf dunklen Leinen, Creme oder ein Ton derselben Familie
    const other = g.pal[Math.floor(r() * g.pal.length)];
    let accent = style === "classic" || style === "foil" ? (dark ? GOLD : U.shade(c, -0.45))
      : style === "label" || style === "penguin" ? CREAM
      : r() < 0.5 ? U.shade(other, r() < 0.5 ? 0.35 : -0.35) : dark ? U.shade(c, 0.5) : U.shade(c, -0.4);
    if (style === "block" && U.contrast(accent, c) < 1.4) accent = U.shade(c, U.luminance(c) > 0.3 ? -0.45 : 0.5);
    const accentInk = U.inkFor(accent);
    const hs = U.hue(c);
    b.vis = {
      h, w, ratio, c, ink, accent, accentInk, style, font,
      logo: Math.floor(r() * 4),
      cover: COVER_VARIANTS[Math.floor(r() * COVER_VARIANTS.length)],
      lean: r(), decor: r(), tilt: (r() - 0.5) * 2,
      crease: b.type === "paper" && r() < 0.55 ? 0.18 + r() * 0.5 : 0,
      hueKey: hs.s < 0.14 || hs.l < 0.12 ? 1000 + (1 - hs.l) * 100 : ((hs.h + 340) % 360) + hs.l * 0.5,
    };
    fitTitle(b);
    return b;
  }

  // Schriftgröße des Rückentitels: so groß wie die Breite erlaubt, so klein wie die Länge verlangt
  function fitTitle(b) {
    const v = b.vis;
    const len = Math.max(4, b.short.length);
    const cw = v.font === "cond" ? 0.44 : v.font === "serif" ? 0.55 : 0.57;
    const reserve = v.style === "penguin" ? 0.42 : v.style === "block" ? 0.38 : 0.3;
    const avail = v.h * (1 - reserve);
    let fs = U.clamp(v.w * 0.42, 8.5, 15.5);
    v.wrap = false;
    if (len * fs * cw > avail) {
      const two = U.clamp(Math.min(v.w * 0.27, (avail * 2) / (len * cw)), 7.5, 13);
      const one = Math.max(7.5, avail / (len * cw));
      if (v.w >= 38 && two > one + 0.6) {
        fs = two;
        v.wrap = true;
      } else fs = Math.min(fs, one);
    }
    v.fs = Math.round(fs * 10) / 10;
    v.afs = U.clamp(v.w * 0.24, 6.5, 9);
  }

  const ICONS = {
    audio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="5" height="7" rx="2" fill="currentColor"/><rect x="16" y="14" width="5" height="7" rx="2" fill="currentColor"/></svg>',
    ebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M9 6.5h6M9 10h6M9 13.5h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  };

  function styleVars(b) {
    const v = b.vis;
    return "--w:" + v.w + ";--h:" + v.h + ";--ratio:" + v.ratio + ";--c:" + v.c + ";--ink:" + v.ink +
      ";--acc:" + v.accent + ";--acc-ink:" + v.accentInk + ";--fs:" + v.fs + ";--afs:" + v.afs +
      (v.crease ? ";--crease:" + v.crease.toFixed(2) : "");
  }

  function spineHTML(b) {
    const v = b.vis;
    const icon = ICONS[b.type] || "";
    const cls = "sp sp--" + v.style + " sp--" + v.font + (b.type === "hard" ? " sp--hard" : "") +
      (v.wrap ? " sp--wrap" : "") + (v.crease ? " sp--crease" : "");
    return '<span class="' + cls + '">' +
      '<span class="sp__band sp__band--top"></span>' +
      '<span class="sp__t">' + U.esc(b.short) + "</span>" +
      '<span class="sp__a">' + U.esc(b.authorLast) + "</span>" +
      '<span class="sp__logo sp__logo--' + v.logo + (icon ? " sp__logo--icon" : "") + '">' + icon + "</span>" +
      '<span class="sp__band sp__band--bottom"></span>' +
      "</span>";
  }

  // Motive im Stil der Vorlage: großer Kreis, Punkteraster, Bänder
  function coverArt(b) {
    const v = b.vis;
    const a = U.esc(v.accent), c2 = U.esc(U.shade(v.c, U.luminance(v.c) > 0.3 ? -0.25 : 0.22));
    switch (v.cover) {
      case "circle":
        return '<svg viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="g' + b.seed +
          '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + a + '" stop-opacity=".95"/><stop offset="1" stop-color="' + c2 +
          '" stop-opacity=".6"/></linearGradient></defs><circle cx="62" cy="58" r="36" fill="url(#g' + b.seed + ')"/><circle cx="80" cy="34" r="5" fill="' + a + '" opacity=".7"/></svg>';
      case "dots": {
        let s = "";
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
          s += '<circle cx="' + (14 + j * 9) + '" cy="' + (16 + i * 9) + '" r="2.6" fill="' + (i === j ? a : c2) + '"/>';
        return '<svg viewBox="0 0 100 150" preserveAspectRatio="xMinYMin meet" aria-hidden="true">' + s + "</svg>";
      }
      case "band":
        return '<svg viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="52" width="100" height="56" fill="' + a + '"/><rect x="0" y="48" width="100" height="2" fill="' + a + '" opacity=".6"/><rect x="0" y="110" width="100" height="2" fill="' + a + '" opacity=".6"/></svg>';
      case "type":
        return '<svg viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true"><path d="M0 150 L100 70 L100 150 Z" fill="' + c2 + '" opacity=".55"/><path d="M0 150 L100 104 L100 150 Z" fill="' + a + '" opacity=".65"/></svg>';
      default:
        return '<svg viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden="true"><rect x="6" y="6" width="88" height="138" fill="none" stroke="' + a + '" stroke-width="1.2"/><rect x="9" y="9" width="82" height="132" fill="none" stroke="' + a + '" stroke-width=".5"/><path d="M42 112 h16 M50 106 v12" stroke="' + a + '" stroke-width="1.2"/></svg>';
    }
  }

  function coverHTML(b) {
    const v = b.vis;
    const len = b.short.length;
    const tsize = len > 42 ? 0.72 : len > 26 ? 0.84 : len > 14 ? 1 : 1.18;
    return '<span class="cv cv--' + v.cover + (b.type === "hard" ? " cv--hard" : "") + '" style="--ts:' + tsize + '">' +
      '<span class="cv__art">' + coverArt(b) + "</span>" +
      '<span class="cv__t">' + U.esc(b.short) + "</span>" +
      '<span class="cv__a">' + U.esc(b.author) + "</span>" +
      (ICONS[b.type] ? '<span class="cv__badge" title="' + U.esc(M.TYPE[b.type].label) + '">' + ICONS[b.type] + "</span>" : "") +
      "</span>";
  }

  // Echtes Cover über das generierte legen, sobald es geladen ist
  function attachCover(coverEl, b, size) {
    if (!coverEl || coverEl.querySelector(".cv__img")) return;
    const urls = BS.covers.coverUrls(b, size || "M");
    if (!urls.length) return;
    const img = new Image();
    img.className = "cv__img";
    img.alt = "";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    // Fehlt die lokale Datei, kommt der nächste Kandidat dran (Open Library)
    const next = () => {
      const url = urls.shift();
      if (url) img.src = url;
      else img.remove();
    };
    const failed = () => {
      BS.covers.markFailedUrl(b, img.getAttribute("src"));
      next();
    };
    img.onload = () => {
      // Open Library liefert bei fehlenden Covern teils 1×1-Pixel
      if (img.naturalWidth < 20) return failed();
      coverEl.classList.add("has-img");
      requestAnimationFrame(() => img.classList.add("is-loaded"));
    };
    img.onerror = failed;
    next();
    coverEl.append(img);
  }

  BS.spine = { decorate, styleVars, spineHTML, coverHTML, attachCover, ICONS };
})();
