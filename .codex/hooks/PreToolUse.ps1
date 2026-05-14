param($tool, $file)

if ($file -match "node_modules") {
  Write-Host "⛔ BLOCKED: node_modules"
  exit 1
}

if ($file -match "_BACKUP") {
  Write-Host "⛔ BLOCKED: backup folder"
  exit 1
}