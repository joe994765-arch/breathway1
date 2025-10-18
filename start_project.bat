@echo off
echo 🚀 Starting Clean Route Radar Project...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo 📦 Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install Python dependencies
    pause
    exit /b 1
)

echo ✅ Python dependencies installed
echo.

echo 🐍 Starting Flask backend...
start "Flask Backend" cmd /k "python app.py"

REM Wait a moment for Flask to start
timeout /t 3 /nobreak >nul

echo ⚛️ Starting React frontend...
start "React Frontend" cmd /k "npm run dev"

echo.
echo ✅ Both servers are starting...
echo 🌐 Flask backend: http://localhost:5000
echo 🌐 React frontend: http://localhost:5173
echo.
echo Press any key to exit...
pause >nul
