@echo off
title Ledger - Mini CRM
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ============================================================
    echo   Node.js was not found on this computer.
    echo   Download and install it from https://nodejs.org
    echo   ^(choose the LTS version^), then double-click this file again.
    echo ============================================================
    echo.
    pause
    exit /b 1
)

echo.
echo Starting Ledger... this window must stay open while you use the app.
echo Once you see "Running at: http://localhost:3000", open that address
echo in your browser.
echo.

node server.js
pause
