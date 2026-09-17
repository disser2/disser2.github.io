/* Plane Spotting – Code-Auflösung

   Aus dem einen Wert, den man eintippt, wird alles andere hergeleitet:

     "D-AIMA"  Kennzeichen  -> Staat aus REGPREFIX, online Typ/Halter/Foto
     "LH400"   Flugnummer   -> Airline aus AIRLINES, online Start- und Zielflughafen
     "DLH400"  ICAO-Rufname -> wie Flugnummer

   Offline funktioniert immer der erste Teil (reine Tabellenarbeit aus data.js).
   Die Online-Abfrage bei adsbdb.com (frei, ohne Schlüssel) legt Typ, Halter,
   Foto und Route darüber und landet im localStorage-Cache, damit dasselbe
   Flugzeug kein zweites Mal abgefragt wird. */
var Lookup = (function () {
  "use strict";

  var API = "https://api.adsbdb.com/v0/";
  var CACHE_KEY = "planeSpotting.cache.v1";
  var CACHE_MAX = 400;                       // Einträge, danach fliegt das Älteste raus
  var ROUTE_TTL = 90 * 24 * 3600 * 1000;     // Flugnummern können umziehen, Kennzeichen nicht

  // ---------- Tabellen ----------
  var AL_IATA = {}, AL_ICAO = {}, TYPE_OF = {};
  AIRLINES.forEach(function (a) {
    if (a[0] && !AL_IATA[a[0]]) AL_IATA[a[0]] = a;
    if (a[1] && !AL_ICAO[a[1]]) AL_ICAO[a[1]] = a;
  });
  TYPES.forEach(function (t) { TYPE_OF[t[0]] = t; });
  var DCLASS = {};
  DREG.forEach(function (d) { DCLASS[d[0]] = d[1]; });

  function normalize(s) {
    return String(s || "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  }

  // ---------- Was ist das für ein Code? ----------
  // Kennzeichen haben einen Bindestrich (D-AIMA, HB-JHA, 9H-QAA) oder sind
  // amerikanisch/japanisch ohne (N12345, JA8089). Alles andere mit 2-3 Zeichen
  // Präfix und Ziffern ist eine Flugnummer.
  function kindOf(code) {
    if (/^[A-Z0-9]{1,4}-[A-Z0-9]{1,5}$/.test(code)) return "reg";
    if (/^N[0-9]{1,5}[A-Z]{0,2}$/.test(code)) return "reg";
    if (/^JA[0-9]{3,4}[A-Z]?$/.test(code)) return "reg";
    if (/^[A-Z0-9]{2}[0-9]{1,4}[A-Z]?$/.test(code)) return "flt";
    if (/^[A-Z]{3}[0-9]{1,4}[A-Z]?$/.test(code)) return "flt";
    return "";
  }

  // Staatszugehörigkeit: längster passender Präfix gewinnt (REGPREFIX ist danach
  // sortiert). Hinter einem Präfix ohne Bindestrich muss "-" oder eine Ziffer
  // folgen, sonst würde "D" auch in "DLH400" treffen.
  function countryOf(code) {
    for (var i = 0; i < REGPREFIX.length; i++) {
      var p = REGPREFIX[i][0];
      if (code.indexOf(p) !== 0) continue;
      var next = code.charAt(p.length);
      if (p.indexOf("-") >= 0 || next === "-" || /[0-9]/.test(next)) {
        return { name: REGPREFIX[i][1], iso: REGPREFIX[i][2] };
      }
    }
    return null;
  }

  // Flugnummer -> Airline: erst zweistellig (IATA), dann dreistellig (ICAO)
  function airlineOf(code) {
    var two = code.slice(0, 2), three = code.slice(0, 3);
    if (/^[A-Z]{3}[0-9]/.test(code) && AL_ICAO[three]) return AL_ICAO[three];
    if (/^[A-Z0-9]{2}[0-9]/.test(code) && AL_IATA[two]) return AL_IATA[two];
    if (AL_ICAO[three]) return AL_ICAO[three];
    return null;
  }

  function typeName(t) {
    var e = TYPE_OF[t];
    return e ? e[1] : (t || "");
  }
  function typeEntry(t) { return TYPE_OF[t] || null; }

  // ---------- Offline-Teil ----------
  function offline(raw) {
    var code = normalize(raw);
    var kind = kindOf(code);
    var out = { code: code, kind: kind, src: "offline" };
    if (kind === "reg") {
      out.reg = code;
      var c = countryOf(code);
      if (c) { out.cty = c.iso; out.ctyn = c.name; }
      if (code.indexOf("D-") === 0) {
        var cls = DCLASS[code.charAt(2)];
        if (cls) out.dcls = cls;
      }
    } else if (kind === "flt") {
      var a = airlineOf(code);
      if (a) { out.al = a[2]; out.alc = a[1] || ""; out.alia = a[0] || ""; out.aln = a[3]; }
    }
    return out;
  }

  // ---------- Cache ----------
  function cacheAll() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function cacheGet(code) {
    var e = cacheAll()[code];
    if (!e) return null;
    if (e.d && e.d.kind === "flt" && Date.now() - (e.t || 0) > ROUTE_TTL) return null;
    return e.d;
  }
  function cachePut(code, data) {
    var all = cacheAll();
    all[code] = { t: Date.now(), d: data };
    var keys = Object.keys(all);
    if (keys.length > CACHE_MAX) {
      keys.sort(function (x, y) { return (all[x].t || 0) - (all[y].t || 0); });
      keys.slice(0, keys.length - CACHE_MAX).forEach(function (k) { delete all[k]; });
    }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(all)); } catch (e) {}
  }
  function cacheClear() {
    try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
  }

  // ---------- Online-Teil ----------
  function fetchJSON(url, cb) {
    if (!window.fetch) return cb(null);
    var done = false;
    var timer = setTimeout(function () { if (!done) { done = true; cb(null); } }, 9000);
    fetch(url, { headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (done) return;
        done = true; clearTimeout(timer); cb(j);
      })
      .catch(function () {
        if (done) return;
        done = true; clearTimeout(timer); cb(null);
      });
  }

  function fromAircraft(j) {
    var a = j && j.response && j.response.aircraft;
    if (!a) return null;
    return {
      reg: a.registration || "",
      typ: a.icao_type || "",
      typn: a.type || "",
      man: a.manufacturer || "",
      al: a.registered_owner || "",
      alc: a.registered_owner_operator_flag_code || "",
      photo: a.url_photo_thumbnail || a.url_photo || "",
      photoBig: a.url_photo || "",
      src: "online"
    };
  }

  function fromRoute(j) {
    var f = j && j.response && j.response.flightroute;
    if (!f) return null;
    var out = { src: "online" };
    if (f.airline) {
      out.al = f.airline.name || "";
      out.alc = f.airline.icao || "";
      out.alia = f.airline.iata || "";
      out.aln = f.airline.country || "";
    }
    if (f.origin) { out.fr = f.origin.icao_code || ""; out.frn = f.origin.municipality || f.origin.name || ""; }
    if (f.destination) { out.to = f.destination.icao_code || ""; out.ton = f.destination.municipality || f.destination.name || ""; }
    if (f.callsign_iata) out.flt = f.callsign_iata;
    return out;
  }

  function merge(base, extra) {
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        if (extra[k] !== "" && extra[k] != null) out[k] = extra[k];
      });
      // der Staat kommt weiter aus dem Kennzeichen, nicht vom Halter
      if (base.cty) { out.cty = base.cty; out.ctyn = base.ctyn; }
    }
    return out;
  }

  /* resolve(code, online, cb)

     cb(info, final) wird ein- bis zweimal aufgerufen: sofort mit dem
     Offline-Ergebnis (final = false, wenn noch eine Abfrage läuft) und danach
     mit dem angereicherten Ergebnis. So steht im Formular ohne Verzögerung
     etwas Sinnvolles, auch wenn gerade kein Netz da ist. */
  function resolve(raw, online, cb) {
    var base = offline(raw);
    if (!base.kind) { cb(base, true); return; }

    var cached = cacheGet(base.code);
    if (cached) { cb(merge(base, cached), true); return; }
    if (!online || !navigator.onLine) { cb(base, true); return; }

    cb(base, false);
    var url = API + (base.kind === "reg" ? "aircraft/" : "callsign/") + encodeURIComponent(base.code);
    fetchJSON(url, function (j) {
      var extra = base.kind === "reg" ? fromAircraft(j) : fromRoute(j);
      if (extra) cachePut(base.code, extra);
      cb(merge(base, extra), true);
    });
  }

  return {
    normalize: normalize, kindOf: kindOf, offline: offline, resolve: resolve,
    countryOf: countryOf, airlineOf: airlineOf,
    typeName: typeName, typeEntry: typeEntry,
    cacheGet: cacheGet, cacheClear: cacheClear
  };
})();
