$ErrorActionPreference = 'Stop'
$java = Get-Command keytool -ErrorAction Stop
$dir = Join-Path $env:USERPROFILE '.gymtracker-signing'
$key = Join-Path $dir 'debug.keystore'
New-Item -ItemType Directory -Path $dir -Force | Out-Null
if (-not (Test-Path -LiteralPath $key)) {
    & $java.Source -genkeypair -keystore $key -storetype JKS -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=GymTracker Private Debug,O=GymTracker,C=IT'
    if ($LASTEXITCODE -ne 0) { throw 'Creazione chiave non riuscita.' }
}
& $java.Source -list -keystore $key -storepass android -alias androiddebugkey
if ($LASTEXITCODE -ne 0) { throw 'Chiave esistente non valida. Non cancellarla: verifica prima.' }
Write-Host "Keystore privato: $key"
Write-Host 'Non caricare questo file su GitHub. Conserva una copia privata.'
if ((Read-Host 'Copiare il Base64 negli appunti per il repository secret? (S/N)') -match '^[sS]$') {
    Set-Clipboard -Value ([Convert]::ToBase64String([IO.File]::ReadAllBytes($key)))
    Write-Host 'Incolla in GitHub Actions secret GYMTRACKER_DEBUG_KEYSTORE_BASE64, poi svuota gli appunti.'
}
