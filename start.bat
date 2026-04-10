@echo off
echo Starting Breathway Project...

echo.
echo [1/2] Starting Backend Server...
start cmd /k "cd backend && python app.py"

echo.
echo [2/2] Starting Frontend Server...
cd frontend
npm run dev

pause
