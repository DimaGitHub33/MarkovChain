@echo off
rem Development mode: backend with auto-reload on :8000, frontend with hot reload on :5173.
setlocal
cd /d "%~dp0.."

if not exist ".venv\Scripts\python.exe" (
    echo Run run_app.bat once first, to create the Python environment.
    exit /b 1
)
set "NODE_DIR="
where node >nul 2>&1 || if exist "%LOCALAPPDATA%\MarkovChainTools\node\node.exe" set "NODE_DIR=%LOCALAPPDATA%\MarkovChainTools\node"
if defined NODE_DIR set "PATH=%NODE_DIR%;%PATH%"

start "Backend :8000" cmd /k ".venv\Scripts\python.exe -m uvicorn api.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload --reload-dir backend"
start "Frontend :5173" cmd /k "cd frontend && npm run dev"
echo Backend:  http://127.0.0.1:8000/api/docs
echo Frontend: http://localhost:5173
