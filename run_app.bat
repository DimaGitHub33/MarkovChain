@echo off
rem Launches the Customer Care Call Prediction app at http://localhost:8900
rem First run: creates a Python environment, installs packages and builds the web interface.
setlocal
title Customer Care Call Prediction
rem Always work from this file's folder, whatever folder the launcher was started from
rem (pushd also maps network paths to a temporary drive letter).
pushd "%~dp0" || (
    echo Could not open the app folder: %~dp0
    goto :fail
)

set "PORT=8900"
set "VENV=.venv"
set "PY=%VENV%\Scripts\python.exe"

rem ---- 1. Python environment -------------------------------------------------
if not exist "%PY%" (
    set "BASE_PY="
    where python >nul 2>&1 && set "BASE_PY=python"
    if not defined BASE_PY where py >nul 2>&1 && set "BASE_PY=py -3"
    if not defined BASE_PY (
        echo Python was not found. Install Python 3.11 or newer from https://www.python.org and try again.
        goto :fail
    )
    echo Creating the Python environment...
    call %%BASE_PY%% -m venv "%VENV%"
    if errorlevel 1 (
        echo Could not create the Python environment.
        goto :fail
    )
)

"%PY%" -c "import fastapi, uvicorn, numpy" >nul 2>&1
if errorlevel 1 (
    echo Installing the Python packages...
    "%PY%" -m pip install --disable-pip-version-check -q -r backend\requirements.txt
    if errorlevel 1 (
        echo Could not install the Python packages.
        goto :fail
    )
)

rem ---- 2. Web interface (built once; rebuild with scripts\build_frontend.bat) --
if not exist "frontend\dist\index.html" (
    call scripts\build_frontend.bat
    if errorlevel 1 goto :fail
)

rem ---- 3. Start ---------------------------------------------------------------
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul
if not errorlevel 1 (
    echo Port %PORT% is already in use. The app may already be running: http://localhost:%PORT%
    goto :fail
)

echo.
echo Starting the app at http://localhost:%PORT%
echo The model trains on startup; the browser opens when it is ready.
echo Close this window to stop the app.
echo.

if not defined NO_BROWSER (
    start "" /b cmd /c scripts\open_when_ready.bat %PORT%
)

"%PY%" -m uvicorn api.main:app --app-dir backend --host 127.0.0.1 --port %PORT%
if errorlevel 1 goto :fail
exit /b 0

:fail
echo.
pause
exit /b 1
