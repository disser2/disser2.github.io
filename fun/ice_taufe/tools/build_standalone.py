# -*- coding: utf-8 -*-
"""Baut standalone.html: eine einzelne HTML-Datei (Artifact-tauglich) aus
index.html + style.css + app.js. Die Wappen-Data-URIs werden aus der
vorhandenen standalone.html uebernommen (Zeile `const TRAINS = [...]`)."""
import io, os, re, sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def read(name):
    return io.open(os.path.join(root, name), encoding="utf-8").read()

# 1) TRAINS-Zeile mit eingebetteten Wappen aus der bestehenden Datei holen
old = read("standalone.html")
m = re.search(r"^const TRAINS = .*$", old, re.M)
if not m:
    sys.exit("standalone.html enthaelt keine TRAINS-Zeile - bitte aus data.js neu einbetten.")
trains_line = m.group(0)

# 2) CSS: Dark Mode zusaetzlich ueber data-theme ansteuerbar machen (Artifact-Themes)
css = read("style.css")
dm = re.search(r"@media \(prefers-color-scheme: dark\) \{\n(  :root \{\n.*?\n  \}\n)\}\n", css, re.S)
if not dm:
    sys.exit("Dark-Mode-Block in style.css nicht gefunden.")
dark_vars = dm.group(1)
css = css.replace(dm.group(0),
    "@media (prefers-color-scheme: dark) {\n" +
    dark_vars.replace(":root {", ':root:not([data-theme="light"]) {', 1) + "}\n\n" +
    dark_vars.replace(":root {", ':root[data-theme="dark"] {', 1) + "\n")

# 3) Body-Markup aus index.html (ohne die externen script-Tags)
body = re.search(r"<body>\n(.*)\n</body>", read("index.html"), re.S).group(1)
body = re.sub(r'\n?<script src="[^"]+"></script>', "", body).strip()

html = (
    '<meta charset="UTF-8">\n'
    '<title>ICE Taufnamen</title>\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    "<style>\n" + css + "</style>\n\n\n" +
    body + "\n\n"
    "<script>\n" + trains_line + "\n" + read("app.js") + "</script>\n"
)
io.open(os.path.join(root, "standalone.html"), "w", encoding="utf-8", newline="\n").write(html)
print("standalone.html geschrieben (%.1f MB)" % (len(html.encode("utf-8")) / 1048576.0))
