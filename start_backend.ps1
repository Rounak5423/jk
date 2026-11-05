# PowerShell script to start JK Tyre backend server
Write-Host "Starting JK Tyre Fleet Intelligence Platform Backend..." -ForegroundColor Green
Set-Location -Path "$PSScriptRoot\backend"
& ".\venv\Scripts\python.exe" run.py
