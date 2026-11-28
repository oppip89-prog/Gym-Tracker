# Galaxy Watch / Wear OS

Installare gli APK Phone e Watch della stessa compilazione, con lo stesso applicationId e certificato. Il telefono è il riferimento per storico, scheda e carichi. Il Watch gestisce warm-up, serie, recupero, zone cardiache, durata, calorie e chiusura/scarto della seduta. La raccolta usa Health Services; le metriche disponibili dipendono dal dispositivo.

1. Sul Watch: Impostazioni → Informazioni software → toccare ripetutamente la versione software fino a modalità sviluppatore.
2. Opzioni sviluppatore: Debug ADB e Debug wireless. Collegare telefono/Watch e PC alla rete adatta.
3. Scaricare Android SDK Platform Tools ufficiali sul PC. Associare tramite `adb pair IP:PORTA_ASSOCIAZIONE` e il codice del Watch; poi `adb connect IP:PORTA_DEBUG` (la porta è spesso diversa). Verificare `adb devices`.
4. Installare con `adb install -r GymTracker-Watch-v9.9.1.apk`. Se la firma non è compatibile, non disinstallare prima di sincronizzare la seduta e fare il backup esterno dal telefono. Dopo una reinstallazione, installare entrambi gli APK della stessa compilazione.
5. Aprire GymTracker sul telefono. Attivare apertura automatica Watch e sensori in Altro → Smartwatch Wear OS; concedere i permessi sul Watch. Per uso senza Watch, lasciare entrambe le opzioni spente. I menu del Watch hanno due icone grandi per pagina, frecce e swipe orizzontale. Le impostazioni di sistema possono impedire l'apertura remota o lo schermo sempre acceso.
6. Dal Watch termina e salva o scarta (conferma). Non avviare in parallelo un altro allenamento nativo: potrebbe interferire con la sessione Health Services.
7. Sul telefono autorizza GymTracker in Connessione Salute, attiva esportazione automatica, e consenti a Samsung Health di leggere i dati. Nel dettaglio dello storico usa Controlla presenza in Connessione Salute. L'esito conferma Health Connect, non l'avvenuta visualizzazione in Samsung Health. Le autorizzazioni devono essere concesse dall'utente.

Non supporta direttamente Redmi Watch con HyperOS. Per altri modelli Wear OS occorre collaudo.
