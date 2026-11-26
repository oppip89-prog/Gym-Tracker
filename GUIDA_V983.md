# GymTracker 9.8.3 - Round Sport

## Novita

Menu a sei icone circolari, sfondo nero, colori distinti e navigazione ottimizzata per un display rotondo. Il menu apre Serie (compresi i warm-up), Recupero, Battito, Attivita, Progresso e Termina. Il quadrante cardiaco usa le zone indicative 40-70%, 70-85%, 85-100% della FC massima di riferimento impostata sul telefono. Non sono soglie cliniche; senza FC max configurata, non viene attribuita una zona.

## Sessione sportiva nativa

GymTracker usa il client Exercise di Wear OS Health Services, non una seconda sessione aperta nell'app Samsung Health. Richiede al dispositivo il tipo STRENGTH_TRAINING, WEIGHTLIFTING oppure WORKOUT (in ordine di preferenza, secondo le capacita restituite dal dispositivo). Richiede esclusivamente i tipi di dati supportati per quella sessione: battito istantaneo, statistiche cardiache native, calorie totali e passi. La durata attiva viene ricavata dallo stato della sessione nativa. I valori non disponibili sono indicati con un trattino. Media, minimo e massimo dei battiti possono essere ricavati dai campioni disponibili se non sono disponibili statistiche native; nessun valore e inventato. Le calorie totali includono il metabolismo basale e non sono calorie attive. Non e garantito che Samsung Health utilizzi gli stessi algoritmi o mostri gli stessi risultati.

Non avviare contemporaneamente una registrazione di allenamento in Samsung Health o altre app sportive: Wear OS consente una sola sessione di esercizio attiva. Se viene rilevata una sessione concorrente, GymTracker non tenta di interromperla. ECG, pressione, SpO2, stress, Energy Score e algoritmi proprietari Samsung non sono implementati in questa versione.

## Primo utilizzo

1. Esporta un backup JSON aggiornato sul telefono. Mantieni il repository privato: include dati personali nel backup originale.
2. Carica il contenuto del progetto nella root del repository GitHub (compresa .github). Esegui il workflow Build Gym Tracker Phone + Galaxy Watch 6. Scarica l'artefatto GymTracker-v9.8.3-GalaxyWatch6 con i due APK. Non serve GitHub Pages.
3. Installa entrambi gli APK dello stesso build. La chiave di firma deve coincidere anche con quella della versione gia installata per aggiornare senza cancellare i dati. Il workflow supporta la chiave persistente tramite il secret GYMTRACKER_DEBUG_KEYSTORE_BASE64; vedi GUIDA_GALAXY_WATCH6.md. Non disinstallare prima di avere verificato il backup.
4. Apri l'app sul Watch, concedi i permessi richiesti per sensori e notifiche. Sul telefono abilita l'apertura automatica del Watch, l'avvio automatico dei sensori e l'esportazione automatica. Imposta la FC max di riferimento se nota; le zone sono orientative.
5. In Connessione Salute concedi a GymTracker i permessi di scrittura e lettura necessari per allenamenti, battito e calorie totali. Consenti a Samsung Health la lettura dei dati pertinenti in Connessione Salute. Dopo l'aggiornamento puo essere necessario autorizzare il nuovo tipo di dato calorie totali.
6. Apri GymTracker sul telefono e avvia una scheda. Il Watch riceve la richiesta di apertura e avvia la sessione sportiva quando riceve la seduta. Se Wear OS impedisce l'apertura automatica, usa la notifica o apri GymTracker sul Watch. Prima dell'allenamento verifica la dicitura Sensori attivi. Attendi il rilevamento cardiaco effettivo.
7. Al termine usa Termina e salva sul Watch. Il servizio tenta di concludere la sessione nativa e inviare i dati finali prima del comando di salvataggio. Lascia i dispositivi connessi finche il salvataggio risulta confermato. Non terminare forzatamente le app durante la sincronizzazione.
8. Controlla lo storico GymTracker: la conferma di esportazione si riferisce alla lettura di verifica in Health Connect, non alla visualizzazione in Samsung Health. Controlla separatamente Samsung Health. Se i permessi o la sincronizzazione non sono disponibili, l'esportazione puo rimanere in coda.

## Collaudo consigliato

Esegui una seduta breve senza un altro allenamento attivo. Verifica warm-up, serie, timer anche a schermo spento, variazione BPM, durata, calorie e passi se supportati. Termina dal Watch e verifica i risultati sul telefono e poi in Connessione Salute e Samsung Health. Ripeti con temporanea disconnessione per verificare il recupero della coda. I dati mancanti devono restare non disponibili, non diventare zero. La comparsa di un dato in Health Connect non garantisce che Samsung Health lo importi.

## Stato

Progetto sorgente, non APK compilati. Test JavaScript locali: controlli della persistenza, dei backup, del protocollo Watch, del warm-up, dell'esportazione automatica e delle nuove metriche native. Compilazione Android e collaudo su Galaxy Watch 6 ancora da effettuare. L'anteprima HTML e illustrativa, non uno screenshot del dispositivo.
