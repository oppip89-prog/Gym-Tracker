const DEFAULT_PROGRAM = {
  "workouts": {
    "PUSH": {
      "name": "PUSH",
      "exercises": [
        {
          "name": "Preparazione spalle/scapole",
          "equipment": "Cavo leggero + mobilita",
          "sets": 0,
          "reps": "2-3 min",
          "rir": "-",
          "restSec": 0,
          "alternative": "Se sei gia caldo: 2 min",
          "note": "Solo attivazione; non deve affaticare.",
          "fixedMin": 3,
          "estimatedMin": 3,
          "special": null,
          "historyKey": "Preparazione spalle/scapole",
          "exerciseId": "preparazione-spalle-scapole",
          "movementId": "preparazione-spalle-scapole",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Panca piana - Protocollo A",
          "equipment": "Panca piana + bilanciere",
          "sets": 0,
          "reps": "1 singola + back-off da piano",
          "rir": "Da piano",
          "restSec": 0,
          "alternative": "Nessuna",
          "note": "Sessione principale. Segui i kg del piano e registra l RPE reale della singola: la v9.1 autoregola i back-off se il top set e troppo pesante.",
          "fixedMin": 20,
          "estimatedMin": 20,
          "special": "bench_push",
          "historyKey": "Panca piana - Protocollo A",
          "exerciseId": "panca-piana-protocollo-a",
          "movementId": "bench-press",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Incline chest press",
          "equipment": "Matrix plate-loaded",
          "sets": 1,
          "reps": "6-10",
          "rir": "2",
          "restSec": 150,
          "alternative": "Distensioni manubri inclinata (dopo il ciclo)",
          "note": "Una serie di qualità. Mantieni margine: la panca resta la priorità.",
          "fixedMin": 0,
          "estimatedMin": 4.8,
          "special": null,
          "historyKey": "Incline chest press",
          "exerciseId": "incline-chest-press",
          "movementId": "incline-chest-press",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Shoulder press pacco pesi",
          "equipment": "Matrix selectorized",
          "sets": 1,
          "reps": "6-10",
          "rir": "2",
          "restSec": 150,
          "alternative": "Shoulder press plate-loaded",
          "note": "Una sola serie efficace; stop se la velocità cala nettamente.",
          "fixedMin": 0,
          "estimatedMin": 4.6,
          "special": null,
          "historyKey": "Shoulder press pacco pesi",
          "exerciseId": "shoulder-press-pacco-pesi",
          "movementId": "overhead-press",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Pec fly",
          "equipment": "Matrix pec fly",
          "sets": 1,
          "reps": "10-15",
          "rir": "1-2",
          "restSec": 90,
          "alternative": "Croci ai cavi",
          "note": "Opzionale se recupero di panca/spalle è buono.",
          "fixedMin": 0,
          "estimatedMin": 4,
          "special": null,
          "historyKey": "Pec fly",
          "exerciseId": "pec-fly",
          "movementId": "chest-fly",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Alzate laterali manubri",
          "equipment": "Manubri",
          "sets": 2,
          "reps": "12-20",
          "rir": "1",
          "restSec": 75,
          "alternative": "Cavo singolo",
          "note": "Due serie controllate; cedimento non necessario.",
          "fixedMin": 0,
          "estimatedMin": 3.8,
          "special": null,
          "historyKey": "Alzate laterali manubri",
          "exerciseId": "alzate-laterali-manubri",
          "movementId": "lateral-raise",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Pushdown tricipiti",
          "equipment": "Cavo + corda/barra",
          "sets": 1,
          "reps": "8-12",
          "rir": "1",
          "restSec": 90,
          "alternative": "Estensione overhead al cavo",
          "note": "Una serie diretta: panca e shoulder press forniscono già molto lavoro ai tricipiti.",
          "fixedMin": 0,
          "estimatedMin": 3.8,
          "special": null,
          "historyKey": "Pushdown tricipiti",
          "exerciseId": "pushdown-tricipiti",
          "movementId": "triceps-extension",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        }
      ],
      "estimatedMin": 33.2
    },
    "PULL": {
      "name": "PULL",
      "exercises": [
        {
          "name": "Riscaldamento generale",
          "equipment": "Scapole/gomiti + serie leggere",
          "sets": 0,
          "reps": "4-5 min",
          "rir": "-",
          "restSec": 0,
          "alternative": "-",
          "note": "Solo preparazione, non volume.",
          "fixedMin": 4,
          "estimatedMin": 4,
          "special": null,
          "historyKey": "Riscaldamento generale",
          "exerciseId": "riscaldamento-generale",
          "movementId": "riscaldamento-generale",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Pulldown corda",
          "equipment": "Cavo alto + corda",
          "sets": 1,
          "reps": "12-15",
          "rir": "1-2",
          "restSec": 90,
          "alternative": "Pulldown braccia tese",
          "note": "Attivazione/stimolo dorsale senza portarla a cedimento.",
          "fixedMin": 0,
          "estimatedMin": 4,
          "special": null,
          "historyKey": "Pulldown corda",
          "exerciseId": "pulldown-corda",
          "movementId": "vertical-pull",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "T-bar row machine pacco pesi",
          "equipment": "Matrix selectorized",
          "sets": 2,
          "reps": "6-10",
          "rir": "1-2",
          "restSec": 180,
          "alternative": "T-bar plate-loaded",
          "note": "Due serie logbook, niente grinder.",
          "fixedMin": 0,
          "estimatedMin": 5.8,
          "special": null,
          "historyKey": "T-bar row machine pacco pesi",
          "exerciseId": "t-bar-row-machine-pacco-pesi",
          "movementId": "horizontal-pull",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Pulley",
          "equipment": "Matrix + presa preferita",
          "sets": 2,
          "reps": "8-12",
          "rir": "1-2",
          "restSec": 150,
          "alternative": "Presa stretta",
          "note": "Due serie pulite con ROM costante.",
          "fixedMin": 0,
          "estimatedMin": 5,
          "special": null,
          "historyKey": "Pulley",
          "exerciseId": "pulley",
          "movementId": "horizontal-pull",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Trazioni assistite",
          "equipment": "Matrix assistenza trazioni",
          "sets": 1,
          "reps": "6-10",
          "rir": "1",
          "restSec": 150,
          "alternative": "Lat machine",
          "note": "Serie tecnica, non MAX.",
          "fixedMin": 0,
          "estimatedMin": 1.8,
          "special": null,
          "historyKey": "Trazioni assistite",
          "exerciseId": "trazioni-assistite",
          "movementId": "vertical-pull",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "lower-is-harder",
          "progression": {}
        },
        {
          "name": "Curl manubrio singolo alla Scott al contrario",
          "equipment": "Panca Scott + manubrio",
          "sets": 2,
          "reps": "6-10",
          "rir": "1",
          "restSec": 120,
          "alternative": "Curl Scott unilaterale",
          "note": "Progressione doppia: reps prima del carico.",
          "fixedMin": 0,
          "estimatedMin": 4.3,
          "special": null,
          "historyKey": "Curl manubrio singolo alla Scott al contrario",
          "exerciseId": "curl-manubrio-singolo-alla-scott-al-contrario",
          "movementId": "biceps-curl",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Hammer curl al cavo",
          "equipment": "Cavo + corda",
          "sets": 1,
          "reps": "10-15",
          "rir": "1",
          "restSec": 90,
          "alternative": "Hammer manubri",
          "note": "Una serie finale controllata.",
          "fixedMin": 0,
          "estimatedMin": 1.5,
          "special": null,
          "historyKey": "Hammer curl al cavo",
          "exerciseId": "hammer-curl-al-cavo",
          "movementId": "biceps-curl",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        }
      ],
      "estimatedMin": 23.5
    },
    "LEGS": {
      "name": "LEGS",
      "exercises": [
        {
          "name": "Riscaldamento generale",
          "equipment": "Anche/caviglie + serie leggere",
          "sets": 0,
          "reps": "5 min",
          "rir": "-",
          "restSec": 0,
          "alternative": "-",
          "note": "Avvicinamento al Pendulum.",
          "fixedMin": 5,
          "estimatedMin": 5,
          "special": null,
          "historyKey": "Riscaldamento generale",
          "exerciseId": "riscaldamento-generale",
          "movementId": "riscaldamento-generale",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Pendulum squat",
          "equipment": "Pendulum squat",
          "sets": 2,
          "reps": "6-8",
          "rir": "1-2",
          "restSec": 180,
          "alternative": "Perfect squat / belt squat",
          "note": "Consolida 2 serie nel range prima di aumentare il carico.",
          "fixedMin": 0,
          "estimatedMin": 6.2,
          "special": null,
          "historyKey": "Pendulum squat",
          "exerciseId": "pendulum-squat",
          "movementId": "knee-dominant",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Pressa 45 gradi carico dischi",
          "equipment": "Pressa 45 gradi plate-loaded",
          "sets": 2,
          "reps": "10-15",
          "rir": "1-2",
          "restSec": 180,
          "alternative": "Pressa orizzontale",
          "note": "Mantieni ROM e margine; progressione su reps.",
          "fixedMin": 0,
          "estimatedMin": 6.3,
          "special": null,
          "historyKey": "Pressa 45 gradi carico dischi",
          "exerciseId": "pressa-45-gradi-carico-dischi",
          "movementId": "knee-dominant",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Leg extension massima inclinazione",
          "equipment": "Leg extension inclinabile",
          "sets": 1,
          "reps": "10-15",
          "rir": "1",
          "restSec": 90,
          "alternative": "Leg extension pacco pesi",
          "note": "Una serie dura ma non a cedimento: riduce fatica periferica.",
          "fixedMin": 0,
          "estimatedMin": 4,
          "special": null,
          "historyKey": "Leg extension massima inclinazione",
          "exerciseId": "leg-extension-massima-inclinazione",
          "movementId": "knee-extension",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Leg curl carico dischi",
          "equipment": "Leg curl plate-loaded",
          "sets": 2,
          "reps": "8-12",
          "rir": "1",
          "restSec": 120,
          "alternative": "Leg curl pacco pesi",
          "note": "Due serie controllate.",
          "fixedMin": 0,
          "estimatedMin": 4.5,
          "special": null,
          "historyKey": "Leg curl carico dischi",
          "exerciseId": "leg-curl-carico-dischi",
          "movementId": "knee-flexion",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Abductor",
          "equipment": "Matrix abductor",
          "sets": 1,
          "reps": "15-25",
          "rir": "1",
          "restSec": 60,
          "alternative": "-",
          "note": "Una serie controllata.",
          "fixedMin": 0,
          "estimatedMin": 1.5,
          "special": null,
          "historyKey": "Abductor",
          "exerciseId": "abductor",
          "movementId": "abductor",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        }
      ],
      "estimatedMin": 23.3
    },
    "UPPER": {
      "name": "UPPER",
      "exercises": [
        {
          "name": "Preparazione spalle/scapole",
          "equipment": "Cavo leggero + mobilita",
          "sets": 0,
          "reps": "2-3 min",
          "rir": "-",
          "restSec": 0,
          "alternative": "-",
          "note": "Solo attivazione.",
          "fixedMin": 3,
          "estimatedMin": 3,
          "special": null,
          "historyKey": "Preparazione spalle/scapole",
          "exerciseId": "preparazione-spalle-scapole",
          "movementId": "preparazione-spalle-scapole",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Panca piana - Protocollo B",
          "equipment": "Panca piana + bilanciere",
          "sets": 0,
          "reps": "Panca B con fermo 2 s",
          "rir": "Da piano",
          "restSec": 0,
          "alternative": "Nessuna",
          "note": "Seconda esposizione specifica con fermo 2 s: tecnica e volume senza grind. Mantieni il dorso come priorita del resto della seduta.",
          "fixedMin": 18,
          "estimatedMin": 18,
          "special": "bench_upper",
          "historyKey": "Panca piana - Protocollo B",
          "exerciseId": "panca-piana-protocollo-b",
          "movementId": "bench-press",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "High row",
          "equipment": "Matrix high row",
          "sets": 2,
          "reps": "6-10",
          "rir": "1-2",
          "restSec": 180,
          "alternative": "T-bar row",
          "note": "Due serie solide, nessun grinder.",
          "fixedMin": 0,
          "estimatedMin": 5.8,
          "special": null,
          "historyKey": "High row",
          "exerciseId": "high-row",
          "movementId": "horizontal-pull",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Lat machine - top + back-off",
          "equipment": "Matrix lat machine",
          "sets": 2,
          "reps": "Top 6-9 / back-off 8-12",
          "rir": "1-2",
          "restSec": 180,
          "alternative": "Trazioni assistite",
          "note": "Mantieni top + back-off, senza cedimento.",
          "fixedMin": 0,
          "estimatedMin": 5.3,
          "special": null,
          "historyKey": "Lat machine - top + back-off",
          "exerciseId": "lat-machine-top-back-off",
          "movementId": "vertical-pull",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Reverse pec deck",
          "equipment": "Matrix",
          "sets": 1,
          "reps": "12-20",
          "rir": "1",
          "restSec": 75,
          "alternative": "Croci inverse ai cavi",
          "note": "Una serie di qualità.",
          "fixedMin": 0,
          "estimatedMin": 3.3,
          "special": null,
          "historyKey": "Reverse pec deck",
          "exerciseId": "reverse-pec-deck",
          "movementId": "rear-delt",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Alzate laterali",
          "equipment": "Cavo singolo o manubri",
          "sets": 1,
          "reps": "12-20",
          "rir": "1-2",
          "restSec": 75,
          "alternative": "Manubri / cavo",
          "note": "Una serie di richiamo.",
          "fixedMin": 0,
          "estimatedMin": 3.8,
          "special": null,
          "historyKey": "Alzate laterali",
          "exerciseId": "alzate-laterali",
          "movementId": "lateral-raise",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        }
      ],
      "estimatedMin": 35.0
    },
    "LOWER": {
      "name": "LOWER",
      "exercises": [
        {
          "name": "Riscaldamento generale",
          "equipment": "Mobilità anche + serie leggere",
          "sets": 0,
          "reps": "5 min",
          "rir": "—",
          "restSec": 0,
          "alternative": "—",
          "note": "Avvicinamento progressivo al primo esercizio.",
          "fixedMin": 5,
          "estimatedMin": 5,
          "special": null,
          "historyKey": "Riscaldamento generale",
          "exerciseId": "riscaldamento-generale",
          "movementId": "riscaldamento-generale",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Romanian deadlift",
          "equipment": "Multipower",
          "sets": 2,
          "reps": "6-8",
          "rir": "1-2",
          "restSec": 150,
          "alternative": "Manubri",
          "note": "Due serie tecniche; niente cedimento.",
          "fixedMin": 0,
          "estimatedMin": 4.8,
          "special": null,
          "historyKey": "Romanian deadlift",
          "exerciseId": "romanian-deadlift",
          "movementId": "hip-hinge",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Hip thrust machine",
          "equipment": "Matrix hip thrust",
          "sets": 1,
          "reps": "8-12",
          "rir": "1-2",
          "restSec": 120,
          "alternative": "Multipower hip thrust",
          "note": "Una serie efficace con pausa in massima estensione.",
          "fixedMin": 0,
          "estimatedMin": 4.3,
          "special": null,
          "historyKey": "Hip thrust machine",
          "exerciseId": "hip-thrust-machine",
          "movementId": "hip-thrust",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Standing leg curl",
          "equipment": "Matrix standing leg curl",
          "sets": 2,
          "reps": "10-15 / lato",
          "rir": "1",
          "restSec": 75,
          "alternative": "Leg curl pacco pesi",
          "note": "Due serie controllate.",
          "fixedMin": 0,
          "estimatedMin": 3.6,
          "special": null,
          "historyKey": "Standing leg curl",
          "exerciseId": "standing-leg-curl",
          "movementId": "knee-flexion",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Belt squat",
          "equipment": "Matrix belt squat",
          "sets": 2,
          "reps": "8-12",
          "rir": "1-2",
          "restSec": 120,
          "alternative": "Perfect squat",
          "note": "Richiamo quad/glutei a margine.",
          "fixedMin": 0,
          "estimatedMin": 4.3,
          "special": null,
          "historyKey": "Belt squat",
          "exerciseId": "belt-squat",
          "movementId": "knee-dominant",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Abductor",
          "equipment": "Matrix abductor",
          "sets": 1,
          "reps": "15-25",
          "rir": "1",
          "restSec": 60,
          "alternative": "—",
          "note": "Una serie controllata.",
          "fixedMin": 0,
          "estimatedMin": 3.3,
          "special": null,
          "historyKey": "Abductor",
          "exerciseId": "abductor",
          "movementId": "abductor",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Calf raise",
          "equipment": "Multipower",
          "sets": 2,
          "reps": "8-12",
          "rir": "1",
          "restSec": 60,
          "alternative": "Pressa orizzontale",
          "note": "ROM completo e pausa, senza cedimento obbligatorio.",
          "fixedMin": 0,
          "estimatedMin": 3.3,
          "special": null,
          "historyKey": "Calf raise",
          "exerciseId": "calf-raise",
          "movementId": "calf-raise",
          "aliases": [],
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Curl Scott unilaterale",
          "equipment": "Panca Scott + manubrio",
          "sets": 1,
          "reps": "6-10 / lato",
          "rir": "1",
          "restSec": 120,
          "alternative": "Curl al cavo unilaterale",
          "note": "Un richiamo: il lavoro principale bicipiti è nel PULL.",
          "fixedMin": 0,
          "estimatedMin": 4.3,
          "special": null,
          "historyKey": "Curl manubrio singolo alla Scott al contrario",
          "aliases": [
            "Curl manubrio singolo alla Scott al contrario",
            "Curl Scott unilaterale"
          ],
          "exerciseId": "curl-scott-unilaterale",
          "movementId": "biceps-curl",
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        },
        {
          "name": "Estensione tricipiti overhead al cavo",
          "equipment": "Cavo + corda",
          "sets": 1,
          "reps": "8-12",
          "rir": "1",
          "restSec": 90,
          "alternative": "Pushdown tricipiti",
          "note": "Un richiamo, senza cedimento forzato.",
          "fixedMin": 0,
          "estimatedMin": 3.8,
          "special": null,
          "historyKey": "Estensione tricipiti overhead al cavo",
          "aliases": [
            "Estensione tricipiti overhead al cavo"
          ],
          "exerciseId": "estensione-tricipiti-overhead-al-cavo",
          "movementId": "triceps-extension",
          "autoLoad": true,
          "loadDirection": "higher-is-harder",
          "progression": {}
        }
      ],
      "estimatedMin": 27.8
    }
  },
  "benchPlan": [
    {
      "week": 1,
      "phase": "Accumulo + carico",
      "pushTop": "140 kg x 1 @7,5",
      "pushBackoff": "120 kg - 4x4",
      "pushRest": "4:00",
      "upperWork": "110 kg - 4x4, fermo 2 s",
      "upperRest": "3:30",
      "rpe": "7-8",
      "time": "20-24 min",
      "note": "Si parte gia con lavoro utile dopo lo scarico. Se 140 supera RPE 8, riduci i back-off di 2,5 kg; nessun grinder."
    },
    {
      "week": 2,
      "phase": "Accumulo",
      "pushTop": "142,5 kg x 1 @7,5-8",
      "pushBackoff": "122,5 kg - 4x4",
      "pushRest": "4:00",
      "upperWork": "112,5 kg - 4x4, fermo 2 s",
      "upperRest": "3:30",
      "rpe": "7-8",
      "time": "20-25 min",
      "note": "Aumento lineare del carico mantenendo margine. Se la singola e lenta o >RPE 8,5, non forzare la progressione dei back-off."
    },
    {
      "week": 3,
      "phase": "Forza / volume specifico",
      "pushTop": "145 kg x 1 @8",
      "pushBackoff": "125 kg - 4x3",
      "pushRest": "4:30",
      "upperWork": "115 kg - 4x3, fermo 2 s",
      "upperRest": "4:00",
      "rpe": "7,5-8",
      "time": "20-25 min",
      "note": "Prima verifica sul carico appena consolidato. L obiettivo e rendere 145 piu controllato del precedente 145 @8-9."
    },
    {
      "week": 4,
      "phase": "Forza",
      "pushTop": "145 kg x 1 @7,5-8",
      "pushBackoff": "127,5 kg - 4x3",
      "pushRest": "4:30",
      "upperWork": "117,5 kg - 3x4, fermo 2 s",
      "upperRest": "4:00",
      "rpe": "7,5-8",
      "time": "20-25 min",
      "note": "Stessa singola per consolidare tecnica e velocita, ma back-off piu pesanti. Se 145 resta >RPE 8,5, mantieni 125 nei back-off."
    },
    {
      "week": 5,
      "phase": "Intensificazione",
      "pushTop": "147,5 kg x 1 @8",
      "pushBackoff": "130 kg - 3x3",
      "pushRest": "5:00",
      "upperWork": "120 kg - 3x3, fermo 2 s",
      "upperRest": "4:00",
      "rpe": "8",
      "time": "19-24 min",
      "note": "Meno volume e piu specificita. Riduci il lavoro accessorio di spinta prima di sacrificare la qualita della panca."
    },
    {
      "week": 6,
      "phase": "Picco di forza",
      "pushTop": "150 kg x 1 @<=8,5",
      "pushBackoff": "132,5 kg - 3x2",
      "pushRest": "5:00",
      "upperWork": "122,5 kg - 3x2, fermo 2 s",
      "upperRest": "4:00",
      "rpe": "8-8,5",
      "time": "18-23 min",
      "note": "150 e una verifica, non un massimale. Se supera RPE 8,5, scala subito i back-off di 2,5-5 kg e non inseguire il carico."
    },
    {
      "week": 7,
      "phase": "Taper",
      "pushTop": "137,5 kg x 1 @6,5-7",
      "pushBackoff": "117,5 kg - 2x2",
      "pushRest": "4:00",
      "upperWork": "105 kg - 2x3, fermo 2 s",
      "upperRest": "3:30",
      "rpe": "6-7",
      "time": "13-17 min",
      "note": "Dissipa fatica. Tutto deve essere veloce; riduci accessori di spinta del 30-40% e resta lontano dal cedimento."
    },
    {
      "week": 8,
      "phase": "Test / realizzazione",
      "pushTop": "145 -> 150 -> 152,5 -> 155 kg solo se consentito dall RPE",
      "pushBackoff": "Nessuno",
      "pushRest": "5:00",
      "upperWork": "Nessuna seconda panca prima del test",
      "upperRest": "-",
      "rpe": "7,5-9,5",
      "time": "20-30 min",
      "note": "145 e il check. Se <=RPE 8 passa a 150. Se 150 <=RPE 8,5 prova 152,5; 155 solo se 152,5 e pulita e <=RPE 8,5. Stop se compare un grinder."
    }
  ],
  "benchStructured": {
    "1": {
      "push": [
        [
          "Top single",
          140,
          1,
          7.5
        ],
        [
          "Back-off 1",
          120,
          4,
          7.5
        ],
        [
          "Back-off 2",
          120,
          4,
          7.5
        ],
        [
          "Back-off 3",
          120,
          4,
          8
        ],
        [
          "Back-off 4",
          120,
          4,
          8
        ]
      ],
      "pushRest": 240,
      "upper": [
        [
          "Fermo 2 s - 1",
          110,
          4,
          7
        ],
        [
          "Fermo 2 s - 2",
          110,
          4,
          7.5
        ],
        [
          "Fermo 2 s - 3",
          110,
          4,
          7.5
        ],
        [
          "Fermo 2 s - 4",
          110,
          4,
          8
        ]
      ],
      "upperRest": 210
    },
    "2": {
      "push": [
        [
          "Top single",
          142.5,
          1,
          7.5
        ],
        [
          "Back-off 1",
          122.5,
          4,
          7.5
        ],
        [
          "Back-off 2",
          122.5,
          4,
          7.5
        ],
        [
          "Back-off 3",
          122.5,
          4,
          8
        ],
        [
          "Back-off 4",
          122.5,
          4,
          8
        ]
      ],
      "pushRest": 240,
      "upper": [
        [
          "Fermo 2 s - 1",
          112.5,
          4,
          7
        ],
        [
          "Fermo 2 s - 2",
          112.5,
          4,
          7.5
        ],
        [
          "Fermo 2 s - 3",
          112.5,
          4,
          7.5
        ],
        [
          "Fermo 2 s - 4",
          112.5,
          4,
          8
        ]
      ],
      "upperRest": 210
    },
    "3": {
      "push": [
        [
          "Top single",
          145,
          1,
          8
        ],
        [
          "Back-off 1",
          125,
          3,
          7.5
        ],
        [
          "Back-off 2",
          125,
          3,
          7.5
        ],
        [
          "Back-off 3",
          125,
          3,
          8
        ],
        [
          "Back-off 4",
          125,
          3,
          8
        ]
      ],
      "pushRest": 270,
      "upper": [
        [
          "Fermo 2 s - 1",
          115,
          3,
          7
        ],
        [
          "Fermo 2 s - 2",
          115,
          3,
          7.5
        ],
        [
          "Fermo 2 s - 3",
          115,
          3,
          7.5
        ],
        [
          "Fermo 2 s - 4",
          115,
          3,
          8
        ]
      ],
      "upperRest": 240
    },
    "4": {
      "push": [
        [
          "Top single",
          145,
          1,
          8
        ],
        [
          "Back-off 1",
          127.5,
          3,
          7.5
        ],
        [
          "Back-off 2",
          127.5,
          3,
          7.5
        ],
        [
          "Back-off 3",
          127.5,
          3,
          8
        ],
        [
          "Back-off 4",
          127.5,
          3,
          8
        ]
      ],
      "pushRest": 270,
      "upper": [
        [
          "Fermo 2 s - 1",
          117.5,
          4,
          7.5
        ],
        [
          "Fermo 2 s - 2",
          117.5,
          4,
          7.5
        ],
        [
          "Fermo 2 s - 3",
          117.5,
          4,
          8
        ]
      ],
      "upperRest": 240
    },
    "5": {
      "push": [
        [
          "Top single",
          147.5,
          1,
          8
        ],
        [
          "Back-off 1",
          130,
          3,
          7.5
        ],
        [
          "Back-off 2",
          130,
          3,
          8
        ],
        [
          "Back-off 3",
          130,
          3,
          8
        ]
      ],
      "pushRest": 300,
      "upper": [
        [
          "Fermo 2 s - 1",
          120,
          3,
          7.5
        ],
        [
          "Fermo 2 s - 2",
          120,
          3,
          8
        ],
        [
          "Fermo 2 s - 3",
          120,
          3,
          8
        ]
      ],
      "upperRest": 240
    },
    "6": {
      "push": [
        [
          "Top single",
          150,
          1,
          8.5
        ],
        [
          "Back-off 1",
          132.5,
          2,
          7.5
        ],
        [
          "Back-off 2",
          132.5,
          2,
          8
        ],
        [
          "Back-off 3",
          132.5,
          2,
          8
        ]
      ],
      "pushRest": 300,
      "upper": [
        [
          "Fermo 2 s - 1",
          122.5,
          2,
          7.5
        ],
        [
          "Fermo 2 s - 2",
          122.5,
          2,
          8
        ],
        [
          "Fermo 2 s - 3",
          122.5,
          2,
          8
        ]
      ],
      "upperRest": 240
    },
    "7": {
      "push": [
        [
          "Top single",
          137.5,
          1,
          6.5
        ],
        [
          "Back-off 1",
          117.5,
          2,
          6.5
        ],
        [
          "Back-off 2",
          117.5,
          2,
          7
        ]
      ],
      "pushRest": 240,
      "upper": [
        [
          "Fermo 2 s - 1",
          105,
          3,
          6
        ],
        [
          "Fermo 2 s - 2",
          105,
          3,
          6.5
        ]
      ],
      "upperRest": 210
    },
    "8": {
      "push": [
        [
          "Check 145",
          145,
          1,
          8
        ],
        [
          "Tentativo 150",
          150,
          1,
          8.5
        ],
        [
          "Tentativo 152,5 - solo se ok",
          152.5,
          1,
          9
        ],
        [
          "Tentativo 155 - solo se 152,5 pulita",
          155,
          1,
          9.5
        ]
      ],
      "pushRest": 300,
      "upper": [],
      "upperRest": 0
    }
  },
  "adaptations": [
    {
      "week": 1,
      "pushUpper": "PUSH: panca prioritaria + complementari normali ma senza cedimento sui press. UPPER: panca B poi dorso.",
      "other": "Mantieni il volume base sulle altre sedute.",
      "goal": "Accumulo subito efficace",
      "note": "Sei appena uscito dallo scarico: cerca qualita e volume, non fatica massimale."
    },
    {
      "week": 2,
      "pushUpper": "Struttura invariata; non aggiungere serie extra di petto.",
      "other": "Progressione normale sugli accessori se recuperi.",
      "goal": "Accumulo",
      "note": "Il carico sale ma RPE resta controllato."
    },
    {
      "week": 3,
      "pushUpper": "Panca A piu specifica; UPPER ancora tecnico con fermo.",
      "other": "Evita grinder sistemici negli esercizi multiarticolari.",
      "goal": "Trasformare volume in forza",
      "note": "145 deve essere piu pulito del tuo recente 145 @8-9."
    },
    {
      "week": 4,
      "pushUpper": "Mantieni gli accessori di spinta a volume base o -1 set se senti fatica.",
      "other": "Dorso e gambe possono progredire normalmente.",
      "goal": "Consolidamento",
      "note": "La qualita dei 4x3 viene prima dei PR accessori."
    },
    {
      "week": 5,
      "pushUpper": "Riduci incline/shoulder press a 1-2 set effettivi; pec fly opzionale.",
      "other": "RIR 1-2 sui multiarticolari, niente cedimenti inutili.",
      "goal": "Intensificazione",
      "note": "Riduci fatica periferica prima di toccare la panca."
    },
    {
      "week": 6,
      "pushUpper": "Minimo efficace sugli accessori di spinta; tricipiti senza cedimento.",
      "other": "Mantieni dorso se il recupero e buono.",
      "goal": "Picco di forza",
      "note": "150 e una verifica tecnica, non una gara."
    },
    {
      "week": 7,
      "pushUpper": "Taglia 30-40% del volume accessorio di spinta. UPPER panca molto leggera + dorso facile.",
      "other": "Tutte le sedute a margine.",
      "goal": "Taper",
      "note": "Devi arrivare alla settimana 8 fresco."
    },
    {
      "week": 8,
      "pushUpper": "Test su PUSH. Nessuna seconda panca prima del test; dopo il test solo lavoro facile opzionale.",
      "other": "Sedute non specifiche leggere e lontane dal cedimento.",
      "goal": "Esprimere la forza",
      "note": "Il risultato e deciso dall RPE del giorno: nessun tentativo e obbligatorio."
    }
  ],
  "equipment": [
    "Macchina trazioni/dip assistite",
    "Pulley / seated cable row",
    "Lat machine",
    "Cavo singolo regolabile in altezza",
    "Castello con 2 cavi regolabili",
    "Barra larga per cavi",
    "Barra EZ per cavi",
    "Corda per cavi",
    "Presa stretta tipo Nebula",
    "Presa media tipo Nebula",
    "Presa larga tipo Nebula",
    "Pec fly / reverse pec deck",
    "Chest press pacco pesi",
    "Incline chest press carico dischi",
    "High row carico dischi",
    "Shoulder press carico dischi",
    "Shoulder press pacco pesi",
    "T-bar row carico dischi",
    "Perfect squat",
    "Pressa 45° carico dischi",
    "Pressa orizzontale pacco pesi",
    "Leg curl pacco pesi",
    "Leg extension pacco pesi",
    "Standing leg curl",
    "Hip thrust machine",
    "Adductor machine",
    "Abductor machine",
    "Leg curl carico dischi",
    "Leg extension inclinabile carico dischi",
    "Belt squat",
    "Manubri fino a 50 kg",
    "Panca piana",
    "Multipower / Smith machine"
  ],
  "splitOrder": [
    "PUSH",
    "PULL",
    "LEGS",
    "UPPER",
    "LOWER"
  ],
  "title": "Panca Forza 8W - Cut Optimized W5-W8",
  "subtitle": "Volume accessorio ottimizzato per deficit calorico: intensita utile, meno ridondanze e RIR 1-2. Panca autoregolata con priorita all ultima singola.",
  "weeks": 8,
  "referenceBench1RM": 155,
  "preCycle": [],
  "startWeek": 1,
  "legacyWeekAdaptations": false,
  "schemaVersion": 1,
  "libraryId": "mur0y0vo-0n45qp",
  "importedAt": "2026-10-02T13:54:14.388Z",
  "benchPlanRevision": "2026-10-30-v9.2.1"
};
