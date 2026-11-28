# GymTracker 9.9.0 — Personal Edition

## Prima di aggiornare da 9.8.5
1. Termina e sincronizza la seduta corrente, anche sul Watch.
2. Sul telefono: Altro → Storico e backup → Esporta backup completo JSON. Salva il file fuori dall'app, in Download e possibilmente su PC. Non confonderlo con CSV o con l'esportazione di una scheda.
3. Configura la firma permanente descritta in GUIDA_FIRMA.md. Se la chiave è diversa da quella della 9.8.5 già installata, Android non consentirà l'aggiornamento sul posto. Non disinstallare prima di avere il backup esterno verificato. Usa i due APK della stessa nuova build.
4. Se l'aggiornamento sul posto riesce, i dati locali rimangono disponibili. Se è necessaria una reinstallazione, al primo avvio scegli Ripristina tutti i miei dati e seleziona il backup completo.
5. Controlla conteggio storico, scheda attiva, settimana, carichi, profili palestra e sensori prima di allenarti. Riconcedi i permessi Health Connect e Watch quando richiesto.

## Nuovo utilizzatore
Lo stesso APK parte vuoto: nessuno storico, scheda, riferimento di carico, palestra o profilo salute di un'altra persona. Scegli Solo telefono o Wear OS, quindi Inizia da zero, Importa una scheda oppure Ripristina tutti i miei dati. Puoi creare una scheda vuota, scegliere Full Body 3 / Upper-Lower 4 / PPL 5 oppure importare una scheda JSON. I modelli non assegnano pesi. Registra i tuoi carichi reali per iniziare Smart Load. Non sono richiesti account GymTracker.

## Centro backup (Altro)
- **Backup completo JSON (privato):** stato locale, storico, schede, bozze, settimana, progressioni, catalogo e riferimenti, palestre, impostazioni, dati salute già importati. Non include permessi Android, intero database Samsung Health, chiavi di firma o file di sistema.
- **Ripristina backup completo:** sostituisce il profilo locale dopo conferma; verifica la struttura e crea una copia pre-ripristino. Accetta anche il precedente formato 9.8.5. Per backup di fiducia, non usare file personali ricevuti da sconosciuti. Una seduta in corso va terminata prima di ripristinare.
- **Copia automatica locale:** al primo salvataggio del giorno e quando cambia l'ultima seduta completata. Conserva un'ultima copia giornaliera, una pre-aggiornamento (solo aggiornamento sul posto) e una pre-ripristino. Su Android sono file privati, esclusi dal backup di sistema; su browser sono copie locali soggette alla quota del browser. Puoi esportarli o ripristinarli dal centro backup. Queste copie non sopravvivono a disinstallazione, cancellazione dati o cambio telefono. Il salvataggio esterno JSON resta indispensabile. La copia non contiene la coda nativa di comandi non sincronizzati.
- **Scheda senza carichi:** esporta una fotografia della settimana selezionata, senza storico, note personali, profili macchina e dati salute. Le serie strutturate della panca diventano serie ordinarie con i rispettivi target di ripetizioni. Non è un trasferimento integrale del piano periodizzato.
- **Scheda con carichi:** stesso formato, con carichi iniziali disponibili (non include lo storico). Condividi solo se desiderato. Smart Load poi si adatta al nuovo utilizzatore.
- **Storico JSON:** dati personali, con eventuali campioni salute; importazione per unione senza duplicati.
- **Preferenze JSON:** impostazioni selezionate, senza storico o schede. Importa da Importa storico o preferenze JSON.
- Le vecchie funzioni CSV e pacchetto personale rimangono disponibili. Il pacchetto personale contiene dati privati; non inviarlo ad amici.
- **Azzera tutti i dati:** doppia conferma, cancella stato e copie locali. Non cancella gli allenamenti già esportati in Samsung Health. Non usarlo come sostituto di un backup.

## Privacy e distribuzione
Distribuire soltanto gli APK ottenuti dal nuovo progetto, mai un backup personale. Il vecchio repository può contenere dati personali anche nella cronologia Git o in precedenti artefatti. Consigliato un repository privato nuovo, vuoto, con GitHub Desktop, non una semplice sovrascrittura del vecchio. Disattivare eventuale pubblicazione GitHub Pages. Non copiare cartelle backups, vecchi report o chiavi nel nuovo repository. Se si aggiorna quello esistente, cancellare i vecchi file personali prima del commit (la cronologia precedente resta comunque presente).

## Build e collaudo
Copia l'intero contenuto dello ZIP nella root del repository, compresa .github; esegui Commit e Push. Per evitare caricamenti incompleti, con GitHub Desktop crea un repository vuoto, apri la cartella locale, estrai direttamente tutti i file lì, verifica Changes e fai Commit to main → Publish repository / Push origin. Lascia selezionato Keep this code private. La cartella .github deve essere inclusa. Actions verifica i file, esegue i test, compila Android e pubblica i due APK con la stessa firma. Scarica l'artefatto GymTracker-v9.9.0-GalaxyWatch6. Il nome della seduta viene passato come titolo personalizzato a Health Connect, ma Samsung Health può mostrare una categoria invece del titolo. Il Watch mantiene le funzioni native e il tema Glossy 3D; il telefono aggiunge la nuova grafica Glossy 3D. I test logici non sostituiscono la compilazione Android e il collaudo sui dispositivi reali.
