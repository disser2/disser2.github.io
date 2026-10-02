/* Bücherregal – Datenmodell: Goodreads-Zeilen → Bücher, Themen, Buchtypen,
   Suche mit Feldsyntax, Facettenfilter, Sortierung und Gruppierung */
(function () {
  "use strict";
  const BS = (window.BS = window.BS || {});
  const U = BS.util;

  // ---------- Themen ----------
  // Reihenfolge = Anzeige-Reihenfolge. Schlüssel stehen auch in data/themen.csv und in der URL.
  // Die Paletten sind Einbandfarben (Deko auf dem Regal), keine Diagrammfarben.
  const GENRES = [
    // ----- Sachbuch -----
    { key: "politik", label: "Politik & Demokratie",
      pal: ["#3d405b", "#5c6784", "#9d2933", "#2b3a55", "#7a3e48", "#4a5a7a"],
      kw: ["politics", "politik", "political science", "political", "politikwissenschaft", "politische bildung",
        "democracy", "demokratie", "populism", "populismus", "rechtspopulismus", "rechtsextremismus",
        "rechtsradikalismus", "right wing extremism", "extremismus", "fascism", "faschismus", "totalitarianism",
        "totalitarismus", "authoritarianism", "autoritarismus", "dictatorship", "diktatur", "government",
        "regierung", "world politics", "weltpolitik", "geopolitics", "geopolitik", "international relations",
        "internationale politik", "public policy", "elections", "wahlen", "propaganda", "liberalism",
        "liberalismus", "socialism", "sozialismus", "communism", "kommunismus", "political ideologies", "staat",
        "verfassung", "constitution", "recht", "law", "human rights", "menschenrechte", "terrorism",
        "terrorismus", "war", "krieg", "military", "militar", "current events", "zeitgeschehen",
        "european union", "europaische union", "verschworungstheorie", "conspiracy theories"] },
    { key: "gesellschaft", label: "Gesellschaft & Ungleichheit",
      pal: ["#8e4585", "#a05195", "#7b3f73", "#b06aa6", "#6f2f66", "#9a5b8f"],
      kw: ["sociology", "soziologie", "society", "gesellschaft", "social science", "social sciences",
        "sozialwissenschaften", "social conditions", "social classes", "soziale ungleichheit", "inequality",
        "ungleichheit", "equality", "poverty", "armut", "klasse", "klassengesellschaft", "working class",
        "arbeiterklasse", "racism", "rassismus", "race relations", "discrimination", "diskriminierung",
        "migration", "immigration", "einwanderung", "emigration and immigration", "integration", "refugees",
        "fluchtlinge", "flucht", "education", "bildung", "bildungswesen", "social problems", "soziale probleme",
        "social justice", "soziale gerechtigkeit", "cities", "city planning", "urbanism", "stadt", "stadte",
        "stadtplanung", "media", "medien", "journalism", "journalismus", "social change", "sozialer wandel",
        "gesellschaftskritik", "demography", "demografie", "soziale herkunft", "chancengleichheit"] },
    { key: "feminismus", label: "Feminismus & Gender",
      pal: ["#d6336c", "#c2255c", "#e64980", "#b02a5b", "#f06595", "#a61e4d"],
      kw: ["feminism", "feminismus", "feminist", "feminist theory", "women", "frauen", "frau", "women s studies",
        "frauenbewegung", "gender", "geschlecht", "geschlechterrolle", "geschlechterverhaltnis", "gender studies",
        "geschlechterforschung", "sexism", "sexismus", "patriarchy", "patriarchat", "misogyny", "misogynie",
        "frauenfeindlichkeit", "lgbt", "lgbtq", "lgbtqia", "queer", "homosexuality", "homosexualitat",
        "transgender", "masculinity", "mannlichkeit", "gleichberechtigung", "gleichstellung", "women s rights",
        "frauenrechte", "sex role", "sex discrimination", "metoo"] },
    { key: "wirtschaft", label: "Wirtschaft & Kapitalismus",
      pal: ["#606c38", "#283618", "#bc6c25", "#b5894a", "#556b2f"],
      kw: ["economics", "okonomie", "wirtschaft", "volkswirtschaft", "business economics", "economic history",
        "wirtschaftsgeschichte", "wirtschaftspolitik", "economic policy", "capitalism", "kapitalismus",
        "finance", "finanzen", "money", "geld", "investing", "investment", "banks", "banken", "banking",
        "globalization", "globalisierung", "economic development", "development economics", "wealth",
        "vermogen", "reichtum", "taxation", "steuern", "trade", "handel", "economic growth", "wachstum",
        "behavioral economics", "verhaltensokonomie", "income distribution", "neoliberalism", "neoliberalismus",
        "consumption", "konsum", "labor", "arbeit", "arbeitsmarkt", "arbeitswelt", "finanzkrise",
        "financial crises"] },
    { key: "business", label: "Business & Management",
      pal: ["#b08d57", "#9c7a45", "#c2a06a", "#8a6a3a", "#a98250", "#7d6238"],
      kw: ["business", "management", "leadership", "fuhrung", "entrepreneurship", "unternehmertum", "startup",
        "startups", "marketing", "corporations", "unternehmen", "unternehmensfuhrung", "innovation",
        "strategy", "strategie", "organizational behavior", "negotiation", "verhandlung", "product management",
        "karriere", "careers", "new business enterprises", "industries"] },
    { key: "geschichte", label: "Geschichte",
      pal: ["#6f4e37", "#8b5e3c", "#4a4e69", "#5e503f", "#7c6a56", "#3f4a5a"],
      not: ["natural history"],
      kw: ["history", "geschichte", "zeitgeschichte", "world history", "weltgeschichte", "antike",
        "mittelalter", "middle ages", "ancient", "civilization", "zivilisation", "archaeology", "archaologie",
        "alte geschichte archaologie", "geschichte europas", "geschichte deutschlands", "world war",
        "weltkrieg", "holocaust", "nationalsozialismus", "drittes reich", "cold war", "kalter krieg", "ddr",
        "weimarer republik", "colonialism", "kolonialismus", "slavery", "sklaverei", "kulturgeschichte"] },
    { key: "welt", label: "Welt & Reportage",
      pal: ["#3a86c8", "#2f74b5", "#4a9ad4", "#2a6aa0", "#5aa5d6", "#256091"],
      kw: ["travel", "reise", "reisen", "reisebericht", "reiseberichte", "reportage", "reportagen",
        "erlebnisbericht", "geography", "geografie", "geografie reisen", "china", "russia", "russland",
        "africa", "afrika", "asia", "asien", "middle east", "naher osten", "india", "indien", "iran",
        "afghanistan", "north korea", "nordkorea", "latin america", "lateinamerika", "ukraine", "japan",
        "developing countries", "entwicklungslander", "foreign relations", "voyages and travels"] },
    { key: "ki", label: "KI & Digitales",
      not: ["science fiction", "robots fiction"],
      pal: ["#3a0ca3", "#4361ee", "#3f6fd8", "#3f37c9", "#560bad", "#5e60ce"],
      kw: ["artificial intelligence", "kunstliche intelligenz", "ki", "ai", "machine learning",
        "maschinelles lernen", "deep learning", "data science", "big data", "daten", "algorithms",
        "algorithmen", "algorithmus", "computer", "computers", "computer science", "informatik", "technology",
        "technologie", "programming", "programmieren", "software", "internet", "digital", "digitalisierung",
        "digitale revolution", "social media", "soziale medien", "soziale netzwerke", "robots", "roboter",
        "robotics", "tech", "silicon valley", "surveillance", "uberwachung", "datenschutz", "privacy",
        "video games", "computerspiele", "information technology", "informationstechnik",
        "information society", "informationsgesellschaft"] },
    { key: "wissenschaft", label: "Naturwissenschaft & Mathe",
      not: ["science fiction", "sci fi", "computer science", "political science", "social science", "fiction science",
        "life sciences"],
      pal: ["#2a9d8f", "#264653", "#3a7d7c", "#287271", "#1b998b", "#40798c"],
      kw: ["science", "sciences", "wissenschaft", "naturwissenschaft", "naturwissenschaften", "popular science",
        "popularwissenschaft", "physics", "physik", "mathematics", "mathematik", "mathe", "math", "maths",
        "statistics", "statistik", "probability", "wahrscheinlichkeit", "chemistry", "chemie", "astronomy",
        "astronomie", "astrophysics", "cosmology", "kosmologie", "universe", "universum", "weltall", "quantum",
        "geology", "geowissenschaften", "evolution", "genetics", "genetik", "complexity", "komplexitat",
        "systems", "systemtheorie", "bayesian", "wissenschaftsgeschichte", "wissenschaftstheorie"] },
    { key: "natur", label: "Natur, Klima & Umwelt",
      pal: ["#4f8a3c", "#3f7a34", "#6a9f4d", "#2f6b2f", "#7bab5a", "#386641"],
      kw: ["nature", "natur", "ecology", "okologie", "environment", "umwelt", "umweltschutz", "environmental",
        "climate", "klima", "klimawandel", "klimaanderung", "climate change", "global warming", "klimakrise",
        "biodiversity", "biodiversitat", "artensterben", "artenvielfalt", "extinction", "animals", "tiere",
        "tiere zoologie", "zoology", "zoologie", "plants", "pflanzen", "botany", "botanik", "biology",
        "biologie", "life sciences", "oceans", "ozean", "meer", "forests", "wald", "sustainability",
        "nachhaltigkeit", "conservation", "naturschutz", "anthropocene", "anthropozan", "energy", "energie",
        "agriculture", "landwirtschaft", "animal rights", "tierschutz", "tierethik", "fungi", "pilze",
        "insects", "insekten", "paleontology", "palaontologie", "natural history"] },
    { key: "anthropologie", label: "Mensch, Kultur & Sprache",
      pal: ["#c9713f", "#b86434", "#d4844f", "#a5562b", "#c27a50", "#96502a"],
      kw: ["anthropology", "anthropologie", "ethnology", "ethnologie", "ethnography", "ethnografie",
        "ethnographie", "human evolution", "menschwerdung", "prehistoric peoples", "urgeschichte",
        "vorgeschichte", "culture", "kultur", "kulturanthropologie", "cultural anthropology", "language",
        "sprache", "languages", "sprachen", "linguistics", "linguistik", "sprachwissenschaft",
        "sprache linguistik", "language and languages", "indigenous peoples", "indigene volker",
        "human beings", "menschheit", "menschheitsgeschichte", "social evolution"] },
    { key: "medizin", label: "Medizin & Gesundheit",
      pal: ["#52b69a", "#6fae9b", "#34a0a4", "#76b8b0", "#4d908e", "#88b5a8"],
      kw: ["medicine", "medizin", "medical", "medizinisch", "health", "gesundheit", "medizin gesundheit",
        "gesundheitswesen", "neuroscience", "neurowissenschaft", "neurowissenschaften", "neurology",
        "neurologie", "physicians", "arzte", "arzt", "doctors", "diseases", "disease", "krankheit",
        "krankheiten", "cancer", "krebs", "psychiatry", "psychiatrie", "nutrition", "ernahrung", "sleep",
        "schlaf", "public health", "epidemics", "epidemiologie", "pandemic", "pandemie", "hospital",
        "krankenhaus", "klinik", "surgery", "chirurgie", "nursing", "pflege", "human body", "anatomy",
        "anatomie", "pharmaceutical industry", "arzneimittel", "immunsystem", "addiction", "sucht"] },
    { key: "psychologie", label: "Psychologie & Denken",
      pal: ["#e07a7a", "#e8a598", "#d9704f", "#c96a6a", "#e59a8a", "#b85c5c"],
      kw: ["psychology", "psychologie", "cognitive", "kognition", "cognitive science", "kognitionswissenschaft",
        "cognitive psychology", "behavior", "behaviour", "verhalten", "decision making", "entscheidung",
        "entscheidungen", "entscheidungsfindung", "brain", "gehirn", "consciousness", "bewusstsein", "memory",
        "gedachtnis", "thinking", "denken", "thought and thinking", "emotions", "emotionen", "gefuhle",
        "social psychology", "sozialpsychologie", "reasoning", "personality", "personlichkeit",
        "psychotherapy", "psychotherapie"] },
    { key: "ratgeber", label: "Ratgeber & Selbsthilfe",
      pal: ["#f4a261", "#e9965a", "#f6b17a", "#e08a4c", "#f2a977", "#d98248"],
      kw: ["self help", "selbsthilfe", "ratgeber", "lebenshilfe", "lebensfuhrung", "personal development",
        "personlichkeitsentwicklung", "self improvement", "personal growth", "productivity", "produktivitat",
        "habits", "gewohnheiten", "mindfulness", "achtsamkeit", "happiness", "gluck", "motivation", "success",
        "erfolg", "self actualization", "selbstmanagement", "zeitmanagement", "time management",
        "conduct of life", "interpersonal relations", "relationships", "beziehungen", "parenting",
        "family relationships"] },
    { key: "philosophie", label: "Philosophie & Religion",
      pal: ["#5f6caf", "#6c757d", "#495057", "#6f7fc9", "#4a5568"],
      kw: ["philosophy", "philosophie", "ethics", "ethik", "moral", "religion", "religions", "spirituality",
        "spiritualitat", "theology", "theologie", "buddhism", "buddhismus", "stoicism", "stoizismus",
        "existentialism", "existenzialismus", "atheism", "atheismus", "islam", "christentum", "christianity",
        "bibel"] },
    { key: "biografie", label: "Biografie & Memoir",
      pal: ["#b07d8c", "#9d6b84", "#a985b0", "#7d5a6b", "#c99595", "#a26769"],
      kw: ["biography", "biographies", "biografie", "biographie", "biografien", "autobiography", "autobiografie",
        "autobiographie", "memoir", "memoirs", "memoiren", "erinnerungen", "biography autobiography",
        "personal narratives", "lebenserinnerungen", "autobiografische literatur"] },
    { key: "sachbuch", label: "Sachbuch", generic: true,
      pal: ["#d9a441", "#c08b30", "#ddb85a", "#b08968", "#cfa877", "#a68a64"],
      kw: ["nonfiction", "sachbuch", "sachbucher", "essays", "essay", "true crime", "cooking", "kochen", "sports",
        "sport", "music", "musik", "art", "kunst", "kunste", "design", "architecture", "architektur",
        "sachliteratur", "games", "spiel", "spiele", "film", "fotografie"] },
    // ----- Belletristik -----
    // "generic" zählt schwächer, damit z. B. "Fiction" + "Science fiction" bei
    // Science-Fiction landet und nicht bei Roman.
    { key: "roman", label: "Roman & Erzählung", generic: true,
      not: ["nonfiction"],
      pal: ["#c8553d", "#b5654a", "#d9785c", "#c99567", "#a44a3f", "#c97b63", "#8e5572", "#b86f52"],
      kw: ["fiction", "roman", "romane", "novel", "novels", "literary fiction", "literary", "literatur",
        "belletristik", "gegenwartsliteratur", "contemporary", "contemporary fiction", "domestic fiction",
        "coming of age", "family", "familie", "short stories", "kurzgeschichten", "erzahlungen", "erzahlung",
        "general fiction", "deutsche literatur", "german literature", "american literature", "english literature",
        "literary collections", "erzahlende literatur"] },
    { key: "klassiker", label: "Klassiker",
      pal: ["#5c1a1b", "#1d3b2a", "#13294b", "#3e2723", "#4a1f3d", "#2f3e46", "#6b2737", "#22403a"],
      kw: ["classics", "classic", "klassiker", "classic literature", "weltliteratur", "literary classics", "kanon"] },
    { key: "historisch", label: "Historischer Roman",
      pal: ["#7f5539", "#9c6644", "#6b4f3a", "#8a5a44", "#a47148", "#7a4e2d"],
      kw: ["historical fiction", "historischer roman", "historische romane", "historical novel",
        "historical novels", "historienroman"] },
    { key: "krimi", label: "Krimi & Thriller",
      pal: ["#1f1f24", "#2b2d33", "#7a1f1f", "#3a3f47", "#1b2333", "#8c2f2f", "#2d2a32"],
      kw: ["crime fiction", "krimi", "krimis", "kriminalroman", "kriminalromane", "thriller", "thrillers",
        "mystery", "mysteries", "mystery fiction", "detective", "detective and mystery stories", "detektiv",
        "detektivgeschichten", "suspense", "suspense fiction", "noir", "spy stories", "psychological thriller",
        "psychothriller", "krimi thriller"] },
    { key: "scifi", label: "Science-Fiction",
      pal: ["#1f4e79", "#2a6f97", "#014f86", "#3d5a80", "#0f6e7d", "#22577a", "#16425b"],
      kw: ["science fiction", "sci fi", "scifi", "sf", "space opera", "cyberpunk", "dystopia", "dystopian",
        "dystopias", "dystopie", "dystopien", "utopia", "utopie", "time travel", "zeitreise", "aliens",
        "extraterrestrial", "post apocalyptic", "postapokalyptisch", "apocalyptic", "space travel",
        "life on other planets"] },
    { key: "fantasy", label: "Fantasy",
      pal: ["#4b2e83", "#5a3d8a", "#6a4c93", "#3c2a6e", "#7b4b94", "#2e3a87", "#553c9a"],
      kw: ["fantasy", "fantasy fiction", "epic fantasy", "high fantasy", "urban fantasy", "magic", "magie",
        "magical realism", "magischer realismus", "dragons", "drachen", "wizards", "zauberer", "witches", "hexen",
        "elves", "fairy tales", "marchen", "sword and sorcery", "romantasy"] },
    { key: "horror", label: "Horror",
      pal: ["#141216", "#3b0d0d", "#5c1010", "#1d1a1f", "#2a0f1f", "#40121a"],
      kw: ["horror", "horror fiction", "horror tales", "ghost stories", "ghosts", "gespenster", "supernatural",
        "ubernaturlich", "vampires", "vampire", "zombies", "haunted houses", "gothic", "grusel"] },
    { key: "romance", label: "Liebesroman",
      pal: ["#e5989b", "#d16d8a", "#e8a3b5", "#c75c7c", "#d98fb3", "#b5577a"],
      kw: ["romance", "romances", "liebesroman", "liebesromane", "love stories", "love story", "chick lit"] },
    { key: "jugend", label: "Kinder & Jugend",
      pal: ["#f2a541", "#e9c53d", "#ee964b", "#45b69c", "#f06543", "#3a86ff"],
      kw: ["young adult", "young adult fiction", "ya", "juvenile fiction", "juvenile literature", "jugendbuch",
        "jugendbucher", "jugendliteratur", "kinderbuch", "kinderbucher", "children", "childrens",
        "children s literature", "children s fiction", "kinderliteratur", "middle grade", "jugend", "teen",
        "kinder und jugendliteratur", "kinder und jugendbuch", "kinderbucher bis 11 jahre"] },
    { key: "comic", label: "Comic & Graphic Novel",
      pal: ["#e63946", "#f4a259", "#1d3557", "#fb8500", "#191919", "#2a9d8f"],
      kw: ["comic", "comics", "graphic novel", "graphic novels", "manga", "bande dessinee", "cartoons",
        "comic books strips etc", "comics graphic novels", "comics cartoons karikaturen"] },
    { key: "lyrik", label: "Lyrik & Drama",
      pal: ["#9f9cc7", "#a3a1c8", "#b49fd6", "#8d7fbf", "#a68fb5"],
      kw: ["poetry", "lyrik", "gedichte", "poems", "poesie", "drama", "dramen", "theater", "theatre", "plays",
        "schauspiel"] },
    { key: "humor", label: "Humor & Satire",
      pal: ["#f2b632", "#ef476f", "#06a77d", "#f78c6b", "#e9a92a"],
      kw: ["humor", "humour", "humorous", "humorous fiction", "humorous stories", "satire", "satirical", "comedy",
        "komik", "witzig", "parody", "parodie"] },
    { key: "none", label: "Unsortiert",
      pal: ["#8d99ae", "#9aa48b", "#a5a58d", "#9a8c98", "#b79a92", "#6d6875", "#c08a8f", "#7f8c8d"],
      kw: [] },
  ];
  const GENRE = {};
  GENRES.forEach((g, i) => {
    g.order = i;
    g.rx = g.kw.map((k) => new RegExp("(?:^| )" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?: |$)"));
    GENRE[g.key] = g;
  });

  // Rauschen in Open-Library-Schlagwörtern
  const NOISE = /^(nyt:|accessible book|protected daisy|in library|large type|lending library|open library|reading level|overdrive|long now|internet archive|staff picks|award|new york times|fiction general|general$)/;
  // Regale, die nichts über das Thema sagen
  const META_SHELVES = /^(read|to read|currently reading|gelesen|will ich lesen|lese ich gerade|favorites?|favourites?|favoriten|lieblingsbucher|owned|books i own|own|wishlist|wunschliste|kindle|ebooks?|e books?|audiobooks?|audible|horbucher|horbuch|library|bibliothek|reread|re read|dnf|did not finish|abgebrochen|\d{4}|read \d{4}|gelesen \d{4}|\d{4} reads?)$/;

  function termNorm(s) {
    return U.norm(s).replace(/non[\s\-_]+fiction/g, "nonfiction").replace(/[^a-z0-9]+/g, " ").trim();
  }

  // Regale über Besitz und Herkunft (bleiben als Filter, sagen aber nichts über das Thema)
  const OWNER_SHELVES = /(^| )(besitz|owned|geliehen|borrowed|geschenk\w*|gift)( |$)/;

  // Thema aus eigenen Goodreads-Regalen (stark), Schlagwörtern von Open Library und DNB
  // (schwach) und dem Titel samt Untertitel. Von Hand vergebene Themen gehen vor, s. derive().
  function classify(shelves, subjects, origYear, title) {
    const score = {};
    const add = (term, w) => {
      const t = termNorm(term);
      if (!t) return;
      for (const g of GENRES) {
        if (g.not && g.not.some((n) => t.includes(n) && !g.kw.includes(t))) continue;
        if (g.rx.some((r) => r.test(t))) score[g.key] = (score[g.key] || 0) + w * (g.generic ? 0.35 : 1);
      }
    };
    shelves.filter((s) => !OWNER_SHELVES.test(termNorm(s))).forEach((s, i) => add(s, 3 / (1 + 0.15 * i)));
    (subjects || []).forEach((s, i) => {
      if (!NOISE.test(U.norm(s))) add(s, i < 10 ? 1 : 0.6);
    });
    if (title) add(title, 1.5);
    let keys = Object.keys(score).filter((k) => score[k] >= 0.3).sort((a, b) => score[b] - score[a]);
    let genre = keys[0] || "none";
    if (genre === "roman" && origYear != null && origYear < 1940) {
      genre = "klassiker";
      if (!keys.includes("klassiker")) keys.unshift("klassiker");
    }
    if (!keys.length) keys = ["none"];
    else if (keys[0] !== genre) keys = [genre].concat(keys.filter((k) => k !== genre));
    return { genre, themes: keys.slice(0, 5) };
  }

  // ---------- Buchtypen ----------
  const TYPES = [
    { key: "hard", label: "Gebunden", short: "Gebunden" },
    { key: "paper", label: "Taschenbuch", short: "Taschenbuch" },
    { key: "ebook", label: "E-Book", short: "E-Book" },
    { key: "audio", label: "Hörbuch", short: "Hörbuch" },
    { key: "other", label: "Sonstige", short: "Sonstige" },
  ];
  const TYPE = {};
  TYPES.forEach((t, i) => ((t.order = i), (TYPE[t.key] = t)));

  const RX_AUDIO = /audio|horbuch|horspiel|audible|mp3|\bcd\b/;
  const RX_EBOOK = /kindle|ebook|e book|e-book|nook|epub|tolino|ibook|elektronisch|digital/;
  const RX_HARD = /hardcover|hardback|gebunden|leinen|leather|library binding|board book|pappbilderbuch/;
  const RX_PAPER = /paperback|taschenbuch|broschiert|softcover|kartoniert|mass market|klappenbroschur|trade paper/;
  function typeOf(binding, shelves) {
    const sh = shelves.map(U.norm).join(" | ");
    if (/(^| )(audiobooks?|audible|horbucher|horbuch|hoerbuch)( |$|\|)/.test(sh)) return "audio";
    if (/(^| )(ebooks?|e books?|kindle)( |$|\|)/.test(sh)) return "ebook";
    const b = U.norm(binding);
    if (RX_AUDIO.test(b)) return "audio";
    if (RX_EBOOK.test(b)) return "ebook";
    if (RX_HARD.test(b)) return "hard";
    if (RX_PAPER.test(b)) return "paper";
    return "other";
  }

  // ---------- Status ----------
  function statusLabel(s) {
    if (s === "read") return "Gelesen";
    if (s === "currently-reading") return "Lese ich gerade";
    if (s === "to-read") return "Will ich lesen";
    if (/dnf|did.not.finish|abgebrochen/.test(s)) return "Abgebrochen";
    return s.replace(/[-_]+/g, " ");
  }

  // ---------- Rezension säubern ----------
  const ALLOWED = new Set(["B", "STRONG", "I", "EM", "U", "BR", "P", "BLOCKQUOTE", "UL", "OL", "LI", "A", "SPOILER"]);
  function sanitize(html) {
    html = String(html || "").trim();
    if (!html) return "";
    if (!/<[a-z!\/]/i.test(html)) return U.esc(html).replace(/\r?\n/g, "<br>");
    const tpl = document.createElement("template");
    tpl.innerHTML = html;
    const walk = (node) => {
      let out = "";
      node.childNodes.forEach((c) => {
        if (c.nodeType === 3) out += U.esc(c.textContent);
        else if (c.nodeType === 1) {
          const tag = c.tagName;
          const inner = walk(c);
          if (!ALLOWED.has(tag)) out += inner;
          else if (tag === "BR") out += "<br>";
          else if (tag === "SPOILER") out += '<span class="spoiler-inline" tabindex="0">' + inner + "</span>";
          else if (tag === "A") {
            const href = c.getAttribute("href") || "";
            out += /^https?:\/\//i.test(href)
              ? '<a href="' + U.esc(href) + '" target="_blank" rel="noopener noreferrer">' + inner + "</a>"
              : inner;
          } else {
            const t = tag.toLowerCase();
            out += "<" + t + ">" + inner + "</" + t + ">";
          }
        }
      });
      return out;
    };
    return walk(tpl.content);
  }

  // ---------- Goodreads-Zeile → Buch ----------
  const col = (row, ...names) => {
    for (const n of names) if (row[n] != null && row[n] !== "") return row[n];
    return "";
  };
  const cleanIsbn = (s) => String(s || "").replace(/[="\s]/g, "").replace(/[^0-9Xx]/g, "").toUpperCase();

  function splitTitle(raw) {
    // Kindle-Ausgaben heißen bei Goodreads "… (German Edition)" – gleiche Regel in tools/build_books.py
    let title = String(raw || "").trim().replace(/\s*\((?:German|English|French|Spanish|Italian|Dutch) Edition\)\s*$/i, "");
    let series = "", seriesNo = null;
    const m = title.match(/\s*\(([^()]*?),?\s*#\s*([\d.]+)[^()]*\)\s*$/);
    if (m) {
      series = m[1].trim();
      seriesNo = parseFloat(m[2]);
      title = title.slice(0, m.index).trim();
    }
    const short = title.split(/:\s/)[0].trim() || title;
    return { title, short, series, seriesNo };
  }

  // Schlüssel für den Open-Library-Cache (identisch zu tools/build_books.py)
  function olKey(isbn13, isbn10, title, authorLast) {
    if (isbn13) return isbn13;
    if (isbn10) return isbn10;
    return "t:" + U.keyNorm(title) + "|" + U.keyNorm(authorLast);
  }

  function fromRow(row, i) {
    const id = String(col(row, "Book Id", "BookId", "book_id") || "x" + i).trim();
    const t = splitTitle(col(row, "Title", "Titel"));
    const author = col(row, "Author", "Autor").trim().replace(/\s+/g, " ");
    const authorLF = col(row, "Author l-f").trim();
    const last = authorLF ? authorLF.split(",")[0].trim() : author.split(" ").slice(-1)[0] || "";
    const exclusive = (col(row, "Exclusive Shelf") || "read").trim().toLowerCase();
    const shelvesRaw = col(row, "Bookshelves")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const shelves = shelvesRaw.filter((s) => s !== exclusive && !META_SHELVES.test(termNorm(s)));
    const dateRead = U.parseDate(col(row, "Date Read"));
    const dateAdded = U.parseDate(col(row, "Date Added"));
    // Jahr ohne Datum: viele pflegen Regale wie "2019" oder "gelesen-2019"
    let readYear = dateRead ? dateRead.getFullYear() : null, readYearSrc = dateRead ? "date" : null;
    if (readYear == null && exclusive === "read") {
      for (const s of shelvesRaw) {
        const m = s.match(/(?:^|\D)((?:19|20)\d{2})(?:\D|$)/);
        if (m) {
          readYear = +m[1];
          readYearSrc = "shelf";
          break;
        }
      }
    }
    // neuere Exporte schreiben "5.0" statt "5"
    const rating = Math.round(U.num(col(row, "My Rating")) || 0);
    const binding = col(row, "Binding").trim();
    const b = {
      id, row,
      title: t.title, short: t.short, series: t.series, seriesNo: t.seriesNo,
      author: author || "Unbekannt", authorLF, authorLast: last,
      additional: col(row, "Additional Authors").split(",").map((s) => s.trim()).filter(Boolean),
      isbn10: cleanIsbn(col(row, "ISBN")), isbn13: cleanIsbn(col(row, "ISBN13")),
      rating: rating >= 1 && rating <= 5 ? rating : 0,
      avgRating: U.num(col(row, "Average Rating")),
      publisher: col(row, "Publisher").trim(),
      binding, massMarket: /mass market/i.test(binding),
      grPages: U.int(col(row, "Number of Pages")),
      year: U.int(col(row, "Year Published")),
      grOrigYear: U.int(col(row, "Original Publication Year")),
      dateRead, dateAdded, readYear, readYearSrc,
      readMonth: dateRead ? dateRead.getMonth() : null,
      status: exclusive || "read",
      shelves,
      review: sanitize(col(row, "My Review")),
      spoiler: /^(true|yes|1)$/i.test(col(row, "Spoiler").trim()),
      readCount: U.int(col(row, "Read Count")) || (exclusive === "read" ? 1 : 0),
      idx: i,
    };
    if (b.grPages != null && b.grPages <= 0) b.grPages = null;
    if (b.isbn13.length !== 13) b.isbn13 = "";
    if (b.isbn10.length !== 10) b.isbn10 = "";
    b.type = typeOf(binding, shelvesRaw);
    b.olKey = olKey(b.isbn13, b.isbn10, b.short, b.authorLast);
    b.sortTitle = U.norm(b.title).replace(/^(the|a|an|der|die|das|ein|eine|le|la|les|el) /, "");
    b.authorSort = U.norm(last + " " + author);
    b.shuffle = Math.random();
    b.seed = U.hash32(id + "|" + b.title);
    derive(b, null);
    return b;
  }

  // Felder, die von der Open-Library-Anreicherung abhängen (bei Updates neu berechnen)
  function derive(b, ol) {
    b.ol = ol || null;
    b.pages = b.grPages || (ol && ol.p) || null;
    b.origYear = b.grOrigYear != null ? b.grOrigYear : b.year != null ? b.year : (ol && ol.y) || null;
    // Themen von Hand (data/themen.csv → books.js) gehen vor der automatischen Zuordnung
    const manual = ol && Array.isArray(ol.th) ? ol.th.filter((k) => GENRE[k] && k !== "none") : [];
    const c = manual.length ? { genre: manual[0], themes: manual.slice(0, 5) }
      : classify(b.shelves, ol && ol.s, b.origYear, b.title);
    b.genre = c.genre;
    b.themes = c.themes;
    b.themeSrc = manual.length ? "manual" : "auto";
    b.tags = tagsOf(ol);
    b.hay = U.norm([
      b.title, b.series, b.author, b.additional.join(" "), b.publisher, b.isbn10, b.isbn13,
      b.shelves.join(" "), b.themes.map((k) => GENRE[k].label).join(" "), TYPE[b.type].label, b.binding,
      b.tags.join(" "),
    ].join(" | "));
    return b;
  }

  // Stichworte zum Anzeigen: die der DNB (k), sonst die brauchbaren Schlagwörter von Open Library
  const DULL_TAGS = /^(fiction|nonfiction|non fiction|general|literature|history|biography|juvenile|ya|teens?|tweens|teenagers|young adult|.*\b(fiction|literature|criticism|curriculum|works by)\b.*)$/;
  function tagsOf(ol) {
    if (!ol) return [];
    const src = ol.k && ol.k.length ? ol.k
      : (ol.s || []).filter((s) => s.length <= 32 && !/[\/:(,]/.test(s) && !NOISE.test(U.norm(s)) && !DULL_TAGS.test(U.norm(s)));
    const seen = new Set(), out = [];
    for (const s of src) {
      const k = U.norm(s);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(s);
      }
    }
    return out.slice(0, 6);
  }

  function grLink(b) {
    return /^\d+$/.test(b.id)
      ? "https://www.goodreads.com/book/show/" + b.id
      : "https://www.goodreads.com/search?q=" + encodeURIComponent(b.isbn13 || b.short + " " + b.author);
  }
  function olLink(b) {
    if (b.ol && b.ol.w) return "https://openlibrary.org" + b.ol.w;
    if (b.isbn13 || b.isbn10) return "https://openlibrary.org/isbn/" + (b.isbn13 || b.isbn10);
    return "https://openlibrary.org/search?q=" + encodeURIComponent(b.short + " " + b.author);
  }

  // Laufende Nummer in Lesereihenfolge ("Buch Nr. 143")
  function number(books) {
    const read = books.filter((b) => b.status === "read").sort((a, b) => {
      const ta = a.dateRead ? +a.dateRead : a.readYear ? +new Date(a.readYear, 6, 1) : -1e15 + a.idx;
      const tb = b.dateRead ? +b.dateRead : b.readYear ? +new Date(b.readYear, 6, 1) : -1e15 + b.idx;
      return ta - tb;
    });
    read.forEach((b, i) => (b.no = i + 1));
    return read.length;
  }

  // ---------- Suche mit Feldsyntax ----------
  // Freitext + Felder: autor:king  seiten>500  jahr:1990-2000  gelesen:2023-05
  // isbn:978…  thema:fantasy  typ:hörbuch  bewertung>=4  verlag:…  regal:…  -thema:horror
  const FIELDS = {
    autor: "author", author: "author", a: "author", von: "author",
    titel: "title", title: "title", t: "title",
    seiten: "pages", pages: "pages", s: "pages", p: "pages",
    jahr: "pub", erschienen: "pub", year: "pub", j: "pub",
    gelesen: "read", lesejahr: "read", read: "read", l: "read",
    isbn: "isbn",
    thema: "genre", genre: "genre", g: "genre",
    typ: "type", type: "type", format: "type",
    bewertung: "rating", sterne: "rating", rating: "rating", r: "rating", stars: "rating",
    verlag: "publisher", publisher: "publisher",
    regal: "shelf", shelf: "shelf",
    reihe: "series", serie: "series", series: "series",
  };
  const NUMERIC = new Set(["pages", "pub", "rating"]);

  function tokenize(q) {
    const out = [];
    const rx = /(-?)([a-zäöü]+)(:|>=|<=|>|<|=)("([^"]*)"|\S+)|"([^"]*)"|(\S+)/gi;
    let m;
    while ((m = rx.exec(q))) {
      if (m[2] && FIELDS[U.norm(m[2])]) {
        out.push({ neg: m[1] === "-", field: FIELDS[U.norm(m[2])], op: m[3], value: m[5] != null ? m[5] : m[4] });
      } else {
        const raw = m[6] != null ? m[6] : m[0];
        const neg = raw.startsWith("-") && raw.length > 1;
        out.push({ neg, field: "text", value: neg ? raw.slice(1) : raw });
      }
    }
    return out;
  }

  function numMatch(v, op, value) {
    if (v == null) return false;
    if (op === ":") {
      // Bereiche: 1990-2000 · 1990- · -2000 · 1990..2000
      const r = value.match(/^(\d+(?:[.,]\d+)?)?(?:-|\.\.|–)(\d+(?:[.,]\d+)?)?$/);
      if (r && (r[1] != null || r[2] != null)) {
        const lo = r[1] != null ? U.num(r[1]) : -Infinity;
        const hi = r[2] != null ? U.num(r[2]) : Infinity;
        return v >= lo && v <= hi;
      }
      // Präfix: jahr:19* → 1900–1999
      if (/^\d+\*$/.test(value)) return String(v).startsWith(value.slice(0, -1));
    }
    const n = U.num(value);
    if (n == null) return false;
    switch (op) {
      case ">": return v > n;
      case "<": return v < n;
      case ">=": return v >= n;
      case "<=": return v <= n;
      default: return v === n;
    }
  }

  // Treffer ab Wortanfang: "king" findet King und Kingsolver, aber nicht Hawking
  const wordRx = (v) => new RegExp("(?:^|[^a-z0-9])" + v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  function tokenMatch(b, tk) {
    const v = tk.v != null ? tk.v : (tk.v = U.norm(tk.value));
    const rx = tk.rx || (tk.rx = wordRx(v));
    switch (tk.field) {
      case "text": {
        const digits = tk.value.replace(/[-\s]/g, "");
        if (/^\d{4,}[\dX]*$/i.test(digits) && (b.isbn13.includes(digits) || b.isbn10.includes(digits))) return true;
        return rx.test(b.hay);
      }
      case "author": return rx.test(U.norm(b.author + " | " + b.additional.join(" | ")));
      case "title": return rx.test(U.norm(b.title));
      case "publisher": return rx.test(U.norm(b.publisher));
      case "series": return rx.test(U.norm(b.series));
      case "shelf": return b.shelves.some((s) => rx.test(U.norm(s)));
      case "isbn": {
        const d = tk.value.replace(/[^0-9Xx]/g, "").toUpperCase();
        return !!d && (b.isbn13.includes(d) || b.isbn10.includes(d));
      }
      case "genre":
        return b.themes.some((k) => k.startsWith(v) || rx.test(U.norm(GENRE[k].label)));
      case "type":
        return rx.test(U.norm(TYPE[b.type].label)) || b.type.startsWith(v) || rx.test(U.norm(b.binding));
      case "read": {
        // gelesen:2023  gelesen:2023-05  gelesen>2020  gelesen:2019-2021
        const ym = tk.value.match(/^(\d{4})[-\/.](\d{1,2})$/);
        if (tk.op === ":" && ym) return b.readYear === +ym[1] && b.readMonth === +ym[2] - 1;
        if (/^(keins?|ohne|none|unbekannt)$/.test(v)) return b.readYear == null;
        return numMatch(b.readYear, tk.op, tk.value);
      }
      default:
        if (NUMERIC.has(tk.field)) {
          const val = tk.field === "pages" ? b.pages : tk.field === "pub" ? b.origYear : b.rating;
          return numMatch(val, tk.op, tk.value);
        }
        return true;
    }
  }

  function compileQuery(q) {
    const tokens = tokenize(String(q || "").trim());
    if (!tokens.length) return null;
    return (b) => tokens.every((tk) => tokenMatch(b, tk) !== tk.neg);
  }

  // ---------- Facettenfilter ----------
  function emptyFilters(statusDefault) {
    return {
      q: "",
      years: new Set(), types: new Set(), genres: new Set(), shelves: new Set(), authors: new Set(),
      status: new Set(statusDefault || ["read", "currently-reading"]),
      pages: [null, null], pub: [null, null], rating: 0,
    };
  }
  function activeCount(f, statusDefault) {
    let n = f.years.size + f.types.size + f.genres.size + f.shelves.size + f.authors.size;
    if (f.pages[0] != null || f.pages[1] != null) n++;
    if (f.pub[0] != null || f.pub[1] != null) n++;
    if (f.rating) n++;
    const def = new Set(statusDefault);
    if (f.status.size !== def.size || [...f.status].some((s) => !def.has(s))) n++;
    return n;
  }
  const yearKey = (b) => (b.readYear == null ? "none" : String(b.readYear));

  // skip: diese Facette ignorieren (für Facetten-Zähler und Diagramme)
  function makeFilter(f, skip) {
    const qf = skip === "q" ? null : compileQuery(f.q);
    return (b) => {
      if (skip !== "status" && f.status.size && !f.status.has(b.status)) return false;
      if (skip !== "years" && f.years.size && !f.years.has(yearKey(b))) return false;
      if (skip !== "types" && f.types.size && !f.types.has(b.type)) return false;
      if (skip !== "genres" && f.genres.size && !b.themes.some((g) => f.genres.has(g))) return false;
      if (skip !== "shelves" && f.shelves.size && !b.shelves.some((s) => f.shelves.has(s))) return false;
      if (skip !== "authors" && f.authors.size && !f.authors.has(b.author)) return false;
      if (skip !== "pages" && (f.pages[0] != null || f.pages[1] != null)) {
        if (b.pages == null) return false;
        if (f.pages[0] != null && b.pages < f.pages[0]) return false;
        if (f.pages[1] != null && b.pages > f.pages[1]) return false;
      }
      if (skip !== "pub" && (f.pub[0] != null || f.pub[1] != null)) {
        if (b.origYear == null) return false;
        if (f.pub[0] != null && b.origYear < f.pub[0]) return false;
        if (f.pub[1] != null && b.origYear > f.pub[1]) return false;
      }
      if (skip !== "rating" && f.rating && b.rating < f.rating) return false;
      if (qf && !qf(b)) return false;
      return true;
    };
  }

  // ---------- Sortierung ----------
  const readTime = (b) =>
    b.dateRead ? +b.dateRead : b.readYear ? +new Date(b.readYear, 6, 1) : null;
  const SORTS = {
    read: { label: "Lesedatum", dir: "desc", key: readTime },
    title: { label: "Titel", dir: "asc", key: (b) => b.sortTitle, str: true },
    author: { label: "Autor:in", dir: "asc", key: (b) => b.authorSort, str: true },
    pages: { label: "Seitenzahl", dir: "desc", key: (b) => b.pages },
    pub: { label: "Erscheinungsjahr", dir: "asc", key: (b) => b.origYear },
    rating: { label: "Meine Bewertung", dir: "desc", key: (b) => b.rating || null },
    avg: { label: "Ø Goodreads", dir: "desc", key: (b) => b.avgRating },
    color: { label: "Farbe", dir: "asc", key: (b) => b.vis && b.vis.hueKey },
    height: { label: "Größe", dir: "desc", key: (b) => b.vis && b.vis.h },
    random: { label: "Zufall", dir: "asc", key: (b) => b.shuffle },
  };
  function sortBooks(list, sortKey, dir) {
    const s = SORTS[sortKey] || SORTS.read;
    const sign = dir === "asc" ? 1 : -1;
    const keyed = list.map((b) => [s.key(b), b]);
    keyed.sort((x, y) => {
      const a = x[0], c = y[0];
      if (a == null && c == null) return x[1].sortTitle.localeCompare(y[1].sortTitle, "de");
      if (a == null) return 1;
      if (c == null) return -1;
      const r = s.str ? a.localeCompare(c, "de") : a - c;
      return r ? r * sign : x[1].sortTitle.localeCompare(y[1].sortTitle, "de");
    });
    return keyed.map((k) => k[1]);
  }

  // ---------- Gruppierung (ein Brett pro Gruppe) ----------
  const GROUPS = {
    none: { label: "Ohne" },
    year: { label: "Lesejahr" },
    genre: { label: "Thema" },
    type: { label: "Buchtyp" },
    rating: { label: "Bewertung" },
    decade: { label: "Jahrzehnt" },
    author: { label: "Autor:in" },
  };
  function groupBooks(sorted, groupKey, sortKey, dir) {
    if (!groupKey || groupKey === "none") return [{ key: "all", label: "", books: sorted }];
    let of, labelOf, order;
    const counts = {};
    if (groupKey === "author") sorted.forEach((b) => (counts[b.author] = (counts[b.author] || 0) + 1));
    switch (groupKey) {
      case "year": {
        of = (b) => (b.status === "currently-reading" && b.readYear == null ? "now" : yearKey(b));
        labelOf = (k) => (k === "none" ? "Ohne Lesedatum" : k === "now" ? "Gerade auf dem Nachttisch" : k);
        const asc = sortKey === "read" && dir === "asc";
        const v = (k) => (k === "now" ? (asc ? 1e5 : -1e5) : k === "none" ? (asc ? -1e5 : 1e5) : asc ? +k : -k);
        order = (a, b) => v(a) - v(b);
        break;
      }
      case "genre":
        of = (b) => b.genre;
        labelOf = (k) => GENRE[k].label;
        break;
      case "type":
        of = (b) => b.type;
        labelOf = (k) => TYPE[k].label;
        order = (a, b) => TYPE[a].order - TYPE[b].order;
        break;
      case "rating":
        of = (b) => String(b.rating || 0);
        labelOf = (k) => (k === "0" ? "Ohne Bewertung" : "★".repeat(+k) + "☆".repeat(5 - +k));
        order = (a, b) => b - a;
        break;
      case "decade":
        of = (b) => (b.origYear == null ? "none" : b.origYear < 1900 ? "pre" : String(Math.floor(b.origYear / 10) * 10));
        labelOf = (k) => (k === "none" ? "Erscheinungsjahr unbekannt" : k === "pre" ? "Vor 1900" : k + "er");
        order = (a, b) => {
          const v = (k) => (k === "pre" ? 0 : k === "none" ? 99999 : +k);
          return v(a) - v(b);
        };
        break;
      case "author":
        of = (b) => (counts[b.author] >= 2 ? b.author : "~");
        labelOf = (k) => (k === "~" ? "Weitere Autor:innen" : k);
        order = null;
        break;
    }
    const map = new Map();
    for (const b of sorted) {
      const k = of(b);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(b);
    }
    let keys = [...map.keys()];
    if (order) keys.sort(order);
    else
      keys.sort((a, b) => {
        if (a === "~" || a === "none") return 1;
        if (b === "~" || b === "none") return -1;
        return map.get(b).length - map.get(a).length || String(a).localeCompare(String(b), "de");
      });
    return keys.map((k) => ({ key: k, label: labelOf(k), books: map.get(k) }));
  }

  function summary(books) {
    let pages = 0, rated = 0, rsum = 0;
    for (const b of books) {
      pages += b.pages || 0;
      if (b.rating) {
        rated++;
        rsum += b.rating;
      }
    }
    return { count: books.length, pages, avgRating: rated ? rsum / rated : null };
  }

  BS.model = {
    GENRES, GENRE, TYPES, TYPE, SORTS, GROUPS, statusLabel,
    fromRow, derive, number, grLink, olLink, sanitize, classify, typeOf,
    emptyFilters, activeCount, makeFilter, compileQuery, tokenize, yearKey, sortBooks, groupBooks, summary,
  };
})();
