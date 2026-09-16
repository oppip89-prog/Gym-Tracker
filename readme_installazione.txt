GYM TRACKER v7.1 — INSTALLAZIONE / AGGIORNAMENTO

AGGIORNAMENTO DA v4, v5, v6 o v7
1. Se possibile, esporta prima un backup dalla versione che stai usando.
2. Non disinstallare la vecchia PWA e non cancellare i dati del sito.
3. Pubblica/sostituisci i file della cartella v7.1 sullo STESSO dominio e nello STESSO percorso della vecchia app.
4. Chiudi completamente la PWA e riaprila. Il service worker v7.1 usa una nuova cache e aggiorna i file.
5. Controlla lo Storico prima del primo nuovo allenamento.

La chiave localStorage resta:
gym_tracker_ppl_upper_lower_v1
quindi il passaggio diretto v4 -> v7.1 è supportato.

Se installi su un dominio/percorso differente, il browser crea uno spazio dati separato: in quel caso importa un backup JSON o il pacchetto scheda + storico.

PWA
- Richiede pubblicazione via HTTPS (o localhost in sviluppo).
- Funziona offline dopo il primo caricamento.

STANDALONE
- gymtracker_standalone.html contiene CSS, programma, storico seed e logica in un solo file.
- Utile per prova rapida o copia locale; per l'uso quotidiano è preferibile la PWA.
