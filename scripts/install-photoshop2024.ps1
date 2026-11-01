$ErrorActionPreference = 'Stop'
$pintaRoot = Split-Path -Parent $PSScriptRoot
$pintaSource = Join-Path $pintaRoot 'dist\photoshop2024\PINTACOMEUPINTO'
$pintaTarget = 'C:\Program Files\Adobe\Adobe Photoshop 2024\Plug-ins\Pinta-Presets'
$pintaRecord = Join-Path $pintaRoot 'install-local.json'
$pintaFiles = @('manifest.json', 'index.html', 'style.css', 'src/core.js', 'src/host.js', 'src/ui.js')
try {
    if (-not (Test-Path -LiteralPath 'C:\Program Files\Adobe\Adobe Photoshop 2024\Photoshop.exe')) { throw 'Photoshop 2024 não encontrado.' }
    $pintaManifest = Get-Content -LiteralPath (Join-Path $pintaSource 'manifest.json') -Raw | ConvertFrom-Json
    if ($pintaManifest.id -ne 'br.pinta.panel' -or $pintaManifest.host.app -ne 'PS') { throw 'Manifesto de instalação inesperado.' }
    foreach ($pintaFile in $pintaFiles) {
        if (-not (Test-Path -LiteralPath (Join-Path $pintaSource $pintaFile) -PathType Leaf)) { throw "Arquivo ausente: $pintaFile" }
    }
    if (Test-Path -LiteralPath $pintaTarget) { throw 'A pasta de destino já existe. Nenhum arquivo foi substituído.' }
    New-Item -ItemType Directory -Path $pintaTarget | Out-Null
    Copy-Item -LiteralPath (Join-Path $pintaSource 'manifest.json'), (Join-Path $pintaSource 'index.html'), (Join-Path $pintaSource 'style.css'), (Join-Path $pintaSource 'src') -Destination $pintaTarget -Recurse
    foreach ($pintaFile in $pintaFiles) {
        $pintaOriginalHash = (Get-FileHash -LiteralPath (Join-Path $pintaSource $pintaFile) -Algorithm SHA256).Hash
        $pintaInstalledHash = (Get-FileHash -LiteralPath (Join-Path $pintaTarget $pintaFile) -Algorithm SHA256).Hash
        if ($pintaOriginalHash -ne $pintaInstalledHash) { throw "Cópia divergente: $pintaFile" }
    }
    @{status='copied-and-hash-verified'; target=$pintaTarget; files=$pintaFiles; photoshopLoaded=$false; time=(Get-Date -Format o)} | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $pintaRecord -Encoding UTF8
} catch {
    @{status='failed'; target=$pintaTarget; error=$_.Exception.Message; photoshopLoaded=$false; time=(Get-Date -Format o)} | ConvertTo-Json | Set-Content -LiteralPath $pintaRecord -Encoding UTF8
    exit 1
}


