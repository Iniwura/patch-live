@echo off
setlocal
rem PATCH//LIVE one-click WSL Codex launcher. Uses only the extracted project folder.
wsl.exe --cd "%~dp0" bash ./START_CODEX.sh
if errorlevel 1 (
  echo.
  echo Codex could not start. Ensure WSL Ubuntu and Node/npm are installed.
  echo Open CODEX_START.md for instructions.
  pause
)
endlocal
