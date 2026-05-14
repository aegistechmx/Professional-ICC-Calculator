Write-Host "⚡ ICORE SESSION START"

netstat -ano | findstr :3001
netstat -ano | findstr :5173

if (Test-Path "frontend\node_modules") {
  Write-Host "✅ Frontend node_modules OK"
}

if (Test-Path "backend\node_modules") {
  Write-Host "✅ Backend node_modules OK"
}