# GymTracker 9.8.2 — Watch automatico e sincronizzazione salute

## Aggiornamento

Esportare il backup JSON aggiornato dal telefono prima di aggiornare. Il backup incorporato del 25/11/2026 con 52 sedute e tutti i dati originali rimane invariato. Non ripristinarlo sopra uno storico più recente. Compilare entrambi gli APK nello stesso workflow GitHub Actions; serve la stessa firma della versione precedente per aggiornare senza disinstallare. Usare repository privato. Non serve GitHub Pages.

## Configurazione una tantum

1. Installare Phone e Watch v9.8.2. Sul Watch aprire GymTracker la prima volta, concedere le notifiche e, quando inizia la seduta, i permessi richiesti per battito e attività fisica.
2. Sul telefono: Impostazioni GymTracker > Samsung Health / Connessione Salute > Concedi / aggiorna permessi. Consentire lettura e scrittura Allenamenti, scrittura Frequenza cardiaca per i campioni Watch, e accesso in background se offerto. Le altre letture sono facoltative. Non occorre autorizzare nuovamente ogni seduta.
3. Samsung Health sul telefono > Impostazioni > Health Connect / Connessione Salute. Consentire la lettura di Allenamenti e Frequenza cardiaca. Se non compaiono dati, aprire Samsung Health e controllare le autorizzazioni e sincronizzazione. GymTracker non può confermare che Samsung Health abbia importato il record; può verificare solo che Health Connect lo contenga.
4. Impostare in GymTracker la propria FC massima di riferimento (bpm), senza usare un dato inventato. 0 significa non configurata. Le soglie sono descrittive, non cliniche: verde sotto 70%, giallo da 70% a meno di 85%, rosso da 85% in su. Il quadrante scala da 40% a 100% e indica valori inferiori/superiori ai limiti alle estremità; BPM e percentuale restano reali. Senza FC max o rilevazione recente il quadrante non attribuisce una zona. Toccare il mini-battito nelle altre schermate per accedere al quadrante.

## Uso quotidiano

- Per impostazione predefinita, l'apertura dell'app sul telefono invia una richiesta di apertura remota al Watch tramite RemoteActivityHelper. La nuova seduta invia un ulteriore comando di apertura. Se Wear OS non apre automaticamente (blocco, disconnessione, limitazioni OS), l'arrivo di una nuova sessione genera una notifica Watch, se autorizzata. È sempre possibile usare Apri / sincronizza Watch o aprire GymTracker dal polso. I sensori non si attivano semplicemente aprendo il menu sul telefono; si attivano con la sessione reale e il Watch visibile, se autorizzati. Non avviare contemporaneamente un altro allenamento Samsung Health che usa Health Services.
- L'avvio automatico dei sensori, l'apertura remota e l'esportazione automatica si possono disattivare dalle impostazioni GymTracker. Lo stop manuale della rilevazione sul Watch vale per la seduta corrente. Il timer, warm-up, serie e salvataggio dal Watch rimangono come in 9.8.1.
- Termina e salva: sul telefono viene salvata la seduta, con l'ora di fine inviata dal Watch se valida. La registrazione cardiaca si ferma anche mentre il comando di chiusura è in attesa. Se il telefono è stato terminato forzatamente o non riceve i comandi, riaprire GymTracker per finalizzare lo storico.
- Il salvataggio mette SOLO le nuove sedute in una coda persistente (nessuna esportazione massiva dei 52 allenamenti). WorkManager programma una scrittura differita dopo il salvataggio. Il lavoro in background richiede supporto e permesso di lettura in background; altrimenti l'app riprova automaticamente quando è aperta. Se Android posticipa/sospende il lavoro, l'esito può arrivare più tardi. I tentativi in-app hanno backoff; nessun nuovo dialogo di esportazione.
- L'export usa ID stabili e controlla eventuali sessioni sovrapposte. La seduta viene indicata come verificata soltanto dopo una lettura di conferma da Health Connect. Dati Watch ricevuti dopo la fine aggiornano la stessa seduta. Il battito scritto è solo quello di GymTracker rilevato dal Watch, non quello importato da Health Connect; occorre il permesso di scrittura battito. Calorie totali stimate (incl. basale) e volume sono nel riepilogo note, non sono scritte come calorie attive per evitare doppi conteggi. I dettagli serie/kg/ripetizioni restano in GymTracker. Samsung Health decide quali dati e note mostrare.
- Lo storico e la scheda Salute indicano verificata, in attesa, permessi mancanti oppure sovrapposizione. Un record sovrapposto non viene cancellato né duplicato. Se necessario, usare ancora il pulsante manuale Verifica esportazione. Non confondere la spunta in Health Connect con l'avvenuta importazione Samsung Health.

## Collaudo sui dispositivi

- Aprire GymTracker sul telefono con Watch connesso e sbloccato: verificare avvio UI. Ripetere dopo aver chiuso UI sul Watch, iniziare una seduta e verificare apertura o notifica di fallback.
- Verificare una serie warm-up, una serie allenante, timer e vibrazione; toccare il mini-battito. Controllare che il valore e il puntatore si aggiornino e che un valore assente non mostri una zona valida. Fermare manualmente i sensori e verificare che non ripartano nella stessa seduta.
- Terminare una seduta di prova dal Watch. Verificare storico telefono, stop sensori, stato esportazione. In Connessione Salute > Dati e accesso > Attività > Allenamenti, verificare GymTracker come origine. In Samsung Health > attività/allenamenti, verificare se viene visualizzata. Ripetere con schermo telefono spento e con permesso background concesso. Ripetere senza background, poi riaprire l'app. Controllare che non compaiano duplicati.
- Verificare aggiornamento di una seduta con campioni tardivi e prova di permessi negati. Il salvataggio locale non dipende da Health Connect.

## Verifiche locali

Eseguire tutti i file `tests/*.test.cjs` dalla root. I test JavaScript simulano i callback nativi e non provano le API Android reali. SDK Android e Gradle non disponibili nell'ambiente di preparazione; compilazione e collaudo hardware ancora necessari. Le API sono state confrontate con la documentazione ufficiale Android e Samsung. Il file demo HTML è illustrativo, non uno screenshot dell'APK.
