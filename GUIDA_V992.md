# GymTracker 9.9.2 - Tempo reale di lavoro

## Cosa cambia

La pagina Oggi e dedicata a palestra, seduta, budget e ripresa della sessione. Non mostra piu il banner di installazione PWA. Conserva le icone Glossy 3D e mantiene accessibili biblioteca, palestre, storico, progressi e backup.

Il budget 45/60 minuti comprende esecuzione, recuperi tra le serie, preparazione/cambi attrezzo e un margine. Non comprende il riscaldamento. La stima e un modello, non una garanzia: occupazione degli attrezzi, conversazioni e tempi individuali possono allungare la permanenza.

Il modello legge i recuperi delle singole serie, non un tempo fisso per esercizio. Considera entrambi i lati degli esercizi unilaterali. Calibra il tempo aggiuntivo tra serie usando timestamp plausibili della stessa palestra: non utilizza durationMin come misura di apprendimento. Timestamp identici, intervalli eccessivi e sedute non plausibili sono esclusi. I dati originali dello storico non vengono corretti o cancellati.

## Adattamento a 45 minuti

Se la seduta stimata supera il budget, vengono ridotte prima le serie a minore priorita e omessi gli accessori dichiarati facoltativi prima di sacrificare esercizi piu importanti. Non vengono compressi i recuperi, cancellate serie gia eseguite o nascosti sforamenti del blocco minimo. Oggi mostra esattamente quali serie cambiano. Se un allenamento completo sta gia nei 45 minuti stimati, non viene accorciato inutilmente.

Cambiare budget durante una sessione imposta la PROSSIMA seduta: quella gia in corso non viene ricostruita, per proteggere dati e indici dei comandi Watch. Prima di iniziare, scegli il budget e verifica il riepilogo.

## Riscaldamento e cronometro

Il warm-up automatico viene generato solo per il primo esercizio allenante idoneo. Dopo questo, sono disponibili avvicinamenti facoltativi, non obbligatori su ogni macchina. Non saltare una preparazione specifica quando cambi movimento pesante, senti di esserti raffreddato o non conosci l'attrezzo. Le serie di warm-up non entrano nel conteggio delle serie allenanti.

Dopo il riscaldamento premi **Inizia serie allenanti** sul telefono oppure nel riepilogo del Watch. Il timer di lavoro comprende i recuperi. Per un avvicinamento aggiuntivo durante il lavoro, usa **Pausa lavoro**, poi **Riprendi**. Il timer dei sensori resta indipendente.

Se non premi avvio, il telefono stima l'inizio dalla prima serie allenante confermata e lo dichiara come stimato. Quando tutte le serie sono completate, il tempo di lavoro si ferma all'ultimo completamento. Se chiudi dal telefono oltre 15 minuti dopo l'ultima serie, l'app chiede se escludere la coda dimenticata dalla chiusura totale. Non conclude automaticamente una seduta incompleta.

Salute continua a ricevere la sessione totale dei sensori, comprensiva di riscaldamento. Il cronometro lavoro non modifica campioni cardiaci o calorie. Il Watch distingue TOTALE SENSORI da LAVORO; il riepilogo LAVORO e aggiornato dal telefono, non un nuovo cronometro autonomo offline.

## Progressione e schede

Le nuove schede possono attivare `progression.increaseOnlyWhenAllSetsAtTop` e `progressionKey`: l'incremento Smart Load e bloccato se non tutte le serie richieste della specifica progressione hanno raggiunto il limite alto con il RIR previsto. Una seduta abbreviata non autorizza da sola un aumento per la seduta completa.

`entryLoadKg` e una proposta editabile per la prima esposizione di quella progressione e palestra, non una prescrizione obbligatoria. Lo storico e conservato. Le schede senza questi campi mantengono la logica precedente. I vecchi protocolli strutturati della panca continuano a essere disponibili nelle schede salvate.

La sequenza Oggi e l'avanzamento settimana non confondono piu le sedute di due programmi diversi. Importare una nuova scheda non fa partire automaticamente dal punto lasciato nel vecchio programma.

## Installazione e dati

1. Esporta un backup completo esterno dall'app attualmente installata.
2. Estrai il progetto e aggiorna la radice del repository, inclusi `.github`, `android`, `wear`, `tests` e tutti i file JavaScript/CSS.
3. Mantieni il segreto di firma esistente. Non generare una nuova chiave se hai gia una firma persistente.
4. Dopo una build riuscita scarica gli APK Phone e Watch v9.9.2. Aggiorna entrambi per il comando avvio lavoro e i conteggi Watch.
5. Se l'aggiornamento mantiene i dati, importa solo la nuova scheda JSON da Scheda -> Importa scheda / pacchetto. Non ripristinare inutilmente un vecchio backup completo.
6. Il backup personale fornito separatamente sostituisce i dati locali con la fotografia della data di esportazione. Non contiene eventuali sedute successive. Non caricarlo nel repository e non distribuirlo agli amici.

Il progetto contiene sorgenti, non APK compilati. Il codice Kotlin di sensori ed esportazione e invariato rispetto alla 9.9.1. La build Android completa e il collaudo fisico restano necessari.
