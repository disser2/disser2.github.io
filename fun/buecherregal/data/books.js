// Hier stehen die Bücher für die Website. Solange BOOKSHELF_DATA leer ist, lädt das
// Regal data/goodreads_library_export.csv (falls vorhanden) oder zeigt Beispieldaten.
//
// Befüllen – eine der beiden Varianten:
//   1. Im Regal: Daten → „Goodreads-CSV importieren“, kurz warten (Cover werden gesucht),
//      dann Daten → „books.js für die Website erzeugen“ und die Datei hier ablegen.
//   2. Lokal: python3 tools/build_books.py data/goodreads_library_export.csv
window.BOOKSHELF_DATA = null;
