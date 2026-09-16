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
          "estimatedMin": 3.0,
          "special": null
        },
        {
          "name": "Panca piana - Protocollo A",
          "equipment": "Panca piana + bilanciere",
          "sets": 0,
          "reps": "1 singola + back-off da piano",
          "rir": "Da piano",
          "restSec": 0,
          "alternative": "Nessuna",
          "note": "Panca prioritaria. Fermo chiaro sulla singola; recuperi completi. I kg sono una guida: usa RPE e autoregolazione.",
          "fixedMin": 20,
          "estimatedMin": 20.0,
          "special": "bench_push"
        },
        {
          "name": "Incline chest press",
          "equipment": "Matrix plate-loaded",
          "sets": 2,
          "reps": "6-10",
          "rir": "2",
          "restSec": 150,
          "alternative": "Distensioni manubri inclinata (dopo il ciclo)",
          "note": "Complementare petto, non prioritaria. W1-W4: massimo 2 set; W5-W6: 1 set; W7-W8: tagliala se riduce il recupero della panca.",
          "fixedMin": 0,
          "estimatedMin": 4.8,
          "special": null
        },
        {
          "name": "Shoulder press pacco pesi",
          "equipment": "Matrix selectorized",
          "sets": 2,
          "reps": "6-10",
          "rir": "2",
          "restSec": 150,
          "alternative": "Shoulder press plate-loaded",
          "note": "Mantieni margine durante il blocco panca; niente grinder.",
          "fixedMin": 0,
          "estimatedMin": 4.6,
          "special": null
        },
        {
          "name": "Pec fly",
          "equipment": "Matrix pec fly",
          "sets": 1,
          "reps": "10-15",
          "rir": "1-2",
          "restSec": 90,
          "alternative": "Croci ai cavi",
          "note": "Una sola serie controllata. Elimina per prima se senti fatica su panca/spalle.",
          "fixedMin": 0,
          "estimatedMin": 4.0,
          "special": null
        },
        {
          "name": "Alzate laterali manubri",
          "equipment": "Manubri",
          "sets": 2,
          "reps": "12-20",
          "rir": "0-1",
          "restSec": 75,
          "alternative": "Cavo singolo",
          "note": "Rif. 10 kg x 17 x 3; ora 2 set.",
          "fixedMin": 0,
          "estimatedMin": 3.8,
          "special": null
        },
        {
          "name": "Pushdown tricipiti",
          "equipment": "Cavo + corda/barra",
          "sets": 2,
          "reps": "8-12",
          "rir": "0-1",
          "restSec": 90,
          "alternative": "Estensione overhead al cavo",
          "note": "Un solo esercizio diretto tricipiti durante il blocco panca.",
          "fixedMin": 0,
          "estimatedMin": 3.8,
          "special": null
        }
      ],
      "estimatedMin": 42.0
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
          "estimatedMin": 4.0,
          "special": null
        },
        {
          "name": "Pulldown corda",
          "equipment": "Cavo alto + corda",
          "sets": 2,
          "reps": "15",
          "rir": "1",
          "restSec": 90,
          "alternative": "Pulldown braccia tese",
          "note": "Tensione continua.",
          "fixedMin": 0,
          "estimatedMin": 4.0,
          "special": null
        },
        {
          "name": "T-bar row machine pacco pesi",
          "equipment": "Matrix selectorized",
          "sets": 2,
          "reps": "6-10",
          "rir": "1",
          "restSec": 180,
          "alternative": "T-bar plate-loaded",
          "note": "3 min pieni; logbook.",
          "fixedMin": 0,
          "estimatedMin": 5.8,
          "special": null
        },
        {
          "name": "High row machine",
          "equipment": "Matrix high row",
          "sets": 2,
          "reps": "6-10",
          "rir": "1",
          "restSec": 180,
          "alternative": "High row plate-loaded",
          "note": "Rif. 60 kg x 10 / 7; cerca almeno 10 / 8 con 3 min.",
          "fixedMin": 0,
          "estimatedMin": 5.8,
          "special": null
        },
        {
          "name": "Pulley",
          "equipment": "Matrix + presa preferita",
          "sets": 2,
          "reps": "10",
          "rir": "1",
          "restSec": 150,
          "alternative": "Presa stretta",
          "note": "Due serie da 10 pulite.",
          "fixedMin": 0,
          "estimatedMin": 5.0,
          "special": null
        },
        {
          "name": "Trazioni assistite",
          "equipment": "Matrix assistenza trazioni",
          "sets": 1,
          "reps": "MAX tecnico",
          "rir": "0-1",
          "restSec": 150,
          "alternative": "Lat machine",
          "note": "Una sola serie finale.",
          "fixedMin": 0,
          "estimatedMin": 1.8,
          "special": null
        },
        {
          "name": "Curl manubrio singolo alla Scott al contrario",
          "equipment": "Panca Scott + manubrio",
          "sets": 2,
          "reps": "6",
          "rir": "0-1",
          "restSec": 120,
          "alternative": "Curl Scott unilaterale",
          "note": "Due serie pesanti da 6 per lato.",
          "fixedMin": 0,
          "estimatedMin": 4.3,
          "special": null
        },
        {
          "name": "Hammer curl al cavo",
          "equipment": "Cavo + corda",
          "sets": 1,
          "reps": "MAX tecnico",
          "rir": "0-1",
          "restSec": 90,
          "alternative": "Hammer manubri",
          "note": "Una serie finale a massimo tecnico.",
          "fixedMin": 0,
          "estimatedMin": 1.5,
          "special": null
        }
      ],
      "estimatedMin": 32.2
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
          "estimatedMin": 5.0,
          "special": null
        },
        {
          "name": "Pendulum squat",
          "equipment": "Pendulum squat",
          "sets": 2,
          "reps": "8",
          "rir": "1",
          "restSec": 180,
          "alternative": "Perfect squat / belt squat",
          "note": "2 x 8; aumenta solo con entrambe solide.",
          "fixedMin": 0,
          "estimatedMin": 6.2,
          "special": null
        },
        {
          "name": "Pressa 45 gradi carico dischi",
          "equipment": "Pressa 45 gradi plate-loaded",
          "sets": 2,
          "reps": "12",
          "rir": "1",
          "restSec": 180,
          "alternative": "Pressa orizzontale",
          "note": "2 x 12, ROM costante.",
          "fixedMin": 0,
          "estimatedMin": 6.3,
          "special": null
        },
        {
          "name": "Leg extension massima inclinazione",
          "equipment": "Leg extension inclinabile",
          "sets": 2,
          "reps": "12",
          "rir": "0-1",
          "restSec": 90,
          "alternative": "Leg extension pacco pesi",
          "note": "2 set base; terza opzionale solo nelle prime settimane se recupero e panca restano ottimi.",
          "fixedMin": 0,
          "estimatedMin": 4.0,
          "special": null
        },
        {
          "name": "Leg curl carico dischi",
          "equipment": "Leg curl plate-loaded",
          "sets": 2,
          "reps": "10",
          "rir": "0-1",
          "restSec": 120,
          "alternative": "Leg curl pacco pesi",
          "note": "2 x 10 controllate.",
          "fixedMin": 0,
          "estimatedMin": 4.5,
          "special": null
        },
        {
          "name": "Standing leg curl",
          "equipment": "Matrix standing leg curl",
          "sets": 1,
          "reps": "15 / lato",
          "rir": "0-1",
          "restSec": 75,
          "alternative": "Leg curl unilaterale",
          "note": "Una serie per lato.",
          "fixedMin": 0,
          "estimatedMin": 1.8,
          "special": null
        },
        {
          "name": "Abductor",
          "equipment": "Matrix abductor",
          "sets": 1,
          "reps": "20",
          "rir": "0-1",
          "restSec": 60,
          "alternative": "-",
          "note": "Una serie da 20 controllata.",
          "fixedMin": 0,
          "estimatedMin": 1.5,
          "special": null
        }
      ],
      "estimatedMin": 29.3
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
          "estimatedMin": 3.0,
          "special": null
        },
        {
          "name": "Panca piana - Protocollo B",
          "equipment": "Panca piana + bilanciere",
          "sets": 0,
          "reps": "Panca B con fermo 2 s",
          "rir": "Da piano",
          "restSec": 0,
          "alternative": "Nessuna",
          "note": "Seconda esposizione specifica: tecnica/volume con fermo 2 s. Poi Upper resta a prevalenza dorsale.",
          "fixedMin": 18,
          "estimatedMin": 18.0,
          "special": "bench_upper"
        },
        {
          "name": "High row",
          "equipment": "Matrix high row",
          "sets": 2,
          "reps": "6-10",
          "rir": "1",
          "restSec": 180,
          "alternative": "T-bar row",
          "note": "Rif. 60 kg x 10 / 7; cerca 10 / 8 prima di salire.",
          "fixedMin": 0,
          "estimatedMin": 5.8,
          "special": null
        },
        {
          "name": "Lat machine - top + back-off",
          "equipment": "Matrix lat machine",
          "sets": 2,
          "reps": "Top 6-9 / back-off 8-12",
          "rir": "1",
          "restSec": 180,
          "alternative": "Trazioni assistite",
          "note": "S1 95 kg 6-9; S2 86 kg 8-12; 3 min.",
          "fixedMin": 0,
          "estimatedMin": 5.3,
          "special": null
        },
        {
          "name": "Reverse pec deck",
          "equipment": "Matrix",
          "sets": 2,
          "reps": "12-20",
          "rir": "0-1",
          "restSec": 75,
          "alternative": "Croci inverse ai cavi",
          "note": "Controllo completo.",
          "fixedMin": 0,
          "estimatedMin": 3.3,
          "special": null
        },
        {
          "name": "Alzate laterali",
          "equipment": "Cavo singolo o manubri",
          "sets": 1,
          "reps": "12-20",
          "rir": "1-2",
          "restSec": 75,
          "alternative": "Manubri / cavo",
          "note": "Una serie di default per contenere la durata; aggiungi una seconda solo se hai tempo e recuperi bene.",
          "fixedMin": 0,
          "estimatedMin": 3.8,
          "special": null
        }
      ],
      "estimatedMin": 38.0
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
          "estimatedMin": 5.0,
          "special": null
        },
        {
          "name": "Romanian deadlift",
          "equipment": "Multipower",
          "sets": 2,
          "reps": "6–10",
          "rir": "1–2",
          "restSec": 150,
          "alternative": "Manubri",
          "note": "Schiena neutra e tibie quasi verticali; niente cedimento.",
          "fixedMin": 0,
          "estimatedMin": 4.8,
          "special": null
        },
        {
          "name": "Hip thrust machine",
          "equipment": "Matrix hip thrust",
          "sets": 2,
          "reps": "6–10",
          "rir": "1",
          "restSec": 120,
          "alternative": "Multipower hip thrust",
          "note": "Pausa 1 s in massima estensione.",
          "fixedMin": 0,
          "estimatedMin": 4.3,
          "special": null
        },
        {
          "name": "Standing leg curl",
          "equipment": "Matrix standing leg curl",
          "sets": 2,
          "reps": "10–15 / lato",
          "rir": "0–1",
          "restSec": 75,
          "alternative": "Leg curl pacco pesi",
          "note": "Bacino stabile; conta 2 serie per lato.",
          "fixedMin": 0,
          "estimatedMin": 3.6,
          "special": null
        },
        {
          "name": "Belt squat",
          "equipment": "Matrix belt squat",
          "sets": 2,
          "reps": "8–12",
          "rir": "1–2",
          "restSec": 120,
          "alternative": "Perfect squat",
          "note": "Richiamo quad/glutei senza caricare la schiena.",
          "fixedMin": 0,
          "estimatedMin": 4.3,
          "special": null
        },
        {
          "name": "Abductor",
          "equipment": "Matrix abductor",
          "sets": 2,
          "reps": "15–25",
          "rir": "0–1",
          "restSec": 60,
          "alternative": "—",
          "note": "Controlla il ritorno.",
          "fixedMin": 0,
          "estimatedMin": 3.3,
          "special": null
        },
        {
          "name": "Calf raise",
          "equipment": "Multipower",
          "sets": 2,
          "reps": "8–12",
          "rir": "0–1",
          "restSec": 60,
          "alternative": "Pressa orizzontale",
          "note": "ROM completo e pausa.",
          "fixedMin": 0,
          "estimatedMin": 3.3,
          "special": null
        },
        {
          "name": "Curl Scott unilaterale",
          "equipment": "Panca Scott + manubrio",
          "sets": 2,
          "reps": "6-10 / lato",
          "rir": "1",
          "restSec": 120,
          "alternative": "Curl al cavo unilaterale",
          "note": "Braccia nella seduta Lower per non allungare Upper. Progressione doppia: prima reps, poi carico.",
          "fixedMin": 0,
          "estimatedMin": 4.3,
          "special": null,
          "historyKey": "Curl manubrio singolo alla Scott al contrario",
          "aliases": [
            "Curl manubrio singolo alla Scott al contrario",
            "Curl Scott unilaterale"
          ]
        },
        {
          "name": "Estensione tricipiti overhead al cavo",
          "equipment": "Cavo + corda",
          "sets": 2,
          "reps": "8-12",
          "rir": "1",
          "restSec": 90,
          "alternative": "Pushdown tricipiti",
          "note": "Braccia nella seduta Lower; controllo completo, niente cedimento forzato durante il blocco panca.",
          "fixedMin": 0,
          "estimatedMin": 3.8,
          "special": null,
          "historyKey": "Estensione tricipiti overhead al cavo",
          "aliases": [
            "Estensione tricipiti overhead al cavo"
          ]
        }
      ],
      "estimatedMin": 37.0
    }
  },
  "benchPlan": [
    {
      "week": 1,
      "phase": "Ripartenza / tecnica",
      "pushTop": "132,5 kg x 1 @7",
      "pushBackoff": "112,5 kg - 3x4",
      "pushRest": "4:00",
      "upperWork": "105 kg - 3x4, fermo 2 s",
      "upperRest": "3:30",
      "rpe": "7-8",
      "time": "18-22 min",
      "note": "Riparti con margine. Nessun set oltre RPE 8; priorita a fermo, traiettoria e velocita."
    },
    {
      "week": 2,
      "phase": "Accumulo",
      "pushTop": "135 kg x 1 @7-7,5",
      "pushBackoff": "115 kg - 3x4",
      "pushRest": "4:00",
      "upperWork": "105 kg - 3x5, fermo 2 s",
      "upperRest": "3:30",
      "rpe": "7-8",
      "time": "18-23 min",
      "note": "Aumenta soprattutto il lavoro utile, non la fatica. Se la singola supera RPE 8, non alzare i back-off."
    },
    {
      "week": 3,
      "phase": "Forza",
      "pushTop": "137,5 kg x 1 @7-7,5",
      "pushBackoff": "120 kg - 4x3",
      "pushRest": "4:00",
      "upperWork": "110 kg - 3x4, fermo 2 s",
      "upperRest": "4:00",
      "rpe": "7-8",
      "time": "20-25 min",
      "note": "Volume specifico piu pesante. Mantieni tutte le triple pulite e con fermo coerente."
    },
    {
      "week": 4,
      "phase": "Forza",
      "pushTop": "140 kg x 1 @<=8",
      "pushBackoff": "122,5 kg - 4x3",
      "pushRest": "4:30",
      "upperWork": "112,5 kg - 3x4, fermo 2 s",
      "upperRest": "4:00",
      "rpe": "7,5-8",
      "time": "21-26 min",
      "note": "Prima verifica: 140 deve essere controllata. Se e RPE 8,5+, riduci 2,5-5 kg nei back-off."
    },
    {
      "week": 5,
      "phase": "Intensificazione",
      "pushTop": "140 kg x 1 @7,5-8",
      "pushBackoff": "125 kg - 3x3",
      "pushRest": "4:30",
      "upperWork": "115 kg - 3x3, fermo 2 s",
      "upperRest": "4:00",
      "rpe": "7,5-8",
      "time": "19-24 min",
      "note": "Meno volume, piu specificita. Accessori di spinta ridotti; niente PR accessori."
    },
    {
      "week": 6,
      "phase": "Intensificazione",
      "pushTop": "142,5 kg x 1 @<=8,5",
      "pushBackoff": "127,5 kg - 3x2",
      "pushRest": "5:00",
      "upperWork": "117,5 kg - 3x3, fermo 2 s",
      "upperRest": "4:00",
      "rpe": "8-8,5",
      "time": "19-24 min",
      "note": "142,5 deve essere nettamente migliore del precedente 142,5 @9,5. Se supera RPE 8,5, scala i back-off."
    },
    {
      "week": 7,
      "phase": "Taper",
      "pushTop": "132,5 kg x 1 @6-7",
      "pushBackoff": "115 kg - 2x2",
      "pushRest": "4:00",
      "upperWork": "102,5 kg - 2x3, fermo 2 s",
      "upperRest": "3:30",
      "rpe": "6-7",
      "time": "14-18 min",
      "note": "Dissipa fatica. Upper puo stare tra 100 e 105 kg in base a recupero e velocita."
    },
    {
      "week": 8,
      "phase": "Test",
      "pushTop": "140 -> 145 -> 150 kg se consentito dall RPE",
      "pushBackoff": "Nessuno",
      "pushRest": "5:00",
      "upperWork": "Nessuna seconda panca prima del test",
      "upperRest": "-",
      "rpe": "8-10",
      "time": "20-30 min",
      "note": "Dopo warm-up: 140. Se <=RPE 8 prova 145; se 145 <=RPE 8 prova 150. Se 145 e RPE 8,5-9 considera 147,5. 152,5 solo con 150 pulita e <=RPE 8,5."
    }
  ],
  "benchStructured": {
    "1": {
      "push": [
        [
          "Top single",
          132.5,
          1,
          7.0
        ],
        [
          "Back-off 1",
          112.5,
          4,
          7.5
        ],
        [
          "Back-off 2",
          112.5,
          4,
          7.5
        ],
        [
          "Back-off 3",
          112.5,
          4,
          8.0
        ]
      ],
      "pushRest": 240,
      "upper": [
        [
          "Fermo 1",
          105,
          4,
          7.0
        ],
        [
          "Fermo 2",
          105,
          4,
          7.5
        ],
        [
          "Fermo 3",
          105,
          4,
          8.0
        ]
      ],
      "upperRest": 210
    },
    "2": {
      "push": [
        [
          "Top single",
          135,
          1,
          7.5
        ],
        [
          "Back-off 1",
          115,
          4,
          7.5
        ],
        [
          "Back-off 2",
          115,
          4,
          7.5
        ],
        [
          "Back-off 3",
          115,
          4,
          8.0
        ]
      ],
      "pushRest": 240,
      "upper": [
        [
          "Fermo 1",
          105,
          5,
          7.0
        ],
        [
          "Fermo 2",
          105,
          5,
          7.5
        ],
        [
          "Fermo 3",
          105,
          5,
          8.0
        ]
      ],
      "upperRest": 210
    },
    "3": {
      "push": [
        [
          "Top single",
          137.5,
          1,
          7.5
        ],
        [
          "Back-off 1",
          120,
          3,
          7.5
        ],
        [
          "Back-off 2",
          120,
          3,
          7.5
        ],
        [
          "Back-off 3",
          120,
          3,
          8.0
        ],
        [
          "Back-off 4",
          120,
          3,
          8.0
        ]
      ],
      "pushRest": 240,
      "upper": [
        [
          "Fermo 1",
          110,
          4,
          7.0
        ],
        [
          "Fermo 2",
          110,
          4,
          7.5
        ],
        [
          "Fermo 3",
          110,
          4,
          8.0
        ]
      ],
      "upperRest": 240
    },
    "4": {
      "push": [
        [
          "Top single",
          140,
          1,
          8.0
        ],
        [
          "Back-off 1",
          122.5,
          3,
          7.5
        ],
        [
          "Back-off 2",
          122.5,
          3,
          7.5
        ],
        [
          "Back-off 3",
          122.5,
          3,
          8.0
        ],
        [
          "Back-off 4",
          122.5,
          3,
          8.0
        ]
      ],
      "pushRest": 270,
      "upper": [
        [
          "Fermo 1",
          112.5,
          4,
          7.5
        ],
        [
          "Fermo 2",
          112.5,
          4,
          7.5
        ],
        [
          "Fermo 3",
          112.5,
          4,
          8.0
        ]
      ],
      "upperRest": 240
    },
    "5": {
      "push": [
        [
          "Top single",
          140,
          1,
          8.0
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
          8.0
        ],
        [
          "Back-off 3",
          125,
          3,
          8.0
        ]
      ],
      "pushRest": 270,
      "upper": [
        [
          "Fermo 1",
          115,
          3,
          7.5
        ],
        [
          "Fermo 2",
          115,
          3,
          7.5
        ],
        [
          "Fermo 3",
          115,
          3,
          8.0
        ]
      ],
      "upperRest": 240
    },
    "6": {
      "push": [
        [
          "Top single",
          142.5,
          1,
          8.5
        ],
        [
          "Back-off 1",
          127.5,
          2,
          7.5
        ],
        [
          "Back-off 2",
          127.5,
          2,
          8.0
        ],
        [
          "Back-off 3",
          127.5,
          2,
          8.0
        ]
      ],
      "pushRest": 300,
      "upper": [
        [
          "Fermo 1",
          117.5,
          3,
          7.5
        ],
        [
          "Fermo 2",
          117.5,
          3,
          8.0
        ],
        [
          "Fermo 3",
          117.5,
          3,
          8.0
        ]
      ],
      "upperRest": 240
    },
    "7": {
      "push": [
        [
          "Top single",
          132.5,
          1,
          6.5
        ],
        [
          "Back-off 1",
          115,
          2,
          6.5
        ],
        [
          "Back-off 2",
          115,
          2,
          7.0
        ]
      ],
      "pushRest": 240,
      "upper": [
        [
          "Fermo 1",
          102.5,
          3,
          6.0
        ],
        [
          "Fermo 2",
          102.5,
          3,
          6.5
        ]
      ],
      "upperRest": 210
    },
    "8": {
      "push": [
        [
          "Check 140",
          140,
          1,
          8.0
        ],
        [
          "Tentativo 145",
          145,
          1,
          8.5
        ],
        [
          "Tentativo 150 - solo se ok",
          150,
          1,
          9.0
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
      "pushUpper": "Panca prioritaria; incline max 2 set RIR 2, pec fly 1 set. Upper: panca B poi dorso.",
      "other": "PPL e Lower normali; Lower include 2 set bicipiti + 2 tricipiti.",
      "goal": "Ripartire con qualita",
      "note": "Niente cedimento sui press; recuperi panca completi."
    },
    {
      "week": 2,
      "pushUpper": "Stessa struttura W1; non aggiungere volume extra di petto.",
      "other": "Accessori a volume base; braccia in Lower.",
      "goal": "Accumulo",
      "note": "La progressione viene dal lavoro specifico, non da piu esercizi."
    },
    {
      "week": 3,
      "pushUpper": "Panca A piu densa; Upper ancora focus dorsale dopo Panca B.",
      "other": "Mantieni logbook ma evita grinder sistemici.",
      "goal": "Costruire forza",
      "note": "Se la panca rallenta, taglia prima pec fly/laterali."
    },
    {
      "week": 4,
      "pushUpper": "Incline 1-2 set, shoulder press 1-2 set; pec fly opzionale.",
      "other": "Volume base con RIR 1-2.",
      "goal": "Consolidare 140",
      "note": "140 non e un test massimale: deve restare <=RPE 8."
    },
    {
      "week": 5,
      "pushUpper": "Incline 1 set, shoulder press 1 set, pec fly opzionale; tricipiti senza cedimento.",
      "other": "Mantieni, senza inseguire PR.",
      "goal": "Intensificazione",
      "note": "Riduci fatica accessoria prima di toccare il lavoro panca."
    },
    {
      "week": 6,
      "pushUpper": "Solo minimo efficace sugli accessori di spinta; Upper dorso invariato se recuperi bene.",
      "other": "RIR 1-2, niente cedimenti inutili.",
      "goal": "Rendere 142,5 controllabile",
      "note": "Se 142,5 supera RPE 8,5, scala il lavoro successivo."
    },
    {
      "week": 7,
      "pushUpper": "PUSH: 0-1 set incline/shoulder; niente pec fly se affaticato. Upper panca leggera + dorso.",
      "other": "Riduci di circa 25-35% il volume accessorio se senti fatica.",
      "goal": "Taper",
      "note": "Devi uscire dalla settimana piu fresco di come sei entrato."
    },
    {
      "week": 8,
      "pushUpper": "Test panca: dopo il test chiudi o fai solo accessori facili. Nessuna seconda panca prima del test.",
      "other": "Sedute non specifiche leggere e lontane dal cedimento.",
      "goal": "Esprimere la forza",
      "note": "I tentativi dipendono dall RPE: 150 non e obbligatorio."
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
  "title": "Panca Forza 8W + PPL / Upper / Lower",
  "subtitle": "Ciclo forza panca 8 settimane, preceduto da intensificazione + scarico; Upper focus dorsale e Lower + braccia.",
  "weeks": 8,
  "referenceBench1RM": 145,
  "preCycle": [
    {
      "step": 1,
      "appliesTo": "bench_push",
      "phase": "Ponte - ultima intensificazione",
      "target": "140 kg x 1 + 127,5 kg - 2x2",
      "rpe": "8-8,5",
      "rest": "4-5 min",
      "note": "Singola con fermo chiaro. Se 140 e gia RPE 9, passa a 125 kg nei back-off. Niente test a 145 kg.",
      "sets": [
        [
          "Singola ponte",
          140,
          1,
          8.0
        ],
        [
          "Back-off 1",
          127.5,
          2,
          8.0
        ],
        [
          "Back-off 2",
          127.5,
          2,
          8.0
        ]
      ],
      "restSec": 240
    },
    {
      "step": 2,
      "appliesTo": "bench_push",
      "phase": "Ponte - scarico",
      "target": "107,5-110 kg - 2x4 con fermo 2 s",
      "rpe": "5-6",
      "rest": "3 min",
      "note": "Scarico tecnico prima del nuovo blocco. Se sei affaticato usa 107,5 kg; se sei fresco 110 kg. Dimezza anche la fatica degli accessori di spinta.",
      "sets": [
        [
          "Fermo 2 s - 1",
          110,
          4,
          6.0
        ],
        [
          "Fermo 2 s - 2",
          110,
          4,
          6.0
        ]
      ],
      "restSec": 180
    }
  ]
};
