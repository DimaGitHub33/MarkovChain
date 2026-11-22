@echo off
rem Launches the Customer Care Call Prediction app at http://localhost:8900
setlocal
title Customer Care Call Prediction
cd /d "%~dp0"

set "PORT=8900"

rem Find Python: prefer "python", fall back to the "py" launcher.
set "PYTHON="
where python >nul 2>&1 && set "PYTHON=python"
if not defined PYTHON (
    where py >nul 2>&1 && set "PYTHON=py -3"
)
if not defined PYTHON (
    echo Python was not found. Install Python 3.11 or newer from https://www.python.org and try again.
    goto :fail
)

rem Install the dependencies the first time, if Streamlit is missing.
%PYTHON% -c "import streamlit" >nul 2>&1
if errorlevel 1 (
    echo Installing the required packages...
    %PYTHON% -m pip install -r requirements.txt
    if errorlevel 1 (
        echo Could not install the required packages.
        goto :fail
    )
)

rem Stop if another program already uses the port.
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul
if not errorlevel 1 (
    echo Port %PORT% is already in use. The app may already be running: http://localhost:%PORT%
    goto :fail
)

echo Starting the app at http://localhost:%PORT%
echo Close this window to stop the app.
echo.
%PYTHON% -m streamlit run app\streamlit_app.py --server.port %PORT% --browser.gatherUsageStats false
if errorlevel 1 goto :fail
exit /b 0

:fail
echo.
pause
exit /b 1
