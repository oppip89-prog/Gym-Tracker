# Formato scheda importabile - Gym Tracker v7

La v7 continua ad accettare le schede `gym-tracker-program` con `schemaVersion: 1`.

## Struttura minima

```json
{
  "type": "gym-tracker-program",
  "schemaVersion": 1,
  "program": {
    "title": "Nome programma",
    "subtitle": "Descrizione breve",
    "weeks": 1,
    "startWeek": 1,
    "splitOrder": ["PUSH", "PULL"],
    "workouts": {
      "PUSH": {"name": "PUSH", "exercises": []},
      "PULL": {"name": "PULL", "exercises": []}
    }
  }
}
```

## Campi esercizio

- `name`: nome mostrato.
- `historyKey`: chiave stabile che collega l'esercizio allo storico anche dopo rinomina.
- `aliases`: nomi storici equivalenti opzionali.
- `equipment`: attrezzatura.
- `sets`: numero di serie.
- `reps`: target, ad esempio `6-10`.
- `rir`: target, ad esempio `1` o `0-1`.
- `restSec`: recupero.
- `loadStepKg`: incremento minimo esplicito. Se manca, la v7 prova a dedurlo dallo storico.
- `initialKg`: fallback quando non esiste storico.
- `autoLoad`: `true` di default.
- `loadDirection`: `higher-is-harder` (default) oppure `lower-is-harder` per esercizi assistiti.
- `alternative`, `note`, `fixedMin`: opzionali.

Esempio:

```json
{
  "name": "Trazioni assistite",
  "historyKey": "Trazioni assistite",
  "equipment": "Macchina assistita",
  "sets": 1,
  "reps": "MAX tecnico",
  "rir": "0-1",
  "restSec": 150,
  "loadStepKg": 2.5,
  "loadDirection": "lower-is-harder",
  "autoLoad": true
}
```

## plannedSets
Per protocolli prescritti puoi usare `plannedSets`. I kg prescritti hanno priorita sul motore automatico.

```json
{
  "name": "Panca pausa",
  "reps": "3",
  "plannedSets": [
    {"label": "1", "kg": 120, "reps": 3, "metric": "RPE", "metricValue": 8},
    {"label": "2", "kg": 120, "reps": 3, "metric": "RPE", "metricValue": 8}
  ]
}
```

## Pacchetto portabile v7
L'app esporta `gym-tracker-program-package` `schemaVersion: 3`. Contiene `program`, `history`, `currentWeek`, `preCycleStep` e le impostazioni essenziali. `preCycleStep` permette di trasferire anche lo stato delle esposizioni ponte del ciclo panca. Va importato dalla funzione "Importa scheda / pacchetto".

## Nota sui macchinari
Se due macchine hanno scale non confrontabili, usa `historyKey` differenti. Se sono la stessa macchina rinominata, conserva lo stesso `historyKey` o aggiungi il vecchio nome in `aliases`.

## Campi v7.1 opzionali

Ogni esercizio può ora includere:

```json
{
  "exerciseId": "lat-machine-matrix",
  "movementId": "vertical-pull",
  "loadStepKg": 4.5,
  "loadDirection": "higher-is-harder",
  "progression": {
    "sets": [
      {"minReps": 6, "maxReps": 9},
      {"minReps": 8, "maxReps": 12}
    ]
  }
}
```

- `exerciseId`: identifica la variante precisa e separa i carichi tra macchine/esercizi diversi.
- `movementId`: collega varianti dello stesso schema di movimento per analisi aggregate.
- `loadStepKg`: scatto reale dell'attrezzatura; può anche essere impostato dall'interfaccia.
- `loadDirection`: `higher-is-harder` oppure `lower-is-harder` (utile per esercizi assistiti).
- `progression.sets`: consente target reps diversi per ciascun set. Se omesso, v7.1 riconosce anche stringhe come `Top 6-9 / back-off 8-12`.

Le vecchie schede restano compatibili: se questi campi mancano, l'app li deduce automaticamente.

## Estensioni v7.2 — Exercise Memory

La scheda continua a funzionare con il formato precedente. Sono supportati anche questi campi opzionali per ogni esercizio:

- `exerciseId`: identificatore della specifica variante/macchina;
- `movementId`: famiglia del movimento, utile per le sostituzioni;
- `gym`: palestra o variante della macchina;
- `loadMode`: `total`, `per-hand` oppure `assistance`;
- `loadStepKg`: incremento reale utilizzabile;
- `initialKg`: carico iniziale se non esistono storico o riferimento personale.

Il database personale non deve essere inserito nella scheda: viene esportato automaticamente nei backup completi e nei pacchetti portabili v7.2 tramite il campo `exerciseCatalog`.
