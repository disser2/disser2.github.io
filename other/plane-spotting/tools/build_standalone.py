# -*- coding: utf-8 -*-
"""Fasst index.html, style.css und die vier Skripte zu standalone.html zusammen.

Praktisch, um die App als einzelne Datei aufs iPhone zu bringen (AirDrop, Mail,
Dateien-App) - ohne Webserver. Die Einzeldatei ist wegen data.js und geo.js
knapp ein Megabyte gross; das ist der Preis dafuer, dass Flughaefen, Airlines
und Weltkarte offline dabei sind.
"""
import base64, io, os, re

BASE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(BASE, "..")
PARTS = ["data.js", "geo.js", "map.js", "lookup.js", "app.js"]


def read(name):
    return io.open(os.path.join(APP, name), encoding="utf-8").read()


html = read("index.html")
html = html.replace('<link rel="stylesheet" href="style.css">',
                    "<style>" + read("style.css") + "</style>")
scripts = chr(10).join('<script src="%s"></script>' % p for p in PARTS)
html = html.replace(scripts, "<script>" + chr(10).join(read(p) for p in PARTS) + "</script>")


# Homescreen-Icons als Data-URI einbetten, damit wirklich alles in einer Datei liegt
def inline_icon(m):
    path = os.path.join(APP, m.group(1))
    data = base64.b64encode(io.open(path, "rb").read()).decode("ascii")
    return 'href="data:image/png;base64,' + data + '"'


html = re.sub(r'href="(icons/icon-\d+\.png)"', inline_icon, html)

assert "style.css" not in html and 'src="app.js"' not in html, "Einbetten fehlgeschlagen"
assert "icons/icon-" not in html, "Icons nicht eingebettet"

out = os.path.join(APP, "standalone.html")
io.open(out, "w", encoding="utf-8").write(html)
print("standalone.html geschrieben:", round(os.path.getsize(out) / 1024, 1), "KB")
