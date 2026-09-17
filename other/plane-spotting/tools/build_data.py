# -*- coding: utf-8 -*-
"""Baut ../data.js aus airports.json, airlines.json und den kuratierten Tabellen.

data.js ist die komplette Offline-Datenbasis der App:

  AIRPORTS   [ICAO, IATA, Name, Stadt, Land, lat, lon, Groesse]
             Groesse 2 = grosser, 1 = mittlerer, 0 = kleiner Flughafen
  AIRLINES   [IATA, ICAO, Name, Land] - fuer "LH400" -> Lufthansa
  REGPREFIX  Kennzeichen-Praefix -> Staat (laengster Treffer gewinnt)
  DREG       Zusatz fuer deutsche Kennzeichen: D-A... -> Gewichtsklasse
  TYPES      [ICAO-Typcode, Name, Hersteller, Kategorie] - die Sammelliste

Praefix-, DREG- und Typenliste sind von Hand gepflegt (keine brauchbare freie
Quelle im passenden Zuschnitt); Flughaefen und Airlines kommen aus
fetch_airports.py bzw. fetch_airlines.py.
"""
import io, json, os, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "..", "data.js")

# ------------------------------------------------------------------ Airlines
# OpenFlights ist an vielen Stellen von 2017: eingestellte Gesellschaften stehen
# noch drin, neuere fehlen. Diese Liste wird darueber gelegt.
AIRLINE_FIX = [
    ("LH", "DLH", "Lufthansa", "Deutschland"),
    ("CL", "CLH", "Lufthansa CityLine", "Deutschland"),
    ("VL", "LCA", "Lufthansa City Airlines", "Deutschland"),
    ("EW", "EWG", "Eurowings", "Deutschland"),
    ("4Y", "OCN", "Discover Airlines", "Deutschland"),
    ("DE", "CFG", "Condor", "Deutschland"),
    ("X3", "TUI", "TUIfly", "Deutschland"),
    ("EN", "DLA", "Air Dolomiti", "Italien"),
    ("OS", "AUA", "Austrian Airlines", "Oesterreich"),
    ("LX", "SWR", "Swiss", "Schweiz"),
    ("WK", "EDW", "Edelweiss Air", "Schweiz"),
    ("SN", "BEL", "Brussels Airlines", "Belgien"),
    ("KL", "KLM", "KLM", "Niederlande"),
    ("WA", "KLC", "KLM Cityhopper", "Niederlande"),
    ("HV", "TRA", "Transavia", "Niederlande"),
    ("AF", "AFR", "Air France", "Frankreich"),
    ("A5", "HOP", "Air France Hop", "Frankreich"),
    ("TO", "TVF", "Transavia France", "Frankreich"),
    ("V7", "VOE", "Volotea", "Spanien"),
    ("VY", "VLG", "Vueling", "Spanien"),
    ("IB", "IBE", "Iberia", "Spanien"),
    ("I2", "IBS", "Iberia Express", "Spanien"),
    ("UX", "AEA", "Air Europa", "Spanien"),
    ("TP", "TAP", "TAP Air Portugal", "Portugal"),
    ("AZ", "ITY", "ITA Airways", "Italien"),
    ("BA", "BAW", "British Airways", "Grossbritannien"),
    ("VS", "VIR", "Virgin Atlantic", "Grossbritannien"),
    ("U2", "EZY", "easyJet", "Grossbritannien"),
    ("EC", "EJU", "easyJet Europe", "Oesterreich"),
    ("FR", "RYR", "Ryanair", "Irland"),
    ("RK", "RUK", "Ryanair UK", "Grossbritannien"),
    ("EI", "EIN", "Aer Lingus", "Irland"),
    ("W6", "WZZ", "Wizz Air", "Ungarn"),
    ("W9", "WUK", "Wizz Air UK", "Grossbritannien"),
    ("W4", "WMT", "Wizz Air Malta", "Malta"),
    ("DY", "NOZ", "Norwegian", "Norwegen"),
    ("SK", "SAS", "SAS Scandinavian Airlines", "Daenemark"),
    ("AY", "FIN", "Finnair", "Finnland"),
    ("FI", "ICE", "Icelandair", "Island"),
    ("LO", "LOT", "LOT Polish Airlines", "Polen"),
    ("OK", "CSA", "Czech Airlines", "Tschechien"),
    ("RO", "ROT", "Tarom", "Rumaenien"),
    ("JU", "ASL", "Air Serbia", "Serbien"),
    ("OU", "CTN", "Croatia Airlines", "Kroatien"),
    ("A3", "AEE", "Aegean Airlines", "Griechenland"),
    ("OA", "OAL", "Olympic Air", "Griechenland"),
    ("TK", "THY", "Turkish Airlines", "Tuerkei"),
    ("PC", "PGT", "Pegasus Airlines", "Tuerkei"),
    ("XQ", "SXS", "SunExpress", "Tuerkei"),
    ("XC", "CAI", "Corendon Airlines", "Tuerkei"),
    ("CD", "CND", "Corendon Dutch Airlines", "Niederlande"),
    ("LY", "ELY", "El Al", "Israel"),
    ("MS", "MSR", "EgyptAir", "Aegypten"),
    ("RJ", "RJA", "Royal Jordanian", "Jordanien"),
    ("EK", "UAE", "Emirates", "VAE"),
    ("EY", "ETD", "Etihad Airways", "VAE"),
    ("QR", "QTR", "Qatar Airways", "Katar"),
    ("SV", "SVA", "Saudia", "Saudi-Arabien"),
    ("GF", "GFA", "Gulf Air", "Bahrain"),
    ("WY", "OMA", "Oman Air", "Oman"),
    ("KU", "KAC", "Kuwait Airways", "Kuwait"),
    ("SQ", "SIA", "Singapore Airlines", "Singapur"),
    ("CX", "CPA", "Cathay Pacific", "Hongkong"),
    ("TG", "THA", "Thai Airways", "Thailand"),
    ("NH", "ANA", "All Nippon Airways", "Japan"),
    ("JL", "JAL", "Japan Airlines", "Japan"),
    ("KE", "KAL", "Korean Air", "Suedkorea"),
    ("OZ", "AAR", "Asiana Airlines", "Suedkorea"),
    ("CA", "CCA", "Air China", "China"),
    ("MU", "CES", "China Eastern", "China"),
    ("CZ", "CSN", "China Southern", "China"),
    ("HU", "CHH", "Hainan Airlines", "China"),
    ("AI", "AIC", "Air India", "Indien"),
    ("IX", "AXB", "Air India Express", "Indien"),
    ("SU", "AFL", "Aeroflot", "Russland"),
    ("PS", "AUI", "Ukraine International", "Ukraine"),
    ("UA", "UAL", "United Airlines", "USA"),
    ("AA", "AAL", "American Airlines", "USA"),
    ("DL", "DAL", "Delta Air Lines", "USA"),
    ("WN", "SWA", "Southwest Airlines", "USA"),
    ("B6", "JBU", "JetBlue Airways", "USA"),
    ("AS", "ASA", "Alaska Airlines", "USA"),
    ("AC", "ACA", "Air Canada", "Kanada"),
    ("WS", "WJA", "WestJet", "Kanada"),
    ("AM", "AMX", "Aeromexico", "Mexiko"),
    ("AV", "AVA", "Avianca", "Kolumbien"),
    ("LA", "LAN", "LATAM Airlines", "Chile"),
    ("AD", "AZU", "Azul", "Brasilien"),
    ("G3", "GLO", "Gol", "Brasilien"),
    ("AR", "ARG", "Aerolineas Argentinas", "Argentinien"),
    ("ET", "ETH", "Ethiopian Airlines", "Aethiopien"),
    ("KQ", "KQA", "Kenya Airways", "Kenia"),
    ("AT", "RAM", "Royal Air Maroc", "Marokko"),
    ("TU", "TAR", "Tunisair", "Tunesien"),
    ("QF", "QFA", "Qantas", "Australien"),
    ("NZ", "ANZ", "Air New Zealand", "Neuseeland"),
    ("5X", "UPS", "UPS Airlines", "USA"),
    ("FX", "FDX", "FedEx Express", "USA"),
    ("", "GEC", "Lufthansa Cargo", "Deutschland"),
    ("CV", "CLX", "Cargolux", "Luxemburg"),
    ("QY", "BCS", "European Air Transport", "Belgien"),
    ("3S", "BOX", "AeroLogic", "Deutschland"),
    ("", "GAF", "German Air Force", "Deutschland"),
    ("", "RCH", "US Air Force (Reach)", "USA"),
    ("", "NAF", "Royal Netherlands Air Force", "Niederlande"),
]

# ------------------------------------------------- Kennzeichen -> Staat
# ICAO-Staatszugehoerigkeitszeichen. Gesucht wird mit dem laengsten Treffer,
# "9H" schlaegt also "9" und "VP-B" schlaegt "V".
REGPREFIX = [
    ("A2", "Botswana", "BW"), ("A3", "Tonga", "TO"), ("A5", "Bhutan", "BT"),
    ("A6", "Vereinigte Arabische Emirate", "AE"), ("A7", "Katar", "QA"),
    ("A9C", "Bahrain", "BH"), ("AP", "Pakistan", "PK"),
    ("B", "China", "CN"), ("B-H", "Hongkong", "HK"), ("B-K", "Hongkong", "HK"),
    ("B-L", "Hongkong", "HK"), ("B-M", "Macau", "MO"),
    ("C", "Kanada", "CA"), ("CC", "Chile", "CL"), ("CN", "Marokko", "MA"),
    ("CP", "Bolivien", "BO"), ("CS", "Portugal", "PT"), ("CU", "Kuba", "CU"),
    ("CX", "Uruguay", "UY"),
    ("D", "Deutschland", "DE"), ("D2", "Angola", "AO"), ("D4", "Kap Verde", "CV"),
    ("D6", "Komoren", "KM"),
    ("E3", "Eritrea", "ER"), ("E5", "Cookinseln", "CK"),
    ("E7", "Bosnien und Herzegowina", "BA"),
    ("EC", "Spanien", "ES"), ("EI", "Irland", "IE"), ("EJ", "Irland", "IE"),
    ("EK", "Armenien", "AM"), ("EP", "Iran", "IR"), ("ER", "Moldau", "MD"),
    ("ES", "Estland", "EE"), ("ET", "Aethiopien", "ET"), ("EW", "Belarus", "BY"),
    ("EX", "Kirgisistan", "KG"), ("EY", "Tadschikistan", "TJ"),
    ("EZ", "Turkmenistan", "TM"),
    ("F", "Frankreich", "FR"),
    ("G", "Grossbritannien", "GB"),
    ("H4", "Salomonen", "SB"), ("HA", "Ungarn", "HU"), ("HB", "Schweiz", "CH"),
    ("HC", "Ecuador", "EC"), ("HH", "Haiti", "HT"),
    ("HI", "Dominikanische Republik", "DO"),
    ("HK", "Kolumbien", "CO"), ("HL", "Suedkorea", "KR"), ("HP", "Panama", "PA"),
    ("HR", "Honduras", "HN"), ("HS", "Thailand", "TH"), ("HZ", "Saudi-Arabien", "SA"),
    ("I", "Italien", "IT"),
    ("J2", "Dschibuti", "DJ"), ("J5", "Guinea-Bissau", "GW"), ("J6", "St. Lucia", "LC"),
    ("J7", "Dominica", "DM"), ("J8", "St. Vincent", "VC"), ("JA", "Japan", "JP"),
    ("JU", "Mongolei", "MN"), ("JY", "Jordanien", "JO"),
    ("LN", "Norwegen", "NO"), ("LV", "Argentinien", "AR"), ("LX", "Luxemburg", "LU"),
    ("LY", "Litauen", "LT"), ("LZ", "Bulgarien", "BG"),
    ("M", "Isle of Man", "IM"),
    ("N", "USA", "US"),
    ("OB", "Peru", "PE"), ("OD", "Libanon", "LB"), ("OE", "Oesterreich", "AT"),
    ("OH", "Finnland", "FI"), ("OK", "Tschechien", "CZ"), ("OM", "Slowakei", "SK"),
    ("OO", "Belgien", "BE"), ("OY", "Daenemark", "DK"),
    ("P", "Nordkorea", "KP"), ("PH", "Niederlande", "NL"), ("PJ", "Curacao", "CW"),
    ("PK", "Indonesien", "ID"), ("PP", "Brasilien", "BR"), ("PR", "Brasilien", "BR"),
    ("PT", "Brasilien", "BR"), ("PU", "Brasilien", "BR"), ("PZ", "Suriname", "SR"),
    ("RA", "Russland", "RU"), ("RF", "Russland", "RU"), ("RDPL", "Laos", "LA"),
    ("RP", "Philippinen", "PH"),
    ("S2", "Bangladesch", "BD"), ("S5", "Slowenien", "SI"), ("S7", "Seychellen", "SC"),
    ("S9", "Sao Tome und Principe", "ST"), ("SE", "Schweden", "SE"),
    ("SP", "Polen", "PL"),
    ("ST", "Sudan", "SD"), ("SU", "Aegypten", "EG"), ("SX", "Griechenland", "GR"),
    ("T7", "San Marino", "SM"), ("TC", "Tuerkei", "TR"), ("TF", "Island", "IS"),
    ("TG", "Togo", "TG"), ("TI", "Costa Rica", "CR"), ("TJ", "Kamerun", "CM"),
    ("TL", "Zentralafrikanische Republik", "CF"), ("TN", "Kongo", "CG"),
    ("TR", "Gabun", "GA"), ("TS", "Tunesien", "TN"), ("TT", "Tschad", "TD"),
    ("TU", "Elfenbeinkueste", "CI"), ("TY", "Benin", "BJ"), ("TZ", "Mali", "ML"),
    ("UK", "Usbekistan", "UZ"), ("UP", "Kasachstan", "KZ"), ("UR", "Ukraine", "UA"),
    ("V2", "Antigua und Barbuda", "AG"), ("V3", "Belize", "BZ"), ("V5", "Namibia", "NA"),
    ("V8", "Brunei", "BN"), ("VH", "Australien", "AU"), ("VN", "Vietnam", "VN"),
    ("VP-B", "Bermuda", "BM"), ("VQ-B", "Bermuda", "BM"),
    ("VP-C", "Cayman Islands", "KY"),
    ("VP-F", "Falklandinseln", "FK"), ("VT", "Indien", "IN"),
    ("XA", "Mexiko", "MX"), ("XB", "Mexiko", "MX"), ("XC", "Mexiko", "MX"),
    ("XT", "Burkina Faso", "BF"), ("XU", "Kambodscha", "KH"), ("XY", "Myanmar", "MM"),
    ("YA", "Afghanistan", "AF"), ("YI", "Irak", "IQ"), ("YJ", "Vanuatu", "VU"),
    ("YK", "Syrien", "SY"), ("YL", "Lettland", "LV"), ("YN", "Nicaragua", "NI"),
    ("YR", "Rumaenien", "RO"), ("YS", "El Salvador", "SV"), ("YU", "Serbien", "RS"),
    ("YV", "Venezuela", "VE"),
    ("Z", "Simbabwe", "ZW"), ("Z3", "Nordmazedonien", "MK"), ("ZA", "Albanien", "AL"),
    ("ZK", "Neuseeland", "NZ"), ("ZP", "Paraguay", "PY"), ("ZS", "Suedafrika", "ZA"),
    ("3A", "Monaco", "MC"), ("3B", "Mauritius", "MU"),
    ("3C", "Aequatorialguinea", "GQ"),
    ("3D", "Eswatini", "SZ"), ("3X", "Guinea", "GN"),
    ("4K", "Aserbaidschan", "AZ"), ("4L", "Georgien", "GE"), ("4O", "Montenegro", "ME"),
    ("4R", "Sri Lanka", "LK"), ("4X", "Israel", "IL"),
    ("5A", "Libyen", "LY"), ("5B", "Zypern", "CY"), ("5H", "Tansania", "TZ"),
    ("5N", "Nigeria", "NG"), ("5R", "Madagaskar", "MG"), ("5T", "Mauretanien", "MR"),
    ("5U", "Niger", "NE"), ("5V", "Togo", "TG"), ("5W", "Samoa", "WS"),
    ("5X", "Uganda", "UG"), ("5Y", "Kenia", "KE"),
    ("6O", "Somalia", "SO"), ("6V", "Senegal", "SN"), ("6Y", "Jamaika", "JM"),
    ("7O", "Jemen", "YE"), ("7P", "Lesotho", "LS"), ("7Q", "Malawi", "MW"),
    ("7T", "Algerien", "DZ"),
    ("8P", "Barbados", "BB"), ("8Q", "Malediven", "MV"), ("8R", "Guyana", "GY"),
    ("9A", "Kroatien", "HR"), ("9G", "Ghana", "GH"), ("9H", "Malta", "MT"),
    ("9J", "Sambia", "ZM"), ("9K", "Kuwait", "KW"), ("9L", "Sierra Leone", "SL"),
    ("9M", "Malaysia", "MY"), ("9N", "Nepal", "NP"), ("9Q", "DR Kongo", "CD"),
    ("9U", "Burundi", "BI"), ("9V", "Singapur", "SG"), ("9XR", "Ruanda", "RW"),
    ("9Y", "Trinidad und Tobago", "TT"),
]

# Deutsche Kennzeichen verraten ueber den ersten Buchstaben die Klasse
DREG = [
    ("A", "Flugzeug ueber 20 t"),
    ("B", "Flugzeug 14 bis 20 t"),
    ("C", "Flugzeug 5,7 bis 14 t"),
    ("E", "einmotorig bis 2 t"),
    ("F", "einmotorig 2 bis 5,7 t"),
    ("G", "mehrmotorig bis 2 t"),
    ("I", "mehrmotorig 2 bis 5,7 t"),
    ("H", "Hubschrauber"),
    ("K", "Motorsegler"),
    ("L", "Luftschiff"),
    ("M", "Ultraleichtflugzeug"),
    ("N", "Tragschrauber"),
]

# --------------------------------------------------------- Sammelliste Typen
# ICAO-Typcode (so liefert ihn auch die Online-Abfrage), Name, Hersteller,
# Kategorie. Das ist die Messlatte fuer den Fortschrittsring: Typen, die sich
# in Europa realistisch sammeln lassen.
TYPES = [
    ("A318", "A318", "Airbus", "Airbus"),
    ("A319", "A319", "Airbus", "Airbus"),
    ("A320", "A320", "Airbus", "Airbus"),
    ("A321", "A321", "Airbus", "Airbus"),
    ("A19N", "A319neo", "Airbus", "Airbus"),
    ("A20N", "A320neo", "Airbus", "Airbus"),
    ("A21N", "A321neo", "Airbus", "Airbus"),
    ("BCS1", "A220-100", "Airbus", "Airbus"),
    ("BCS3", "A220-300", "Airbus", "Airbus"),
    ("A332", "A330-200", "Airbus", "Airbus"),
    ("A333", "A330-300", "Airbus", "Airbus"),
    ("A338", "A330-800neo", "Airbus", "Airbus"),
    ("A339", "A330-900neo", "Airbus", "Airbus"),
    ("A343", "A340-300", "Airbus", "Airbus"),
    ("A345", "A340-500", "Airbus", "Airbus"),
    ("A346", "A340-600", "Airbus", "Airbus"),
    ("A359", "A350-900", "Airbus", "Airbus"),
    ("A35K", "A350-1000", "Airbus", "Airbus"),
    ("A388", "A380-800", "Airbus", "Airbus"),
    ("B733", "737-300", "Boeing", "Boeing"),
    ("B735", "737-500", "Boeing", "Boeing"),
    ("B736", "737-600", "Boeing", "Boeing"),
    ("B737", "737-700", "Boeing", "Boeing"),
    ("B738", "737-800", "Boeing", "Boeing"),
    ("B739", "737-900", "Boeing", "Boeing"),
    ("B38M", "737 MAX 8", "Boeing", "Boeing"),
    ("B39M", "737 MAX 9", "Boeing", "Boeing"),
    ("B3XM", "737 MAX 10", "Boeing", "Boeing"),
    ("B712", "717-200", "Boeing", "Boeing"),
    ("B744", "747-400", "Boeing", "Boeing"),
    ("B748", "747-8", "Boeing", "Boeing"),
    ("B752", "757-200", "Boeing", "Boeing"),
    ("B753", "757-300", "Boeing", "Boeing"),
    ("B763", "767-300", "Boeing", "Boeing"),
    ("B764", "767-400", "Boeing", "Boeing"),
    ("B772", "777-200", "Boeing", "Boeing"),
    ("B77L", "777-200LR", "Boeing", "Boeing"),
    ("B77W", "777-300ER", "Boeing", "Boeing"),
    ("B788", "787-8", "Boeing", "Boeing"),
    ("B789", "787-9", "Boeing", "Boeing"),
    ("B78X", "787-10", "Boeing", "Boeing"),
    ("E170", "E170", "Embraer", "Regional"),
    ("E75L", "E175", "Embraer", "Regional"),
    ("E190", "E190", "Embraer", "Regional"),
    ("E195", "E195", "Embraer", "Regional"),
    ("E290", "E190-E2", "Embraer", "Regional"),
    ("E295", "E195-E2", "Embraer", "Regional"),
    ("E145", "ERJ 145", "Embraer", "Regional"),
    ("CRJ2", "CRJ200", "Bombardier", "Regional"),
    ("CRJ7", "CRJ700", "Bombardier", "Regional"),
    ("CRJ9", "CRJ900", "Bombardier", "Regional"),
    ("CRJX", "CRJ1000", "Bombardier", "Regional"),
    ("RJ85", "Avro RJ85", "BAe", "Regional"),
    ("RJ1H", "Avro RJ100", "BAe", "Regional"),
    ("F70", "Fokker 70", "Fokker", "Regional"),
    ("F100", "Fokker 100", "Fokker", "Regional"),
    ("SU95", "Superjet 100", "Suchoi", "Regional"),
    ("DH8D", "Dash 8-400", "De Havilland", "Turboprop"),
    ("AT45", "ATR 42-500", "ATR", "Turboprop"),
    ("AT72", "ATR 72-500", "ATR", "Turboprop"),
    ("AT76", "ATR 72-600", "ATR", "Turboprop"),
    ("SF34", "Saab 340", "Saab", "Turboprop"),
    ("J328", "Dornier 328", "Dornier", "Turboprop"),
    ("D228", "Dornier 228", "Dornier", "Turboprop"),
    ("SW4", "Metroliner", "Fairchild", "Turboprop"),
    ("B463", "BAe 146-300", "BAe", "Turboprop"),
    ("MD11", "MD-11", "McDonnell Douglas", "Klassiker"),
    ("MD83", "MD-83", "McDonnell Douglas", "Klassiker"),
    ("MD88", "MD-88", "McDonnell Douglas", "Klassiker"),
    ("B462", "BAe 146-200", "BAe", "Klassiker"),
    ("DC3", "DC-3", "Douglas", "Klassiker"),
    ("JU52", "Ju 52", "Junkers", "Klassiker"),
    ("A124", "An-124", "Antonow", "Frachter"),
    ("IL76", "Il-76", "Iljuschin", "Frachter"),
    ("B77F", "777F", "Boeing", "Frachter"),
    ("C130", "C-130 Hercules", "Lockheed", "Militaer"),
    ("A400", "A400M", "Airbus", "Militaer"),
    ("C17", "C-17 Globemaster", "Boeing", "Militaer"),
    ("K35R", "KC-135", "Boeing", "Militaer"),
    ("EUFI", "Eurofighter", "Airbus", "Militaer"),
    ("P8", "P-8 Poseidon", "Boeing", "Militaer"),
    ("GLF5", "Gulfstream G550", "Gulfstream", "Business"),
    ("GLF6", "Gulfstream G650", "Gulfstream", "Business"),
    ("GL7T", "Global 7500", "Bombardier", "Business"),
    ("CL60", "Challenger 600", "Bombardier", "Business"),
    ("C56X", "Citation Excel", "Cessna", "Business"),
    ("E55P", "Phenom 300", "Embraer", "Business"),
    ("PC12", "PC-12", "Pilatus", "Business"),
    ("PC24", "PC-24", "Pilatus", "Business"),
    ("LJ45", "Learjet 45", "Learjet", "Business"),
    ("BE20", "King Air 200", "Beechcraft", "Business"),
    ("C172", "Cessna 172", "Cessna", "Kleinflugzeug"),
    ("C182", "Cessna 182", "Cessna", "Kleinflugzeug"),
    ("PA28", "Piper PA-28", "Piper", "Kleinflugzeug"),
    ("DA40", "DA40 Diamond Star", "Diamond", "Kleinflugzeug"),
    ("DA42", "DA42 Twin Star", "Diamond", "Kleinflugzeug"),
    ("DR40", "Robin DR400", "Robin", "Kleinflugzeug"),
    ("EC35", "H135", "Airbus Helicopters", "Hubschrauber"),
    ("EC45", "H145", "Airbus Helicopters", "Hubschrauber"),
    ("R44", "Robinson R44", "Robinson", "Hubschrauber"),
]


def dedupe(rows, key=0):
    seen, out = set(), []
    for r in rows:
        if r[key] in seen:
            continue
        seen.add(r[key])
        out.append(list(r))
    return out


# ------------------------------------------------------------------- Aufbau
airports = json.load(io.open(os.path.join(BASE, "airports.json"), encoding="utf-8"))
airlines = json.load(io.open(os.path.join(BASE, "airlines.json"), encoding="utf-8"))

AP = [[a["id"], a["ia"], a["n"], a["c"], a["k"],
       round(a["ll"][0], 3), round(a["ll"][1], 3), a["s"]] for a in airports]

# OpenFlights zuerst, die kuratierten Eintraege gewinnen (nach IATA und ICAO)
merged = [[a["ia"], a["ic"], a["n"], a["k"]] for a in airlines]
for ia, ic, n, k in AIRLINE_FIX:
    merged = [m for m in merged if not ((ia and m[0] == ia) or (ic and m[1] == ic))]
    merged.append([ia, ic, n, k])
merged.sort(key=lambda m: (m[0] or "zz", m[1]))

TY = dedupe(TYPES)
RP = sorted([[p, n, k] for p, n, k in REGPREFIX], key=lambda r: -len(r[0]))


def js(name, rows):
    body = ("," + chr(10) + "  ").join(
        json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in rows)
    return "var " + name + " = [" + chr(10) + "  " + body + chr(10) + "];"


doc = [
    "/* Offline-Datenbasis - erzeugt von tools/build_data.py",
    "   AIRPORTS  [ICAO, IATA, Name, Stadt, Land, lat, lon, Groesse 2/1/0]",
    "   AIRLINES  [IATA, ICAO, Name, Land]",
    "   REGPREFIX [Praefix, Staat, ISO]  - laengster Treffer gewinnt",
    "   DREG      [Buchstabe, Klasse]    - nur deutsche Kennzeichen",
    "   TYPES     [ICAO-Typ, Name, Hersteller, Kategorie] - Sammelliste */",
    js("AIRPORTS", AP),
    js("AIRLINES", merged),
    js("REGPREFIX", RP),
    js("DREG", [list(d) for d in DREG]),
    js("TYPES", TY),
    "",
]
io.open(OUT, "w", encoding="utf-8").write(chr(10).join(doc))
print("data.js: %.1f KB" % (os.path.getsize(OUT) / 1024))
print("  %d Flughaefen, %d Airlines, %d Praefixe, %d Typen"
      % (len(AP), len(merged), len(RP), len(TY)))
