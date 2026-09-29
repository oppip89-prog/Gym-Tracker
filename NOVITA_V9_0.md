# Gym Tracker v9.0 — Adaptive Coach + Smart Load 6

La v9.0 integra in un'unica release le funzioni evolute richieste dopo la v8.0, mantenendo la stessa chiave localStorage e la compatibilità con i backup precedenti.

## Novità principali

### Smart Load 6
- Usa storico recente, target reps/RIR/RPE, fase del programma, feedback dell'esercizio e trend delle ultime sedute.
- I feedback **Facile / Giusto / Pesante** diventano un segnale aggiuntivo per il carico successivo.
- Due feedback consecutivi "Pesante" provocano una riduzione prudenziale di uno step; un feedback pesante blocca aumenti non supportati.
- Il carico resta specifico per macchina/palestra quando i profili sono distinti.
- Le macchine ad assistenza mantengono la corretta direzione del carico.

### Profili palestra
- Restano le funzioni v8: palestra attiva, associazioni automatiche esercizio→macchina e storico separato per macchina.
- Due palestre possono condividere lo stesso profilo se la macchina è realmente identica.
- Gli esercizi universali possono restare condivisi tra tutte le palestre.

### Swap intelligente
- Le alternative vengono ordinate privilegiando stesso movimento, palestra attiva, profili già associati e varianti con storico.
- Dopo lo swap il carico viene ricalcolato usando lo storico della variante scelta.

### Warm-up automatico
- Genera serie di avvicinamento per gli esercizi pesati principali.
- I warm-up sono separati dalle serie allenanti: non alterano volume, progressione o PR.
- Il numero di serie di avvicinamento si adatta anche al tempo disponibile.

### Durata adattiva
- Prima della seduta puoi scegliere **30 / 45 / 60 / 75 minuti / Completo**.
- L'app mantiene gli esercizi prioritari e riduce prima serie/accessori meno importanti.
- La seduta salva il budget scelto e le eventuali riduzioni effettuate.

### Readiness opzionale
- Check-in giornaliero: sonno, energia e indolenzimento.
- Se compilato, può modulare leggermente volume e carichi accessori.
- È volutamente un indicatore euristico di programmazione, non una misura medica/fisiologica.

### Recupero e volume muscolare
- Home con indicatore euristico di recupero per gruppo muscolare.
- Conteggio delle serie equivalenti negli ultimi 7 giorni e confronto con i 7 giorni precedenti.
- Le serie di warm-up sono escluse.

### Statistiche esercizio e PR
- Analisi per esercizio con sedute registrate, serie/reps totali, trend recente, plateau, ultimo feedback e PR.
- Le nuove serie vengono marcate quando superano riferimenti precedenti di carico/e1RM/reps coerenti.

### Memoria macchina
- Il profilo esercizio mantiene palestra, attrezzatura, step di carico e note/setup.
- Utile per ricordare regolazioni, sedile, presa e dettagli di una macchina specifica.

### Backup e portabilità
- Pacchetto portabile aggiornato a schema 6 con palestre, readiness, impostazioni e storico.
- CSV include anche il feedback esercizio.
- I backup v7/v8 restano importabili e vengono migrati.

## Compatibilità dati

La chiave localStorage resta:

`gym_tracker_ppl_upper_lower_v1`

Quindi un normale aggiornamento dei file sulla stessa GitHub Pages **non cancella lo storico locale**. È comunque raccomandato esportare un backup completo prima dell'aggiornamento.
