# Gym Tracker v9.2 - Android + PWA

Repository di produzione della v9.2. La root contiene l'app web; `android/` contiene il wrapper Android nativo. Durante la build i file web della root vengono copiati automaticamente dentro l'APK, quindi non vanno duplicati manualmente.

## Generare l'APK su GitHub

1. Carica **il contenuto di questa cartella** nella root del repository GitHub.
2. Fai commit sul branch `main` (oppure `master`).
3. Apri la scheda **Actions** del repository.
4. Apri il workflow **Build Android APK** e attendi il segno di spunta verde.
5. In fondo alla pagina del run scarica l'artifact **GymTracker-v9.2.apk**.
6. Copia/apri l'APK su Android e installalo. Se Android blocca l'installazione, abilita temporaneamente l'installazione da quella fonte nelle impostazioni del telefono.

Il workflow parte automaticamente a ogni push su `main`/`master` e puo' anche essere avviato manualmente con **Run workflow**.

## Dati e scheda

- La v9.2 include la scheda Cut Optimized nei file applicativi correnti.
- Lo storico e le impostazioni sono local-first e vengono conservati nello storage dell'app.
- Import JSON e CSV funzionano dal selettore file Android.
- Esportazione backup/scheda/CSV usa il selettore di salvataggio Android.

> Prima di sostituire una vecchia APK con package diverso e' consigliato esportare un backup dall'app precedente. Il package di questa build e' `it.omcr.gymtracker`.

## Stack build

- Android Gradle Plugin 8.7.3
- Gradle 8.9
- Java 17
- compileSdk / targetSdk 35
- minSdk 26
