# Gym Tracker v9.4.0 - FitActive / Schede, carichi, attrezzature

App personale per forza e ipertrofia (PWA + progetto Android). **Nessuna modalita utente limitata**: tutte le funzioni rimangono disponibili.

## Dati e backup di partenza

La versione 9.4.0 e stata migrata dal backup fornito il **20 novembre 2026 (Gym Tracker v9.2.1)**, non dal vecchio seed della 9.3.0:

- **48 allenamenti gia svolti** conservati con serie, carichi, RPE/RIR, nomi, date e palestre, dove presenti.
- **1 sessione LOWER ancora aperta**, avviata il 20 novembre; non e stata chiusa o completata automaticamente.
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

Il backup indicava settimana attiva **2**. Nella settimana **3** del programma 15W il vecchio carico di 122,5 kg e stato sostituito con **6 serie x 3 ripetizioni a 125 kg**, sia nel testo della scheda sia nei **sei set operativi** (compresi i back-off). Il recupero tra set resta 4 minuti. La seduta LOWER ancora aperta e i record di forza gia eseguiti non sono stati alterati.

Nuovo comando `Scheda > Piano panca modificabile > Modifica` per modificare peso, serie, ripetizioni e recupero di ogni settimana dei protocolli A/PUSH e B/UPPER. Le modifiche al piano sono persistenti, sincronizzate con la libreria del programma e hanno priorita rispetto agli offset preventivi dell'algoritmo RPE; resta possibile ridurre i back-off nella sessione per un RPE realmente eccessivo. Le altre settimane non sono state cambiate senza indicazioni.

## Funzioni della 9.3.0 mantenute

Catalogo di 87 esercizi guida aggiuntivi, editor schede, programmi Full Body/Upper-Lower/PPL, tecniche dropset/rest-pause/fermi/eccentriche controllate, storico e CSV, progressioni Smart Load 6.1, readiness, cronometro e controllo della durata. Le associazioni incoerenti del vecchio backup sono disattivate e conservate nella lista di verifica.

## Aggiornamento/trasferimento dati

**Prima di installare o aggiornare l'APK, esporta un backup JSON dalla versione attualmente installata.** Questa app salva dati in locale; firme APK differenti possono impedire l'installazione sopra la versione esistente. Non disinstallare senza backup: rischi di perdere allenamenti successivi a questo snapshot.

Il file consegnato a parte `gym-tracker-backup-2026-11-20-aggiornato-v9.4.0.json` e un backup pronto per l'importazione: contiene gli stessi 48 allenamenti e la sessione LOWER aperta con inventario e panca corretti. **Importalo solo se il telefono non contiene allenamenti piu recenti**, perche l'importazione completa sostituisce lo stato corrente.

La nuova build migra in automatico anche il vecchio stato locale quando viene avviata senza importazione, usando un marcatore di versione e senza cancellare lo storico.

## Compilazione APK Android

1. Carica il contenuto della cartella, inclusa `.github`, nella root di una repository GitHub.
2. Apri `Actions > Build Android APK > Run workflow`, oppure esegui commit su main/master.
3. Scarica l'artefatto `GymTracker-v9.4.0.apk` al termine della compilazione.
4. Installa/verifica l'app e usa `Importa backup JSON` soltanto se necessario.

Stack: Java 17, Gradle 8.9, Android Gradle Plugin 8.7.3, compileSdk 35, minSdk 26. Il file `fitactive_v94.js` e incluso nella build Android e nella PWA. **L'APK Android non e stato compilato direttamente in questa sessione**; sorgenti, script e schermate sono stati testati tramite Chromium/Playwright.

## Privacy e condivisione

La cartella contiene anche `history_seed.js` con la tua sessione e lo storico personale; **non condividere questo sorgente con amici**. In futuro si puo produrre una copia pulita senza cambiare la modalita di utilizzo o introdurre ruoli.
