# -*- coding: utf-8 -*-
"""Erzeugt die Home-Bildschirm-Icons (apple-touch-icon) in ../icons/.

Motiv: ICE-rote Flaeche mit kursiver Wortmarke "ICE" und drei Speedlines.
Ohne abgerundete Ecken - iOS maskiert das Icon selbst.

    python tools/make_icons.py
"""
import io, os
from PIL import Image, ImageDraw, ImageFont

SIZES = (152, 167, 180)          # iPad, iPad Pro, iPhone
SS = 4                           # Supersampling fuer weiche Kanten
C1, C2 = (236, 0, 22), (179, 0, 15)   # Verlauf: DB-/ICE-Rot -> dunkler
FONTS = [
    r"C:\Windows\Fonts\ariblk.ttf",            # Arial Black
    r"C:\Windows\Fonts\arialbd.ttf",           # Arial Bold
    "/Library/Fonts/Arial Black.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
outdir = os.path.join(root, "icons")


def font(px):
    for path in FONTS:
        if os.path.exists(path):
            return ImageFont.truetype(path, px)
    raise SystemExit("Keine passende Schrift gefunden - FONTS in make_icons.py anpassen.")


def wordmark(S, text="ICE"):
    """Kursive weisse Wortmarke als RGBA-Layer in Groesse SxS."""
    f = font(int(S * 0.355))
    track = int(S * 0.02)                       # Laufweite
    widths = [f.getbbox(ch)[2] - f.getbbox(ch)[0] for ch in text]
    advances = [f.getlength(ch) for ch in text]
    total = sum(advances) + track * (len(text) - 1)

    layer = Image.new("RGBA", (S, S), (255, 255, 255, 0))
    d = ImageDraw.Draw(layer)
    x = (S - total) / 2.0
    for ch in text:
        d.text((x, S * 0.40), ch, font=f, fill=(255, 255, 255, 255), anchor="lm")
        x += f.getlength(ch) + track

    shear = 0.20                                # nach rechts geneigt
    return layer.transform((S, S), Image.AFFINE,
                           (1, shear, -shear * S * 0.40, 0, 1, 0),
                           resample=Image.BICUBIC)


def icon(size):
    S = size * SS
    img = Image.new("RGB", (S, S), C1)
    d = ImageDraw.Draw(img)
    for i in range(2 * S):                      # diagonaler Verlauf
        t = i / float(2 * S - 1)
        d.line([(i, 0), (0, i)], fill=tuple(int(a + (b - a) * t) for a, b in zip(C1, C2)))

    lines = Image.new("RGBA", (S, S), (255, 255, 255, 0))
    dl = ImageDraw.Draw(lines)
    lw = S * 0.05
    for i, (x1, alpha) in enumerate(((0.18, 255), (0.34, 191), (0.50, 128))):
        y = S * 0.70 + i * lw * 1.9
        dl.rounded_rectangle([(S * x1 - lw / 2, y - lw / 2), (S * 0.82 + lw / 2, y + lw / 2)],
                             radius=lw / 2, fill=(255, 255, 255, alpha))

    img = Image.alpha_composite(img.convert("RGBA"), lines)
    img = Image.alpha_composite(img, wordmark(S))
    return img.convert("RGB").resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    if not os.path.isdir(outdir):
        os.makedirs(outdir)
    for s in SIZES:
        p = os.path.join(outdir, "icon-%d.png" % s)
        icon(s).save(p, "PNG", optimize=True)
        print("%s (%d Bytes)" % (os.path.relpath(p, root), os.path.getsize(p)))
