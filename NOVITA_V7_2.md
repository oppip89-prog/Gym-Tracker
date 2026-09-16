# Gym Tracker v7.2 — Exercise Memory + Smart Load 4

## Database personale esercizi e carichi

La v7.2 introduce un database locale persistente per ogni esercizio/macchina/variante. Ogni profilo può memorizzare:

- nome esercizio;
- palestra / variante macchina;
- attrezzatura;
- `exerciseId` specifico;
- `movementId` comune alle varianti dello stesso movimento;
- modalità carico: kg totali, kg per manubrio, kg assistenza;
- step reale della macchina/manubrio;
- riferimento personale (kg, reps e RIR opzionale);
- storico reale proveniente dalle sessioni.

Una Lat Machine, una Trazione assistita e un Pulldown possono essere collegati allo stesso movimento senza condividere carichi incompatibili. Anche due macchine Belt Squat in palestre diverse possono avere profili e carichi separati.

### Riferimento Belt Squat iniziale

Per questa build personale è registrato:

- Belt Squat: **200 kg × 6 reps**;
- RIR non specificato, quindi la stima viene trattata in modo prudente;
- il riferimento manuale più recente ha priorità sui vecchi dati finché non viene registrata una nuova seduta reale su quella specifica variante.

## Smart Load 4

Quando manca uno storico recente di un esercizio, Smart Load può ora partire dal riferimento personale e convertirlo nel range/RIR richiesto dalla scheda.

Esempio: un riferimento 200 × 6 viene trasformato in un carico coerente con un target 8–12 @RIR 1–2, arrotondato allo step reale della macchina.

Dopo una nuova sessione reale, lo storico più recente torna ad avere priorità sul riferimento manuale.

## Trasformatore carichi / e1RM

Nuovo strumento in **Altro → Trasformatore carichi**.

Inserendo:

- carico noto;
- reps eseguite;
- RIR del set;
- reps target;
- RIR target;
- step disponibile;

l'app calcola:

1. e1RM con formula Epley RIR-adjusted;
2. carico teorico per le reps target;
3. carico realmente utilizzabile, arrotondato allo step disponibile.

Esempio: **20 kg/manubrio × 5 @RIR 0** → e1RM ≈ **23,3 kg/manubrio**. Per **8 reps @RIR 2**, con step da 2 kg, il suggerimento è circa **18 kg/manubrio**.

## Esercizi e serie fuori scheda

Durante una sessione è disponibile **+ Aggiungi esercizio alla sessione**.

Puoi:

- scegliere un esercizio dal database;
- recuperare automaticamente il suo riferimento e lo storico;
- impostare serie, reps target, RIR e recupero;
- creare al volo un esercizio/macchina nuova;
- storicizzarlo anche se non era previsto dalla scheda.

È inoltre possibile aggiungere **serie extra** anche agli esercizi prescritti, inclusa la panca programmata. Le serie extra non modificano l'autoregolazione delle serie target della panca.

## Sostituzioni migliorate

Il menu **Sostituisci** mostra prima le varianti dello stesso `movementId` già presenti nel database e indica il riferimento disponibile. È possibile anche cercare in tutto il database.

Questo rende pratico cambiare esercizio quando:

- una macchina è occupata;
- ti alleni in una palestra diversa;
- una palestra usa una macchina con scala di carico differente.

## Backup e portabilità

Il backup completo e il pacchetto portabile includono ora anche `exerciseCatalog`, quindi riferimenti personali, palestra, macchina e step dei carichi viaggiano insieme a scheda e storico.

Il CSV storico v7.2 aggiunge Palestra, Attrezzatura e LoadMode mantenendo la compatibilità con i CSV precedenti.
