Write-Host "=== ICORE CHECKLIST ==="

Write-Host "Checking ports..."

netstat -ano | findstr :3001
netstat -ano | findstr :5173

Write-Host "✔ Session complete"