# GymTracker 9.9.2 — Personal Edition

App Android per schede, allenamento di forza, warm-up, recupero, storico, progressioni Smart Load e salute. Companion Wear OS con menu Glossy 3D. Nessuno storico, scheda, massimale o profilo palestra personale è incorporato nell'app. Il catalogo di esercizi e i modelli sono generici e non prescrivono carichi.

- `GUIDA_V990.md`: primo avvio, migrazione, backup e condivisione.
- `GUIDA_GALAXY_WATCH6.md`: installazione del companion e permessi.
- `GUIDA_FIRMA.md`: firma permanente per gli aggiornamenti.
- `.github/workflows/build-android-apk.yml`: test e build Android dei due APK.
- `tests/`: test del protocollo, esportazione, migrazione e separazione dei dati.

Per una nuova distribuzione usare un repository GitHub **privato e vuoto**, senza copiare il vecchio storico Git. Non pubblicare backup personali o chiavi di firma. Non attivare GitHub Pages. I due APK saranno disponibili negli Artifacts di Actions dopo la compilazione. Il progetto non contiene APK precompilati.

Build locale con JDK 17, SDK Android 36, build-tools 35.0.0, Gradle 8.11.1 e Node.js 22: `gradle :app:assembleDebug :wear:assembleDebug`. Il workflow verifica la stessa firma sui due APK. I dati sanitari richiedono Health Connect e i permessi dell'utente; la visualizzazione in Samsung Health è gestita da Samsung.

## Novità 9.9.1
Importazione/esportazione selettiva di carichi, palestre o entrambi, anche da backup completi precedenti, senza sostituire schede, storico e salute. Vedi GUIDA_V991.md.


## Novita 9.9.2
Pagina Oggi essenziale; budget allenante separato dal warm-up; stime con esecuzione, recuperi reali, lavoro unilaterale, cambi macchina e margine; adattamento con priorita esplicite; warm-up automatico solo sul primo esercizio; cronometro lavoro separato dai sensori; protezione da chiusure dimenticate e doppia progressione opt-in. Vedi `GUIDA_V992.md`.

I test JavaScript includono `tests/training-v992.test.cjs`. Verifiche locali della logica e del rendering non sostituiscono la build Android e il collaudo sui dispositivi.
