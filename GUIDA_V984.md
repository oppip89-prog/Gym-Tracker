# GymTracker 9.8.4 – Round Sport

## Navigazione Watch
- Menu 1/3: Serie, Recupero; menu 2/3: Battito, Attività; menu 3/3: Progresso, Termina.
- Scorrere orizzontalmente dal centro del display o usare le frecce. Due icone da 56 dp per pagina (prima: 32 dp). I pallini indicano la pagina. Le cinque schermate operative scorrono orizzontalmente; toccare «Menu» per tornare al menu. Scorrere verticalmente per le schermate lunghe.
- La schermata Termina ha tre pulsanti verticali: Salva, Scarta sessione, Continua allenamento. La cancellazione richiede conferma; una seduta scartata non viene inserita nello storico né accodata per Health Connect. La rilevazione nativa viene terminata. Se il telefono non è disponibile, la chiusura aspetta la conferma del telefono. Le eventuali rilevazioni autonome di altre app non sono cancellate.

## Samsung Health: diagnosi
GymTracker scrive tramite Health Connect (Connessione Salute), non nel database privato di Samsung Health. L'esito di scrittura non prova l'importazione in Samsung Health.
1. In GymTracker sul telefono: Storico → seleziona una seduta → Salute → Controlla presenza in Connessione Salute. È un controllo di sola lettura. Mostra esito, titolo, ora, durata, origine e ID, se presenti. In caso di errore verificare i permessi e riprovare. Il pulsante separato Ripeti esportazione usa l'identificativo stabile della seduta.
2. In Android → Impostazioni → Connessione Salute → Dati e accesso → Attività → Allenamenti (i nomi possono variare). Cerca il record GymTracker della data e ora esatte. In Permessi app → GymTracker devono essere concessi lettura e scrittura Allenamenti.
3. In Samsung Health → Impostazioni → Connessione Salute → Permessi app → Samsung Health, abilita la lettura degli allenamenti e, se disponibili, frequenza cardiaca e calorie. Riapri Samsung Health, sincronizza con account Samsung e controlla lo storico. Aggiorna le app Samsung sul telefono e sull'orologio.
4. Se il record esiste in Connessione Salute ma non appare in Samsung Health, la scrittura GymTracker è riuscita: il problema resta nella fase di importazione/visualizzazione Samsung. Non creare copie della seduta. L'SDK Samsung Health Data SDK permette la scrittura diretta solo con accesso approvato da Samsung, oltre ai permessi dell'utente e alla firma registrata. Non è integrato in questo aggiornamento.

Riferimenti ufficiali:
- https://developer.samsung.com/health/health-connect-faq.html
- https://developer.samsung.com/health/blog/en/accessing-samsung-health-data-through-health-connect
- https://developer.samsung.com/health/data/process.html

## Installazione
Carica i contenuti dello ZIP, compresa `.github/workflows`, nella root del repository (non una cartella ZIP dentro la root). Aggiorna entrambi gli APK generati da GitHub Actions. Prima dell'installazione esporta un backup JSON aggiornato. Se la chiave di firma non è persistente, l'aggiornamento in-place potrebbe non essere possibile: non disinstallare senza backup.

## Controlli
Otto gruppi di test JavaScript, incluso lo scarto idempotente e la verifica Health Connect di sola lettura. Controllo della sintassi di Java e Kotlin con i parser. La compilazione Android completa e il collaudo su telefono/Watch, compreso l'effettivo import Samsung, restano da effettuare. Il backup del 25/11 e lo storico incorporato non sono stati alterati.
