/* Bücherregal – CSV lesen/schreiben (RFC 4180, inkl. Zeilenumbrüchen in Rezensionen) */
(function () {
  "use strict";
  const BS = (window.BS = window.BS || {});

  // Trennzeichen aus der Kopfzeile raten: Goodreads liefert Kommas, ein in
  // deutschem Excel neu gespeicherter Export hat Semikolons.
  function sniff(text) {
    const nl = text.search(/\r?\n/);
    const head = text.slice(0, nl < 0 ? 2000 : nl);
    const counts = { ",": 0, ";": 0, "\t": 0 };
    let inQ = false;
    for (const c of head) {
      if (c === '"') inQ = !inQ;
      else if (!inQ && c in counts) counts[c]++;
    }
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  }

  function parse(text) {
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const sep = sniff(text);
    const rows = [];
    let row = [], field = "", inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else inQ = false;
        } else field += c;
      } else if (c === '"') inQ = true;
      else if (c === sep) {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else field += c;
    }
    if (field !== "" || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows.filter((r) => r.length > 1 || (r[0] || "").trim() !== "");
  }

  function toObjects(text) {
    const rows = parse(text);
    if (!rows.length) return [];
    const head = rows.shift().map((h) => h.trim());
    return rows.map((r) => {
      const o = {};
      head.forEach((h, i) => (o[h] = r[i] == null ? "" : r[i]));
      return o;
    });
  }

  function quote(v) {
    const s = String(v == null ? "" : v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function stringify(objects, headers) {
    const lines = [headers.map(quote).join(",")];
    for (const o of objects) lines.push(headers.map((h) => quote(o[h])).join(","));
    return lines.join("\r\n");
  }

  BS.csv = { parse, toObjects, stringify };
})();
