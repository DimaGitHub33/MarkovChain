@echo off
rem Opens the app in the browser once the server answers. Usage: open_when_ready.bat PORT
setlocal
set "PORT=%~1"
for /l %%i in (1,1,120) do (
    curl.exe -s -f -o nul --noproxy "*" --max-time 2 http://127.0.0.1:%PORT%/api/health && (
        start "" http://localhost:%PORT%
        exit /b 0
    )
    ping -n 2 127.0.0.1 >nul
)
exit /b 1
