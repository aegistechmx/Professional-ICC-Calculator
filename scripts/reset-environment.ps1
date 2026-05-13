Write-Host "🧹 Limpiando entorno de Professional ICC Calculator..." -ForegroundColor Cyan

$ports = @(3001, 3002, 5173)

foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "⚠️  Puerto $port ocupado. Liberando..." -ForegroundColor Yellow
        Stop-Process -Id $connection.OwningProcess -Force
    } else {
        Write-Host "✅ Puerto $port está libre." -ForegroundColor Green
    }
}

# Limpiar caché de dependencias si es necesario
if (Test-Path "backend/node_modules/.bin/nodemon") {
    Write-Host "🚀 Entorno listo para 'npm start'" -ForegroundColor Cyan
}

Write-Host "=========================================="
Write-Host "Sugerencia: Si el error 'C:\Program' persiste,"
Write-Host "asegúrese de que las rutas en package.json"
Write-Host "estén envueltas en comillas dobles."
Write-Host "=========================================="