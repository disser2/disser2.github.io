# -*- coding: utf-8 -*-
"""Erzeugt die App-Icons (../icons/icon-*.png) fuer den iOS-Homescreen.

Gleiche Designsprache wie die Schwester-Apps "ICE Taufnamen" und
"ICE Verbindungen" (../../ice_taufe, ../../ice-routes):

  * Entwurfsraster 1024x1024, randlos (iOS rundet die Ecken selbst ab)
  * Hintergrund: senkrechter Verlauf #e8121f -> #960a16
  * weisse, geometrisch konstruierte Formen (keine Schriftdatei)
  * unten ein Signaturband aus weissen Rundbalken der Staerke 44 (Radius 22)

Motiv hier: das Haltestellen-"H" in einem Ring, darunter eine Strecke mit
drei Halten - der mittlere ist ausgefuellt ("gesammelt").

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

TOP = (232, 18, 31)                    # Verlauf oben  (#e8121f)
BOT = (150, 10, 22)                    # Verlauf unten (#960a16)
WHITE = (255, 255, 255)


def rrect(x0, y0, x1, y1, r=0):
    def f(x, y):
        if not (x0 <= x <= x1 and y0 <= y <= y1):
            return False
        if r <= 0 or (x0 + r <= x <= x1 - r) or (y0 + r <= y <= y1 - r):
            return True
        cx = min(max(x, x0 + r), x1 - r)
        cy = min(max(y, y0 + r), y1 - r)
        return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
    return f


def circle(cx, cy, r):
    return lambda x, y: (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def ring(cx, cy, ro, ri):
    return lambda x, y: ri * ri <= (x - cx) ** 2 + (y - cy) ** 2 <= ro * ro


CY = 410                               # Mittelpunkt des Rings
WHITE_SHAPES = [
    ring(512, CY, 262, 200),           # Haltestellenring
    rrect(404, CY - 128, 468, CY + 128, 12),    # H links
    rrect(556, CY - 128, 620, CY + 128, 12),    # H rechts
    rrect(404, CY - 30, 620, CY + 30, 0),       # H Querbalken
    rrect(238, 772, 786, 816, 22),     # Strecke
    circle(238, 794, 58),              # Halt links
    circle(512, 794, 58),              # Halt Mitte (gesammelt)
    circle(786, 794, 58),              # Halt rechts
]
HOLES = [circle(238, 794, 26), circle(786, 794, 26)]   # offene Halte


def color_at(x, y):
    t = y / D
    bg = tuple(int(TOP[i] + (BOT[i] - TOP[i]) * t) for i in range(3))
    for h in HOLES:
        if h(x, y):
            return bg
    for f in WHITE_SHAPES:
        if f(x, y):
            return WHITE
    return bg


def write_png(path, size, rows):
    raw = b"".join(b"\x00" + bytes(row) for row in rows)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    io.open(path, "wb").write(png)


def render(size):
    rows = []
    step = D / size
    sub = step / SS
    for py in range(size):
        row = []
        for px in range(size):
            r = g = b = 0
            for sy in range(SS):
                y = py * step + (sy + 0.5) * sub
                for sx in range(SS):
                    c = color_at(px * step + (sx + 0.5) * sub, y)
                    r += c[0]; g += c[1]; b += c[2]
            n = SS * SS
            row += [r // n, g // n, b // n]
        rows.append(row)
    return rows


if not os.path.isdir(OUT):
    os.makedirs(OUT)
for s in SIZES:
    p = os.path.join(OUT, "icon-%d.png" % s)
    write_png(p, s, render(s))
    print("icon-%d.png  %.1f KB" % (s, os.path.getsize(p) / 1024))
