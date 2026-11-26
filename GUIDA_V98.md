# GymTracker 9.8.1 | Galaxy Watch 6 + Samsung Health

Per le novità Watch della 9.8.1 e i test sul dispositivo, leggi anche `GUIDA_V981.md`.

## Stato della consegna

Progetto sorgente aggiornato dalla 9.5.1 corretta. NON contiene APK compilati.
I test JavaScript sono stati eseguiti, ma la compilazione Android e il collaudo
sui dispositivi non sono stati eseguiti in questo ambiente (SDK/Gradle assenti,
rete verso i repository Android non disponibile). La pipeline GitHub Actions
compila entrambi i moduli e verifica che abbiano lo stesso certificato.
Non usare GitHub Pages: non e necessario per nessuna funzione Android.

## 1. Compilazione e installazione

1. Esporta il backup JSON piu recente dal telefono prima di aggiornare.
2. Carica il contenuto di questo ZIP nella root del repository GitHub PRIVATO.
   Includi `.github`, `android`, `wear`, `tests`, `backups` e i file della root.
   Non pubblicare: il progetto contiene uno storico personale nel seed e nei backup.
3. Actions > Build Gym Tracker Phone + Galaxy Watch 6 > Run workflow.
4. Dopo esito verde, scarica l'artefatto `GymTracker-v9.8.1-GalaxyWatch6`:
   - `GymTracker-Phone-v9.8.1.apk`
   - `GymTracker-Watch-v9.8.1.apk`
5. Installa il primo sul telefono. Sul Watch usa ADB wireless (vedi anche
   GUIDA_GALAXY_WATCH6.md), quindi `adb install -r GymTracker-Watch-v9.8.1.apk`.
6. Apri entrambe le app e avvia una seduta dal telefono; verifica la comparsa
   dell'esercizio e una conferma serie dal Watch.

### Firma APK e aggiornamenti futuri

Phone e Watch devono avere lo stesso package (`it.omcr.gymtracker`) e lo
stesso certificato. Il workflow verifica la corrispondenza delle firme.
La chiave debug di un runner GitHub nuovo puo essere diversa da quella di
una build precedente. Se vedi INSTALL_FAILED_UPDATE_INCOMPATIBLE, non
cancellare nulla prima di esportare e verificare il backup piu recente.
Per aggiornare senza reinstallare occorre la stessa chiave della versione
precedente. Se non e stata conservata, non si puo ricostruire dal solo APK.

Per mantenere una chiave personale debug stabile da ora in avanti, puoi
conservare in un luogo sicuro una chiave `debug.keystore` gia esistente (se
compatibile con la firma corrente) oppure crearne una nuova con Java:

```
keytool -genkeypair -v -keystore debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
```

In PowerShell, dalla cartella del file:

```
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path .\debug.keystore))) | Set-Clipboard
```

GitHub repository privato > Settings > Secrets and variables > Actions > New
repository secret: `GYMTRACKER_DEBUG_KEYSTORE_BASE64`. Incolla il valore.
Non caricare la chiave o il base64 in file pubblici o nel repository.
Se il certificato non coincide con la versione installata, per questa prima
migrazione serviranno backup, reinstallazione di entrambe le app e ripristino.
I nuovi APK resteranno debug, adatti all'uso personale, non a una pubblicazione
sul Play Store. In assenza del secret il workflow compila ugualmente con una
chiave temporanea, ma gli aggiornamenti in-place non sono garantiti.

## 2. Configurazione Samsung Health

GymTracker usa Android Health Connect (in italiano Connessione Salute), non
il Samsung Health Data SDK. Sul telefono Android 14+ e integrato nel sistema;
con Android 9-13, se supportato, installalo o aggiornalo dal Play Store.

1. In Samsung Health, cerca Impostazioni > Connessione Salute e abilita
   l'accesso e la condivisione dei dati che desideri sincronizzare.
2. In GymTracker, Impostazioni > Samsung Health / Connessione Salute,
   premi Concedi / aggiorna permessi. Autorizza soltanto i dati desiderati.
3. Premi Aggiorna dati salute. La schermata Oggi mostra peso, variazione
   di peso, grasso corporeo, massa magra (non massa muscolare scheletrica),
   ultima sessione di sonno, frequenza a riposo, media personale e passi.
4. I dati assenti restano indicati con un trattino. I valori sono importati
   su richiesta; non sono letti in background. Origine e ora di ciascun dato
   sono visualizzate. I dati disponibili dipendono da telefono, permessi e
   configurazione Samsung Health. Il sonno indica l'intervallo della sessione,
   non un punteggio di qualita del sonno. Il peso non viene inserito automaticamente
   nelle sedute e la variazione e calcolata tra misure della stessa fonte.

## 3. Durante un allenamento

1. Avvia la scheda sul telefono. Sul Watch, nelle pagine Serie, Battito o
   Calorie, premi **Avvia salute** e concedi i permessi richiesti.
2. Health Services registra battito e calorie totali stimate (basale + attive)
   con servizio in primo piano, senza GPS. La raccolta dipende dai sensori e
   dalle capacita del Watch e puo essere ritardata durante lo schermo spento.
   Non avviare in parallelo un allenamento Samsung Health sul Watch: il
   sistema consente una sola sessione ExerciseClient attiva alla volta.
3. Conferma normalmente kg, ripetizioni e serie. Il battito viene conservato
   a intervalli di 15 secondi; ogni minuto i nuovi dati sono messi nella coda
   persistente del Watch e inviati alla app telefono. I dati possono arrivare
   in ritardo. Le conferme serie usano il protocollo della 9.5.1.
4. Termina la rilevazione dal Watch prima di chiudere la seduta per la massima
   copertura. In alternativa si arresta quando il Watch riceve la chiusura
   dal telefono. In caso di disconnessione prolungata, interrompila manualmente;
   esiste un limite di sicurezza di 6 ore. Una coda piena o un arresto forzato
   possono impedire il salvataggio degli ultimi campioni. La registrazione non
   riparte automaticamente dopo il riavvio del Watch.

## 4. Riepilogo e condivisione

Nello storico apri il dettaglio della sessione: durata, serie, volume, battito
medio/massimo, calorie totali Watch, calorie attive da Health Connect,
grafico e recupero cardiaco indicativo a circa 60 secondi. Il recupero si
calcola solo per serie con timestamp, dati sufficienti e recupero >=75 s.
I campioni sono deduplicati; la fonte Watch ha priorita sulla fonte importata.
Non sommare calorie attive e totali. Il grafico mostra interruzioni per
campioni lontani; i valori possono descrivere solo una parte della sessione.

- **Importa battito e calorie da Connessione Salute**: cerca dati nello
  stesso intervallo temporale, preferisce la fonte Samsung Health per il
  battito, importa calorie attive aggregate. Non sovrascrive il battito Watch.
- **Esporta allenamento in Connessione Salute**: registra durata, tipo forza
  e note riepilogative. Non esporta i campioni cardio/calorici come record
  separati per evitare duplicazioni; serie, kg, ripetizioni e grafici restano
  in GymTracker. La scrittura usa un ID stabile e controlla le sovrapposizioni
  con altri allenamenti. Non esporta automaticamente i 52 allenamenti storici.
  L'esportazione in Health Connect non garantisce che Samsung Health mostri
  il record: dipende dalle versioni e dai permessi delle app.
- Il normale accesso Health Connect puo limitare l'importazione dei dati
  precedenti ai 30 giorni antecedenti il primo permesso. Gli errori sono
  mostrati; nessun valore fittizio viene creato.

## 5. Health Coach (Smart Load)

Disattivato per impostazione predefinita. Si attiva in Oggi o Impostazioni.
Usa i normali suggerimenti Smart Load e aggiunge una regola prudenziale:
rinvia un aumento proposto se la sessione sonno recente dura meno di 6 ore
oppure se il battito a riposo recente supera di almeno 8 bpm la media
personale disponibile (minimo 3 giorni precedenti della stessa fonte).
Dati vecchi o mancanti non modificano il suggerimento. Non cambia il piano
panca programmato, non aumenta automaticamente i carichi, non sostituisce
le regole di scarico, non cambia automaticamente timer/recuperi. Se sono
presenti almeno tre serie e tre sedute comparabili, confronta anche il calo
cardiaco indicativo con la mediana delle sedute precedenti e puo suggerire
30 secondi di recupero in piu, da valutare manualmente. Le soglie sono
regole prudenziali modificabili in futuro, non soglie cliniche validate.
La variazione di peso viene mostrata ma non determina da sola modifiche ai
carichi. Dati di Samsung Energy Score e massa muscolare scheletrica non sono
integrati; il punteggio sonno proprietario non e disponibile tramite questa
integrazione. La app non e un dispositivo medico.

## 6. Privacy e conservazione

I dati autorizzati vengono copiati nella memoria locale del telefono (e nei
backup JSON esportati). I dati Watch passano tramite Wear OS Data Layer.
Non esiste un server GymTracker o un account esterno. In Impostazioni puoi
cancellare le copie locali dei dati salute e disattivare Health Coach. La
revoca dei permessi di sistema non cancella automaticamente copie gia salvate,
e l'eliminazione locale non cancella le sedute esportate in Health Connect.
Ferma la registrazione Watch e attendi la coda vuota prima di cancellare.
Conserva i backup e la chiave in luoghi sicuri; non condividere lo ZIP su
repository o servizi pubblici.

## 7. Collaudo consigliato (ancora da eseguire su dispositivi reali)

- Build Android verde; download APK e certificati uguali.
- Installazione e verifica 52 sedute di base o storico locale piu recente.
- Prova senza alcun permesso salute: registrazione serie e timer funzionanti.
- Prova Watch: battito, kcal, schermo spento, interruzione e ricomparsa rete;
  arresto rilevazione e ricezione batch nello storico gia chiuso.
- Prova Health Connect con permessi parziali; confronto con Samsung Health.
- Esportazione singola seduta di prova, ripetere per verificare idempotenza,
  verificare che una seduta gia presente in Health Connect non venga duplicata.
- Verificare piano panca e suggerimenti accessori con Health Coach ON/OFF.
- Backup JSON dopo un allenamento e ripristino su installazione di prova.

## 8. Test eseguiti sui sorgenti

```
node --check app.js
node --check watch_bridge.js
node --check health_v98.js
node tests/health-v98.test.cjs
node tests/watch-bridge.test.cjs
node tests/backup-integrity.test.cjs
node tests/bootstrap-persistence.test.cjs
```

Riferimenti tecnici ufficiali:
- https://developer.android.com/health-and-fitness/health-connect/get-started
- https://developer.android.com/health-and-fitness/health-connect/write-data
- https://developer.android.com/health-and-fitness/health-services/active-data
