# -*- coding: utf-8 -*-
"""Erzeugt data/demo.js: Beispieldaten im Format des Goodreads-Exports.

Die Bücher sind real, Bewertungen, Lesedaten und Rezensionen sind erfunden –
sie zeigen nur, wie das Regal mit einem echten Export aussieht. ISBNs stehen
nur dort, wo sie sicher stimmen; sonst sucht die App per Titel bei Open Library.
"""
import csv, io, json, os, datetime as dt

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "..", "data", "demo.js")

# Titel | Autor:in | ISBN13 | Sterne | Ø Goodreads | Verlag | Einband | Seiten | Jahr | Original | gelesen | Regale | Rezension
B = [
 ("Sapiens: A Brief History of Humankind", "Yuval Noah Harari", "9780062316097", 4, 4.37, "Harper", "Hardcover", 443, 2015, 2011, "2019/01/20", "geschichte, sachbuch",
  "Großer Bogen über 70.000 Jahre. Manche Thesen sind steil, aber genau das macht es zum perfekten Gesprächsstoff beim Abendessen."),
 ("The Martian", "Andy Weir", "9780553418026", 5, 4.42, "Broadway Books", "Paperback", 384, 2014, 2011, "2019/02/17", "science-fiction, favoriten",
  "Ein Buch, das Physikhausaufgaben spannend macht. Watney ist der beste Ich-Erzähler seit Langem.<br/><br/>Wer Kartoffeln mag, wird weinen."),
 ("Thinking, Fast and Slow", "Daniel Kahneman", "9780374533557", 4, 4.18, "Farrar, Straus and Giroux", "Paperback", 499, 2013, 2011, "2019/03/30", "psychologie, sachbuch",
  "System 1 und System 2 begegnen mir seitdem in jedem Meeting. Teilweise zäh, aber Pflichtlektüre für alle, die mit Daten Entscheidungen begründen."),
 ("Der Vorleser", "Bernhard Schlink", "", 3, 3.80, "Diogenes", "Taschenbuch", 207, 1997, 1995, "2019/04/22", "roman", ""),
 ("The Name of the Wind (The Kingkiller Chronicle, #1)", "Patrick Rothfuss", "9780756404741", 5, 4.52, "DAW Books", "Hardcover", 662, 2007, 2007, "2019/06/10", "fantasy, favoriten",
  "Sprache wie Musik. Ich warte seitdem auf Band drei – wie alle anderen auch."),
 ("Weapons of Math Destruction", "Cathy O'Neil", "9780553418811", 4, 3.88, "Crown", "Hardcover", 259, 2016, 2016, "2019/07/05", "ki-und-daten, sachbuch",
  "Wichtige Warnung vor undurchsichtigen Scores. Für Leute aus dem Fach etwas plakativ, für alle anderen ein Augenöffner."),
 ("Dune (Dune, #1)", "Frank Herbert", "9780441172719", 5, 4.27, "Ace Books", "Paperback", 658, 2005, 1965, "2019/08/24", "science-fiction, klassiker",
  "Ökologie, Religion, Politik – und Sandwürmer. Die ersten hundert Seiten sind Arbeit, danach lässt es einen nicht mehr los."),
 ("Die Vermessung der Welt", "Daniel Kehlmann", "", 4, 3.71, "Rowohlt Taschenbuch", "Taschenbuch", 302, 2008, 2005, "2019/09/15", "historischer-roman",
  "Gauß und Humboldt als komisches Paar. Leichtfüßig und klug."),
 ("The Signal and the Noise", "Nate Silver", "9780143125082", 4, 4.00, "Penguin Books", "Paperback", 560, 2015, 2012, "2019/10/28", "statistik, sachbuch",
  "Bayes für alle. Das Kapitel über Erdbeben ist großartig, Poker hätte kürzer sein dürfen."),
 ("Gone Girl", "Gillian Flynn", "", 4, 4.14, "Crown", "Kindle Edition", 415, 2012, 2012, "2019/11/18", "thriller",
  "Die zweite Hälfte dreht alles um. <spoiler>Amy ist die eigentliche Erzählerin, der man nicht trauen darf.</spoiler>"),
 ("It", "Stephen King", "9781501142970", 4, 4.25, "Scribner", "Paperback", 1138, 2016, 1986, "2019/12/30", "horror",
  "Über tausend Seiten Derry. Die Kindheitskapitel sind das Beste, was King geschrieben hat."),
 ("The Emperor of All Maladies", "Siddhartha Mukherjee", "9781439170915", 5, 4.31, "Scribner", "Paperback", 571, 2011, 2010, "2020/01/26", "medizin, sachbuch, favoriten",
  "Eine Biografie des Krebses, so erzählt, dass man die Studien vor sich sieht. Für mich das beste Medizinbuch überhaupt."),
 ("Educated", "Tara Westover", "9780399590504", 5, 4.47, "Random House", "Hardcover", 334, 2018, 2018, "2020/02/14", "biografie",
  "Kaum zu glauben, dass das alles passiert ist. Leise und trotzdem unglaublich wütend machend."),
 ("The Hunger Games (The Hunger Games, #1)", "Suzanne Collins", "9780439023481", 4, 4.34, "Scholastic Press", "Hardcover", 374, 2008, 2008, "2020/03/21", "jugendbuch, dystopie", ""),
 ("Station Eleven", "Emily St. John Mandel", "", 4, 4.04, "Knopf", "Audible Audio", 333, 2014, 2014, "2020/04/09", "science-fiction, hörbuch",
  "Im April 2020 gehört – seltsames Timing. Trotzdem tröstlich: Survival is insufficient."),
 ("Die Pest", "Albert Camus", "", 4, 4.00, "Rowohlt Taschenbuch", "Taschenbuch", 350, 1998, 1947, "2020/04/30", "klassiker, roman", ""),
 ("Being Mortal", "Atul Gawande", "9780805095159", 5, 4.46, "Metropolitan Books", "Hardcover", 282, 2014, 2014, "2020/05/24", "medizin",
  "Was Medizin am Lebensende leisten soll – und was nicht. Sollte jede:r lesen, die/der im Gesundheitswesen arbeitet."),
 ("Neuromancer (Sprawl, #1)", "William Gibson", "9780441569595", 3, 3.89, "Ace", "Mass Market Paperback", 271, 1984, 1984, "2020/06/20", "science-fiction, cyberpunk",
  "Historisch wichtig, stilistisch anstrengend. Der Himmel hatte die Farbe eines Fernsehers, der auf einen toten Kanal eingestellt war."),
 ("Factfulness", "Hans Rosling", "9781250107817", 5, 4.33, "Flatiron Books", "Hardcover", 341, 2018, 2018, "2020/07/12", "statistik, sachbuch",
  "Die Welt ist besser, als wir denken – und Rosling erklärt, warum wir das nicht glauben. Ich habe die zehn Instinkte als Checkliste im Büro hängen."),
 ("Circe", "Madeline Miller", "9780316556347", 4, 4.27, "Little, Brown and Company", "Hardcover", 393, 2018, 2018, "2020/08/16", "fantasy, mythologie", ""),
 ("Tschick", "Wolfgang Herrndorf", "", 5, 4.04, "Rowohlt Taschenbuch", "Taschenbuch", 254, 2012, 2010, "2020/08/29", "jugendbuch, roman",
  "Sommer, Lada, Freundschaft. Das schönste Roadmovie in Buchform."),
 ("The Gene: An Intimate History", "Siddhartha Mukherjee", "9781476733500", 4, 4.36, "Scribner", "Hardcover", 592, 2016, 2016, "2020/10/18", "medizin, wissenschaft", ""),
 ("The Silent Patient", "Alex Michaelides", "9781250301697", 3, 4.08, "Celadon Books", "Hardcover", 325, 2019, 2019, "2020/11/07", "thriller",
  "Solide, aber den Twist habe ich zu früh geahnt."),
 ("Die Känguru-Chroniken", "Marc-Uwe Kling", "", 5, 4.31, "Hörbuch Hamburg", "Audio CD", 272, 2009, 2009, "2020/12/23", "humor, hörbuch",
  "Nur als Hörbuch, gelesen vom Autor. Halt! Stopp! Das ist Kunst."),
 ("The Hobbit", "J.R.R. Tolkien", "9780618260300", 5, 4.29, "Houghton Mifflin", "Paperback", 366, 2002, 1937, "2020/12/30", "fantasy, klassiker", ""),
 ("The Book of Why: The New Science of Cause and Effect", "Judea Pearl", "9780465097609", 5, 4.02, "Basic Books", "Hardcover", 418, 2018, 2018, "2021/01/17", "ki-und-daten, statistik, favoriten",
  "Die Kausalitätsleiter hat verändert, wie ich über Modelle in der Klinik nachdenke. Do-Kalkül zum Mitnehmen."),
 ("Deep Medicine", "Eric Topol", "9781541644632", 4, 4.07, "Basic Books", "Hardcover", 400, 2019, 2019, "2021/02/20", "medizin, ki-und-daten",
  "Optimistischer Blick auf KI in der Medizin. Weniger Technik, mehr Haltung – genau richtig für Gespräche mit Ärzt:innen."),
 ("Human Compatible", "Stuart Russell", "9780525558613", 4, 4.08, "Viking", "Hardcover", 352, 2019, 2019, "2021/03/14", "ki-und-daten", ""),
 ("Klara and the Sun", "Kazuo Ishiguro", "9780593318171", 4, 3.71, "Knopf", "Hardcover", 303, 2021, 2021, "2021/04/11", "roman, science-fiction",
  "Ishiguro schreibt Sehnsucht wie kein anderer. Klara bleibt."),
 ("The Midnight Library", "Matt Haig", "9780525559474", 3, 4.00, "Viking", "Hardcover", 288, 2020, 2020, "2021/05/01", "roman", ""),
 ("Project Hail Mary", "Andy Weir", "9780593135204", 5, 4.52, "Ballantine Books", "Hardcover", 476, 2021, 2021, "2021/06/02", "science-fiction, favoriten",
  "Rocky! Mehr muss man nicht sagen. Bestes Buch des Jahres."),
 ("Atomic Habits", "James Clear", "9780735211292", 4, 4.38, "Avery", "Hardcover", 319, 2018, 2018, "2021/07/19", "ratgeber, produktivität", ""),
 ("Der Schwarm", "Frank Schätzing", "", 4, 3.90, "Fischer Taschenbuch", "Taschenbuch", 992, 2005, 2004, "2021/08/30", "thriller, science-fiction",
  "Dick wie ein Ziegelstein, spannend bis zum Schluss. Die Meeresbiologie ist erstaunlich gut recherchiert."),
 ("Born a Crime", "Trevor Noah", "", 5, 4.48, "Audible Studios", "Audible Audio", 304, 2016, 2016, "2021/09/12", "biografie, hörbuch",
  "Unbedingt als Hörbuch: Trevor Noah liest selbst, mit allen Sprachen."),
 ("Algorithms to Live By", "Brian Christian", "9781627790369", 4, 4.13, "Henry Holt", "Hardcover", 368, 2016, 2016, "2021/10/03", "ki-und-daten, mathematik",
  "Optimal Stopping fürs Wohnungssuchen, Caching für den Kleiderschrank. Informatik für den Alltag."),
 ("The Three-Body Problem (Remembrance of Earth's Past, #1)", "Liu Cixin", "9780765382030", 4, 4.07, "Tor Books", "Paperback", 399, 2016, 2008, "2021/11/14", "science-fiction", ""),
 ("The Man Who Mistook His Wife for a Hat", "Oliver Sacks", "9780684853949", 4, 4.07, "Touchstone", "Paperback", 243, 1998, 1985, "2021/12/05", "medizin, psychologie", ""),
 ("Fermat's Enigma", "Simon Singh", "9780385493628", 5, 4.16, "Anchor", "Paperback", 315, 1998, 1997, "2021/12/28", "mathematik",
  "Mathematikgeschichte als Thriller. Ich habe es zweimal verschenkt."),
 ("Bad Blood: Secrets and Lies in a Silicon Valley Startup", "John Carreyrou", "9781524731656", 5, 4.38, "Knopf", "Hardcover", 339, 2018, 2018, "2022/01/23", "wirtschaft, medizin",
  "Pflichtlektüre für alle, die Medizinprodukte bauen. Validierung ist kein Detail."),
 ("Qualityland", "Marc-Uwe Kling", "", 4, 3.95, "Ullstein", "Gebundene Ausgabe", 384, 2017, 2017, "2022/02/12", "science-fiction, satire", ""),
 ("1984", "George Orwell", "9780451524935", 5, 4.19, "Signet Classic", "Mass Market Paperback", 328, 1961, 1949, "2022/03/06", "klassiker, dystopie", ""),
 ("Brave New World", "Aldous Huxley", "9780060850524", 4, 3.99, "Harper Perennial", "Paperback", 268, 2006, 1932, "2022/03/27", "klassiker, dystopie",
  "Direkt nach 1984 gelesen. Huxley wirkt heute fast realistischer."),
 ("The Code Breaker", "Walter Isaacson", "9781982115852", 4, 4.23, "Simon & Schuster", "Hardcover", 536, 2021, 2021, "2022/04/24", "wissenschaft, biografie", ""),
 ("The Way of Kings (The Stormlight Archive, #1)", "Brandon Sanderson", "", 5, 4.65, "Tor Books", "Kindle Edition", 1007, 2010, 2010, "2022/06/12", "fantasy",
  "Tausend Seiten Aufbau, dann hundert Seiten, die alles rechtfertigen. Sanderlanche!"),
 ("Where the Crawdads Sing", "Delia Owens", "9780735219090", 3, 4.45, "G.P. Putnam's Sons", "Hardcover", 370, 2018, 2018, "2022/07/09", "roman", ""),
 ("Range: Why Generalists Triumph in a Specialized World", "David Epstein", "9780735214484", 4, 4.13, "Riverhead Books", "Hardcover", 339, 2019, 2019, "2022/08/01", "psychologie, sachbuch", ""),
 ("Die Verwandlung", "Franz Kafka", "", 4, 3.83, "Reclam", "Taschenbuch", 72, 2001, 1915, "2022/08/14", "klassiker", ""),
 ("Foundation (Foundation, #1)", "Isaac Asimov", "9780553293357", 4, 4.17, "Bantam Spectra", "Mass Market Paperback", 255, 1991, 1951, "2022/09/18", "science-fiction, klassiker",
  "Psychohistorie ist im Grunde Statistik mit Ehrgeiz. Hat mir als Datenmensch natürlich gefallen."),
 ("Superintelligence: Paths, Dangers, Strategies", "Nick Bostrom", "9780199678112", 3, 3.86, "Oxford University Press", "Hardcover", 328, 2014, 2014, "2022/10/22", "ki-und-daten, philosophie", ""),
 ("Das Parfum", "Patrick Süskind", "", 4, 4.03, "Diogenes", "Taschenbuch", 320, 1994, 1985, "2022/11/19", "roman, klassiker", ""),
 ("Maus I: A Survivor's Tale", "Art Spiegelman", "", 5, 4.37, "Pantheon", "Paperback", 159, 1986, 1986, "2022/12/10", "graphic-novel, geschichte",
  "Mehr Geschichte auf 160 Seiten als in manchem Schulbuch."),
 ("Tomorrow, and Tomorrow, and Tomorrow", "Gabrielle Zevin", "", 5, 4.18, "Knopf", "Hardcover", 401, 2022, 2022, "2023/01/15", "roman, favoriten",
  "Ein Roman über Freundschaft, der zufällig von Videospielen handelt."),
 ("The Last Thing He Told Me", "Laura Dave", "9781501171345", 3, 3.95, "Simon & Schuster", "Hardcover", 307, 2021, 2021, "2023/02/05", "thriller", ""),
 ("A Brief History of Time", "Stephen Hawking", "9780553380163", 4, 4.20, "Bantam", "Paperback", 212, 1998, 1988, "2023/02/26", "wissenschaft, physik", ""),
 ("Pride and Prejudice", "Jane Austen", "9780141439518", 4, 4.29, "Penguin Classics", "Paperback", 480, 2002, 1813, "2023/03/19", "klassiker, romance",
  "Endlich gelesen. Elizabeth Bennet hätte Twitter dominiert."),
 ("The Shining", "Stephen King", "9780307743657", 4, 4.27, "Anchor", "Mass Market Paperback", 659, 2012, 1977, "2023/04/10", "horror", ""),
 ("11/22/63", "Stephen King", "9781451627282", 5, 4.31, "Scribner", "Hardcover", 849, 2011, 2011, "2023/05/14", "science-fiction, zeitreise, favoriten",
  "Zeitreise, Liebesgeschichte und Amerika der Sechziger. Mein liebster King."),
 ("Misery", "Stephen King", "", 4, 4.21, "Simon & Schuster Audio", "Audible Audio", 370, 2016, 1987, "2023/06/03", "horror, thriller, hörbuch", ""),
 ("Never Let Me Go", "Kazuo Ishiguro", "9781400078776", 4, 3.85, "Vintage", "Paperback", 288, 2006, 2005, "2023/07/02", "roman, science-fiction", ""),
 ("Gödel, Escher, Bach: An Eternal Golden Braid", "Douglas R. Hofstadter", "9780465026562", 4, 4.29, "Basic Books", "Paperback", 777, 1999, 1979, "2023/08/20", "mathematik, philosophie",
  "Ein Sommerprojekt. Nicht alles verstanden, aber die Dialoge sind ein Genuss."),
 ("Unterleuten", "Juli Zeh", "", 4, 3.90, "Luchterhand", "Gebundene Ausgabe", 640, 2016, 2016, "2023/09/10", "roman", ""),
 ("The Road", "Cormac McCarthy", "9780307387899", 4, 3.98, "Vintage", "Paperback", 287, 2006, 2006, "2023/10/01", "roman, dystopie", ""),
 ("The Hitchhiker's Guide to the Galaxy (Hitchhiker's Guide to the Galaxy, #1)", "Douglas Adams", "9780345391803", 5, 4.23, "Del Rey", "Paperback", 193, 1995, 1979, "2023/10/28", "science-fiction, humor",
  "Zum dritten Mal gelesen, immer noch 42 von 42."),
 ("Becoming", "Michelle Obama", "", 4, 4.50, "Random House Audio", "Audible Audio", 448, 2018, 2018, "2023/11/25", "biografie, hörbuch", ""),
 ("Die Wand", "Marlen Haushofer", "", 5, 4.10, "List", "Taschenbuch", 288, 2004, 1963, "2023/12/27", "roman, klassiker",
  "Eine Frau, ein Hund, eine Kuh und eine unsichtbare Wand. Hat mich wochenlang begleitet."),
 ("The Left Hand of Darkness", "Ursula K. Le Guin", "9780441478125", 4, 4.09, "Ace", "Paperback", 304, 2000, 1969, "2024/01/14", "science-fiction, klassiker", ""),
 ("Babel", "R.F. Kuang", "", 5, 4.18, "Harper Voyager", "Hardcover", 545, 2022, 2022, "2024/02/18", "fantasy, historischer-roman",
  "Sprachwissenschaft als Magiesystem – und eine wütende Abrechnung mit dem Empire."),
 ("Fahrenheit 451", "Ray Bradbury", "9781451673319", 4, 3.97, "Simon & Schuster", "Paperback", 249, 2012, 1953, "2024/03/03", "klassiker, dystopie", ""),
 ("The Alignment Problem", "Brian Christian", "", 5, 4.37, "W. W. Norton & Company", "Hardcover", 476, 2020, 2020, "2024/03/24", "ki-und-daten, favoriten",
  "Das beste Buch über Machine Learning für Menschen, die keine Formeln lesen wollen – und für die, die es tun."),
 ("Atlas of AI", "Kate Crawford", "", 3, 3.90, "Yale University Press", "Kindle Edition", 336, 2021, 2021, "2024/04/14", "ki-und-daten", ""),
 ("Demon Copperhead", "Barbara Kingsolver", "", 5, 4.48, "Harper", "Hardcover", 548, 2022, 2022, "2024/05/12", "roman",
  "Dickens in den Appalachen. Wütend, warm und unvergesslich."),
 ("The Great Gatsby", "F. Scott Fitzgerald", "9780743273565", 3, 3.93, "Scribner", "Paperback", 180, 2004, 1925, "2024/06/02", "klassiker", ""),
 ("Lessons in Chemistry", "Bonnie Garmus", "", 4, 4.28, "Penguin Audio", "Audible Audio", 386, 2022, 2022, "2024/06/30", "roman, hörbuch", ""),
 ("Der Process", "Franz Kafka", "", 3, 3.98, "Fischer Taschenbuch", "Taschenbuch", 280, 2008, 1925, "2024/07/21", "klassiker", ""),
 ("Why We Sleep", "Matthew Walker", "", 4, 4.37, "Scribner", "Paperback", 360, 2017, 2017, "2024/08/18", "medizin, wissenschaft",
  "Danach eine Woche lang um 22 Uhr im Bett gewesen. Hielt nicht an."),
 ("Piranesi", "Susanna Clarke", "", 5, 4.23, "Bloomsbury", "Hardcover", 245, 2020, 2020, "2024/09/08", "fantasy",
  "Das Haus ist grenzenlos, seine Güte unendlich. Kurz, seltsam, perfekt."),
 ("The Body: A Guide for Occupants", "Bill Bryson", "", 4, 4.26, "Doubleday", "Hardcover", 450, 2019, 2019, "2024/10/13", "medizin, wissenschaft", ""),
 ("Persepolis", "Marjane Satrapi", "", 5, 4.27, "Pantheon", "Paperback", 341, 2007, 2000, "2024/11/10", "graphic-novel, biografie", ""),
 ("A Christmas Carol", "Charles Dickens", "", 4, 4.08, "Penguin Classics", "Kindle Edition", 104, 2003, 1843, "2024/12/22", "klassiker", ""),
 ("Intermezzo", "Sally Rooney", "", 4, 3.90, "Farrar, Straus and Giroux", "Hardcover", 448, 2024, 2024, "2025/01/19", "roman", ""),
 ("Nexus: A Brief History of Information Networks from the Stone Age to AI", "Yuval Noah Harari", "", 4, 4.10, "Random House", "Hardcover", 528, 2024, 2024, "2025/02/16", "ki-und-daten, geschichte", ""),
 ("James", "Percival Everett", "", 5, 4.40, "Doubleday", "Hardcover", 303, 2024, 2024, "2025/03/09", "roman, historischer-roman",
  "Huckleberry Finn aus Jims Sicht. Brillant, witzig und schmerzhaft."),
 ("The Covenant of Water", "Abraham Verghese", "", 5, 4.50, "Grove Press", "Hardcover", 724, 2023, 2023, "2025/04/27", "roman, medizin, favoriten",
  "Ein Arzt, der erzählen kann wie ein Großvater. Drei Generationen, eine Krankheit, viel Wasser."),
 ("Co-Intelligence: Living and Working with AI", "Ethan Mollick", "", 4, 4.00, "Penguin Audio", "Audible Audio", 256, 2024, 2024, "2025/05/18", "ki-und-daten, hörbuch", ""),
 ("Kairos", "Jenny Erpenbeck", "", 4, 3.80, "Penguin Verlag", "Gebundene Ausgabe", 416, 2021, 2021, "2025/06/22", "roman", ""),
 ("Mistborn: The Final Empire (Mistborn, #1)", "Brandon Sanderson", "", 4, 4.47, "Tor Books", "Paperback", 541, 2006, 2006, "2025/07/20", "fantasy", ""),
 ("Thinking in Systems: A Primer", "Donella H. Meadows", "", 4, 4.20, "Chelsea Green Publishing", "Paperback", 218, 2008, 2008, "2025/08/10", "wissenschaft, sachbuch", ""),
 ("Yellowface", "R.F. Kuang", "", 4, 3.80, "William Morrow", "Hardcover", 336, 2023, 2023, "2025/09/14", "roman, thriller", ""),
 ("Dracula", "Bram Stoker", "", 3, 4.00, "Penguin Classics", "Paperback", 488, 2003, 1897, "2025/10/30", "horror, klassiker",
  "Pünktlich zu Halloween. Briefroman-Form ist anstrengend, die Atmosphäre ist es wert."),
 ("Orbital", "Samantha Harvey", "", 4, 3.70, "Grove Press", "Hardcover", 136, 2024, 2023, "2025/11/23", "roman", ""),
 ("The Anxious Generation", "Jonathan Haidt", "", 4, 4.20, "Penguin Press", "Hardcover", 385, 2024, 2024, "2025/12/14", "psychologie, sachbuch", ""),
 ("Dune Messiah (Dune, #2)", "Frank Herbert", "", 4, 3.89, "Ace Books", "Paperback", 336, 2008, 1969, "2026/01/11", "science-fiction", ""),
 ("The Ministry of Time", "Kaliane Bradley", "", 4, 3.70, "Avid Reader Press", "Hardcover", 352, 2024, 2024, "2026/02/08", "science-fiction, romance", ""),
 ("The Wager: A Tale of Shipwreck, Mutiny and Murder", "David Grann", "", 5, 4.30, "Random House Audio", "Audible Audio", 352, 2023, 2023, "2026/03/15", "geschichte, hörbuch",
  "Sachbuch, das sich liest wie ein Abenteuerroman. Gehört auf langen Bahnfahrten."),
 ("Wind and Truth (The Stormlight Archive, #5)", "Brandon Sanderson", "", 4, 4.60, "Tor Books", "Hardcover", 1344, 2024, 2024, "2026/05/03", "fantasy",
  "Das dickste Buch im Regal. Würdiger Abschluss des ersten Zyklus."),
 ("Prophet Song", "Paul Lynch", "", 4, 3.90, "Atlantic Monthly Press", "Hardcover", 309, 2023, 2023, "2026/06/07", "roman, dystopie", ""),
 ("Die Hauptstadt", "Robert Menasse", "", 4, 3.60, "Suhrkamp", "Gebundene Ausgabe", 459, 2017, 2017, "2026/07/12", "roman, satire", ""),
 ("Statistical Rethinking: A Bayesian Course with Examples in R and Stan", "Richard McElreath", "", 5, 4.60, "CRC Press", "Hardcover", 594, 2020, 2015, "2026/08/30", "statistik, mathematik, ki-und-daten, favoriten",
  "Das Lehrbuch, das ich mir im Studium gewünscht hätte. Golems, DAGs und ehrliche Unsicherheit."),
 # Ohne Lesedatum (vor Goodreads gelesen)
 ("Harry Potter and the Sorcerer's Stone (Harry Potter, #1)", "J.K. Rowling", "9780439708180", 5, 4.47, "Scholastic", "Paperback", 309, 1998, 1997, "", "fantasy, jugendbuch", ""),
 ("The Lord of the Rings", "J.R.R. Tolkien", "", 5, 4.53, "Houghton Mifflin", "Hardcover", 1178, 2005, 1955, "", "fantasy, klassiker", ""),
 ("To Kill a Mockingbird", "Harper Lee", "9780060935467", 5, 4.26, "Harper Perennial", "Paperback", 324, 2002, 1960, "", "klassiker", ""),
 ("Momo", "Michael Ende", "", 5, 4.25, "Thienemann", "Gebundene Ausgabe", 304, 1973, 1973, "", "jugendbuch, fantasy", ""),
 ("Die unendliche Geschichte", "Michael Ende", "", 5, 4.20, "Thienemann", "Gebundene Ausgabe", 428, 1979, 1979, "", "fantasy, jugendbuch", ""),
]
CURRENT = [
 ("The Brothers Karamazov", "Fyodor Dostoyevsky", "", 0, 4.36, "Farrar, Straus and Giroux", "Paperback", 796, 2002, 1880, "klassiker"),
 ("The Coming Wave", "Mustafa Suleyman", "", 0, 4.10, "Random House Audio", "Audible Audio", 352, 2023, 2023, "ki-und-daten, hörbuch"),
]
TO_READ = [
 ("The Making of the Atomic Bomb", "Richard Rhodes", "", 0, 4.38, "Simon & Schuster", "Paperback", 886, 2012, 1986, "geschichte, wissenschaft"),
 ("Middlemarch", "George Eliot", "", 0, 4.01, "Penguin Classics", "Paperback", 880, 2003, 1871, "klassiker"),
]
REREAD = {"The Hobbit": 2, "The Hitchhiker's Guide to the Galaxy (Hitchhiker's Guide to the Galaxy, #1)": 3, "Dune (Dune, #1)": 2}

HEAD = ["Book Id", "Title", "Author", "Author l-f", "Additional Authors", "ISBN", "ISBN13", "My Rating",
        "Average Rating", "Publisher", "Binding", "Number of Pages", "Year Published", "Original Publication Year",
        "Date Read", "Date Added", "Bookshelves", "Bookshelves with positions", "Exclusive Shelf", "My Review",
        "Spoiler", "Private Notes", "Read Count", "Owned Copies"]


def lf(name):
    parts = name.split()
    return parts[-1] + ", " + " ".join(parts[:-1]) if len(parts) > 1 else name


def row(i, t, a, isbn, r, avg, pub, binding, pages, year, orig, read, shelves, review, status):
    added = ""
    if read:
        d = dt.date(*map(int, read.split("/")))
        added = (d - dt.timedelta(days=18 + (i * 7) % 40)).strftime("%Y/%m/%d")
    else:
        added = "2014/0%d/1%d" % (1 + i % 9, i % 9)
    if status != "read":
        added = "2026/0%d/0%d" % (3 + i % 6, 1 + i % 8)
    return {
        "Book Id": "demo-%d" % i, "Title": t, "Author": a, "Author l-f": lf(a),
        "Additional Authors": "Dana Mackenzie" if a == "Judea Pearl" else ("Tom Griffiths" if t.startswith("Algorithms to Live") else ""),
        "ISBN": '=""', "ISBN13": '="%s"' % isbn,
        "My Rating": r, "Average Rating": "%.2f" % avg, "Publisher": pub, "Binding": binding,
        "Number of Pages": pages, "Year Published": year, "Original Publication Year": orig,
        "Date Read": read, "Date Added": added,
        "Bookshelves": shelves if status == "read" else (shelves + ", " + status),
        "Bookshelves with positions": "", "Exclusive Shelf": status, "My Review": review,
        "Spoiler": "true" if "<spoiler>" in review else "", "Private Notes": "",
        "Read Count": REREAD.get(t, 1) if status == "read" else 0, "Owned Copies": 0,
    }


rows = []
for i, b in enumerate(B):
    rows.append(row(i + 1, *b, "read"))
for j, b in enumerate(CURRENT):
    rows.append(row(500 + j, *b[:10], "", b[10], "", "currently-reading"))
for j, b in enumerate(TO_READ):
    rows.append(row(600 + j, *b[:10], "", b[10], "", "to-read"))
rows.reverse()  # Goodreads exportiert neueste zuerst

buf = io.StringIO()
w = csv.DictWriter(buf, fieldnames=HEAD, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
w.writeheader()
for r in rows:
    w.writerow(r)
text = buf.getvalue()
js = ("// Beispieldaten im Goodreads-Exportformat (erzeugt von tools/make_demo.py).\n"
      "// Echte Bücher, erfundene Lesedaten, Sterne und Rezensionen.\n"
      "window.BOOKSHELF_DEMO_CSV = " + json.dumps(text, ensure_ascii=False) + ";\n")
io.open(OUT, "w", encoding="utf-8").write(js)
print("demo.js:", len(rows), "Bücher,", round(len(js) / 1024, 1), "KB")
