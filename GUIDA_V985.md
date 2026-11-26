# GymTracker 9.8.5 — Glossy 3D

## Grafica Watch
- Due icone da 60 dp per ciascuna delle tre pagine. Gradiente radiale, riflessi, bordo luminoso e pittogrammi in rilievo disegnati nativamente su Canvas; nessuna nuova libreria.
- Pagina 1: Serie / Recupero. Pagina 2: Battito / Attività. Pagina 3: Progresso / Termina.
- Frecce e swipe orizzontale invariati; salvataggio, scarto, warm-up e sensori invariati rispetto alla 9.8.4.

## Samsung Health: permessi già concessi
La 9.8.5 non cambia la scrittura nativa né introduce un SDK Samsung. In GymTracker, apri un allenamento nello storico e premi **Controlla presenza in Connessione Salute**. Il controllo legge il record senza inserirne un altro. Se presente, conserva l'ID, il titolo, la data e l'origine: la scrittura Health Connect è riuscita. Se assente, verifica il record nelle impostazioni Android di Connessione Salute (Dati e accesso > Attività > Allenamenti; nomi variabili). Se presente ma non visualizzato in Samsung Health, il passaggio di importazione è ancora da verificare. Non è una conferma di sincronizzazione Samsung e non è utile ripetere indiscriminatamente l'esportazione.

Per la scrittura diretta con Samsung Health Data SDK serve un access code ottenuto dopo approvazione Samsung, anche per i test di scrittura. La distribuzione richiede la registrazione di package e firma SHA-256. Riferimenti: https://developer.samsung.com/health/data/process.html e https://developer.samsung.com/health/health-connect-faq.html.

## Installazione
Esporta prima il backup JSON aggiornato. Mantieni privato il repository. Carica il contenuto dello ZIP nella root. Il workflow genera gli APK Phone e Watch 9.8.5; installali dalla stessa build. Nessun cambio di applicationId o firma. La firma persistente deve essere configurata separatamente; non disinstallare senza backup. La compilazione Android e il collaudo sul dispositivo non sono verificati localmente.
