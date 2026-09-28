@echo off
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (node tools\serve.mjs & exit /b)
where py >nul 2>nul
if %errorlevel%==0 (py -3 -m http.server 8080 --bind 127.0.0.1 & exit /b)
echo Node.js 20+ or Python 3 is required.
pause
