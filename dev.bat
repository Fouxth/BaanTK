@echo off
echo 🛠️ Starting BaanTK Development Environment...

echo.
echo 📦 Installing dependencies...
cd functions
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b %errorlevel%
)

echo.
echo 🔥 Starting Firebase Emulators...
echo.
echo 📱 Your development URLs:
echo   - Hosting: http://localhost:5000
echo   - Functions: http://localhost:5001
echo   - Firestore: http://localhost:8080
echo   - Storage: http://localhost:9199
echo   - Emulator UI: http://localhost:4000
echo.
echo 🔧 Admin Dashboard: http://localhost:5000/admin
echo 📱 LIFF Register: http://localhost:5000
echo.
echo Press Ctrl+C to stop emulators
echo.

cd ..
call firebase emulators:start --import ./emulator-data --export-on-exit ./emulator-data

pause
