# Gym Tracker v9.2.1 Android

Repository completa per compilare l'APK Android di Gym Tracker.

## Build APK su GitHub
1. Caricare **il contenuto di questa cartella nella root del repository**.
2. Verificare che la cartella nascosta `.github/workflows/` sia presente.
3. Fare commit su `main`.
4. Aprire **Actions > Build Android APK**.
5. A build completata, scaricare l'artifact `GymTracker-v9.2.1.apk`.

## Importante
Non spostare `android/app/build.gradle` nella root. La root contiene un `build.gradle` diverso che dichiara Android Gradle Plugin 8.7.3.

La build usa Java 17, Gradle 8.9, AGP 8.7.3 e compileSdk 35.
