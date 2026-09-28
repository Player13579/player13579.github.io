@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18 or newer is required. See README.md.
  pause
  exit /b 1
)
start "EMP E r0.3" http://localhost:8080
node tools\serve.mjs
pause
