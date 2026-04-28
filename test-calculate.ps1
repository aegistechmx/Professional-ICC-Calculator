$body = @{
    nodes = @(
        @{
            id = "transformer-1"
            type = "transformer"
            data = @{
                parameters = @{
                    kVA = 500
                    primario = 13800
                    secundario = 480
                    Z = 5.75
                }
            }
        }
    )
    edges = @()
} | ConvertTo-Json -Depth 10

$uri = "http://localhost:3002/cortocircuito/calculate"
$headers = @{ "Content-Type" = "application/json" }

try {
    $response = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $body
    Write-Host "SUCCESS: " -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "ERROR: " -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.ReadToEnd() | Write-Host
    }
}
