# GymTracker v9.8.2 - Galaxy Watch 6 + Health Coach

**Progetto sorgente Android per generare due APK nativi, non GitHub Pages.**

Aggiornamento 9.8.2: quadrante delle zone cardiache, apertura remota del Watch, avvio automatico dei sensori e esportazione automatica con verifica in Health Connect. Vedi `GUIDA_V982.md`. Mantiene tutte le migliorie UI, warm-up, recupero e chiusura dal polso della 9.8.1.

La nuova versione integra Health Services sul Watch, Health Connect sul telefono, riepilogo della seduta, dati di composizione corporea, sonno, passi, battito a riposo e Health Coach facoltativo. Leggi `GUIDA_V98.md` per configurazione, limiti, privacy, firma e collaudo.

Mantiene la scheda, lo storico e le funzioni della 9.5.1. Il backup del 25/11/2026 con 52 allenamenti rimane intatto. Non sovrascrive uno stato locale valido gia presente.

**Prima di aggiornare: esporta il backup JSON dal telefono. Usa esclusivamente un repository privato.** Questo progetto include dati personali incorporati nel seed e nella cartella backups.

## Dati e backup di partenza

La base storica e stata aggiornata dal backup **Gym Tracker 9.4.0 esportato
il 25/11/2026**, che mantiene tutte le modifiche precedenti e i dati originali:

- **52 allenamenti completati** conservati con serie, carichi, RPE/RIR, nomi, date e palestre, dove presenti.
- **Sessione LOWER del 20 novembre completata** nel backup originale; ora non ci sono sessioni aperte.
- **1 programma PPLUL di 15 settimane**, libreria schede, parametri personali e riferimenti manuali conservati.
- **5 sedi FitActive** e **140 profili esercizio** dopo l'ampliamento del catalogo e i due nuovi profili specifici Botticelli.
- Per gli esercizi e le macchine ancora mai utilizzati non sono stati inventati kg, e1RM o serie svolte.

## Inventario attrezzature confermate / gia presenti nel backup

Il nuovo menu `Palestre > Configura attrezzi` mostra un inventario indipendente dalle associazioni della scheda. Le voci note sono:

| Sede FitActive | Attrezzi registrati | Note |
| --- | --- | --- |
| Borgaro | Shoulder press Matrix a dischi; incline chest press Matrix; pec fly Matrix; lat machine Matrix; prone leg curl Matrix; shoulder press Matrix a pacco pesi | Le due shoulder press **sono diverse**, quindi hanno storico/carico distinto. |
| Pinerolo | Incline chest Technogym, shoulder press Technogym, pec fly Toorx, shoulder trainer Diamond, high row Panatta, Latzug Technogym | Dati preesistenti nell'app; vecchie sostituzioni errate ancora in lista di verifica. |
| Beinasco | Pec fly Matrix, shoulder press Toorx a dischi, decline chest Toorx, hack squat Toorx, multipower inclinato | La pec fly e stata confermata equivalente alle altre Matrix. |
| Torino Botticelli | Shoulder press Matrix a dischi, **chest press verticale Matrix (NON inclinata)**, pec fly Matrix, lat machine Matrix, **lat pulldown Toorx**, **castello cavi compatto Toorx** | Le due macchine Toorx sono distinte dalle Matrix. La chest verticale ha un profilo esclusivo senza carichi storici. |
| Grugliasco | Shoulder press Matrix a dischi, incline chest press Matrix, pec fly Matrix, lat machine Matrix | Modelli indicati dall'utente come identici a quelli delle altre sedi citate. |

La dotazione Matrix generale di Botticelli non e un elenco completo dei singoli modelli. **Nessun modello o carico ulteriore e stato desunto da fotografie o cataloghi online.** Le 27 voci sono un inventario delle informazioni note, non il numero totale delle macchine fisiche.

### Condivisione controllata dei carichi

Solo quando l'utente ha esplicitamente confermato macchine uguali vengono aggregati gli storici comparabili:

- **Shoulder press Matrix carico dischi:** Borgaro, Botticelli, Grugliasco.
- **Incline chest press Matrix:** Borgaro, Grugliasco.
- **Pec fly Matrix:** Borgaro, Beinasco, Botticelli, Grugliasco.
- **Lat machine Matrix:** Borgaro, Botticelli, Grugliasco.

La lat machine Technogym/altre macchine di Pinerolo, la lat pulldown Toorx e la chest press verticale Matrix di Botticelli non ereditano kg da varianti differenti. Lo storico senza sede rimane consultabile, ma **non alimenta i suggerimenti specifici di macchina**.

## Piano panca: settimana successiva corretta

Il nuovo backup indica settimana attiva **3**. Nella settimana **3** del programma 15W il vecchio carico di 122,5 kg e stato sostituito con **6 serie x 3 ripetizioni a 125 kg**, sia nel testo della scheda sia nei **sei set operativi** (compresi i back-off). Il recupero tra set resta 4 minuti. Le sedute concluse e i record di forza gia eseguiti non sono stati alterati.

Nuovo comando `Scheda > Piano panca modificabile > Modifica` per modificare peso, serie, ripetizioni e recupero di ogni settimana dei protocolli A/PUSH e B/UPPER. Le modifiche al piano sono persistenti, sincronizzate con la libreria del programma e hanno priorita rispetto agli offset preventivi dell'algoritmo RPE; resta possibile ridurre i back-off nella sessione per un RPE realmente eccessivo. Le altre settimane non sono state cambiate senza indicazioni.

## Funzioni della 9.3.0 mantenute

Catalogo di 87 esercizi guida aggiuntivi, editor schede, programmi Full Body/Upper-Lower/PPL, tecniche dropset/rest-pause/fermi/eccentriche controllate, storico e CSV, progressioni Smart Load 6.1, readiness, cronometro e controllo della durata. Le associazioni incoerenti del vecchio backup sono disattivate e conservate nella lista di verifica.

## Aggiornamento/trasferimento dati

**Prima di installare o aggiornare l'APK, esporta un backup JSON dalla versione attualmente installata.** Questa app salva dati in locale; firme APK differenti possono impedire l'installazione sopra la versione esistente. Non disinstallare senza backup: rischi di perdere allenamenti successivi a questo snapshot.

Lo snapshot storico incorporato risale al **25/11/2026, ore 14:45 italiane**:
**non ripristinarlo sopra dati piu recenti**. L'importazione completa JSON
sostituisce lo stato corrente. Trovi gli originali intatti in `backups/`,
insieme a un file v9.5.1 importabile. Il seed e soltanto per nuove installazioni.

La nuova build migra in automatico anche il vecchio stato locale quando viene avviata senza importazione, usando un marcatore di versione e senza cancellare lo storico.

## Compilazione dei due APK Android

1. Carica tutto il progetto (inclusa `.github`) nella root di una repository **privata**.
2. Apri **Actions > Build Gym Tracker Phone + Galaxy Watch 6 > Run workflow**.
3. Scarica il pacchetto `GymTracker-v9.8.2-GalaxyWatch6` contenente gli APK
   `GymTracker-Phone-v9.8.2.apk` e `GymTracker-Watch-v9.8.2.apk`.
4. Installa ciascun APK sul dispositivo corretto. Per aggiornare senza
   perdere dati serve una firma compatibile con la vecchia app.
5. Segui `GUIDA_V98.md` e `GUIDA_GALAXY_WATCH6.md` per backup, installazione e collaudo.

Stack: Java 17, Gradle 8.11.1, Android Gradle Plugin 8.10.1, Kotlin 2.2.21, compileSdk 36,
minSdk 26 (telefono), minSdk 30 (Watch), Wear OS Data Layer 20.0.1.
La build Android non e stata eseguita in questo ambiente: manca l'SDK Android.
I test disponibili del protocollo JavaScript si eseguono con
`node tests/watch-bridge.test.cjs`, `node tests/backup-integrity.test.cjs` e
`node tests/bootstrap-persistence.test.cjs` e `node tests/health-v98.test.cjs`. Il test reale sui dispositivi e ancora necessario.

## Privacy e condivisione

La cartella contiene `history_seed.js` e `backups/` con lo storico personale; **non condividere questo sorgente con amici**. In futuro si puo produrre una copia pulita senza cambiare la modalita di utilizzo o introdurre ruoli.

## Aggiornamento dati 25 novembre 2026

Leggi `REPORT_BACKUP_2026-11-25.md` per il confronto tra i 48 record precedenti
e i 52 attuali, le verifiche e la procedura di ripristino senza perdita dati.
Il test automatico `tests/backup-integrity.test.cjs` verifica che l'intero
snapshot incorporato corrisponda al backup fornito.
