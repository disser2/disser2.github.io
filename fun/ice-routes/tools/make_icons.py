# -*- coding: utf-8 -*-
"""Erzeugt die App-Icons (../icons/icon-*.png) fuer den iOS-Homescreen.

Kein Fremdpaket noetig: die Grafik wird aus geometrischen Formen mit 4x-
Supersampling gerastert und mit zlib als PNG geschrieben. Motiv: weisses "ICE"
ueber einer Strecke mit zwei Halten, auf DB-rotem Grund.
"""
import io, math, os, struct, sys, zlib

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "..", "icons")
SIZES = [120, 152, 167, 180]          # iPhone @2x, iPad, iPad Pro, iPhone @3x
D = 1024.0                             # Entwurfsflaeche
SS = 4                                 # Supersampling

TOP = (232, 18, 31)                    # Verlauf oben  (#e8121f)
BOT = (150, 10, 22)                    # Verlauf unten (#960a16)
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


def ring(cx, cy, ro, ri, gap_deg=0, gap_dir=0.0):
    """Kreisring; gap_deg schneidet einen Keil heraus (fuer das C)."""
    g = math.radians(gap_deg) / 2.0

    def f(x, y):
        dx, dy = x - cx, y - cy
        d2 = dx * dx + dy * dy
        if not (ri * ri <= d2 <= ro * ro):
            return False
        if gap_deg:
            a = math.atan2(dy, dx) - gap_dir
            a = (a + math.pi) % (2 * math.pi) - math.pi
            if abs(a) < g:
                return False
        return True
    return f


# "ICE" plus Strecke mit zwei Halten
def shapes():
    s = []
    s.append(("I", rrect(162, 292, 232, 592, 12)))
    s.append(("C", ring(432, 442, 150, 80, gap_deg=76, gap_dir=0.0)))
    s.append(("E", rrect(640, 292, 710, 592, 12)))
    s.append(("E1", rrect(640, 292, 862, 362, 12)))
    s.append(("E2", rrect(640, 407, 832, 477, 12)))
    s.append(("E3", rrect(640, 522, 862, 592, 12)))
    s.append(("rail", rrect(300, 680, 724, 724, 22)))
    s.append(("stop1", circle(300, 702, 62)))
    s.append(("stop2", circle(724, 702, 62)))
    return s


HOLES = [circle(300, 702, 26), circle(724, 702, 26)]   # rote Punkte in den Halten


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
    raw = b"".join(b"\x00" + bytes(row) for row in pixels)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = (b"\x89PNG\r\n\x1a\n"
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
