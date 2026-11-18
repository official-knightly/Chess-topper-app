@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required. Install it from https://nodejs.org/
  pause
  exit /b 1
)
echo Installing Chessist Local dependencies...
call npm install
if errorlevel 1 (
  echo Dependency installation failed.
  pause
  exit /b 1
)
echo Launching Chessist Local desktop app...
call npm run dev
