# GymTracker 9.8.1 | Watch experience

Aggiornamento del progetto 9.8.0 corretto. Installare **entrambi gli APK** della stessa build: il protocollo ora trasmette riscaldamenti e il comando di chiusura, oltre alle serie allenanti. Prima esportare il backup JSON dal telefono. Conservare la firma APK precedente, se disponibile (vedi GUIDA_V98.md). Lo storico incluso nel progetto contiene dati personali: repository privato.

## Novità operative
- Warm-up generale: mostra durata e descrizione della scheda, conferma con un tocco. Warm-up di avvicinamento: carico, ripetizioni, recupero e conferma, distinti dalle serie allenanti e dal loro volume. Se una serie di lavoro è già iniziata, il Watch non torna automaticamente a warm-up precedenti non eseguiti. La generazione dei warm-up resta sul telefono.
- Dopo la conferma si apre la schermata circolare del recupero, se il timer è attivo. +30 secondi, salta, oppure torna alle serie. Ritorno automatico alla serie dopo il recupero se non si è cambiata pagina manualmente.
- Il servizio WatchSessionService mantiene un'attività in corso Wear OS con collegamento di ritorno dal quadrante e timer indipendente dai sensori. Autorizzare le notifiche quando richiesto. Schermo sempre attivo di default durante la seduta, disattivabile in Riepilogo. La modalità di sistema, il tasto Home, la batteria, le impostazioni di Wear OS e la chiusura forzata possono comunque oscurare o sospendere l'app; il servizio non forza il ritorno in primo piano. Il wake lock parziale per il recupero è limitato a dieci minuti per timer. I sensori Health Services si avviano separatamente dalla pagina Battito/Calorie.
- Riepilogo > Termina e salva: conferma la chiusura dal Watch. Se mancano attività viene richiesta una conferma esplicita. Per evitare perdita o riordino delle serie, attendere l'ACK delle operazioni precedenti prima di chiudere. Se il telefono non è raggiungibile, il comando di fine rimane in coda e il Watch mostra il salvataggio in corso; la chiusura effettiva avviene quando l'app telefono elabora il comando. Se Android ha chiuso il processo sul telefono, riaprire GymTracker. Nessun dato è dichiarato salvato prima dell'ACK o della chiusura autorevole della seduta.
- Il servizio di sessione termina dopo la chiusura autorevole; la rilevazione salute già attiva termina e invia il riepilogo restante. Health Connect e Smart Load non sono rimossi.

## Collaudo
1. Compilare tramite Actions e scaricare GymTracker-v9.8.1-GalaxyWatch6; installare Phone e Watch della stessa build. Verificare che le firme corrispondano anche a quelle installate se si desidera aggiornare in-place.
2. Avviare una sessione con riscaldamento generale e almeno un warm-up automatico. Confermare dal Watch e verificare telefono e volume (warm-up escluso).
3. Confermare una serie, verificare timer, anello e vibrazione anche con schermo oscurato e ritorno dal quadrante. Provare +30 s e Salta. Provare la modalità schermo sempre attivo disattivata.
4. Provare chiusura completa e incompleta (con conferma), verificare che la seduta compaia una sola volta nello storico e che i servizi si fermino.
5. Provare disconnessione temporanea prima della conferma e durante il salvataggio; riconnettere, eventualmente riaprire il telefono. Verificare che non manchino serie.
6. Verificare su schermo 40/44 mm la leggibilità, il comportamento del display e della notifica, nonché il consumo batteria.

Test Node eseguiti: integrità dei backup, bootstrap, salute e Smart Load, bridge precedente, bridge warm-up e fine seduta con funzioni reali di app.js/v9_features.js. Compilazione Android e collaudo su Galaxy Watch non eseguiti localmente: SDK/Gradle non disponibili. L'anteprima HTML è illustrativa, non uno screenshot dell'APK.
