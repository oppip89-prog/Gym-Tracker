# Gym Tracker v9.1 — Bench RPE Adaptive

## Correzione principale
La panca A/B non usa più solo i carichi statici del ciclo. Le esposizioni recenti vengono confrontate con l’RPE target e il piano successivo viene corretto con step prudenti da 2,5/5 kg.

- `bench_push` e `bench_upper` hanno ora un motore dedicato RPE-aware.
- Se l’RPE reale supera il target, la seduta successiva viene alleggerita.
- Se l’RPE è nettamente sotto target, può essere concesso un aumento massimo prudente; aumento disattivato in scarico/taper.
- Le fasi di scarico eseguite correttamente non vengono interpretate come motivo per aumentare i kg.
- Durante una stessa seduta, se un set di panca supera chiaramente il target RPE, le serie successive vengono alleggerite automaticamente e `recommendedKg` viene aggiornato.
- Home, Scheda e Sessione mostrano ora gli stessi carichi adattati.

## Caso reale verificato
Sul backup del 29/09, il piano W1 originario `132,5 kg` per la singola viene corretto a `130 kg`; i back-off `112,5 kg` vengono corretti a `110 kg`, sulla base delle esposizioni precedenti sopra target.

È incluso anche un test di regressione che forza le singole da 142,5 e 145 kg a RPE 9 e verifica che il piano non rimanga invariato.
