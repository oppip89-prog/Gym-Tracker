# Gym Tracker v7.1 — Smart Load 3 + Panca Dashboard

Questa versione mantiene il ciclo panca forza 8 settimane della v7 e ne migliora il motore dati, la progressione e la robustezza.

## Correzioni importanti
- Corretto il selettore RPE: 8,5 e 9,5 vengono selezionati e mostrati correttamente.
- `Azzera tutti i dati` salva uno stato vuoto esplicito: lo storico seed non ricompare al riavvio.
- `Copia ultima performance` è disabilitato per panca programmata e set prescritti.
- Migrazione diretta compatibile con la stessa chiave localStorage usata dalle versioni precedenti, inclusa v4.

## Ciclo automatico W1 → W8
- L'app registra l'inizio della settimana di programma.
- Quando PUSH, PULL, LEGS, UPPER e LOWER risultano completati al 100%, propone il passaggio alla settimana successiva.
- Puoi confermare il passaggio o restare volontariamente nella settimana corrente.
- In W8 propone la chiusura del blocco invece di creare una W9 inesistente.

## Smart Load 3 — set-aware
- Top set e back-off possono progredire in modo indipendente.
- `Top 6-9 / back-off 8-12` viene interpretato con due range distinti.
- I set `MAX tecnico` ora usano andamento reps + RIR/RPE per decidere mantenimento, aumento o riduzione.
- Restano attive le protezioni contro aumenti impulsivi e contro deload basati su una singola giornata negativa.

## Identità esercizi e sostituzioni
- Ogni variante usa un `exerciseId` proprio per i carichi e lo storico specifico.
- Esercizi dello stesso schema condividono un `movementId` per analisi aggregate.
- Una sostituzione Lat Machine → Trazioni assistite non eredita più i kg della Lat Machine.
- CSV e pacchetti portabili conservano anche ExerciseId e MovementId.

## Trazioni assistite
- Meno assistenza = progresso in PR, grafici e trend.
- L'e1RM classico è disattivato sugli esercizi assistiti.
- I messaggi PR parlano correttamente di riduzione dell'assistenza.

## Dashboard Forza Panca
La voce `Panca piana — globale` unisce Panca A e Panca B e mostra:
- singole e lavoro con fermo;
- carico;
- volume;
- RPE della singola;
- e1RM RPE-adjusted (usa reps + RIR/RPE);
- confronto RPE allo stesso carico quando disponibile;
- velocità percepita della singola.

Durante i set panca puoi registrare la velocità percepita come `Veloce`, `Fluida`, `Lenta` o `Grinder`.

## Step carichi personalizzati
In Altro → Step carichi personalizzati puoi impostare lo scatto reale di ogni macchina o manubrio (es. 4,5 kg, 7 kg, 2 kg). Se lasci vuoto, l'app usa la deduzione automatica dallo storico e dal tipo di attrezzatura.

## Import / export
- CSV: include carico consigliato, ExerciseId, MovementId e velocità percepita.
- Backup JSON: conserva l'intero stato.
- Pacchetto scheda + storico: conserva Smart Load, step personalizzati e posizione nel ciclo.

## Migrazione da v4
Se il localStorage contiene ancora il vecchio campo `program` della v4, v7.1:
1. conserva integralmente lo storico;
2. archivia la vecchia scheda nella Libreria come `Scheda precedente v4`;
3. attiva il nuovo programma base v7.1 con ponte intensificazione/scarico e W1/8.

Questo evita che il vecchio piano panca resti accidentalmente attivo dopo l'aggiornamento.
