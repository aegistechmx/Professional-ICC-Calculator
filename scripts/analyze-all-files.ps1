# scripts/analyze-all-files.ps1
# Análisis DETALLADO de todos los archivos del proyecto

param(
    [string]$Path = $null,
    [switch]$Detailed = $true,
    [string]$ReportFile = $null
)

# Auto-detectar directorio raíz del proyecto
if (-not $Path) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $projectRoot = Split-Path -Parent $scriptDir
    $Path = $projectRoot
}

# Verificar que el path existe
if (-not (Test-Path $Path)) {
    Write-Host "[ERROR] Directory not found: $Path" -ForegroundColor Red
    Write-Host "[INFO] Usage: .\analyze-all-files.ps1 -Path 'C:\path\to\project'" -ForegroundColor Yellow
    exit 1
}

# Configurar archivo de reporte
if (-not $ReportFile) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $ReportFile = "$Path\analysis_report_$timestamp.txt"
}

# Función para excluir node_modules
function Get-FilesExcludingNodeModules {
    param(
        [string]$Path,
        [string[]]$Include = @(),
        [switch]$Directory
    )
    
    $excludePattern = "node_modules"
    if ($Directory) {
        Get-ChildItem -Path $Path -Directory -Recurse | Where-Object { $_.FullName -notlike "*$excludePattern*" }
    } elseif ($Include.Count -gt 0) {
        Get-ChildItem -Path $Path -Recurse -Include $Include | Where-Object { $_.FullName -notlike "*$excludePattern*" }
    } else {
        Get-ChildItem -Path $Path -Recurse -File | Where-Object { $_.FullName -notlike "*$excludePattern*" }
    }
}

# Iniciar captura de salida para el reporte
$output = New-Object System.Collections.Generic.List[string]

$output.Add("════════════════════════════════════════════════════════════")
$output.Add("DETAILED FILE ANALYSIS - ICC CALCULATOR")
$output.Add("════════════════════════════════════════════════════════════")
$output.Add("Directory analyzed: $Path")
$output.Add("Excluded: node_modules folders")
$output.Add("")

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "DETAILED FILE ANALYSIS - ICC CALCULATOR" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Directory analyzed: $Path" -ForegroundColor Gray
Write-Host "Excluded: node_modules folders" -ForegroundColor Gray
Write-Host ""

# ============================================
# 1. ESTRUCTURA DE CARPETAS
# ============================================
Write-Host "1. FOLDER STRUCTURE" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────" -ForegroundColor DarkGray

$output.Add("1. FOLDER STRUCTURE")
$output.Add("────────────────────────────────────────────────────────")

$allDirs = Get-FilesExcludingNodeModules -Path $Path -Directory
$allDirs | ForEach-Object {
    $fileCount = (Get-ChildItem $_.FullName -File -Recurse | Where-Object { $_.FullName -notlike "*node_modules*" }).Count
    $indent = "  " * ($_.FullName.Split('\').Count - ($Path.Split('\').Count))
    $line = "$indent[DIR] $($_.Name) ($fileCount files)"
    Write-Host $line -ForegroundColor Green
    $output.Add($line)
}
Write-Host ""
$output.Add("")

# ============================================
# 2. ANÁLISIS POR TIPO DE ARCHIVO
# ============================================
Write-Host "2. FILES BY TYPE" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────" -ForegroundColor DarkGray

$output.Add("2. FILES BY TYPE")
$output.Add("────────────────────────────────────────────────────────")

$allFiles = Get-FilesExcludingNodeModules -Path $Path
$extensions = $allFiles | Group-Object Extension | Sort-Object Count -Descending
$extensions | ForEach-Object {
    $line = "   $($_.Name) : $($_.Count) files"
    Write-Host $line -ForegroundColor Cyan
    $output.Add($line)
}
Write-Host ""
$output.Add("")

# ============================================
# 3. ANÁLISIS DETALLADO POR SUBDIRECTORIO
# ============================================
Write-Host "3. ANALYSIS BY SUBDIRECTORY" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────" -ForegroundColor DarkGray

$output.Add("3. ANALYSIS BY SUBDIRECTORY")
$output.Add("────────────────────────────────────────────────────────")

$directories = Get-ChildItem -Path $Path -Directory | Where-Object { $_.Name -ne "node_modules" }
foreach ($dir in $directories) {
    $files = Get-ChildItem -Path $dir.FullName -Recurse -File | Where-Object { $_.FullName -notlike "*node_modules*" }
    $jsFiles = $files | Where-Object { $_.Extension -in '.js', '.jsx', '.ts', '.tsx' }
    $cssFiles = $files | Where-Object { $_.Extension -in '.css', '.scss' }
    $jsonFiles = $files | Where-Object { $_.Extension -eq '.json' }
    
    Write-Host ""
    Write-Host "[DIR] $($dir.Name)/" -ForegroundColor Magenta
    Write-Host "   |-- Total files: $($files.Count)" -ForegroundColor Gray
    Write-Host "   |-- JS/TS/JSX: $($jsFiles.Count)" -ForegroundColor Green
    Write-Host "   |-- CSS: $($cssFiles.Count)" -ForegroundColor Blue
    Write-Host "   |-- JSON: $($jsonFiles.Count)" -ForegroundColor Yellow
    
    $output.Add("")
    $output.Add("[DIR] $($dir.Name)/")
    $output.Add("   |-- Total files: $($files.Count)")
    $output.Add("   |-- JS/TS/JSX: $($jsFiles.Count)")
    $output.Add("   |-- CSS: $($cssFiles.Count)")
    $output.Add("   |-- JSON: $($jsonFiles.Count)")
    
    if ($Detailed -and $jsFiles.Count -le 20) {
        Write-Host "   |-- Files:" -ForegroundColor DarkGray
        $output.Add("   |-- Files:")
        foreach ($file in $jsFiles) {
            $sizeKB = [math]::Round($file.Length / 1KB, 2)
            $line = "       [FILE] $($file.Name) ($sizeKB KB)"
            Write-Host $line -ForegroundColor Gray
            $output.Add($line)
        }
    }
}
Write-Host ""
$output.Add("")

# ============================================
# 4. ANÁLISIS DE IMPORTACIONES
# ============================================
Write-Host "4. IMPORT ANALYSIS" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────" -ForegroundColor DarkGray

$output.Add("4. IMPORT ANALYSIS")
$output.Add("────────────────────────────────────────────────────────")

$jsFiles = Get-FilesExcludingNodeModules -Path $Path -Include @("*.js", "*.jsx")
$imports = Select-String -Path $jsFiles.FullName -Pattern "import.*from" -ErrorAction SilentlyContinue
$uniqueImports = $imports | ForEach-Object { $_ -replace "import.*from ['`"]", '' -replace "['`"].*", '' } | Sort-Object -Unique

$line = "   Total unique imports: $($uniqueImports.Count)"
Write-Host $line -ForegroundColor Cyan
$output.Add($line)
Write-Host ""
$output.Add("")

# ============================================
# 5. ARCHIVOS MÁS GRANDES
# ============================================
Write-Host "5. LARGEST FILES (>50KB)" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────" -ForegroundColor DarkGray

$output.Add("5. LARGEST FILES (>50KB)")
$output.Add("────────────────────────────────────────────────────────")

$largeFiles = Get-FilesExcludingNodeModules -Path $Path | Where-Object { $_.Length -gt 50KB } | Sort-Object Length -Descending
if ($largeFiles) {
    $largeFiles | Select-Object -First 20 | ForEach-Object {
        $sizeKB = [math]::Round($_.Length / 1KB, 2)
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        $line = "   [FILE] $($_.FullName.Replace('$PWD\', '')) - $sizeKB KB ($sizeMB MB)"
        Write-Host $line -ForegroundColor Red
        $output.Add($line)
    }
} else {
    $line = "   [OK] No files >50KB"
    Write-Host $line -ForegroundColor Green
    $output.Add($line)
}
Write-Host ""
$output.Add("")

# ============================================
# 6. COMPONENTES POR CATEGORÍA
# ============================================
Write-Host "6. COMPONENTS BY CATEGORY" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────" -ForegroundColor DarkGray

$output.Add("6. COMPONENTS BY CATEGORY")
$output.Add("────────────────────────────────────────────────────────")

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
        $line = "   $cat : $count components"
        Write-Host $line -ForegroundColor Green
        $output.Add($line)
    }
}
Write-Host ""
$output.Add("")

# ============================================
# 7. SERVICIOS Y UTILIDADES
# ============================================
Write-Host "7. SERVICES AND UTILITIES" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────" -ForegroundColor DarkGray

$output.Add("7. SERVICES AND UTILITIES")
$output.Add("────────────────────────────────────────────────────────")

$services = Get-ChildItem -Path "$Path\services" -Filter "*.js" -ErrorAction SilentlyContinue
$utils = Get-ChildItem -Path "$Path\utils" -Filter "*.js" -ErrorAction SilentlyContinue
$hooks = Get-ChildItem -Path "$Path\hooks" -Filter "*.js" -ErrorAction SilentlyContinue

$line = "   [SRV] Services: $($services.Count)"
Write-Host $line -ForegroundColor Cyan
$output.Add($line)
$services | ForEach-Object { 
    $line = "      - $($_.Name)"
    Write-Host $line -ForegroundColor Gray
    $output.Add($line)
}

$line = "   [UTL] Utilities: $($utils.Count)"
Write-Host $line -ForegroundColor Cyan
$output.Add($line)
$utils | ForEach-Object { 
    $line = "      - $($_.Name)"
    Write-Host $line -ForegroundColor Gray
    $output.Add($line)
}

$line = "   [HKS] Hooks: $($hooks.Count)"
Write-Host $line -ForegroundColor Cyan
$output.Add($line)
$hooks | ForEach-Object { 
    $line = "      - $($_.Name)"
    Write-Host $line -ForegroundColor Gray
    $output.Add($line)
}
Write-Host ""
$output.Add("")

# ============================================
# 8. ARCHIVOS SIN REFERENCIA (POSIBLES HUÉRFANOS)
# ============================================
Write-Host "8. FILES WITHOUT REFERENCES (POSSIBLE ORPHANS)" -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────" -ForegroundColor DarkGray

$output.Add("8. FILES WITHOUT REFERENCES (POSSIBLE ORPHANS)")
$output.Add("────────────────────────────────────────────────────────")

$allFiles = Get-FilesExcludingNodeModules -Path $Path -Include @("*.js", "*.jsx") | Where-Object { $_.Name -notlike "index.*" }
$jsFilesForSearch = Get-FilesExcludingNodeModules -Path $Path -Include @("*.js", "*.jsx")
$orphans = @()

foreach ($file in $allFiles) {
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    $references = Select-String -Path $jsFilesForSearch.FullName -Pattern "$fileName" -ErrorAction SilentlyContinue
    if ($references.Count -eq 1) {  # Solo la propia definición
        $orphans += $file.FullName.Replace("$PWD\", "")
    }
}

if ($orphans) {
    $orphans | ForEach-Object { 
        $line = "   [WARN] $_"
        Write-Host $line -ForegroundColor Yellow
        $output.Add($line)
    }
} else {
    $line = "   [OK] No orphan files detected"
    Write-Host $line -ForegroundColor Green
    $output.Add($line)
}
Write-Host ""
$output.Add("")

# ============================================
# 9. RESUMEN FINAL
# ============================================
Write-Host "FINAL SUMMARY" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan

$output.Add("FINAL SUMMARY")
$output.Add("════════════════════════════════════════════════════════════")

$totalFiles = (Get-FilesExcludingNodeModules -Path $Path).Count
$totalJS = (Get-FilesExcludingNodeModules -Path $Path -Include @("*.js", "*.jsx")).Count
$totalCSS = (Get-FilesExcludingNodeModules -Path $Path -Include @("*.css", "*.scss")).Count
$totalSize = [math]::Round((Get-FilesExcludingNodeModules -Path $Path | Measure-Object -Property Length -Sum).Sum / 1MB, 2)

Write-Host ""
Write-Host "   [SUM] Total files: $totalFiles" -ForegroundColor Green
Write-Host "   [SUM] JS/JSX files: $totalJS" -ForegroundColor Green
Write-Host "   [SUM] CSS files: $totalCSS" -ForegroundColor Green
Write-Host "   [SUM] Total size: $totalSize MB" -ForegroundColor Green
Write-Host ""

$output.Add("")
$output.Add("   [SUM] Total files: $totalFiles")
$output.Add("   [SUM] JS/JSX files: $totalJS")
$output.Add("   [SUM] CSS files: $totalCSS")
$output.Add("   [SUM] Total size: $totalSize MB")
$output.Add("")

# Generar archivo de reporte
$output.Add("════════════════════════════════════════════════════════════")
$output.Add("[OK] ANALYSIS COMPLETED")
$output.Add("Report generated: $ReportFile")
$output.Add("════════════════════════════════════════════════════════════")

$output | Out-File -FilePath $ReportFile -Encoding UTF8

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "[OK] ANALYSIS COMPLETED" -ForegroundColor Green
Write-Host "[INFO] Report saved to: $ReportFile" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan