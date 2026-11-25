# Gym Tracker 9.5.1 + Galaxy Watch 6

## Cosa e incluso

Sono presenti **due app Android** nello stesso progetto Gradle:

- `:app`: Gym Tracker per telefono (WebView originale + bridge Wear OS).
- `:wear`: Gym Tracker Watch 6 (app nativa per Wear OS).

Sullo smartwatch puoi modificare **kg e ripetizioni**, confermare ogni serie,
controllare il timer di recupero e accedere con swipe laterale alle pagine
**Battito**, **Calorie** e **Riepilogo**.

### Come funzionano i dati

Lo storico e Smart Load restano nel telefono. Il Watch riceve un riassunto della
seduta in corso via Wear OS Data Layer. Il carico suggerito proviene dalla tua
scheda, inclusi i profili distinti per le macchine delle sedi FitActive. Ogni
conferma usa un identificativo univoco: anche quando il collegamento si interrompe
il Watch memorizza la serie e la ritrasmette. L'app sul telefono la registra
usando **le stesse funzioni di Gym Tracker**: `updateSetField()` e `completeSet()`.

Una serie visualizzata sul Watch mentre c'e una disconnessione e **in attesa di
conferma definitiva**: non e ancora nello storico locale del telefono. Solo lo
stato `applied` significa che e stata registrata nel database locale della app.

### Le cinque pagine

1. **Serie**: esercizio attivo, serie progressiva, step del carico specifico,
   kg +/- , ripetizioni +/- e CONFERMA SERIE.
2. **Recupero**: countdown con vibrazione, `+30 s` e `Salta`.
3. **Battito**: lettura diretta dal sensore cardio solo con permesso e pagina
   in primo piano. Non equivale a una registrazione continua con Samsung Health.
4. **Calorie**: pagina predisposta, ma **nessuna lettura calorica attiva** in
   questa prima versione. Non viene mostrata una stima artificiale.
5. **Riepilogo**: avanzamento serie e stato della coda offline.

Per cambiare pagina, fai uno swipe **orizzontale** sul display del Watch. Lo
scroll verticale rimane disponibile per le schermate piu lunghe.

## Come creare gli APK

Non usare semplicemente il file ZIP come un'APK: sono sorgenti.

1. Crea una repository GitHub privata e carica **tutta** la cartella del
   progetto, includendo `.github/workflows/build-android-apk.yml`.
2. Da **Actions > Build Gym Tracker Phone + Galaxy Watch 6 > Run workflow**,
   avvia la compilazione.
3. Scarica l'artefatto `GymTracker-v9.5.1-GalaxyWatch6` con i due APK.
4. Trasferisci l'APK **Phone** sul telefono Android e l'APK **Watch** sul
   Galaxy Watch 6 (tramite la procedura di installazione locale Wear OS, ADB
   wireless oppure Android Studio).
5. Accoppia normalmente il Watch 6 allo smartphone tramite Galaxy Wearable,
   apri Gym Tracker sul telefono e avvia un allenamento; apri Gym Tracker Watch.
6. Prova con una sessione di test: cambia un carico, conferma una serie e
   verifica sul telefono che carico, ripetizioni, timer e storico siano corretti.

**Importante sulla firma**: le due app devono essere firmate con lo **stesso
certificato** e avere lo stesso `applicationId` (gia configurato). La build
GitHub crea entrambi gli APK debug nello stesso job e usa lo stesso certificato
in quella build. Un job successivo puo pero avere una chiave debug **diversa**.
Per aggiornamenti normali senza disinstallazione bisogna impostare una chiave di
firma release stabile, conservata nei GitHub Secrets; non caricare la chiave
privata in repository.

**Backup obbligatorio**: prima di installare, esporta **Backup JSON** dall'app
Gym Tracker *attualmente installata*. Il pacchetto contiene lo snapshot del **25/11/2026 alle 14:45**
(**52 allenamenti completati**, nessuna sessione aperta): non deve
sovrascrivere gli allenamenti piu recenti! Se il nuovo APK non puo aggiornare
la vecchia firma, fai prima un backup verificato, poi installa e ripristina.
Non disinstallare l'app prima di avere salvato e controllato il backup.

## Collaudo e limiti

Nel pacchetto sono inclusi test JavaScript in `tests/watch-bridge.test.cjs`.
Non sono stati compilati APK in questo ambiente, dove Android SDK e Gradle
non sono disponibili. La build e il comportamento reale su Galaxy Watch 6,
compresa la gestione dell'app Android in background e le autorizzazioni sensore,
vanno verificati sul dispositivo. La schermata Calorie rimane predisposta per
una integrazione futura con Health Services, non dichiarata come funzionante.

## Risoluzione problemi

- **Nessuna sessione**: avvia prima una seduta sul telefono, apri entrambe le
  app almeno una volta, verifica Bluetooth e Galaxy Wearable.
- **Serie in attesa**: apri Gym Tracker sul telefono, perche il bridge web
  deve applicare gli eventi offline alla sessione originale. Non ripetere
  le conferme manualmente mentre risultano in coda.
- **Errore sessione differente**: una seduta sul telefono e stata cambiata,
  terminata o scartata; il comando viene rifiutato per evitare dati errati.
- **Carichi diversi tra FitActive**: provengono dal profilo macchina della
  scheda sul telefono, non da un calcolo del Watch.
- **Battito assente**: autorizza la lettura del sensore nella relativa pagina.
  La disponibilita dipende dal firmware Samsung/Wear OS.
- **Installazione non riuscita**: verifica che siano APK per il dispositivo
  corretto, la firma e l'abilitazione dell'installazione locale.

Privacy: nessun server, account o upload a servizi cloud e stato aggiunto.
Lo scambio avviene fra dispositivi associati via Wear OS Data Layer.
I file `history_seed.js` contengono storico personale: repository **privata**.

## Backup aggiornato 25/11/2026

- Alla prima installazione senza stato precedente, il dataset iniziale e gia
  aggiornato a 52 allenamenti con settimana 3 e nessuna sessione aperta.
- Su un telefono che ha gia Gym Tracker, l'aggiornamento conserva lo stato
  presente, **non carica automaticamente lo snapshot incorporato**.
- Puoi importare `backups/gym-tracker-backup-2026-11-25-v951-importabile.json`
  dalle impostazioni dell'app, ma solo dopo aver esportato una nuova copia
  di sicurezza e aver controllato che non ci siano sessioni piu recenti.
- La copia byte-identica del file ricevuto e in
  `backups/gym-tracker-backup-2026-11-25-originale.json`.
- Prima di aggiornare gli APK controlla la firma dell'installazione esistente:
  se differente, Android blocca l'aggiornamento e potrebbe essere necessario
  disinstallare; in tal caso **non disinstallare** senza aver verificato il
  backup e l'accesso al file esportato.
