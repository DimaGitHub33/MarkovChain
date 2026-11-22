@echo off
rem Builds the web interface into frontend\dist. Needs Node.js 22 or newer.
setlocal
cd /d "%~dp0..\frontend"

set "NODE_DIR="
where node >nul 2>&1 && goto :have_node
if exist "%LOCALAPPDATA%\MarkovChainTools\node\node.exe" (
    set "NODE_DIR=%LOCALAPPDATA%\MarkovChainTools\node"
    goto :have_node
)
echo Node.js was not found. Install Node.js 22 LTS from https://nodejs.org and try again.
exit /b 1

:have_node
if defined NODE_DIR set "PATH=%NODE_DIR%;%PATH%"

if not exist "node_modules" (
    echo Installing the web interface packages...
    call npm install --no-audit --no-fund --loglevel=error
    if errorlevel 1 (
        echo Could not install the web interface packages.
        exit /b 1
    )
)

echo Building the web interface...
call npm run build --silent
if errorlevel 1 (
    echo The build failed.
    exit /b 1
)
echo Build complete: frontend\dist
exit /b 0
