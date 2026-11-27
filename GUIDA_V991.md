# GymTracker 9.9.1 — Carichi e palestre

## Trasferimento selettivo (Altro → Centro backup → Carichi e palestre)

Seleziona Importa solo carichi, Importa solo palestre oppure Importa carichi e palestre e scegli un JSON: è compatibile sia con un backup completo precedente, incluso 9.8.5, sia con il corrispondente file selettivo creato dalla 9.9.1. Non usare il comando Ripristina backup completo per questa operazione.

- Solo carichi: riferimenti manuali in kg/reps/RIR, ultima prima serie allenante valida per esercizio e sede (se identificabile), carichi iniziali ordinari come riferimento di riserva e incrementi di peso disponibili. Nessun allenamento storico, dato salute, piano periodizzato o carico prescritto della scheda viene importato. Un riferimento è un punto di partenza per Smart Load, non una copia esatta di tutte le serie o delle progressioni basate sullo storico. Con Smart Load disattivato o esercizi a carico fisso, il comportamento precedente è mantenuto.
- Solo palestre: nomi, note, inventario macchinari, profili necessari e associazioni con gli esercizi; non importa riferimenti di peso né incrementi. Mantiene l'associazione della palestra attiva locale, se già scelta.
- Carichi e palestre: entrambi i gruppi, nella stessa operazione, preservando i riferimenti specifici dei macchinari.

L'importazione unisce i dati senza sostituire il profilo: i riferimenti locali con data uguale o più recente, gli incrementi già impostati, le associazioni e i macchinari locali in conflitto rimangono invariati. Le palestre vengono riconosciute dall'identificativo o dal nome univoco; identificativi incompatibili bloccano l'importazione. I profili esercizio incompatibili sono saltati. I carichi per sedi non identificabili non vengono attribuiti a una sede per ipotesi; se importi solo carichi specifici di una palestra non ancora presente, verranno saltati. Usa la modalità combinata oppure importa prima le palestre. La finestra di conferma indica dati nuovi e dati saltati. Prima di importare si crea una copia pre-modifica; se lo spazio non basta non si applica la modifica. Termina la sessione corrente prima di procedere.

Le tre esportazioni selettive creano JSON privati riutilizzabili. Il file carichi include gli identificativi e i nomi delle palestre necessari per riconoscere la provenienza dei carichi, non i profili o gli inventari. Non esporta le sedute o i campioni cardiaci. Il file palestre non contiene i carichi. Non condividere questi file se non vuoi comunicare riferimenti personali, nomi delle palestre o note dei macchinari.

## Aggiornamento
Esporta un backup completo JSON esterno. Compila il progetto completo in GitHub Actions (inclusi .github, tests, android e wear). L'artefatto GymTracker-v9.9.1-GalaxyWatch6 contiene gli APK per smartphone e Watch. La modifica è sullo smartphone; se hai già la 9.9.0, il Watch può rimanere invariato quando firma e protocollo sono compatibili. Se devi cambiare firma, installa entrambi gli APK della nuova build dopo avere salvato i dati. Mantieni la firma permanente descritta in GUIDA_FIRMA.md.

Per le funzioni della Personal Edition e il ripristino completo, consulta GUIDA_V990.md. Il nome della versione nelle istruzioni precedenti si riferisce alla 9.9.0.
