# Publish CafeClient for Windows x64
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "Publishing CafeClient..."
dotnet publish CafeClient\CafeClient.csproj `
    -c Release `
    -r win-x64 `
    --self-contained true `
    -p:PublishSingleFile=true `
    -p:IncludeNativeLibrariesForSelfExtract=true `
    -o CafeClient\publish

Write-Host "Done. Output: CafeClient\publish\CafeClient.exe"
