# Mahlzeiten-Tracker

Mobile-first Web-App (iPhone) zum schnellen Erfassen von Mahlzeiten.
Komplett offline, ohne Server, ohne Konto. Alles auf Deutsch.

## Auf dem iPhone einrichten

1. Ordner auf einen Webserver legen (oder z. B. GitHub Pages / Netlify).
   Alternativ im lokalen Netz: `python -m http.server 5599` im Projektordner
   starten und am iPhone `http://<IP-des-Rechners>:5599` öffnen.
2. In Safari öffnen → Teilen-Symbol → **Zum Home-Bildschirm**.
   Danach startet die App im Vollbild ohne Safari-Leiste.

> Hinweis: `localStorage` und die Zwischenablage funktionieren am
> zuverlässigsten über `http(s)://`, nicht per `file://`.

## Bedienung

**Erfassen** – Zeitpunkt ist automatisch „jetzt“. Zutaten antippen,
„Speichern“. Das war's (2–3 Taps, kein Scrollen).

* **Zeit ändern:** auf die Zeit-Pille oder den Stift tippen →
  Datum/Uhrzeit wählen, dort auch Frühstück/Mittag/Abend/Snack ändern.
  Die Mahlzeitenart wird sonst automatisch aus der Uhrzeit abgeleitet.
* **Häufig-Leiste:** die meistgegessenen Kombinationen der letzten
  Einträge – ein Tap übernimmt die komplette Auswahl.
* **Gericht-Dropdown:** feste Rezepte (Nudelauflauf, Chili con carne,
  Shakshuka, Japanisches Curry, Ramen, Maultaschen, Pelmeni,
  Linsensuppe mit Kartoffeln, Sauerkrautsuppe mit Mettenden und
  Kartoffeln, Hähnchen-Curry mit Gemüse und Reis, Pizza) lassen sich
  direkt auswählen, ohne die Zutaten einzeln anzutippen. Zutaten-Chips
  lassen sich zusätzlich wählen (z. B. „Pizza“ + „Salat“). Über
  „＋ Eigenes Gericht…“ am Ende der Liste eigene Rezepte anlegen.
* **Eigene Zutaten:** „+“ rechts neben der Kategorie-Überschrift.
* **Notiz:** optional über „+ Notiz hinzufügen“.

**Verlauf** – nach Tagen gruppiert. Eintrag antippen → bearbeiten,
Text kopieren oder löschen (mit Rückgängig).

**Statistik** – Woche/Monat/Jahr: Anteil erfasster Tage, Anzahl
Mahlzeiten, Verlaufsbalken und Ranglisten je Kategorie sowie je Gericht.

**Daten** – Export/Import und Einstellungen.

## Notizen-Text

Beim Speichern wird automatisch eine Zeile in die Zwischenablage gelegt
(abschaltbar unter *Daten → Automatisch kopieren*), zusätzlich liegt sie
im Hinweis unten mit „Text kopieren“ bereit:

```
2026-09-03 19:14 | Abend | Protein: Hähnchen | KH: Reis | Gemüse: Brokkoli | Beilagen: Salat | Notiz: auswärts
```

Das ISO-Datum vorne sorgt dafür, dass die Zeilen in der Notizen-App
chronologisch sortierbar bleiben.

## Daten & Sicherung

* Speicherung: `localStorage` unter dem Schlüssel `mahlzeiten.v1`
  (nur auf dem jeweiligen Gerät/Browser).
* **JSON exportieren** legt `mahlzeiten-JJJJ-MM-TT.json` ab,
  **JSON in Zwischenablage** ist der iPhone-freundliche Weg.
* **JSON importieren** akzeptiert Datei oder eingefügten Text:
  *Zusammenführen* ergänzt nur unbekannte Einträge (Dubletten werden
  über ID und Zeitstempel+Zutaten erkannt), *Ersetzen* überschreibt alles.

Format:

```json
{
  "app": "mahlzeiten-tracker",
  "v": 1,
  "exportedAt": "2026-09-03T17:14:49.131Z",
  "settings": { "autoCopy": true },
  "custom": { "protein": [], "carbs": [], "veggies": [], "sides": [], "dishes": ["Gulaschsuppe"] },
  "meals": [
    {
      "id": "mtlsc9m3n19f11",
      "ts": "2026-09-03T17:14:49.131Z",
      "type": "Abend",
      "dish": "",
      "sel": {
        "protein": ["Hähnchen"], "carbs": ["Reis"],
        "veggies": ["Brokkoli"], "sides": ["Salat"]
      },
      "note": ""
    }
  ]
}
```

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Struktur der vier Tabs |
| `styles.css` | iOS-Look, Hell/Dunkel automatisch |
| `app.js` | Logik: Erfassen, Verlauf, Statistik, Import/Export |
| `manifest.json`, `sw.js`, `icon*.png` | Home-Bildschirm & Offline-Cache |

Zutatenlisten stehen oben in `app.js` in der Konstante `CATS`, die
Gerichte-Liste für das Dropdown in der Konstante `DISHES` – dort
lassen sich Kategorien, Namen, Emojis und Rezepte dauerhaft anpassen.
