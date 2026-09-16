# Gym Tracker v7 - Panca Forza 8W

## Nuovo ciclo panca
- Due esposizioni ponte prima del blocco: intensificazione 140 x 1 + 127,5 2x2, poi scarico 110 2x4 con fermo 2 s.
- Il ciclo vero dura 8 settimane.
- Riferimento conservativo: 145 kg, con carichi guidati dall RPE.
- Frequenza panca: PUSH pesante + UPPER tecnica/volume con fermo.
- W7 taper, W8 test condizionato dall RPE.

## Autoregolazione panca
La singola salva un target RPE per set. Se il valore reale supera il target, i back-off ancora da eseguire vengono ridotti automaticamente di 2,5 o 5 kg. Se la singola e molto facile, l app non aggiunge fatica nella stessa seduta: mantiene i back-off e usa il dato per la progressione successiva.

## Split aggiornato
- PUSH: panca prioritaria, volume petto accessorio ridotto.
- PULL: invariato.
- LEGS: invariato.
- UPPER: panca B per prima, poi focus dorsale; laterali ridotte a 1 serie di default.
- LOWER: aggiunti 2 set bicipiti + 2 set tricipiti per tenere l Upper breve.

## Compatibilita dati
La chiave localStorage resta invariata. Aggiornando la PWA sullo stesso dominio/percorso, storico e backup restano disponibili. Gli utenti provenienti dalla v6 vengono portati al ponte iniziale e alla W1 del nuovo ciclo senza cancellare lo storico.

## Portabilita
Il pacchetto scheda + storico passa a schemaVersion 3 e include anche `preCycleStep`, cosi il punto del ponte viene trasferito tra dispositivi.
