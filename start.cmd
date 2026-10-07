@echo off
rem Double-click to open the site locally. Close this window to stop.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve.ps1" -Open
