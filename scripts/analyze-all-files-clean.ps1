# scripts/analyze-all-files-clean.ps1
# Clean version without Unicode encoding issues

param(
    [string]$Path = $null,
    [switch]$Detailed = $true
)

# Auto-detectar directorio raíz del proyecto
if (-not $Path) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $projectRoot = Split-Path -Parent $scriptDir
    $Path = $projectRoot
}

# Verificar que el path existe
if (-not (Test-Path $Path)) {
    Write-Host "Error: No se encontró el directorio: $Path" -ForegroundColor Red
    Write-Host "Uso: .\analyze-all-files-clean.ps1 -Path 'C:\ruta\al\proyecto'" -ForegroundColor Yellow
    exit 1
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "DETAILED FILE ANALYSIS - ICC CALCULATOR" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Directory analyzed: $Path" -ForegroundColor Gray
Write-Host ""

# ============================================
# 1. ESTRUCTURA DE CARPETAS
# ============================================
Write-Host "1. FOLDER STRUCTURE" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor DarkGray

Get-ChildItem -Path $Path -Directory -Recurse | ForEach-Object {
    $fileCount = (Get-ChildItem $_.FullName -File -Recurse).Count
    $indent = "  " * ($_.FullName.Split('\').Count - ($Path.Split('\').Count))
    Write-Host "$indent[DIR] $($_.Name) ($fileCount files)" -ForegroundColor Green
}
Write-Host ""

# ============================================
# 2. ANALISIS POR TIPO DE ARCHIVO
# ============================================
Write-Host "2. FILES BY TYPE" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor DarkGray

$extensions = Get-ChildItem -Path $Path -Recurse -File | Group-Object Extension | Sort-Object Count -Descending
$extensions | ForEach-Object {
    Write-Host "   $($_.Name) : $($_.Count) files" -ForegroundColor Cyan
}
Write-Host ""

# ============================================
# 3. ANALISIS DETALLADO POR SUBDIRECTORIO
# ============================================
Write-Host "3. ANALYSIS BY SUBDIRECTORY" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor DarkGray

$directories = Get-ChildItem -Path $Path -Directory
foreach ($dir in $directories) {
    $files = Get-ChildItem -Path $dir.FullName -Recurse -File
    $jsFiles = $files | Where-Object { $_.Extension -in '.js', '.jsx', '.ts', '.tsx' }
    $cssFiles = $files | Where-Object { $_.Extension -in '.css', '.scss' }
    $jsonFiles = $files | Where-Object { $_.Extension -eq '.json' }
    
    Write-Host ""
    Write-Host "[DIR] $($dir.Name)/" -ForegroundColor Magenta
    Write-Host "   |-- Total files: $($files.Count)" -ForegroundColor Gray
    Write-Host "   |-- JS/TS/JSX: $($jsFiles.Count)" -ForegroundColor Green
    Write-Host "   |-- CSS: $($cssFiles.Count)" -ForegroundColor Blue
    Write-Host "   |-- JSON: $($jsonFiles.Count)" -ForegroundColor Yellow
    
    if ($Detailed -and $jsFiles.Count -le 20) {
        Write-Host "   |-- Files:" -ForegroundColor DarkGray
        foreach ($file in $jsFiles) {
            $sizeKB = [math]::Round($file.Length / 1KB, 2)
            Write-Host "       [FILE] $($file.Name) ($sizeKB KB)" -ForegroundColor Gray
        }
    }
}
Write-Host ""

# ============================================
# 4. ANALISIS DE IMPORTACIONES
# ============================================
Write-Host "4. IMPORT ANALYSIS" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor DarkGray

$imports = Select-String -Path "$Path\**\*.jsx", "$Path\**\*.js" -Pattern "import.*from" -ErrorAction SilentlyContinue
$uniqueImports = $imports | ForEach-Object { $_ -replace 'import.*from [''"]', '' -replace '[''"].*', '' } | Sort-Object -Unique

Write-Host "   Total unique imports: $($uniqueImports.Count)" -ForegroundColor Cyan
Write-Host ""

# ============================================
# 5. ARCHIVOS MAS GRANDES
# ============================================
Write-Host "5. LARGEST FILES (>50KB)" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor DarkGray

$largeFiles = Get-ChildItem -Path $Path -Recurse -File | Where-Object { $_.Length -gt 50KB } | Sort-Object Length -Descending
if ($largeFiles) {
    $largeFiles | Select-Object -First 20 | ForEach-Object {
        $sizeKB = [math]::Round($_.Length / 1KB, 2)
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        Write-Host "   [FILE] $($_.FullName.Replace('$PWD\', '')) - $sizeKB KB ($sizeMB MB)" -ForegroundColor Red
    }
} else {
    Write-Host "   [OK] No files >50KB" -ForegroundColor Green
}
Write-Host ""

# ============================================
# 6. COMPONENTES POR CATEGORIA
# ============================================
Write-Host "6. COMPONENTS BY CATEGORY" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor DarkGray

$categories = @{
    "Panels" = "panels"
    "Layout" = "layout"
    "Common" = "common"
    "Visualizations" = "visualizations"
    "AI" = "ai"
    "Reports" = "reports"
    "Wizard" = "wizard"
    "Templates" = "templates"
    "Docs" = "docs"
    "Feeders" = "feeders"
    "Optimization" = "optimization"
    "Validation" = "validation"
}

foreach ($cat in $categories.Keys) {
    $componentPath = "$Path\components\$($categories[$cat])"
    if (Test-Path $componentPath) {
        $count = (Get-ChildItem -Path $componentPath -Filter "*.jsx" -ErrorAction SilentlyContinue).Count
        Write-Host "   $cat : $count components" -ForegroundColor Green
    }
}
Write-Host ""

# ============================================
# 7. SERVICIOS Y UTILIDADES
# ============================================
Write-Host "7. SERVICES AND UTILITIES" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor DarkGray

$services = Get-ChildItem -Path "$Path\services" -Filter "*.js" -ErrorAction SilentlyContinue
$utils = Get-ChildItem -Path "$Path\utils" -Filter "*.js" -ErrorAction SilentlyContinue
$hooks = Get-ChildItem -Path "$Path\hooks" -Filter "*.js" -ErrorAction SilentlyContinue

Write-Host "   [SRV] Services: $($services.Count)" -ForegroundColor Cyan
$services | ForEach-Object { Write-Host "      - $($_.Name)" -ForegroundColor Gray }

Write-Host "   [UTL] Utilities: $($utils.Count)" -ForegroundColor Cyan
$utils | ForEach-Object { Write-Host "      - $($_.Name)" -ForegroundColor Gray }

Write-Host "   [HKS] Hooks: $($hooks.Count)" -ForegroundColor Cyan
$hooks | ForEach-Object { Write-Host "      - $($_.Name)" -ForegroundColor Gray }
Write-Host ""

# ============================================
# 8. ARCHIVOS SIN REFERENCIA (POSIBLES HUERFANOS)
# ============================================
Write-Host "8. FILES WITHOUT REFERENCES (POSSIBLE ORPHANS)" -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor DarkGray

$allFiles = Get-ChildItem -Path $Path -Recurse -Include "*.js", "*.jsx" | Where-Object { $_.Name -notlike "index.*" }
$orphans = @()

foreach ($file in $allFiles) {
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    $references = Select-String -Path "$Path\**\*.js", "$Path\**\*.jsx" -Pattern "$fileName" -ErrorAction SilentlyContinue
    if ($references.Count -eq 1) {  # Solo la propia definicion
        $orphans += $file.FullName.Replace("$PWD\", "")
    }
}

if ($orphans) {
    $orphans | ForEach-Object { Write-Host "   [WARN] $_" -ForegroundColor Yellow }
} else {
    Write-Host "   [OK] No orphan files detected" -ForegroundColor Green
}
Write-Host ""

# ============================================
# 9. RESUMEN FINAL
# ============================================
Write-Host "FINAL SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$totalFiles = (Get-ChildItem -Path $Path -Recurse -File).Count
$totalJS = (Get-ChildItem -Path $Path -Recurse -Include "*.js", "*.jsx").Count
$totalCSS = (Get-ChildItem -Path $Path -Recurse -Include "*.css", "*.scss").Count
$totalSize = [math]::Round((Get-ChildItem -Path $Path -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB, 2)

Write-Host ""
Write-Host "   [SUM] Total files: $totalFiles" -ForegroundColor Green
Write-Host "   [SUM] JS/JSX files: $totalJS" -ForegroundColor Green
Write-Host "   [SUM] CSS files: $totalCSS" -ForegroundColor Green
Write-Host "   [SUM] Total size: $totalSize MB" -ForegroundColor Green
Write-Host ""

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[OK] ANALYSIS COMPLETED" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
