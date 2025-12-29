@echo off
echo Starting Recruitment Software...

:: Start Backend
echo Starting Python Backend on port 8000...
start "Python Backend" cmd /k "cd /d %~dp0 && call .venv\Scripts\activate && python -m uvicorn backend.main:app --reload --port 8000"

:: Start Frontend
echo Starting React Frontend on port 5173...
start "React Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Application started!
echo -------------------------------------------
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000/docs
echo -------------------------------------------
echo.
