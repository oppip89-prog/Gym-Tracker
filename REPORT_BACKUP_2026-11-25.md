# REPORT DI AGGIORNAMENTO DATI - 25/11/2026

## Origine
- File originale: `gym-tracker-backup-2026-11-25.json`
- Versione nell'esportazione: **9.4.0** (schema 2)
- Data esportazione UTC: **2026-11-25T13:45:42.101Z**, ore **14:45:42 in Italia**
- SHA-256 sorgente: `c0cb56e3ee7dd6ccf2352d00c1b2a917123f00e9ce095af0dfe94b91b5f05846`

## Confronto con il precedente dataset del progetto
- Storico precedente: **48** sedute; nuovo: **52** sedute
- Sedute aggiunte: **4**; sedute precedenti conservate senza differenze: **48**
- Sessioni terminate presenti nel nuovo backup: **52** su 52
- Sessione aperta precedente: LOWER 20/11/2026; ora **nessuna sessione aperta**
- Settimana precedente: **2**, ora **3**
- Profilo palestra attivo: **borgaro**
- Palestre censite: **5**; profili catalogo esercizi: **140**
- Libreria schede: **1**; piano attivo: **PPLUL 15W · Panca 5x5→8x2 · TM145 · 60 min**
- Il backup contiene anche `builderDraft`: e stato incluso nel bootstrap.

### Quattro sessioni aggiunte

| Data | Allenamento | Ora UTC inizio | Stato |
| --- | --- | --- | --- |
| 2026-11-20 | LOWER | 05:27:27 | completato |
| 2026-11-23 | PUSH | 05:37:09 | completato |
| 2026-11-24 | PULL | 05:46:21 | completato |
| 2026-11-25 | LEGS | 05:30:24 | completato |

## Integrita e comportamento dell'aggiornamento

1. `history_seed.js` contiene tutte le 52 sedute del backup e tutti gli altri
   campi dello stato originale, mantenuti senza modifiche salvo la versione
   applicativa aggiornata a v9.5.1.
2. Il backup originale e stato copiato senza alcuna modifica; e disponibile
   anche una variante importabile con versione v9.5.1.
3. La nuova versione utilizza la stessa chiave locale per le sessioni
   (`gym_tracker_ppl_upper_lower_v1`): **se il telefono possiede dati gia
   presenti, il seed non li sovrascrive**.
4. Il file di importazione completo **sostituisce** lo stato corrente: non va
   utilizzato per un aggiornamento automatico di una installazione piu recente.
5. Le funzionalita del progetto Galaxy Watch 6 non sono state cambiate in questa
   revisione; le schermate battito/calorie restano allo stato della v9.5.0.
6. Per la compilazione dei due APK e il collaudo sul Watch servono ancora
   Android SDK, Gradle e i dispositivi reali.

## Verifica

Esegui `node tests/backup-integrity.test.cjs` e
`node tests/watch-bridge.test.cjs` nella root del progetto.
