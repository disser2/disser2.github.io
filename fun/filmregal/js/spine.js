/* Filmregal – Aussehen der Hüllen: Maße, Farbe, Rückenstil, gestalteter
   Rücken und gestaltetes Cover (wenn es kein Plakat gibt) */
(function () {
  "use strict";
  const FR = (window.FR = window.FR || {});
  const U = FR.util, M = FR.model;

  const GOLD = "#d8b45f", CREAM = "#f3e9d2";
  // Höhe [Mittel, Streuung], Rückenbreite bei normaler Laufzeit, Seitenverhältnis der Front
  const DIMS = {
    vhs: { h: [196, 3], w: 26, ratio: 0.55 },
    dvd: { h: [202, 2], w: 15, ratio: 0.71 },
    bd: { h: [182, 2], w: 14, ratio: 0.77 },
    uhd: { h: [182, 2], w: 14, ratio: 0.77 },
  };
  const STYLES = {
    vhs: ["label", "block", "stripe", "penguin", "classic", "block"],
    dvd: ["modern", "block", "stripe", "label", "penguin", "modern"],
    bd: ["modern", "label", "modern"],
    uhd: ["modern", "label", "modern"],
  };
  const FONTS = ["serif", "sans", "cond"];
  const COVER_VARIANTS = ["circle", "frame", "band", "type", "dots"];

  // Maße & Farben. Breite ∝ Laufzeit (lange Filme sind dicke Mehr-Disc-Boxen),
  // Höhe und Format nach Ära.
  function decorate(b) {
    const r = U.rng(b.seed);
    const d = DIMS[b.type] || DIMS.dvd;
    const h = Math.round(d.h[0] + (r() * 2 - 1) * d.h[1]);
    const factor = b.runtime ? U.clamp(b.runtime / 110, 0.82, 1.7) : 1;
    const w = Math.round(d.w * factor);

    const g = M.GENRE[b.genre] || M.GENRE.none;
    let c = g.pal[Math.floor(r() * g.pal.length)];
    c = U.shade(c, (r() - 0.5) * 0.2);
    if (b.type === "uhd") c = U.shade(c, -0.18); // 4K-Hüllen sind schwarz, die Einleger dunkler
    const ink = U.inkFor(c);
    const dark = U.luminance(c) < 0.18;
    const styles = STYLES[b.type] || STYLES.dvd;
    let style = styles[Math.floor(r() * styles.length)];
    let font = FONTS[Math.floor(r() * FONTS.length)];
    if (style === "classic" || style === "penguin") font = "serif";
    if (style === "stripe" && font === "serif") font = "cond";
    // Zweitfarbe: Gold auf dunklem Grund, Creme oder ein Ton derselben Familie
    const other = g.pal[Math.floor(r() * g.pal.length)];
    let accent = style === "classic" ? (dark ? GOLD : U.shade(c, -0.45))
      : style === "label" || style === "penguin" ? CREAM
      : r() < 0.5 ? U.shade(other, r() < 0.5 ? 0.35 : -0.35) : dark ? U.shade(c, 0.5) : U.shade(c, -0.4);
    if (style === "block" && U.contrast(accent, c) < 1.4) accent = U.shade(c, U.luminance(c) > 0.3 ? -0.45 : 0.5);
    const accentInk = U.inkFor(accent);
    const hs = U.hue(c);
    b.vis = {
      h, w, ratio: d.ratio, c, ink, accent, accentInk, style, font,
      logo: Math.floor(r() * 4),
      cover: COVER_VARIANTS[Math.floor(r() * COVER_VARIANTS.length)],
      lean: r(), decor: r(), tilt: (r() - 0.5) * 2,
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
    const reserve = (v.style === "penguin" ? 0.42 : v.style === "block" ? 0.38 : 0.3) +
      (b.type === "bd" || b.type === "uhd" ? 0.1 : 0);
    const avail = v.h * (1 - reserve);
    let fs = U.clamp(v.w * 0.42, 8.5, 14);
    v.wrap = false;
    if (len * fs * cw > avail) {
      const two = U.clamp(Math.min(v.w * 0.27, (avail * 2) / (len * cw)), 7.5, 12);
      const one = Math.max(7.5, avail / (len * cw));
      if (v.w >= 34 && two > one + 0.6) {
        fs = two;
        v.wrap = true;
      } else fs = Math.min(fs, one);
    }
    v.fs = Math.round(fs * 10) / 10;
    v.afs = U.clamp(v.w * 0.3, 6.5, 8.5);
  }

  const CAP = { bd: "BD", uhd: "4K" };
  const MARK = { vhs: "VHS", dvd: "DVD" };
  const STRIP = { bd: "Blu-ray", uhd: "4K Ultra HD" };

  function styleVars(b) {
    const v = b.vis;
    return "--w:" + v.w + ";--h:" + v.h + ";--ratio:" + v.ratio + ";--c:" + v.c + ";--ink:" + v.ink +
      ";--acc:" + v.accent + ";--acc-ink:" + v.accentInk + ";--fs:" + v.fs + ";--afs:" + v.afs;
  }

  function spineHTML(b) {
    const v = b.vis;
    const cls = "sp sp--" + v.style + " sp--" + v.font + " sp--" + b.type + (v.wrap ? " sp--wrap" : "");
    return '<span class="' + cls + '">' +
      (CAP[b.type] ? '<span class="sp__cap">' + CAP[b.type] + "</span>" : "") +
      '<span class="sp__band sp__band--top"></span>' +
      '<span class="sp__t">' + U.esc(b.short) + "</span>" +
      '<span class="sp__a">' + (b.year != null ? b.year : "") + "</span>" +
      (MARK[b.type] ? '<span class="sp__logo sp__logo--fmt">' + MARK[b.type] + "</span>"
        : '<span class="sp__logo sp__logo--' + v.logo + '"></span>') +
      '<span class="sp__band sp__band--bottom"></span>' +
      "</span>";
  }

  // Motive: großer Kreis, Punkteraster, Bänder
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
          s += '<circle cx="' + (14 + j * 9) + '" cy="' + (22 + i * 9) + '" r="2.6" fill="' + (i === j ? a : c2) + '"/>';
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
    return '<span class="cv cv--' + v.cover + " cv--" + b.type + '" style="--ts:' + tsize + '">' +
      '<span class="cv__art">' + coverArt(b) + "</span>" +
      '<span class="cv__t">' + U.esc(b.short) + "</span>" +
      '<span class="cv__a">' + U.esc(b.director || (b.year != null ? b.year : "")) + "</span>" +
      (STRIP[b.type] ? '<span class="cv__strip">' + STRIP[b.type] + "</span>" : "") +
      "</span>";
  }

  // Plakat über das gestaltete Cover legen, sobald es geladen ist
  function attachCover(coverEl, b, size) {
    if (!coverEl || coverEl.querySelector(".cv__img")) return;
    const urls = FR.enrich.posterUrls(b, size || "M");
    if (!urls.length) return;
    const img = new Image();
    img.className = "cv__img";
    img.alt = "";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    const failed = () => {
      FR.enrich.markFailed(b);
      img.remove();
    };
    img.onload = () => {
      if (img.naturalWidth < 20) return failed();
      coverEl.classList.add("has-img");
      requestAnimationFrame(() => img.classList.add("is-loaded"));
    };
    img.onerror = failed;
    img.src = urls[0];
    coverEl.append(img);
  }

  FR.spine = { decorate, styleVars, spineHTML, coverHTML, attachCover };
})();
