# ICE Verbindungen – Fahrten-Tracker

Web-App zum Festhalten gefahrener ICE-Verbindungen, optimiert fürs iPhone.
Design und Bedienlogik wie die Taufnamen-App (siehe `../ice_taufe/`).

Eine Fahrt besteht aus **Datum, Zugnummer, Von-/Nach-Bahnhof, Linie und Anlass
(privat/geschäftlich)** – z. B. „ICE 106 am 05.03.2026 von Baden-Baden nach Köln,
privat“. Daraus errechnet die App, welcher Anteil des ICE-Liniennetzes bereits
abgefahren ist. Fahrpläne, Abfahrtszeiten oder Verspätungen kommen bewusst nicht vor.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | App-Shell (iOS-optimiert, PWA-Meta-Tags) |
| `style.css` | iOS-inspiriertes Design, Light/Dark Mode |
| `app.js` | Logik: Fahrten erfassen, Abdeckung berechnen, Filter, Sheets, localStorage |
| `data.js` | 44 ICE-Linien mit 63 Laufwegvarianten, 290 Bahnhöfe, offizielle Linienfarben |
| `standalone.html` | Einzeldatei-Variante (alles inline), erzeugt von `tools/build_standalone.py` |
| `tools/` | Python-Skripte, mit denen `data.js` aus Wikipedia erzeugt wurde |

## Features

- **Fahrt eintragen** in wenigen Schritten: Von- und Nach-Bahnhof wählen, die App
  schlägt automatisch die passenden ICE-Linien vor (bei mehreren Kandidaten wählt
  man die tatsächlich gefahrene aus). Dazu Datum, Zugnummer und privat/geschäftlich.
- Beim Ziel-Bahnhof werden die Bahnhöfe **auf einem gemeinsamen Laufweg** zuerst
  gelistet – wer trotzdem eine Umsteigeverbindung einträgt, bekommt einen Hinweis
  und kann sie speichern (zählt dann nicht zur Netzabdeckung).
- **Linien-Ansicht**: alle 44 ICE-Linien mit Fortschrittsbalken „gefahrene
  Abschnitte / Abschnitte gesamt“. Filter: Gefahren, Offen, Komplett, Sprinter.
- **Linien-Detail**: kompletter Laufweg als Streckenband – gefahrene Abschnitte
  und besuchte Halte sind grün markiert, Halte „nur einzelne Züge“ sind als solche
  gekennzeichnet. Darunter die eigenen Fahrten auf dieser Linie.
- **Fahrten-Ansicht**: alle Fahrten nach Datum, Filter privat/geschäftlich,
  Antippen zum Bearbeiten oder Löschen (mit Rückfrage).
- **Statistik**: Fortschrittsring über die Linien, Kacheln für Fahrten /
  Netzabdeckung (Abschnitte) / besuchte Bahnhöfe, Aufteilung privat–geschäftlich,
  Fahrten je Monat (12 Monate), Abschnittsabdeckung je gefahrener Linie sowie die
  häufigsten Ein- und Ausstiegsbahnhöfe.
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

1. Repo anlegen, Dateien pushen, in den Repo-Einstellungen *Pages* aktivieren.
2. URL in Safari öffnen → Teilen → **„Zum Home-Bildschirm"**.

Die Fahrten bleiben im localStorage des Geräts. (Tipp: gelegentlich über
„Exportieren" ein Backup sichern.) Alternativ `standalone.html` per AirDrop aufs
Gerät schieben und in Safari öffnen.

## Datenbasis

- [Wikipedia: Liste der Intercity-Express-Linien](https://de.wikipedia.org/wiki/Liste_der_Intercity-Express-Linien),
  Abschnitt „Aktuelle Linien (2026)“ – Laufwege, Fahrzeuge und die offiziellen
  Linienfarben. Zusätzliche Laufwege einzelner Zugpaare (Nachtläufe, Umleiter)
  sind bewusst nicht enthalten.

### Daten aktualisieren

```bash
cd tools
curl -s "https://de.wikipedia.org/w/index.php?title=Liste_der_Intercity-Express-Linien&action=raw" -o ../wiki_linien.txt
python parse_lines.py       # -> lines.json (lesbares Zwischenformat) und ../data.js
python build_standalone.py  # -> ../standalone.html
```

`parse_lines.py` gibt am Ende alle Linien mit ihren Halten aus – gut geeignet,
um eine neue Wikipedia-Fassung gegenzulesen.

Gespeicherte Fahrten referenzieren Bahnhöfe über ihre ID (den Wikipedia-Artikelnamen,
z. B. `Köln Hbf`), nicht über die Position in `data.js`. Ein neu erzeugtes `data.js`
darf die Reihenfolge also ändern. Wird ein Bahnhof in Wikipedia umbenannt, verliert
eine alte Fahrt allerdings ihren Bezugspunkt – dann in `tools/parse_lines.py` einen
Eintrag in `ALIAS` ergänzen.
