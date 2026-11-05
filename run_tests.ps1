# PowerShell script to run full automated test suite
Write-Host "Running JK Tyre Fleet Intelligence Platform Automated Tests..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\backend"
& ".\venv\Scripts\python.exe" -m pytest tests -v
Set-Location -Path "$PSScriptRoot\frontend"
npm run build
Write-Host "All backend tests and frontend type-check/build completed!" -ForegroundColor Green
