@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: instala Node.js 20 o superior.
  pause
  exit /b 1
)
echo Descargando poligonos oficiales SERNAGEOMIN. No se generan geometrias artificiales.
node tools/sync-relaves.mjs
pause
