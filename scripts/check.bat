@echo off
rem Runs every check: backend tests, frontend tests, type check and build.
setlocal
cd /d "%~dp0.."
set "NODE_DIR="
where node >nul 2>&1 || if exist "%LOCALAPPDATA%\MarkovChainTools\node\node.exe" set "NODE_DIR=%LOCALAPPDATA%\MarkovChainTools\node"
if defined NODE_DIR set "PATH=%NODE_DIR%;%PATH%"

echo === Backend tests ===
pushd backend
..\.venv\Scripts\python.exe -m pytest -q || (popd & exit /b 1)
popd

echo === Frontend tests ===
pushd frontend
call npm test --silent || (popd & exit /b 1)
echo === Type check and build ===
call npm run build --silent || (popd & exit /b 1)
popd
echo All checks passed.
