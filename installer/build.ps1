$ErrorActionPreference='Stop'
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
 node scripts/build-cep.cjs
 if($LASTEXITCODE -ne 0){throw 'Falha no build CEP'}
 Compress-Archive -Path dist/photoshop2024/PINTAKOMEOPINTO-CEP/* -DestinationPath installer/payload.zip -Force
 node -e "const fs=require('fs'),crypto=require('crypto'),path=require('path'),base='dist/photoshop2024/PINTAKOMEOPINTO-CEP';let out=[];function walk(d){for(const n of fs.readdirSync(d)){const p=path.join(d,n);if(fs.statSync(p).isDirectory())walk(p);else out.push(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')+' '+path.relative(base,p).replaceAll('\\','/'));}}walk(base);fs.writeFileSync('installer/checksums.txt',out.join('\n'));"
 & "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /target:winexe /out:PKP-Setup-0.13.0.exe /win32manifest:installer\app.manifest /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll /resource:installer\payload.zip,payload.zip /resource:installer\checksums.txt,checksums.txt 'installer\Setup.cs'
 if($LASTEXITCODE -ne 0){throw 'Falha ao compilar instalador'}
} finally { Pop-Location }
