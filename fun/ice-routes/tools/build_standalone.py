# -*- coding: utf-8 -*-
"""Fasst index.html, style.css, data.js und app.js zu standalone.html zusammen.

Praktisch, um die App als einzelne Datei aufs iPhone zu bringen (AirDrop,
Mail, Dateien-App) - ohne Webserver und ohne Internetverbindung.
"""
import io, os, re

BASE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(BASE, "..")


def read(name):
    return io.open(os.path.join(APP, name), encoding="utf-8").read()


html = read("index.html")
html = html.replace('<link rel="stylesheet" href="style.css">',
                    "<style>" + read("style.css") + "</style>")
html = html.replace('<script src="data.js"></script>' + chr(10) + '<script src="app.js"></script>',
                    "<script>" + read("data.js") + chr(10) + read("app.js") + "</script>")

assert "style.css" not in html and 'src="app.js"' not in html, "Einbetten fehlgeschlagen"

out = os.path.join(APP, "standalone.html")
io.open(out, "w", encoding="utf-8").write(html)
print("standalone.html geschrieben:", round(os.path.getsize(out) / 1024, 1), "KB")
