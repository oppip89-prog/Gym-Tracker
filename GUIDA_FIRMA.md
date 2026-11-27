# Firma APK permanente — configurazione una tantum

Il protocollo Wear OS richiede lo stesso identificativo applicazione e certificato su telefono e Watch. La firma permanente evita il cambio di certificato ad ogni nuova build GitHub. **Non è ancora configurata nel tuo repository**: occorre inserire un segreto. Non distribuire mai il keystore a terzi.

1. Sul PC Windows, installa Java 17 (JDK, con keytool nel PATH) e apri PowerShell nella cartella del progetto. Esegui `powershell -ExecutionPolicy Bypass -File .\tools\Prepara-Firma.ps1`. Lo script crea una chiave debug persistente fuori dal progetto, oppure riutilizza quella già presente. Ne copia il Base64 negli appunti solo se lo confermi.
2. GitHub, repository privato: Settings → Secrets and variables → Actions → New repository secret. Nome esatto `GYMTRACKER_DEBUG_KEYSTORE_BASE64`. Incolla il valore (Base64, non il percorso del file) e salva. Svuota poi gli appunti. Non incollarlo in chat, commit o issue.
3. Conserva una copia del keystore originale in un archivio privato e sicuro, separato dal repository. Non rigenerarlo a ogni build. Questa configurazione è per APK debug privati; non è una chiave di pubblicazione Play Store.
4. Compila entrambi gli APK. Il workflow ripristina la chiave, verifica le firme e confronta i digest SHA-256. Se manca il segreto, la build può proseguire ma mostra un avviso: i futuri aggiornamenti potrebbero richiedere reinstallazione.
5. Una chiave nuova non può sostituire la vecchia firma già installata. Esegui backup esterno, installa una coppia di APK firmata con la chiave nuova e ripristina il backup una sola volta. Gli aggiornamenti futuri con lo stesso certificato potranno preservare i dati, purché anche applicationId e versionCode siano compatibili.
