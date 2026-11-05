# PowerShell script to start JK Tyre frontend dev server
Write-Host "Starting JK Tyre Fleet Intelligence Platform Frontend..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\frontend"
npm run dev
