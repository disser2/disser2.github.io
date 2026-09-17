# -*- coding: utf-8 -*-
"""Erzeugt die App-Icons (../icons/icon-*.png) fuer den iOS-Homescreen.

Gemeinsame Designsprache mit den Schwester-Apps "ICE Verbindungen" und
"ICE Taufnamen" (../../ice-routes/tools/make_icons.py):

  * Entwurfsraster 1024x1024, randlos (iOS rundet die Ecken selbst ab)
  * senkrechter Farbverlauf, weisse geometrisch konstruierte Marke
  * darunter dasselbe Signaturband aus weissen Rundbalken der Staerke 44
    (Radius 22) mit zwei Halten - hier Start- und Zielflughafen

Unterschiede zu den ICE-Icons: der Verlauf ist blau (#0e63d6 -> #08347a) statt
rot, und statt der Wortmarke "ICE" steht die Draufsicht eines Verkehrsflugzeugs
darueber. Wer eines der drei Icons aendert, sollte die anderen mitziehen.

Kein Fremdpaket noetig: die Grafik wird aus geometrischen Formen mit 4x-
Supersampling gerastert und mit zlib als PNG geschrieben.
"""
import io, os, struct, sys, zlib

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "..", "icons")
SIZES = [120, 152, 167, 180]          # iPhone @2x, iPad, iPad Pro, iPhone @3x
D = 1024.0                             # Entwurfsflaeche
SS = 4                                 # Supersampling

TOP = (14, 99, 214)                    # Verlauf oben  (#0e63d6)
BOT = (8, 52, 122)                     # Verlauf unten (#08347a)
WHITE = (255, 255, 255)


# ---------------------------------------------------------------- Formen
def rrect(x0, y0, x1, y1, r=0):
    def f(x, y):
        if r <= 0:
            return x0 <= x <= x1 and y0 <= y <= y1
        cx = min(max(x, x0 + r), x1 - r)
        cy = min(max(y, y0 + r), y1 - r)
        if x0 <= x <= x1 and y0 <= y <= y1:
            return (x - cx) ** 2 + (y - cy) ** 2 <= r * r or \
                   (x0 + r <= x <= x1 - r) or (y0 + r <= y <= y1 - r)
        return False
    return f


def circle(cx, cy, r):
    return lambda x, y: (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def poly(pts):
    """Punkt-in-Polygon (Strahlenverfahren) - fuer Tragflaechen und Leitwerk."""
    def f(x, y):
        inside = False
        n = len(pts)
        for i in range(n):
            ax, ay = pts[i]
            bx, by = pts[(i + 1) % n]
            if (ay > y) != (by > y):
                t = (y - ay) / (by - ay)
                if x < ax + t * (bx - ax):
                    inside = not inside
        return inside
    return f


# Verkehrsflugzeug von oben plus Streckenband mit zwei Halten
def shapes():
    s = []
    s.append(("rumpf", rrect(488, 90, 536, 620, 24)))
    s.append(("flaeche", poly([(504, 270), (520, 270), (872, 490), (872, 536),
                               (520, 410), (504, 410), (152, 536), (152, 490)])))
    s.append(("leitwerk", poly([(504, 520), (520, 520), (688, 614), (688, 648),
                                (520, 580), (504, 580), (336, 648), (336, 614)])))
    s.append(("route", rrect(300, 718, 724, 762, 22)))
    s.append(("stop1", circle(300, 740, 62)))
    s.append(("stop2", circle(724, 740, 62)))
    return s


HOLES = [circle(300, 740, 26), circle(724, 740, 26)]   # blaue Punkte in den Halten


def color_at(x, y, white_shapes):
    t = y / D
    bg = tuple(int(TOP[i] + (BOT[i] - TOP[i]) * t) for i in range(3))
    for _, f in white_shapes:
        if f(x, y):
            for h in HOLES:
                if h(x, y):
                    return bg
            return WHITE
    return bg


# ---------------------------------------------------------------- PNG
def write_png(path, size, pixels):
    raw = b"".join(bytes([0]) + bytes(row) for row in pixels)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = (bytes([137, 80, 78, 71, 13, 10, 26, 10])
           + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    io.open(path, "wb").write(png)


def render(size, white_shapes):
    rows = []
    step = D / size
    sub = step / SS
    for py in range(size):
        row = []
        for px in range(size):
            r = g = b = 0
            for sy in range(SS):
                y = (py * step) + (sy + 0.5) * sub
                for sx in range(SS):
                    x = (px * step) + (sx + 0.5) * sub
                    c = color_at(x, y, white_shapes)
                    r += c[0]; g += c[1]; b += c[2]
            n = SS * SS
            row += [r // n, g // n, b // n]
        rows.append(row)
    return rows


if not os.path.isdir(OUT):
    os.makedirs(OUT)

sh = shapes()
for s in SIZES:
    p = os.path.join(OUT, "icon-%d.png" % s)
    write_png(p, s, render(s, sh))
    print("icon-%d.png  %.1f KB" % (s, os.path.getsize(p) / 1024))
