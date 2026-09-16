# Gym Tracker v7.3 — Protocollo A/B Fix

## Correzione principale
- Il Protocollo B della sessione UPPER non viene più sovrascritto dal ponte pre-ciclo.
- Il ponte (intensificazione + scarico) si applica esclusivamente alla Panca A nel PUSH.
- UPPER usa sempre il Protocollo B della settimana corrente, anche mentre il ponte è ancora aperto.
- PULL, LEGS, UPPER e LOWER non vengono più etichettati come sessioni PONTE.
- Solo una Panca A completata nel PUSH può far avanzare il ponte.

## Recupero automatico
Se si aggiorna dalla v7.2 con una sessione UPPER ancora aperta e marcata erroneamente come ponte, la v7.3 rimuove il flag errato. Se non sono state completate serie di panca, rigenera automaticamente la Panca B corretta.

## Comportamento atteso W1
- PUSH / Protocollo A durante ponte 1: 140×1 + 127,5×2×2.
- UPPER / Protocollo B: 105×4×3 con fermo 2 s.
- Ponte 2 sul successivo PUSH: 110×4×2 (o 107,5 se necessario) di scarico tecnico.
- Dopo il ponte, il ciclo prosegue normalmente W1→W8.
