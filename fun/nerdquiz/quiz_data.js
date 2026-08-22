// Datenbasis der Quizsammlung – hier neue Fragen ergänzen.
window.QUIZ_DATA = {
  "meta": {
    "title": "Quizsammlung",
    "quizCount": 18,
    "questionCount": 345
  },
  "categories": {
    "base-geo": {
      "id": "base-geo",
      "name": "Geografie",
      "source": "Basis-Set",
      "questions": [
        {
          "points": 100,
          "question": "Was ist die Hauptstadt von Australien?",
          "answer": "Canberra"
        },
        {
          "points": 200,
          "question": "Welcher ist der längste Fluss der Welt?",
          "answer": "Nil"
        },
        {
          "points": 300,
          "question": "In welchem Land liegt der Mount Everest?",
          "answer": "Nepal / Tibet"
        },
        {
          "points": 600,
          "question": "Welches ist das kleinste Land der Welt?",
          "answer": "Vatikanstadt"
        },
        {
          "points": 1000,
          "question": "Wie viele Zeitzonen hat Russland?",
          "answer": "11"
        }
      ]
    },
    "base-wissenschaft": {
      "id": "base-wissenschaft",
      "name": "Wissenschaft",
      "source": "Basis-Set",
      "questions": [
        {
          "points": 100,
          "question": "Was ist das chemische Symbol für Gold?",
          "answer": "Au"
        },
        {
          "points": 200,
          "question": "Wie viele Knochen hat ein erwachsener Mensch?",
          "answer": "206"
        },
        {
          "points": 300,
          "question": "Was ist die Einheit der elektrischen Stromstärke?",
          "answer": "Ampere"
        },
        {
          "points": 600,
          "question": "Welches Element hat die Ordnungszahl 1?",
          "answer": "Wasserstoff"
        },
        {
          "points": 1000,
          "question": "Wie schnell ist Licht im Vakuum (in km/s)?",
          "answer": "299.792",
          "kind": "schaetz"
        }
      ]
    },
    "base-geschichte": {
      "id": "base-geschichte",
      "name": "Geschichte",
      "source": "Basis-Set",
      "questions": [
        {
          "points": 100,
          "question": "In welchem Jahr fiel die Berliner Mauer?",
          "answer": "1989"
        },
        {
          "points": 200,
          "question": "Wer war der erste deutsche Bundeskanzler?",
          "answer": "Konrad Adenauer"
        },
        {
          "points": 300,
          "question": "Wann endete der Zweite Weltkrieg in Europa?",
          "answer": "1945"
        },
        {
          "points": 600,
          "question": "Welches Reich regierte Kleopatra?",
          "answer": "Ägypten"
        },
        {
          "points": 1000,
          "question": "Wann wurde die EU gegründet?",
          "answer": "1992",
          "note": "Vertrag von Maastricht"
        }
      ]
    },
    "base-kunst": {
      "id": "base-kunst",
      "name": "Kunst & Kultur",
      "source": "Basis-Set",
      "questions": [
        {
          "points": 100,
          "question": "Wer malte die Mona Lisa?",
          "answer": "Leonardo da Vinci"
        },
        {
          "points": 200,
          "question": "Wer schrieb „Faust“?",
          "answer": "Goethe"
        },
        {
          "points": 300,
          "question": "Welcher Komponist wurde taub?",
          "answer": "Beethoven"
        },
        {
          "points": 600,
          "question": "In welcher Stadt steht das Kolosseum?",
          "answer": "Rom"
        },
        {
          "points": 1000,
          "question": "Wer schrieb „Die Verwandlung“?",
          "answer": "Franz Kafka"
        }
      ]
    },
    "base-sport": {
      "id": "base-sport",
      "name": "Sport",
      "source": "Basis-Set",
      "questions": [
        {
          "points": 100,
          "question": "Wie oft hat Deutschland die Fußball-WM gewonnen?",
          "answer": "4"
        },
        {
          "points": 200,
          "question": "Wie viele Spieler hat eine Basketball-Mannschaft auf dem Feld?",
          "answer": "5"
        },
        {
          "points": 300,
          "question": "Wie lang ist ein Marathon in km?",
          "answer": "42,195"
        },
        {
          "points": 600,
          "question": "In welcher Sportart gibt es einen „Slam Dunk“?",
          "answer": "Basketball"
        },
        {
          "points": 1000,
          "question": "Wo fanden die ersten modernen Olympischen Spiele statt?",
          "answer": "Athen"
        }
      ]
    },
    "nq-action": {
      "id": "nq-action",
      "name": "Und Action!",
      "source": "Nerdquiz 2.0",
      "questions": [
        {
          "points": 100,
          "question": "Für welchen Film bekam Leonardo DiCaprio seinen ersten Oscar?",
          "answer": "The Revenant"
        },
        {
          "points": 200,
          "question": "Wie heißt das Mädchen aus „Léon – Der Profi“, das von Natalie Portman verkörpert wird?",
          "answer": "Mathilda"
        },
        {
          "points": 300,
          "question": "Welche Serie beginnt mit diesem Intro?",
          "answer": "Dexter",
          "media": "https://www.youtube.com/watch?v=f73a9y0sb7Q",
          "kind": "musik"
        },
        {
          "points": 600,
          "question": "„Avengers: Endgame“ hätte „Avatar“ fast von Platz 1 der größten Filmerfolge abgelöst. Wie viel hat Endgame eingespielt (in Mio. US-Dollar)?",
          "answer": "2.297,5 Mio. US-Dollar",
          "kind": "schaetz"
        },
        {
          "points": 1000,
          "question": "Wo wurden die meisten Szenen von „Der Herr der Ringe“ gedreht?",
          "answer": "Neuseeland"
        }
      ]
    },
    "nq-grusel": {
      "id": "nq-grusel",
      "name": "Gruselspaß",
      "source": "Nerdquiz 2.0",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt die berühmte Puppe, die in Amerika in einem Schaukasten eingesperrt ist, weil sie von einem Geist besessen sein soll – und die einem Film ihren Namen gab?",
          "answer": "Annabelle"
        },
        {
          "points": 200,
          "question": "Welcher Mörder wird meist von diesem Sound begleitet?",
          "answer": "Jason Voorhees",
          "media": "https://www.youtube.com/watch?v=ao-xzO7dYQU",
          "kind": "musik"
        },
        {
          "points": 300,
          "question": "Wie nennt man das Gerät, mit dem man angeblich Geister aufspüren kann?",
          "answer": "EMF-Meter (Elektromagnetfeld-Messer)"
        },
        {
          "points": 600,
          "question": "Wie heißt das Internetphänomen, das 2018 Kinder in Angst und Schrecken versetzte?",
          "answer": "Momo"
        },
        {
          "points": 1000,
          "question": "Wie heißen die vier Cenobiten aus den Hellraiser-Filmen?",
          "answer": "Pinhead, Chatterer, Butterball, Deep Throat"
        }
      ]
    },
    "nq-heimat": {
      "id": "nq-heimat",
      "name": "Meine Heimat",
      "source": "Nerdquiz 2.0",
      "questions": [
        {
          "points": 100,
          "question": "Wie viele Kontinente hat die Erde?",
          "answer": "7",
          "note": "Europa, Asien, Nordamerika, Südamerika, Afrika, Australien, Antarktis. Wer 5 sagt und es begründen kann, bekommt den Punkt auch."
        },
        {
          "points": 200,
          "question": "Wie heißt die größte Wüste der Welt?",
          "answer": "Sahara",
          "note": "Als größte Trockenwüste. Flächenmäßig ist die Antarktis als Kältewüste größer."
        },
        {
          "points": 300,
          "question": "In welchem Land befindet sich der größte Regenwald?",
          "answer": "Brasilien"
        },
        {
          "points": 600,
          "question": "Wie tief ist der Marianengraben (tiefster Punkt im Meer) in Metern?",
          "answer": "ca. 11.000 Meter",
          "kind": "schaetz"
        },
        {
          "points": 1000,
          "question": "Wie heißt die größte Gebirgskette Russlands?",
          "answer": "Ural"
        }
      ]
    },
    "nq-mytho": {
      "id": "nq-mytho",
      "name": "Mythologische Wesen",
      "source": "Nerdquiz 2.0",
      "questions": [
        {
          "points": 100,
          "question": "Aus welchen zwei Wesen ist ein Zentaur gemischt?",
          "answer": "Pferd und Mensch"
        },
        {
          "points": 200,
          "question": "Durch welche Fähigkeit verbreitet ein Basilisk Angst und Schrecken?",
          "answer": "Versteinernder Blick"
        },
        {
          "points": 300,
          "question": "Wie heißt die männliche Version des Sukkubus?",
          "answer": "Inkubus"
        },
        {
          "points": 600,
          "question": "An welchem Ort findet man einen Klabautermann?",
          "answer": "Auf einem Schiff"
        },
        {
          "points": 1000,
          "question": "Ein Manticore ist ein Mischwesen. Von welchem Tier stammt sein Schwanz?",
          "answer": "Skorpion"
        }
      ]
    },
    "nq-retro": {
      "id": "nq-retro",
      "name": "Retro Gaming",
      "source": "Nerdquiz 2.0",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt das meistverkaufte Arcade-Spiel der Welt?",
          "answer": "Space Invaders"
        },
        {
          "points": 200,
          "question": "Aus welchem Spiel stammt diese Melodie?",
          "answer": "Donkey Kong Country",
          "media": "https://www.youtube.com/watch?v=IndBgOrTWx0",
          "kind": "musik"
        },
        {
          "points": 300,
          "question": "Wofür steht die Abkürzung SNES?",
          "answer": "Super Nintendo Entertainment System"
        },
        {
          "points": 600,
          "question": "Zu welchem Franchise gehörte das Spiel, das 1982 so sehr floppte, dass hunderttausende Kopien in der Wüste vergraben wurden?",
          "answer": "E.T. – Der Außerirdische",
          "note": "Vergraben in Alamogordo, New Mexico; 1983 verscharrt, 2014 wieder ausgegraben."
        },
        {
          "points": 1000,
          "question": "Wie heißt der Heimcomputer, der 1982 mit integrierter Tastatur ausgeliefert wurde?",
          "answer": "Commodore 64"
        }
      ]
    },
    "nq-modern": {
      "id": "nq-modern",
      "name": "Moderne Games",
      "source": "Nerdquiz 2.0",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt die Konsole, die weltweit lange Probleme hatte, die Nachfrage zu decken?",
          "answer": "PS5"
        },
        {
          "points": 200,
          "question": "Wie heißt der Skateboarder, der seinen Namen einer Spielereihe verlieh?",
          "answer": "Tony Hawk"
        },
        {
          "points": 300,
          "question": "Welche Firma entwarf ein CD-System für den Nintendo 64, das nie zum Einsatz kam – und die Technik dann für eine eigene Konsole nutzte?",
          "answer": "Sony"
        },
        {
          "points": 600,
          "question": "Wofür steht die Abkürzung GTA?",
          "answer": "Grand Theft Auto"
        },
        {
          "points": 1000,
          "question": "Wann wurde „The Elder Scrolls V: Skyrim“ veröffentlicht?",
          "answer": "11.11.2011"
        }
      ]
    },
    "nq-koerper": {
      "id": "nq-koerper",
      "name": "Körperwelten",
      "source": "Nerdquiz 2.0",
      "questions": [
        {
          "points": 100,
          "question": "Wie viele Sinne hat der Mensch (klassische Zählung)?",
          "answer": "5"
        },
        {
          "points": 200,
          "question": "Aus wie viel Prozent Wasser besteht der menschliche Körper im Schnitt?",
          "answer": "ca. 70 %",
          "kind": "schaetz"
        },
        {
          "points": 300,
          "question": "Wie viele Muskatnüsse können für den Menschen lebensgefährlich sein?",
          "answer": "3"
        },
        {
          "points": 600,
          "question": "Wo liegt der größte Knochen im menschlichen Körper?",
          "answer": "Im Oberschenkel (Femur)"
        },
        {
          "points": 1000,
          "question": "Welche Zellorganellen sind verantwortlich für die Energieproduktion?",
          "answer": "Mitochondrien"
        }
      ]
    },
    "nq-universum": {
      "id": "nq-universum",
      "name": "Das Universum",
      "source": "Nerdquiz 2.0",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt die Galaxie, in der auch unser Sonnensystem liegt?",
          "answer": "Milchstraße"
        },
        {
          "points": 200,
          "question": "Welcher Planet ist der achte unseres Sonnensystems von innen nach außen?",
          "answer": "Neptun"
        },
        {
          "points": 300,
          "question": "Wie kalt ist es im Weltall?",
          "answer": "ca. −270 °C (2,7 Kelvin)",
          "kind": "schaetz"
        },
        {
          "points": 600,
          "question": "Welches ist das schwerste bekannte Objekt des Universums?",
          "answer": "Das Schwarze Loch in der Galaxie M87",
          "note": "Rund 6,5 Milliarden Sonnenmassen."
        },
        {
          "points": 1000,
          "question": "Auf dem Saturn regnet es – aber kein Wasser. Was sonst?",
          "answer": "Diamanten"
        }
      ]
    },
    "nq-konnichiwa": {
      "id": "nq-konnichiwa",
      "name": "Konnichiwa",
      "source": "Nerdquiz 2.0",
      "questions": [
        {
          "points": 100,
          "question": "Aus welchem Anime stammt dieses Lied?",
          "answer": "Dragon Ball Z (Prologue Theme)",
          "media": "https://www.youtube.com/watch?v=pVYeJyZCwzE",
          "kind": "musik"
        },
        {
          "points": 200,
          "question": "Wie heißt der Parasit, der im gleichnamigen Anime in die rechte Hand des Schülers Shinichi eindringt?",
          "answer": "Migi"
        },
        {
          "points": 300,
          "question": "In welchem Anime gibt es sogenannte Kaiserwaffen?",
          "answer": "Akame ga Kill!"
        },
        {
          "points": 600,
          "question": "Wessen Kopfgeld beträgt in One Piece exakt 1.000.000.000 Berry?",
          "answer": "Jack"
        },
        {
          "points": 1000,
          "question": "An welche Zielgruppe richten sich „Josei“-Animes?",
          "answer": "Erwachsene Frauen"
        }
      ]
    },
    "nq-duos": {
      "id": "nq-duos",
      "name": "Dynamische Duos",
      "source": "Nerdquiz 2.0",
      "questions": [
        {
          "points": 100,
          "question": "Zwei Brüder hüpfen durch ein merkwürdiges Königreich.",
          "answer": "Mario und Luigi",
          "kind": "namen"
        },
        {
          "points": 200,
          "question": "Ein Familiendrama reißt dieses verliebte Paar entzwei – und so starb sie im Kuss.",
          "answer": "Romeo und Julia",
          "kind": "namen"
        },
        {
          "points": 300,
          "question": "Ein Alien, das Wissenschaftsoffizier ist, und der Kapitän eines Raumschiffs.",
          "answer": "Captain Kirk und Spock",
          "kind": "namen"
        },
        {
          "points": 600,
          "question": "Die Namen dieses Komikerduos sind Stan Laurel und Oliver Hardy.",
          "answer": "Dick und Doof",
          "kind": "namen"
        },
        {
          "points": 1000,
          "question": "Verbunden bis in den Tod erleben diese beiden sehr unterschiedlichen Tiere viele Abenteuer.",
          "answer": "CatDog",
          "kind": "namen"
        }
      ]
    },
    "nq-franchises": {
      "id": "nq-franchises",
      "name": "Gemischte Franchises",
      "source": "Nerdquiz 2.0",
      "questions": [
        {
          "points": 100,
          "question": "Yamchu, Minako, Kuririn, Bunny, Son Goku, Tuxedo Mask",
          "answer": "Dragon Ball / Sailor Moon",
          "kind": "namen"
        },
        {
          "points": 200,
          "question": "Neptune, Élodie, Hunter, Jake, Tyrant, Claudette",
          "answer": "Resident Evil / Dead by Daylight",
          "kind": "namen"
        },
        {
          "points": 300,
          "question": "Zabrak, Asari, Twi’lek, Kroganer, Wookiee, Geth",
          "answer": "Star Wars / Mass Effect",
          "kind": "namen"
        },
        {
          "points": 600,
          "question": "Danny, Britta, Spence, Jeff, Arthur, Abed",
          "answer": "King of Queens / Community",
          "kind": "namen"
        },
        {
          "points": 1000,
          "question": "Riley Biers, Zweiblum, Jasper Hale, Rincewind, Edward Cullen, Tod",
          "answer": "Twilight / Scheibenwelt",
          "kind": "namen"
        }
      ]
    },
    "nq-welten": {
      "id": "nq-welten",
      "name": "Fremde Welten",
      "source": "Nerdquiz 2.0",
      "questions": [
        {
          "points": 100,
          "question": "Spider Rico, Dixon, Thunderlips, Clubber Lang, Tommy Gunn, Ivan Drago",
          "answer": "Rocky (Gegner)",
          "kind": "namen"
        },
        {
          "points": 200,
          "question": "Bespin, Geonosis, Kashyyyk, Dagobah, Tatooine",
          "answer": "Star Wars (Planeten)",
          "kind": "namen"
        },
        {
          "points": 300,
          "question": "Jagdgewehr, Kampfflinte, Alienblaster, Sledgehammer, Dönerspieß",
          "answer": "Fallout (Waffen)",
          "kind": "namen"
        },
        {
          "points": 600,
          "question": "Miruvor, Cram, Alter Wingert, Honigkuchen, Lembas",
          "answer": "Der Herr der Ringe (Essen & Trinken)",
          "kind": "namen"
        },
        {
          "points": 1000,
          "question": "Frontal, Nachsorge, Seelenwächter, Verwandt, Ass im Ärmel",
          "answer": "Dead by Daylight (Perks)",
          "kind": "namen"
        }
      ]
    },
    "d1-promis": {
      "id": "d1-promis",
      "name": "Promis",
      "source": "Dezemberquiz 2025 v1",
      "questions": [
        {
          "points": 100,
          "question": "Welche US-Sängerin veröffentlichte 2014 das Album „1989“?",
          "answer": "Taylor Swift"
        },
        {
          "points": 200,
          "question": "Wie heißt der britische Schauspieler, der Sherlock Holmes in der BBC-Serie spielt?",
          "answer": "Benedict Cumberbatch"
        },
        {
          "points": 300,
          "question": "Welche Schauspielerin gewann 2020 den Oscar für „Judy“?",
          "answer": "Renée Zellweger"
        },
        {
          "points": 600,
          "question": "Welcher Regisseur ist bekannt für Filme wie „Inception“ und „Interstellar“?",
          "answer": "Christopher Nolan"
        },
        {
          "points": 1000,
          "question": "Welche berühmte Künstlerin schuf die Performance-Installation „The Artist Is Present“?",
          "answer": "Marina Abramović"
        }
      ]
    },
    "d1-geografie": {
      "id": "d1-geografie",
      "name": "Geografie",
      "source": "Dezemberquiz 2025 v1",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt die Hauptstadt von Spanien?",
          "answer": "Madrid"
        },
        {
          "points": 200,
          "question": "Welcher Fluss fließt durch Paris?",
          "answer": "Seine"
        },
        {
          "points": 300,
          "question": "Welche Wüste ist die größte der Erde (nach Fläche)?",
          "answer": "Die antarktische Eiswüste"
        },
        {
          "points": 600,
          "question": "In welchem Land liegt der Kilimandscharo?",
          "answer": "Tansania"
        },
        {
          "points": 1000,
          "question": "Wie heißt der tiefste Punkt auf dem Festland?",
          "answer": "Die Küsten des Toten Meeres"
        }
      ]
    },
    "d1-wissenschaft": {
      "id": "d1-wissenschaft",
      "name": "Wissenschaft",
      "source": "Dezemberquiz 2025 v1",
      "questions": [
        {
          "points": 100,
          "question": "Welche Einheit misst elektrische Spannung?",
          "answer": "Volt"
        },
        {
          "points": 200,
          "question": "Wie nennt man die Erbinformation in Zellen?",
          "answer": "DNA"
        },
        {
          "points": 300,
          "question": "Welcher Planet unseres Sonnensystems hat die stärkste Gravitation?",
          "answer": "Jupiter"
        },
        {
          "points": 600,
          "question": "Welcher Physiker formulierte die Unschärferelation?",
          "answer": "Werner Heisenberg"
        },
        {
          "points": 1000,
          "question": "Wie heißt der Prozess, bei dem Pflanzen Sonnenlicht in chemische Energie umwandeln?",
          "answer": "Photosynthese"
        }
      ]
    },
    "d1-filme": {
      "id": "d1-filme",
      "name": "Filme",
      "source": "Dezemberquiz 2025 v1",
      "questions": [
        {
          "points": 100,
          "question": "Wer spielt den Protagonisten in „Indiana Jones“?",
          "answer": "Harrison Ford"
        },
        {
          "points": 200,
          "question": "Wie heißt das Animationsstudio hinter „Toy Story“?",
          "answer": "Pixar"
        },
        {
          "points": 300,
          "question": "Welcher Film gewann 1995 den Oscar als bester Film und handelt von einem Mann, der eher zufällig amerikanische Geschichte miterlebt?",
          "answer": "Forrest Gump"
        },
        {
          "points": 600,
          "question": "Wie heißt der Regisseur von „Titanic“ und „Avatar“?",
          "answer": "James Cameron"
        },
        {
          "points": 1000,
          "question": "Wie lautet der Name des Raumschiffs in „Alien“ (1979)?",
          "answer": "Nostromo"
        }
      ]
    },
    "d1-musik": {
      "id": "d1-musik",
      "name": "Musik",
      "source": "Dezemberquiz 2025 v1",
      "questions": [
        {
          "points": 100,
          "question": "Welche Band sang „Hey Jude“?",
          "answer": "The Beatles"
        },
        {
          "points": 200,
          "question": "Wer ist der „King of Pop“?",
          "answer": "Michael Jackson"
        },
        {
          "points": 300,
          "question": "Welcher klassische Komponist war schon mit fünf Jahren als Wunderkind bekannt?",
          "answer": "Wolfgang Amadeus Mozart"
        },
        {
          "points": 600,
          "question": "Welche US-Sängerin ist bekannt für Hits wie „Halo“ und „Single Ladies“?",
          "answer": "Beyoncé"
        },
        {
          "points": 1000,
          "question": "Welche Musikrichtung entstand in den 1970ern in der Bronx und umfasst DJing, MCing, Graffiti und Breakdance?",
          "answer": "Hip-Hop"
        }
      ]
    },
    "d2-mythologie": {
      "id": "d2-mythologie",
      "name": "Mythologie",
      "source": "Dezemberquiz 2025 v2",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt der griechische Göttervater?",
          "answer": "Zeus"
        },
        {
          "points": 200,
          "question": "Welches Fabelwesen hat den Körper eines Löwen und den Kopf eines Menschen?",
          "answer": "Sphinx"
        },
        {
          "points": 300,
          "question": "In welcher Mythologie ist Thor der Donnergott?",
          "answer": "In der nordischen (altnordischen) Mythologie"
        },
        {
          "points": 600,
          "question": "Wie heißt der ägyptische Gott der Unterwelt?",
          "answer": "Osiris"
        },
        {
          "points": 1000,
          "question": "Welches Wesen bewachte in der griechischen Mythologie den Eingang zur Unterwelt?",
          "answer": "Kerberos",
          "note": "Dreiköpfiger Hund."
        }
      ]
    },
    "d2-technik": {
      "id": "d2-technik",
      "name": "Technik & Erfindungen",
      "source": "Dezemberquiz 2025 v2",
      "questions": [
        {
          "points": 100,
          "question": "Wer erfand das Telefon?",
          "answer": "Alexander Graham Bell"
        },
        {
          "points": 200,
          "question": "Wie nennt man den kleinsten adressierbaren Speicherort im Computer?",
          "answer": "Byte"
        },
        {
          "points": 300,
          "question": "Welcher deutsche Ingenieur gilt als Erfinder des Automobils mit Verbrennungsmotor?",
          "answer": "Carl Benz"
        },
        {
          "points": 600,
          "question": "Welche Programmiersprache wurde ursprünglich für Statistik und Datenanalyse entwickelt?",
          "answer": "R"
        },
        {
          "points": 1000,
          "question": "Wie nennt man die Maschine, die Alan Turing zur Codeentschlüsselung im Zweiten Weltkrieg entwickelte?",
          "answer": "Turing-Bombe"
        }
      ]
    },
    "d2-geschichte": {
      "id": "d2-geschichte",
      "name": "Geschichte",
      "source": "Dezemberquiz 2025 v2",
      "questions": [
        {
          "points": 100,
          "question": "In welchem Jahr fiel die Berliner Mauer?",
          "answer": "1989"
        },
        {
          "points": 200,
          "question": "Wer war der erste Bundeskanzler der Bundesrepublik Deutschland?",
          "answer": "Konrad Adenauer"
        },
        {
          "points": 300,
          "question": "Welche antike Stadt wurde 79 n. Chr. durch einen Vulkanausbruch zerstört?",
          "answer": "Pompeji"
        },
        {
          "points": 600,
          "question": "Welcher Vertrag beendete den Ersten Weltkrieg?",
          "answer": "Der Vertrag von Versailles"
        },
        {
          "points": 1000,
          "question": "Wie heißt die legendäre Stadt des Reiches Mali, deren Reichtum unter Mansa Musa berühmt wurde?",
          "answer": "Timbuktu"
        }
      ]
    },
    "d2-tiere": {
      "id": "d2-tiere",
      "name": "Tiere & Natur",
      "source": "Dezemberquiz 2025 v2",
      "questions": [
        {
          "points": 100,
          "question": "Welches Tier gilt als der König der Tiere?",
          "answer": "Löwe"
        },
        {
          "points": 200,
          "question": "Welche Farbe hat Chlorophyll?",
          "answer": "Grün"
        },
        {
          "points": 300,
          "question": "Welcher Vogel kann rückwärts fliegen?",
          "answer": "Kolibri"
        },
        {
          "points": 600,
          "question": "Wie heißt die Schicht der Erde, die direkt unter der Erdkruste liegt?",
          "answer": "Der Erdmantel"
        },
        {
          "points": 1000,
          "question": "Wie heißt die Fähigkeit einiger Tiere, ihre Körpertemperatur unabhängig von der Umgebung zu regulieren?",
          "answer": "Endothermie"
        }
      ]
    },
    "d2-games": {
      "id": "d2-games",
      "name": "Games & Popkultur",
      "source": "Dezemberquiz 2025 v2",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt der berühmte italienische Videospiel-Klempner?",
          "answer": "Mario"
        },
        {
          "points": 200,
          "question": "Welches Pokémon ist gelb und nutzt Elektrizität?",
          "answer": "Pikachu"
        },
        {
          "points": 300,
          "question": "Welche Serie spielt in einer Welt mit Häusern wie Stark, Lannister und Targaryen?",
          "answer": "Game of Thrones"
        },
        {
          "points": 600,
          "question": "In welchem Spiel kämpft man in einer Arena mit bunten Tintenwaffen?",
          "answer": "Splatoon"
        },
        {
          "points": 1000,
          "question": "Wie heißt das fiktive Metall im Marvel-Universum, aus dem Captain Americas Schild besteht?",
          "answer": "Vibranium"
        }
      ]
    },
    "d3-kunst": {
      "id": "d3-kunst",
      "name": "Kunst & Kultur",
      "source": "Dezemberquiz 2025 v3",
      "questions": [
        {
          "points": 100,
          "question": "Welcher niederländische Maler schuf „Die Sternennacht“?",
          "answer": "Vincent van Gogh"
        },
        {
          "points": 200,
          "question": "Wie nennt man die japanische Kunst des Papierfaltens?",
          "answer": "Origami"
        },
        {
          "points": 300,
          "question": "Welche französische Stadt gilt als Zentrum der Parfümherstellung?",
          "answer": "Grasse"
        },
        {
          "points": 600,
          "question": "Wie heißt die Kunstrichtung von Picasso und Braque?",
          "answer": "Kubismus"
        },
        {
          "points": 1000,
          "question": "Welcher italienische Bildhauer fertigte die Statue „David“?",
          "answer": "Michelangelo"
        }
      ]
    },
    "d3-weltraum": {
      "id": "d3-weltraum",
      "name": "Weltraum",
      "source": "Dezemberquiz 2025 v3",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt unsere Galaxie?",
          "answer": "Milchstraße"
        },
        {
          "points": 200,
          "question": "Welcher Planet ist der Sonne am nächsten?",
          "answer": "Merkur"
        },
        {
          "points": 300,
          "question": "Wie nennt man die Geschwindigkeit, die ein Raumschiff braucht, um in einen Orbit einzutreten?",
          "answer": "Orbitalgeschwindigkeit"
        },
        {
          "points": 600,
          "question": "Welche Teleskopmission lieferte ikonische Bilder wie die „Säulen der Schöpfung“?",
          "answer": "Das Hubble-Weltraumteleskop"
        },
        {
          "points": 1000,
          "question": "Wie heißt das theoretische Objekt, das eine Einstein-Rosen-Brücke darstellen könnte?",
          "answer": "Wurmloch"
        }
      ]
    },
    "d3-sport": {
      "id": "d3-sport",
      "name": "Sport",
      "source": "Dezemberquiz 2025 v3",
      "questions": [
        {
          "points": 100,
          "question": "Wie viele Spieler hat eine Fußballmannschaft auf dem Feld?",
          "answer": "11"
        },
        {
          "points": 200,
          "question": "Aus welcher Sportart kennt man den Begriff „Ass“?",
          "answer": "Tennis oder Volleyball",
          "note": "Beides wird anerkannt."
        },
        {
          "points": 300,
          "question": "In welcher Stadt fanden die Olympischen Spiele 2012 statt?",
          "answer": "London"
        },
        {
          "points": 600,
          "question": "Wie heißt der erfolgreichste Schwimmer der Olympiageschichte?",
          "answer": "Michael Phelps"
        },
        {
          "points": 1000,
          "question": "Welcher legendäre Boxer war als „The Greatest“ bekannt?",
          "answer": "Muhammad Ali"
        }
      ]
    },
    "d3-allgemein": {
      "id": "d3-allgemein",
      "name": "Allgemeinwissen",
      "source": "Dezemberquiz 2025 v3",
      "questions": [
        {
          "points": 100,
          "question": "Wie viele Kontinente gibt es?",
          "answer": "7"
        },
        {
          "points": 200,
          "question": "Wie lautet das chemische Symbol für Silber?",
          "answer": "Ag"
        },
        {
          "points": 300,
          "question": "Welche Sprache hat weltweit die meisten Muttersprachler?",
          "answer": "Mandarin-Chinesisch"
        },
        {
          "points": 600,
          "question": "Wie nennt man die Lehre vom richtigen und folgerichtigen Denken?",
          "answer": "Logik"
        },
        {
          "points": 1000,
          "question": "Wie heißt der längste internationale Fluss der Welt?",
          "answer": "Nil",
          "note": "Umstritten – je nach Messmethode auch der Amazonas."
        }
      ]
    },
    "d3-raetsel": {
      "id": "d3-raetsel",
      "name": "Rätsel & Kurioses",
      "source": "Dezemberquiz 2025 v3",
      "questions": [
        {
          "points": 100,
          "question": "Welches Tier trägt sein Haus immer bei sich?",
          "answer": "Die Schnecke"
        },
        {
          "points": 200,
          "question": "Was wird beim Trocknen nass?",
          "answer": "Ein Handtuch"
        },
        {
          "points": 300,
          "question": "Ich bin nicht lebendig, aber ich wachse; ich habe keine Lunge, aber brauche Luft. Was bin ich?",
          "answer": "Feuer"
        },
        {
          "points": 600,
          "question": "Welche arabische Zahl steckt hinter der römischen Zahl XL?",
          "answer": "40"
        },
        {
          "points": 1000,
          "question": "Ich laufe ohne Beine und spreche ohne Stimme. Was bin ich?",
          "answer": "Ein Fluss"
        }
      ]
    },
    "d4-essen": {
      "id": "d4-essen",
      "name": "Essen & Trinken",
      "source": "Dezemberquiz 2025 v4",
      "questions": [
        {
          "points": 100,
          "question": "Welches Getränk wird aus Kaffeebohnen hergestellt?",
          "answer": "Kaffee"
        },
        {
          "points": 200,
          "question": "Welche Frucht ist die Hauptzutat von Guacamole?",
          "answer": "Avocado"
        },
        {
          "points": 300,
          "question": "Welche Nudelsorte ist spiralförmig gedreht?",
          "answer": "Fusilli"
        },
        {
          "points": 600,
          "question": "Wie nennt man die japanische Kunst, rohen Fisch mit Reis zu servieren?",
          "answer": "Sushi"
        },
        {
          "points": 1000,
          "question": "Welche chemische Verbindung sorgt für die Schärfe in Chilis?",
          "answer": "Capsaicin"
        }
      ]
    },
    "d4-literatur": {
      "id": "d4-literatur",
      "name": "Literatur",
      "source": "Dezemberquiz 2025 v4",
      "questions": [
        {
          "points": 100,
          "question": "Wer schrieb „Harry Potter“?",
          "answer": "J. K. Rowling"
        },
        {
          "points": 200,
          "question": "Welcher deutsche Dichter schrieb „Faust“?",
          "answer": "Johann Wolfgang von Goethe"
        },
        {
          "points": 300,
          "question": "Wie heißt der berühmte Detektiv aus London, den Arthur Conan Doyle erschuf?",
          "answer": "Sherlock Holmes"
        },
        {
          "points": 600,
          "question": "Wer schrieb den dystopischen Roman „1984“?",
          "answer": "George Orwell"
        },
        {
          "points": 1000,
          "question": "Welcher Autor verfasste das Epos „Die göttliche Komödie“?",
          "answer": "Dante Alighieri"
        }
      ]
    },
    "d4-internet": {
      "id": "d4-internet",
      "name": "Internet & Medien",
      "source": "Dezemberquiz 2025 v4",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt die größte Videoplattform der Welt?",
          "answer": "YouTube"
        },
        {
          "points": 200,
          "question": "Welche App wird vor allem mit kurzen, viralen Clips verbunden?",
          "answer": "TikTok"
        },
        {
          "points": 300,
          "question": "Wie nennt man Bilder, die sich schnell online verbreiten und humorvolle Botschaften tragen?",
          "answer": "Memes"
        },
        {
          "points": 600,
          "question": "Welche Firma entwickelte das Betriebssystem Android?",
          "answer": "Google"
        },
        {
          "points": 1000,
          "question": "Wie nennt man den Prozess, bei dem Algorithmen Inhalte personalisiert ausspielen?",
          "answer": "Content-Personalisierung / algorithmische Empfehlung"
        }
      ]
    },
    "d4-reisen": {
      "id": "d4-reisen",
      "name": "Reisen & Weltwissen",
      "source": "Dezemberquiz 2025 v4",
      "questions": [
        {
          "points": 100,
          "question": "Welcher Kontinent ist der größte?",
          "answer": "Asien"
        },
        {
          "points": 200,
          "question": "Welches Land hat die meisten Inseln?",
          "answer": "Schweden"
        },
        {
          "points": 300,
          "question": "Welches europäische Land hat die längste Küstenlinie?",
          "answer": "Norwegen"
        },
        {
          "points": 600,
          "question": "Wie heißt die berühmte alte Handelsroute zwischen Europa und Ostasien?",
          "answer": "Die Seidenstraße"
        },
        {
          "points": 1000,
          "question": "Welche Stadt war früher unter dem Namen Edo bekannt?",
          "answer": "Tokio"
        }
      ]
    },
    "d4-logik": {
      "id": "d4-logik",
      "name": "Kniffliges & Logik",
      "source": "Dezemberquiz 2025 v4",
      "questions": [
        {
          "points": 100,
          "question": "Was ist immer vor dir, aber du kannst es nie sehen?",
          "answer": "Die Zukunft"
        },
        {
          "points": 200,
          "question": "Welche Zahl ist die Hälfte von 1.000 – aber nicht 500?",
          "answer": "D",
          "note": "Der Buchstabe „D“ ist die Hälfte von „M“."
        },
        {
          "points": 300,
          "question": "Was wird größer, je mehr man davon wegnimmt?",
          "answer": "Ein Loch"
        },
        {
          "points": 600,
          "question": "Ein Bauer hat 17 Schafe. 9 laufen weg. Wie viele bleiben?",
          "answer": "17",
          "note": "Es laufen nur 9 weg – gehören tun ihm aber weiterhin alle."
        },
        {
          "points": 1000,
          "question": "Ich habe Städte, aber keine Häuser; Wälder, aber keine Bäume; Wasser, aber keine Fische. Was bin ich?",
          "answer": "Eine Landkarte"
        }
      ]
    },
    "s-reality": {
      "id": "s-reality",
      "name": "Reality-Trash-TV",
      "source": "Quiz von Samy",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt die Bachelorette, die 2020 die Rosen verteilen durfte – und aus welcher Show war sie vorher bekannt?",
          "answer": "Melissa Damilia (aus „Love Island“)"
        },
        {
          "points": 200,
          "question": "Wie heißt die Girlband, die 2006 bei „Popstars“ gegründet wurde? Mitglieder: Senna Gümmer, Bahar Kızıl und Mandy Capristo.",
          "answer": "Monrose"
        },
        {
          "points": 300,
          "question": "Wie viele Bachelor-Staffeln – beginnend mit Paul Janke – wurden bis dahin bei RTL ausgestrahlt?",
          "answer": "9",
          "kind": "schaetz"
        },
        {
          "points": 600,
          "question": "Wer gewann das allererste Dschungelcamp?",
          "answer": "Costa Cordalis",
          "note": "IBES-Staffel 1, 2004."
        },
        {
          "points": 1000,
          "question": "In wie vielen Staffeln nahm DSDS-Kultkandidat Menderes Bağcı als regulärer Kandidat teil?",
          "answer": "14"
        }
      ]
    },
    "s-tv": {
      "id": "s-tv",
      "name": "Film & Fernsehen",
      "source": "Quiz von Samy",
      "questions": [
        {
          "points": 100,
          "question": "Welcher Film wurde 2017 versehentlich zum „Best Picture“ gekürt?",
          "answer": "La La Land"
        },
        {
          "points": 200,
          "question": "Wie heißt der Moderator der „Late Late Show“, der mit „Carpool Karaoke“ zum YouTube-Hit wurde?",
          "answer": "James Corden"
        },
        {
          "points": 300,
          "question": "Wie hieß die Live-Band, die bei TV total zur Einleitung und zur Überleitung in die Werbung spielte?",
          "answer": "Heavytones"
        },
        {
          "points": 600,
          "question": "In welcher Kategorie gewann Matt Damon 1998 seinen ersten und einzigen Oscar?",
          "answer": "Bestes Originaldrehbuch",
          "note": "Für „Good Will Hunting“, gemeinsam mit Ben Affleck."
        },
        {
          "points": 1000,
          "question": "„High School Musical“ hatte Vanessa Hudgens und Zac Efron in der Hauptbesetzung. Wer sang im ersten Film aber hauptsächlich die männliche Hauptstimme?",
          "answer": "Drew Seeley"
        }
      ]
    },
    "s-social": {
      "id": "s-social",
      "name": "Social Media",
      "source": "Quiz von Samy",
      "questions": [
        {
          "points": 100,
          "question": "Welche Person hat die meisten Follower auf Instagram?",
          "answer": "Cristiano Ronaldo"
        },
        {
          "points": 200,
          "question": "Was war auf dem meistgelikten Instagram-Bild zu sehen?",
          "answer": "Ein Ei"
        },
        {
          "points": 300,
          "question": "Welche Person hatte die meisten TikTok-Follower?",
          "answer": "Charli D’Amelio"
        },
        {
          "points": 600,
          "question": "Wie viele Abonnenten hatte die meistgefolgte Person auf TikTok etwa?",
          "answer": "ca. 105,8 Mio.",
          "kind": "schaetz"
        },
        {
          "points": 1000,
          "question": "Welche YouTube-Creator waren hauptsächlich am sogenannten „Dramageddon“ beteiligt?",
          "answer": "Jeffree Star, Shane Dawson, Tati Westbrook, James Charles"
        }
      ]
    },
    "s-partner": {
      "id": "s-partner",
      "name": "Partner von …",
      "source": "Quiz von Samy",
      "questions": [
        {
          "points": 100,
          "question": "Heidi Klum?",
          "answer": "Tom Kaulitz",
          "kind": "namen"
        },
        {
          "points": 200,
          "question": "David Beckham?",
          "answer": "Victoria Beckham",
          "kind": "namen"
        },
        {
          "points": 300,
          "question": "Queen Elizabeth II.?",
          "answer": "Prinz Philip",
          "note": "Verstorben im April 2021.",
          "kind": "namen"
        },
        {
          "points": 600,
          "question": "Ryan Reynolds?",
          "answer": "Blake Lively",
          "kind": "namen"
        },
        {
          "points": 1000,
          "question": "Meghan Trainor?",
          "answer": "Daryl Sabara",
          "note": "Bekannt aus „Spy Kids“.",
          "kind": "namen"
        }
      ]
    },
    "s-fiktion": {
      "id": "s-fiktion",
      "name": "Fiktionale Welten",
      "source": "Quiz von Samy",
      "questions": [
        {
          "points": 100,
          "question": "Mace, Rey, Lando, Padmé, Luke, Jabba, Yoda",
          "answer": "Star Wars",
          "kind": "namen"
        },
        {
          "points": 200,
          "question": "Jordan, Keith, Todd, John, Laverne, Christopher, Carla, Perry, Elliot",
          "answer": "Scrubs",
          "kind": "namen"
        },
        {
          "points": 300,
          "question": "Karen, Perla, Patrick, Eugene, Sheldon, Sandy, Larry, Mrs. Puff, Gary",
          "answer": "SpongeBob Schwammkopf",
          "kind": "namen"
        },
        {
          "points": 600,
          "question": "Jackson, Taylor, Babette, Miss Patty, Dean, Lane, Luke, Emily, Lorelai, Rory",
          "answer": "Gilmore Girls",
          "kind": "namen"
        },
        {
          "points": 1000,
          "question": "Philip Höfer, Verena Koch, Emily Höfer, Jasmin Flemming, Sunny Richter, Leon Moreno, Katrin Flemming, Jo Gerner",
          "answer": "GZSZ",
          "kind": "namen"
        }
      ]
    },
    "dq3-weltwaerts": {
      "id": "dq3-weltwaerts",
      "name": "Weltwärts",
      "source": "Quiz von Dario (2021)",
      "questions": [
        {
          "points": 100,
          "question": "In welchem Land stehen die Petronas Twin Towers?",
          "answer": "Malaysia"
        },
        {
          "points": 200,
          "question": "Welcher Fluss fließt durch Berlin?",
          "answer": "Spree"
        },
        {
          "points": 300,
          "question": "Zu welchem Land gehört eine rote Flagge mit einem gelben Stern in der Mitte?",
          "answer": "Vietnam"
        },
        {
          "points": 600,
          "question": "Wie heißen die japanischen Hochgeschwindigkeitszüge?",
          "answer": "Shinkansen"
        },
        {
          "points": 1000,
          "question": "Zu welcher Inselgruppe gehört Mallorca?",
          "answer": "Balearen"
        }
      ]
    },
    "dq3-politik": {
      "id": "dq3-politik",
      "name": "Politik & Gesellschaft",
      "source": "Quiz von Dario (2021)",
      "questions": [
        {
          "points": 100,
          "question": "Wie hieß der amerikanische Präsident vor Barack Obama?",
          "answer": "George W. Bush"
        },
        {
          "points": 200,
          "question": "In welchem Jahr endete der Zweite Weltkrieg?",
          "answer": "1945"
        },
        {
          "points": 300,
          "question": "Wie viele Mitglieder hatte der Bundestag?",
          "answer": "709",
          "note": "Wahlperiode 2017–2021.",
          "kind": "schaetz"
        },
        {
          "points": 600,
          "question": "Die USA warfen zwei Atombomben über Japan ab. Eine traf Hiroshima – welche Stadt war die zweite?",
          "answer": "Nagasaki"
        },
        {
          "points": 1000,
          "question": "In welchem Land wurde Melania Trump geboren?",
          "answer": "Slowenien"
        }
      ]
    },
    "dq3-musik": {
      "id": "dq3-musik",
      "name": "Musik",
      "source": "Quiz von Dario (2021)",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt der Leiter eines Orchesters?",
          "answer": "Dirigent"
        },
        {
          "points": 200,
          "question": "In welchem Song von Ed Sheeran heißt es „people fall in love in mysterious ways“?",
          "answer": "Thinking Out Loud"
        },
        {
          "points": 300,
          "question": "Die wievielte DSDS-Staffel lief im Jahr 2021?",
          "answer": "Die 18.",
          "kind": "schaetz"
        },
        {
          "points": 600,
          "question": "Adele hatte damals drei Studioalben veröffentlicht. Wie hieß das zuletzt erschienene?",
          "answer": "25",
          "note": "Stand 2021 – inzwischen kam „30“ dazu."
        },
        {
          "points": 1000,
          "question": "In welcher Stadt gewann Lena Meyer-Landrut den Eurovision Song Contest?",
          "answer": "Oslo"
        }
      ]
    },
    "dq3-film": {
      "id": "dq3-film",
      "name": "Film",
      "source": "Quiz von Dario (2021)",
      "questions": [
        {
          "points": 100,
          "question": "Wer spielt den Hauptcharakter Jack in „Titanic“?",
          "answer": "Leonardo DiCaprio"
        },
        {
          "points": 200,
          "question": "Wie heißt der kleine runde Roboter-Ball aus Star Wars?",
          "answer": "BB-8"
        },
        {
          "points": 300,
          "question": "Wie heißt Simbas Vater in „Der König der Löwen“?",
          "answer": "Mufasa"
        },
        {
          "points": 600,
          "question": "Wie heißt Nemos Vater in „Findet Nemo“?",
          "answer": "Marlin"
        },
        {
          "points": 1000,
          "question": "Wie heißt der erfolgreichste deutsche Film?",
          "answer": "Der Schuh des Manitu",
          "note": "Deutsche Produktion seit 1960, sowohl nach Besucherzahl als auch nach Einspielergebnis."
        }
      ]
    },
    "dq3-popkultur": {
      "id": "dq3-popkultur",
      "name": "Popkultur",
      "source": "Quiz von Dario (2021)",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt die niedliche japanische Katze, die als Werbefigur weltberühmt wurde?",
          "answer": "Hello Kitty"
        },
        {
          "points": 200,
          "question": "Wie heißen die drei ursprünglichen Starter-Pokémon der ersten Generation?",
          "answer": "Bisasam, Glumanda, Schiggy"
        },
        {
          "points": 300,
          "question": "Welches Video durchbrach als erstes die Marke von 1 Mrd. Aufrufen auf YouTube?",
          "answer": "Gangnam Style"
        },
        {
          "points": 600,
          "question": "Wie hieß der Löwe, der Maskottchen der Fußball-WM 2006 in Deutschland war?",
          "answer": "Goleo"
        },
        {
          "points": 1000,
          "question": "Wie heißt der Druide im Dorf von Asterix und Obelix, der den Zaubertrank herstellt?",
          "answer": "Miraculix"
        }
      ]
    },
    "l-film": {
      "id": "l-film",
      "name": "Film",
      "source": "Quiz von Lorenz",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt der Menschenjunge aus dem „Dschungelbuch“?",
          "answer": "Mogli"
        },
        {
          "points": 200,
          "question": "Für welchen Film gewann Leonardo DiCaprio den Oscar als bester Hauptdarsteller?",
          "answer": "The Revenant"
        },
        {
          "points": 300,
          "question": "In welchem Land wurde „Der Herr der Ringe“ größtenteils gedreht?",
          "answer": "Neuseeland"
        },
        {
          "points": 600,
          "question": "Heath Ledger verstarb 2008. In welcher Kategorie erhielt er 2009 posthum einen Oscar?",
          "answer": "Bester Nebendarsteller"
        },
        {
          "points": 1000,
          "question": "In welchem Film wurde erstmals die Bluescreen-Technik eingesetzt?",
          "answer": "King Kong (1933)"
        }
      ]
    },
    "l-wissenschaft": {
      "id": "l-wissenschaft",
      "name": "Wissenschaft",
      "source": "Quiz von Lorenz",
      "questions": [
        {
          "points": 100,
          "question": "Meter ist eine Basiseinheit wofür?",
          "answer": "Für die Länge"
        },
        {
          "points": 200,
          "question": "Für welche Entdeckung erhielt Marie Curie 1903 anteilig den Nobelpreis für Physik?",
          "answer": "Radioaktivität"
        },
        {
          "points": 300,
          "question": "Wie lautet die Summenformel von Kochsalz?",
          "answer": "NaCl"
        },
        {
          "points": 600,
          "question": "Wofür steht die Abkürzung PET?",
          "answer": "Polyethylenterephthalat"
        },
        {
          "points": 1000,
          "question": "Wie heißt das 30. Element im Periodensystem?",
          "answer": "Zink"
        }
      ]
    },
    "l-kurioses": {
      "id": "l-kurioses",
      "name": "Kurioses",
      "source": "Quiz von Lorenz",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt Käse auf Niederländisch?",
          "answer": "Kaas"
        },
        {
          "points": 200,
          "question": "In welchem Jahr passierte das Nuklearunglück in Fukushima?",
          "answer": "2011"
        },
        {
          "points": 300,
          "question": "Was bedeutet es, wenn jemand sagt: „Ich habe Trypophobie“?",
          "answer": "Angst vor Löchern"
        },
        {
          "points": 600,
          "question": "Was ist mit dem „Torfall von Madrid“ gemeint?",
          "answer": "Vor dem Spiel krachte ein Tor zusammen",
          "note": "Europapokalspiel 1998, Real Madrid gegen Borussia Dortmund."
        },
        {
          "points": 1000,
          "question": "Wie viel Kilo brachte der Kürbis des Belgiers Mathias Willemijns 2016 auf die Waage?",
          "answer": "1.191 kg",
          "kind": "schaetz"
        }
      ]
    },
    "l-promis": {
      "id": "l-promis",
      "name": "Promis",
      "source": "Quiz von Lorenz",
      "questions": [
        {
          "points": 100,
          "question": "„I’ll be back“ – dieser kurze Satz hat welchen Menschen weltberühmt gemacht?",
          "answer": "Arnold Schwarzenegger"
        },
        {
          "points": 200,
          "question": "In welcher Castingshow sitzt Nico Santos seit 2020 in der Jury?",
          "answer": "The Voice of Germany"
        },
        {
          "points": 300,
          "question": "In welchem Land wurde Natalie Portman geboren?",
          "answer": "Israel"
        },
        {
          "points": 600,
          "question": "Warum rasierte sich Britney Spears 2007 eine Glatze?",
          "answer": "Nach der Trennung von Kevin Federline"
        },
        {
          "points": 1000,
          "question": "Mit wie vielen Frauen war Frauenschwarm George Clooney verheiratet?",
          "answer": "2"
        }
      ]
    },
    "l-zahlen": {
      "id": "l-zahlen",
      "name": "Zahlengraf",
      "source": "Quiz von Lorenz",
      "questions": [
        {
          "points": 100,
          "question": "Mit wie vielen Darts wird bei der WM pro Aufnahme geworfen?",
          "answer": "3"
        },
        {
          "points": 200,
          "question": "Wie viele Saiten hat eine Geige?",
          "answer": "4"
        },
        {
          "points": 300,
          "question": "Wie hoch ist die je gemessene Höchstgeschwindigkeit in der Formel 1?",
          "answer": "360 km/h (2004)",
          "kind": "schaetz"
        },
        {
          "points": 600,
          "question": "Wie hoch ist der durchschnittliche IQ in Deutschland?",
          "answer": "100"
        },
        {
          "points": 1000,
          "question": "Matthias Steiner verletzte sich 2012 beim Gewichtheben am Kopf. Wie viele Kilogramm knallten gegen seinen Kopf?",
          "answer": "196 kg",
          "note": "Olympische Spiele in London 2012.",
          "kind": "schaetz"
        }
      ]
    },
    "u-tiere": {
      "id": "u-tiere",
      "name": "Tiere & Pflanzen",
      "source": "Quizrunde 2021",
      "questions": [
        {
          "points": 100,
          "question": "Wie lautet die lateinische Bezeichnung für Pilze?",
          "answer": "Fungi"
        },
        {
          "points": 200,
          "question": "Wie viele wildlebende Tiger gibt es?",
          "answer": "ca. 3.890",
          "kind": "schaetz"
        },
        {
          "points": 300,
          "question": "Welche Tiere bezeichnet die lateinische Bezeichnung „Mammalia“?",
          "answer": "Säugetiere"
        },
        {
          "points": 600,
          "question": "Wie heißen die hydrothermalen Quellen am Meeresboden, in denen vermutlich das erste Leben entstand?",
          "answer": "Schwarze Raucher"
        },
        {
          "points": 1000,
          "question": "Wie heißt der größte Mond des Jupiter?",
          "answer": "Ganymed"
        }
      ]
    },
    "u-technik": {
      "id": "u-technik",
      "name": "Wissenschaft & Technik",
      "source": "Quizrunde 2021",
      "questions": [
        {
          "points": 100,
          "question": "In welchem Land hat Samsung seinen Sitz?",
          "answer": "Südkorea"
        },
        {
          "points": 200,
          "question": "In welchem Jahr wurde das iPhone vorgestellt?",
          "answer": "2007"
        },
        {
          "points": 300,
          "question": "Wie heißt das größte Passagierflugzeug der Welt?",
          "answer": "Airbus A380"
        },
        {
          "points": 600,
          "question": "Wie viele Rennen wurden in der Formel-1-Weltmeisterschaft 2019 gefahren?",
          "answer": "21",
          "kind": "schaetz"
        },
        {
          "points": 1000,
          "question": "Was untersucht die Wissenschaft der Limnologie?",
          "answer": "Binnengewässer, vor allem Seen"
        }
      ]
    },
    "u-promis": {
      "id": "u-promis",
      "name": "Promis & Musik",
      "source": "Quizrunde 2021",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt die erste Gewinnerband von „Popstars“?",
          "answer": "No Angels"
        },
        {
          "points": 200,
          "question": "Welches monatliche Brutto-Gesamteinkommen hatte Bundeskanzlerin Merkel?",
          "answer": "ca. 39.420 €",
          "kind": "schaetz"
        },
        {
          "points": 300,
          "question": "Wie heißt der Frontsänger von Coldplay?",
          "answer": "Chris Martin"
        },
        {
          "points": 600,
          "question": "Wer singt diesen Song?",
          "answer": "— im Original nicht notiert",
          "note": "Achtung: Die Antwort war in der Vorlage nicht festgehalten. Vor dem Spielabend selbst anhören und eintragen.",
          "media": "https://youtu.be/5KcRl1p2waM",
          "kind": "musik"
        },
        {
          "points": 1000,
          "question": "Wie heißen die vier Mitglieder der Beatles?",
          "answer": "McCartney, Lennon, Harrison, Starr"
        }
      ]
    },
    "u-sport": {
      "id": "u-sport",
      "name": "Sport",
      "source": "Quizrunde 2021",
      "questions": [
        {
          "points": 100,
          "question": "Wie viele Turniere gehören zum Grand Slam?",
          "answer": "4"
        },
        {
          "points": 200,
          "question": "Wie viele Tore hat Bayern München in der Saison geschossen?",
          "answer": "100",
          "note": "Bundesliga-Saison 2019/20.",
          "kind": "schaetz"
        },
        {
          "points": 300,
          "question": "Wer ist der erfolgreichste Sommerolympionike?",
          "answer": "Michael Phelps"
        },
        {
          "points": 600,
          "question": "Wie viele Hürden überspringt man beim 400-m-Hürdenlauf?",
          "answer": "10"
        },
        {
          "points": 1000,
          "question": "Welche Disziplin fehlt beim Siebenkampf: 100 m Hürden, Hochsprung, Kugelstoßen, 200 m, Weitsprung, 800 m?",
          "answer": "Speerwurf"
        }
      ]
    },
    "u-weltwaerts": {
      "id": "u-weltwaerts",
      "name": "Weltwärts",
      "source": "Quizrunde 2021",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt die größte Pyramide von Gizeh?",
          "answer": "Cheops-Pyramide"
        },
        {
          "points": 200,
          "question": "Wie heißt der bevölkerungsreichste Bundesstaat der USA?",
          "answer": "Kalifornien"
        },
        {
          "points": 300,
          "question": "Wie heißt das höchste Gebäude der Welt?",
          "answer": "Burj Khalifa"
        },
        {
          "points": 600,
          "question": "Wie heißt die Tempelanlage, die als wichtigste Attraktion Kambodschas gilt?",
          "answer": "Angkor Wat"
        },
        {
          "points": 1000,
          "question": "In welchem Jahr wurde Singapur unabhängig?",
          "answer": "1965",
          "kind": "schaetz"
        }
      ]
    },
    "oly-turnen": {
      "id": "oly-turnen",
      "name": "Turnen",
      "source": "Olympia-Quiz",
      "questions": [
        {
          "points": 100,
          "question": "Wie hieß das deutsche Frauen-Turnteam bei Tokio 2020?",
          "answer": "Kim Bui, Pauline Schäfer-Betz, Elisabeth Seitz, Sarah Voss"
        },
        {
          "points": 200,
          "question": "Wie lang ist bei den Frauen der Schwebebalken?",
          "answer": "5 m"
        },
        {
          "points": 300,
          "question": "Wie breit ist die Bodenfläche in der Gerätgymnastik?",
          "answer": "12 m"
        },
        {
          "points": 600,
          "question": "Welche US-amerikanische Turnerin war 2013 bei „Dancing with the Stars“ dabei?",
          "answer": "Aly (Alexandra) Raisman",
          "note": "Sie wurde Vierte."
        },
        {
          "points": 1000,
          "question": "Wie heißt der Handschutz bei Ringturnern?",
          "answer": "Turnriemchen"
        }
      ]
    },
    "oly-leicht": {
      "id": "oly-leicht",
      "name": "Leichtathletik",
      "source": "Olympia-Quiz",
      "questions": [
        {
          "points": 100,
          "question": "Wie lang ist die längste olympische Wettkampfdistanz?",
          "answer": "50 km",
          "note": "50-km-Gehen."
        },
        {
          "points": 200,
          "question": "Wie schnell ist der Weltrekord der Männer über 100 m?",
          "answer": "9,58 s"
        },
        {
          "points": 300,
          "question": "Wie viel wiegt die Kugel beim Kugelstoßen der Frauen?",
          "answer": "4 kg"
        },
        {
          "points": 600,
          "question": "Wie weit stehen die Hürden beim 110-m-Hürdenlauf voneinander entfernt?",
          "answer": "9,14 m"
        },
        {
          "points": 1000,
          "question": "Welche Disziplinen beinhaltet der Siebenkampf?",
          "answer": "100 m Hürden, Hochsprung, Kugelstoßen, 200 m, Weitsprung, Speerwurf, 800 m"
        }
      ]
    },
    "oly-geschichte": {
      "id": "oly-geschichte",
      "name": "Olympia-Geschichte",
      "source": "Olympia-Quiz",
      "questions": [
        {
          "points": 100,
          "question": "Auf welchem Platz lag Deutschland im Medaillenspiegel von Rio 2016?",
          "answer": "5."
        },
        {
          "points": 200,
          "question": "Wo waren die Sommerspiele im Jahr 2000?",
          "answer": "Sydney"
        },
        {
          "points": 300,
          "question": "Wo fanden die darauffolgenden Winterspiele statt?",
          "answer": "Peking",
          "note": "Winterspiele 2022."
        },
        {
          "points": 600,
          "question": "Welche Farbe hatte das Maskottchen von Tokio 2020?",
          "answer": "Blau-weiß"
        },
        {
          "points": 1000,
          "question": "Wann waren die letzten Sommerspiele in Deutschland?",
          "answer": "1972 in München"
        }
      ]
    },
    "oly-tokio": {
      "id": "oly-tokio",
      "name": "Tokio 2020",
      "source": "Olympia-Quiz",
      "questions": [
        {
          "points": 100,
          "question": "Welche fünf Disziplinen gibt es beim Schwimmen?",
          "answer": "Schwimmen, Freiwasser, Wasserspringen, Synchronschwimmen, Wasserball"
        },
        {
          "points": 200,
          "question": "Welche vier Disziplinen gibt es beim Radsport?",
          "answer": "Straße, BMX, Mountainbike, Bahn"
        },
        {
          "points": 300,
          "question": "Wie viele Athletinnen und Athleten sind bei Tokio 2020 dabei?",
          "answer": "11.270",
          "kind": "schaetz"
        },
        {
          "points": 600,
          "question": "Welche drei Disziplinen gibt es beim Reiten?",
          "answer": "Dressur, Springen, Vielseitigkeit"
        },
        {
          "points": 1000,
          "question": "Welche fünf Sportarten sind in Tokio neu dabei?",
          "answer": "Baseball/Softball, Karate, Sportklettern, Skateboard und Surfen"
        }
      ]
    },
    "q4-politik": {
      "id": "q4-politik",
      "name": "Politik & Bildung",
      "source": "Quiz 4 von Dario",
      "questions": [
        {
          "points": 100,
          "question": "Welche Stadt war bis zur Wiedervereinigung 1990 Bundeshauptstadt?",
          "answer": "Bonn"
        },
        {
          "points": 200,
          "question": "Es gibt sechs Fraktionen im Bundestag: CDU/CSU, Grüne, Linke, FDP, SPD und …?",
          "answer": "AfD"
        },
        {
          "points": 300,
          "question": "Welches Studienfach hat in Deutschland insgesamt die meisten Studierenden?",
          "answer": "BWL"
        },
        {
          "points": 600,
          "question": "Wie heißt die Vizepräsidentin der USA?",
          "answer": "Kamala Harris",
          "note": "Stand 2021."
        },
        {
          "points": 1000,
          "question": "Womit beschäftigt sich jemand, der Geodäsie studiert?",
          "answer": "Mit der Vermessung der Erde"
        }
      ]
    },
    "q4-weltwaerts": {
      "id": "q4-weltwaerts",
      "name": "Weltwärts",
      "source": "Quiz 4 von Dario",
      "questions": [
        {
          "points": 100,
          "question": "Wofür steht das Kürzel ISS in der Raumfahrt?",
          "answer": "International Space Station"
        },
        {
          "points": 200,
          "question": "Wie heißt der Hochgeschwindigkeitszug in Frankreich?",
          "answer": "TGV"
        },
        {
          "points": 300,
          "question": "Wie heißt der österreichische Skiort, der für einen Corona-Ausbruch bekannt wurde?",
          "answer": "Ischgl"
        },
        {
          "points": 600,
          "question": "An welcher Meerenge liegt Istanbul?",
          "answer": "Am Bosporus"
        },
        {
          "points": 1000,
          "question": "Wie heißt die Ruinenstadt der Inka in Peru?",
          "answer": "Machu Picchu"
        }
      ]
    },
    "q4-fantasy": {
      "id": "q4-fantasy",
      "name": "Film & Fantasy",
      "source": "Quiz 4 von Dario",
      "questions": [
        {
          "points": 100,
          "question": "Wie lautet der Untertitel des ersten Harry-Potter-Buchs?",
          "answer": "Der Stein der Weisen"
        },
        {
          "points": 200,
          "question": "Welchen Gegenstand wollen die Hobbits in „Der Herr der Ringe“ vernichten?",
          "answer": "Den Ring"
        },
        {
          "points": 300,
          "question": "Über welchen Weg betreten die Protagonisten die Welt Narnias?",
          "answer": "Durch einen Kleiderschrank"
        },
        {
          "points": 600,
          "question": "Wie heißt die Hauptfigur der Buchreihe „Die Tribute von Panem“?",
          "answer": "Katniss Everdeen"
        },
        {
          "points": 1000,
          "question": "Wie heißt der Mitarbeiter des britischen Geheimdienstes, der James Bond die technischen Spielzeuge liefert?",
          "answer": "Q"
        }
      ]
    },
    "blitz-1": {
      "id": "blitz-1",
      "name": "Blitzrunde I",
      "source": "Schnellraterunde (Samy)",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt der Reboot der HSM-Filmreihe, der als Serie auf Disney+ läuft?",
          "answer": "HSMTMTS",
          "note": "„High School Musical: The Musical: The Series“."
        },
        {
          "points": 200,
          "question": "Wer moderierte die ersten sechs Staffeln des Dschungelcamps an der Seite von Sonja Zietlow?",
          "answer": "Dirk Bach"
        },
        {
          "points": 300,
          "question": "Wann wurde die allererste Bachelor-Staffel mit Marcel Maderitsch ausgestrahlt?",
          "answer": "2003"
        },
        {
          "points": 600,
          "question": "Welche Show und Moderatorin gerieten 2020 wegen schlechter Arbeitsbedingungen in die Kritik?",
          "answer": "Ellen DeGeneres"
        },
        {
          "points": 1000,
          "question": "Welchen Weltrekord stellte der erste „High School Musical“-Film auf?",
          "answer": "Die meisten gleichzeitigen Hits eines Soundtracks in den US-Charts"
        }
      ]
    },
    "blitz-2": {
      "id": "blitz-2",
      "name": "Blitzrunde II",
      "source": "Schnellraterunden 2021",
      "questions": [
        {
          "points": 100,
          "question": "Bis zu welcher Runde schaffte es Menderes bei DSDS als regulärer Kandidat?",
          "answer": "Bis zum Auslandsrecall"
        },
        {
          "points": 200,
          "question": "Wie heißt die Netflix-Show, an der auch Kenny Ortega, der Regisseur von HSM, mitwirkt?",
          "answer": "Julie and the Phantoms"
        },
        {
          "points": 300,
          "question": "Wie heißt der Choreograph, der bei „Popstars“ die Kandidaten coachte und zeitweise in der Jury saß?",
          "answer": "Detlef D! Soost"
        },
        {
          "points": 600,
          "question": "Wer gewann das Dschungelcamp 2020?",
          "answer": "Prince Damien"
        },
        {
          "points": 1000,
          "question": "Wer moderierte die letzten Sendungen von „Wetten, dass..?“",
          "answer": "Markus Lanz"
        }
      ]
    },
    "blitz-3": {
      "id": "blitz-3",
      "name": "Blitzrunde III",
      "source": "Schnellraterunde (Dario)",
      "questions": [
        {
          "points": 100,
          "question": "Wie viele Fragen muss man bei „Wer wird Millionär?“ richtig beantworten?",
          "answer": "15"
        },
        {
          "points": 200,
          "question": "Welche Tierart ist Patrick Star?",
          "answer": "Ein Seestern"
        },
        {
          "points": 300,
          "question": "Wofür steht CSU?",
          "answer": "Christlich-Soziale Union"
        },
        {
          "points": 600,
          "question": "Wie heißen die sich schnell drehenden Spielzeug-Kreisel, die früher beliebt waren?",
          "answer": "Beyblades"
        },
        {
          "points": 1000,
          "question": "Wie heißt mit Vor- und Nachnamen die Oberbürgermeisterin von Köln?",
          "answer": "Henriette Reker"
        }
      ]
    },
    "misc-kunterbunt": {
      "id": "misc-kunterbunt",
      "name": "Kunterbunt",
      "source": "Verstreute Fragen",
      "questions": [
        {
          "points": 100,
          "question": "Wie heißt der Schultest der OECD, mit dem Leistungen in Mathematik und anderen Fächern international verglichen werden?",
          "answer": "PISA-Test"
        },
        {
          "points": 200,
          "question": "Wie heißt Barack Obama mit zweitem Vornamen?",
          "answer": "Hussein"
        },
        {
          "points": 300,
          "question": "Wie viele Staffeln „Are You the One?“ gab es in Deutschland?",
          "answer": "3 (plus eine Spin-off-Staffel)"
        },
        {
          "points": 600,
          "question": "Welches Nachbarland Deutschlands fehlt: Dänemark, Niederlande, Belgien, Polen, Tschechien, Österreich, Schweiz, Frankreich?",
          "answer": "Luxemburg"
        },
        {
          "points": 1000,
          "question": "Was ist das bevölkerungsreichste Land Afrikas?",
          "answer": "Nigeria"
        }
      ]
    },
    "misc-schaetz": {
      "id": "misc-schaetz",
      "name": "Schätzfragen",
      "source": "Schätzfragen-Sammlung",
      "questions": [
        {
          "points": 100,
          "question": "Wie viele Rennen umfasste die Formel-1-Weltmeisterschaft 2021?",
          "answer": "23",
          "kind": "schaetz"
        },
        {
          "points": 200,
          "question": "Wie viele Wolfsrudel gibt es in Deutschland?",
          "answer": "128",
          "kind": "schaetz"
        },
        {
          "points": 300,
          "question": "Wie viele wild lebende Tiger gibt es geschätzt?",
          "answer": "3.890",
          "kind": "schaetz"
        },
        {
          "points": 600,
          "question": "Wie viele iPads hatte Apple bis September 2020 verkauft?",
          "answer": "über 500 Millionen",
          "kind": "schaetz"
        },
        {
          "points": 1000,
          "question": "Auf welchen monatlichen Gesamtverdienst kam die Bundeskanzlerin?",
          "answer": "ca. 39.420 €",
          "kind": "schaetz"
        }
      ]
    }
  },
  "quizzes": [
    {
      "id": "aufwaermrunde",
      "title": "Aufwärmrunde",
      "tagline": "Fünf Klassiker zum Einsteigen",
      "mix": false,
      "categories": [
        "base-geo",
        "base-wissenschaft",
        "base-geschichte",
        "base-kunst",
        "base-sport"
      ]
    },
    {
      "id": "nerdquiz-1",
      "title": "Nerdquiz 2.0 · Nacht 1",
      "tagline": "Popkultur, Grusel und Controller",
      "mix": false,
      "categories": [
        "nq-action",
        "nq-grusel",
        "nq-retro",
        "nq-modern",
        "nq-konnichiwa"
      ]
    },
    {
      "id": "nerdquiz-2",
      "title": "Nerdquiz 2.0 · Nacht 2",
      "tagline": "Von der Tiefsee bis zum Schwarzen Loch",
      "mix": false,
      "categories": [
        "nq-heimat",
        "nq-koerper",
        "nq-universum",
        "nq-mytho",
        "nq-duos"
      ]
    },
    {
      "id": "dez-v1",
      "title": "Dezemberquiz v1",
      "tagline": "Promis, Planeten, Popsongs",
      "mix": false,
      "categories": [
        "d1-promis",
        "d1-geografie",
        "d1-wissenschaft",
        "d1-filme",
        "d1-musik"
      ]
    },
    {
      "id": "dez-v2",
      "title": "Dezemberquiz v2",
      "tagline": "Götter, Getriebe und Gaming",
      "mix": false,
      "categories": [
        "d2-mythologie",
        "d2-technik",
        "d2-geschichte",
        "d2-tiere",
        "d2-games"
      ]
    },
    {
      "id": "dez-v3",
      "title": "Dezemberquiz v3",
      "tagline": "Kunst, Kosmos und Kopfnüsse",
      "mix": false,
      "categories": [
        "d3-kunst",
        "d3-weltraum",
        "d3-sport",
        "d3-allgemein",
        "d3-raetsel"
      ]
    },
    {
      "id": "dez-v4",
      "title": "Dezemberquiz v4",
      "tagline": "Essen, Bücher, Bandbreite",
      "mix": false,
      "categories": [
        "d4-essen",
        "d4-literatur",
        "d4-internet",
        "d4-reisen",
        "d4-logik"
      ]
    },
    {
      "id": "quiz-samy",
      "title": "Quiz von Samy",
      "tagline": "Trash-TV, Timeline und Traumpaare",
      "mix": false,
      "categories": [
        "s-reality",
        "s-tv",
        "s-social",
        "s-partner",
        "s-fiktion"
      ]
    },
    {
      "id": "quiz-dario-2021",
      "title": "Quiz von Dario",
      "tagline": "Der Klassiker von 2021",
      "mix": false,
      "categories": [
        "dq3-weltwaerts",
        "dq3-politik",
        "dq3-musik",
        "dq3-film",
        "dq3-popkultur"
      ]
    },
    {
      "id": "quiz-lorenz",
      "title": "Quiz von Lorenz",
      "tagline": "Zwischen Zink und Zahlengraf",
      "mix": false,
      "categories": [
        "l-film",
        "l-wissenschaft",
        "l-kurioses",
        "l-promis",
        "l-zahlen"
      ]
    },
    {
      "id": "quizrunde-2021",
      "title": "Quizrunde 2021",
      "tagline": "Breites Allgemeinwissen mit Schätzeinlagen",
      "mix": false,
      "categories": [
        "u-tiere",
        "u-technik",
        "u-promis",
        "u-sport",
        "u-weltwaerts"
      ]
    },
    {
      "id": "olympia",
      "title": "Olympia-Quiz",
      "tagline": "Turnen, Tokio und Medaillenspiegel",
      "mix": false,
      "categories": [
        "oly-turnen",
        "oly-leicht",
        "oly-geschichte",
        "oly-tokio",
        "u-sport"
      ]
    },
    {
      "id": "quiz4-dario",
      "title": "Quiz 4 von Dario",
      "tagline": "Politik, Fantasy und eine Blitzrunde",
      "mix": false,
      "categories": [
        "q4-politik",
        "q4-weltwaerts",
        "q4-fantasy",
        "misc-kunterbunt",
        "blitz-2"
      ]
    },
    {
      "id": "mix-namen",
      "title": "Wer gehört zu wem?",
      "tagline": "Fünf Boards, in denen nur Namen auf dem Tisch liegen",
      "mix": true,
      "categories": [
        "nq-franchises",
        "nq-welten",
        "s-fiktion",
        "s-partner",
        "nq-duos"
      ]
    },
    {
      "id": "mix-kopfnuss",
      "title": "Kopfnuss",
      "tagline": "Rätseln, schätzen, rechnen – nichts zum Auswendiglernen",
      "mix": true,
      "categories": [
        "d4-logik",
        "d3-raetsel",
        "l-zahlen",
        "misc-schaetz",
        "blitz-3"
      ]
    },
    {
      "id": "mix-boulevard",
      "title": "Boulevard & Bildschirm",
      "tagline": "Alles, was man eigentlich nicht wissen müsste",
      "mix": true,
      "categories": [
        "blitz-1",
        "s-reality",
        "s-social",
        "d1-promis",
        "l-promis"
      ]
    },
    {
      "id": "mix-leinwand",
      "title": "Leinwand & Lautsprecher",
      "tagline": "Kino, Serien und ein paar Ohrwürmer",
      "mix": true,
      "categories": [
        "nq-action",
        "d1-filme",
        "l-film",
        "s-tv",
        "dq3-musik"
      ]
    },
    {
      "id": "mix-kosmos",
      "title": "Kosmos & Körper",
      "tagline": "Vom Mitochondrium bis zum Wurmloch",
      "mix": true,
      "categories": [
        "nq-universum",
        "d3-weltraum",
        "nq-koerper",
        "l-wissenschaft",
        "d2-tiere"
      ]
    }
  ]
};
