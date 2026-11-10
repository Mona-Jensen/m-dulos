@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: instala Node.js 20 o superior desde https://nodejs.org
  pause
  exit /b 1
)
echo SIRM v2 - Servidor local: http://localhost:5187
start "" "http://localhost:5187"
node tools/server.mjs
pause
