# ICE Verbindungen – Fahrten-Tracker

Web-App zum Festhalten gefahrener ICE-Verbindungen, optimiert fürs iPhone.
Design und Bedienlogik wie die Taufnamen-App (siehe `../ice_taufe/`).

Eine Fahrt besteht aus **Datum, Zugnummer, Von-/Nach-Bahnhof, Linie, Anlass
(privat/geschäftlich) und Klasse (1./2.)** – z. B. „ICE 106 am 05.03.2026 von
Baden-Baden nach Köln, privat, 2. Klasse“. Daraus errechnet die App, welcher Anteil
des ICE-Liniennetzes bereits abgefahren ist, und zeigt ihn auf einer Netzkarte.
Fahrpläne, Abfahrtszeiten oder Verspätungen kommen bewusst nicht vor.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | App-Shell (iOS-optimiert, PWA-Meta-Tags) |
| `style.css` | iOS-inspiriertes Design, Light/Dark Mode |
| `app.js` | Logik: Fahrten erfassen, Abdeckung berechnen, Filter, Sheets, localStorage |
| `map.js` | Netzkarte: zeichnet Basiskarte und Liniennetz als SVG |
| `geo.js` | Basiskarte: Landflächen, Grenzen und Seen Europas (Natural Earth, vereinfacht) |
| `data.js` | 44 ICE-Linien mit 63 Laufwegvarianten, 290 Bahnhöfe (mit Koordinaten), offizielle Linienfarben |
| `icons/` | App-Icons für den iOS-Homescreen (120/152/167/180 px), erzeugt von `tools/make_icons.py` |
| `standalone.html` | Einzeldatei-Variante (alles inline), erzeugt von `tools/build_standalone.py` |
| `tools/` | Python-Skripte, mit denen `data.js` aus Wikipedia erzeugt wurde |

## Features

- **Fahrt eintragen** in wenigen Schritten: Von- und Nach-Bahnhof wählen, die App
  schlägt automatisch die passenden ICE-Linien vor (bei mehreren Kandidaten wählt
  man die tatsächlich gefahrene aus). Dazu Datum, Zugnummer, privat/geschäftlich
  und 1./2. Klasse (die zuletzt gewählte Klasse ist beim nächsten Mal vorbelegt).
- Beim Ziel-Bahnhof werden die Bahnhöfe **auf einem gemeinsamen Laufweg** zuerst
  gelistet – wer trotzdem eine Umsteigeverbindung einträgt, bekommt einen Hinweis
  und kann sie speichern (zählt dann nicht zur Netzabdeckung).
- **Linien-Ansicht**: alle 44 ICE-Linien mit Fortschrittsbalken „gefahrene
  Abschnitte / Abschnitte gesamt“. Filter: Gefahren, Offen, Komplett, Sprinter.
- **Linien-Detail**: kompletter Laufweg als Streckenband – gefahrene Abschnitte
  und besuchte Halte sind grün markiert, Halte „nur einzelne Züge“ sind als solche
  gekennzeichnet. Darunter die eigenen Fahrten auf dieser Linie.
- **Karten-Ansicht**: das komplette ICE-Netz auf einer echten Landkarte
  (Küstenlinien, Landesgrenzen, Seen), gezeichnet aus den
  Bahnhofskoordinaten. Grau = Liniennetz, farbig = selbst gefahrene Abschnitte
  (in der offiziellen Linienfarbe), grüne Punkte = besuchte Bahnhöfe. Eine Linie
  antippen hebt sie hervor und blendet ihre Abdeckung ein; ein Tipp auf die
  Info-Leiste öffnet das Linien-Detail. Ziehen verschiebt, zwei Finger (oder
  Mausrad) zoomen; die Knöpfe rechts springen zurück auf Deutschland bzw. das
  ganze Netz. Im Linien-Detail zeigt eine Mini-Karte den Laufweg der Linie.
- **Fahrten-Ansicht**: alle Fahrten nach Datum, Filter privat/geschäftlich und
  1./2. Klasse, Antippen zum Bearbeiten oder Löschen (mit Rückfrage).
- **Statistik**: Fortschrittsring über die Linien, Kacheln für Fahrten /
  Netzabdeckung (Abschnitte) / besuchte Bahnhöfe, Aufteilung privat–geschäftlich
  und 1./2. Klasse, Fahrten je Monat (12 Monate), Abschnittsabdeckung je gefahrener
  Linie sowie die häufigsten Ein- und Ausstiegsbahnhöfe.
- Export/Import der Fahrten (JSON, via Teilen/Zwischenablage), Speicherung in
  `localStorage`.

### Wie die Abdeckung gerechnet wird

Jede Linie besteht aus ihren Laufwegvarianten; benachbarte Halte bilden einen
**Abschnitt**. Eine Fahrt markiert alle Abschnitte zwischen Von- und Nach-Bahnhof
auf der gewählten Linie (bei mehreren Varianten die kürzeste passende) als
gefahren. Netzweit ergeben die 44 Linien 392 verschiedene Abschnitte; ein Abschnitt,
den mehrere Linien befahren, zählt netzweit einmal, in jeder Linie aber einzeln.

## Lokal starten

```bash
python -m http.server 8124
```

Dann <http://localhost:8124> öffnen. (Doppelklick auf `standalone.html`
funktioniert ebenfalls, ganz ohne Server.)

## Aufs iPhone bringen

Die App ist statisch – am einfachsten über GitHub Pages:

1. Repo anlegen, Dateien pushen (inklusive `icons/`), in den Repo-Einstellungen
   *Pages* aktivieren.
2. URL in Safari öffnen → Teilen → **„Zum Home-Bildschirm"**.

Auf dem Homescreen erscheint dann das rote ICE-Icon (`apple-touch-icon`, 120/152/167/180 px),
und die App startet im Vollbild ohne Safari-Leisten.

Die Fahrten bleiben im localStorage des Geräts. (Tipp: gelegentlich über
„Exportieren" ein Backup sichern.) Alternativ `standalone.html` per AirDrop aufs
Gerät schieben und in Safari öffnen. In der Einzeldatei stecken die Icons als
Data-URI; ob iOS sie von dort als Homescreen-Icon übernimmt, ist versionsabhängig –
die gehostete Variante mit echten PNG-Dateien ist dafür der sichere Weg.

## Datenbasis

- [Wikipedia: Liste der Intercity-Express-Linien](https://de.wikipedia.org/wiki/Liste_der_Intercity-Express-Linien),
  Abschnitt „Aktuelle Linien (2026)“ – Laufwege, Fahrzeuge und die offiziellen
  Linienfarben. Zusätzliche Laufwege einzelner Zugpaare (Nachtläufe, Umleiter)
  sind bewusst nicht enthalten.
- Bahnhofskoordinaten für die Karte: Wikipedia-API (`prop=coordinates`). Die Linien
  sind eine reine Luftlinien-Darstellung – gezeichnet wird Bahnhof zu Bahnhof, nicht
  der tatsächliche Gleisverlauf.
- Kartengrundlage (Küsten, Grenzen, Seen): [Natural Earth](https://www.naturalearthdata.com/)
  1:50m, gemeinfrei. `tools/fetch_geo.py` lädt die Rohdaten (~5 MB), schneidet sie auf
  Europa zu, vereinfacht sie (Douglas-Peucker) und schreibt daraus die 166 KB in
  `geo.js`; die Rohdaten selbst liegen nicht im Projekt.

### Daten aktualisieren

```bash
cd tools
curl -s "https://de.wikipedia.org/w/index.php?title=Liste_der_Intercity-Express-Linien&action=raw" -o ../wiki_linien.txt
python parse_lines.py       # -> lines.json, stations.json und ../data.js
python fetch_coords.py      # Koordinaten neuer Bahnhöfe -> coords.json
python parse_lines.py       # nochmal: mischt coords.json in ../data.js ein
python fetch_geo.py         # Basiskarte -> ../geo.js (nur nötig, wenn sie fehlt)
python make_icons.py        # Homescreen-Icons -> ../icons/ (nur nach Icon-Änderung)
python build_standalone.py  # -> ../standalone.html
```

`fetch_coords.py` fragt nur Bahnhöfe ab, die noch nicht in `coords.json` stehen –
ein erneuter Lauf kostet also fast nichts.

`parse_lines.py` gibt am Ende alle Linien mit ihren Halten aus – gut geeignet,
um eine neue Wikipedia-Fassung gegenzulesen.

Gespeicherte Fahrten referenzieren Bahnhöfe über ihre ID (den Wikipedia-Artikelnamen,
z. B. `Köln Hbf`), nicht über die Position in `data.js`. Ein neu erzeugtes `data.js`
darf die Reihenfolge also ändern. Wird ein Bahnhof in Wikipedia umbenannt, verliert
eine alte Fahrt allerdings ihren Bezugspunkt – dann in `tools/parse_lines.py` einen
Eintrag in `ALIAS` ergänzen.
