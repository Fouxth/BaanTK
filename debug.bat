@echo off
title BaanTK Debug Console
color 0A

echo ======================================
echo 🐛 BaanTK Debug Mode
echo ======================================
echo.

echo 📍 Current Directory: %cd%
echo 📅 Date: %date% %time%
echo 💻 Node Version:
node --version
echo.

echo 🔍 Checking project structure...
echo.
if exist "functions" (
    echo ✅ functions/ folder exists
) else (
    echo ❌ functions/ folder missing
)

if exist "functions\package.json" (
    echo ✅ functions/package.json exists
) else (
    echo ❌ functions/package.json missing
)

if exist "functions\.env" (
    echo ✅ functions/.env exists
) else (
    echo ⚠️ functions/.env missing - this may cause errors
)

if exist "functions\node_modules" (
    echo ✅ functions/node_modules exists
) else (
    echo ❌ functions/node_modules missing - run npm install
)

echo.
echo 🔥 Checking Firebase CLI...
firebase --version
if %errorlevel% neq 0 (
    echo ❌ Firebase CLI not found
    echo 💡 Install: npm install -g firebase-tools
    echo.
)

echo.
echo 📦 Checking dependencies in functions...
cd functions

echo 🔍 Current dependencies:
call npm list --depth=0 2>nul

echo.
echo 🧪 Testing Node.js syntax...
node -c index.js
if %errorlevel% neq 0 (
    echo ❌ Syntax error found in index.js
) else (
    echo ✅ index.js syntax is OK
)

echo.
echo 🔧 Environment Variables Check:
if exist ".env" (
    echo ✅ .env file found
    echo 📋 Variables defined:
    for /f "tokens=1 delims==" %%i in (.env) do echo   - %%i
) else (
    echo ❌ .env file not found
    echo 💡 Copy .env.example to .env and fill in values
)

echo.
echo 🚨 Common Error Solutions:
echo ----------------------------------------
echo 1. Missing dependencies:
echo    cd functions ^&^& npm install
echo.
echo 2. Missing .env file:
echo    copy .env.example .env
echo    ^(then edit .env with your values^)
echo.
echo 3. Firebase not logged in:
echo    firebase login
echo.
echo 4. Wrong Firebase project:
echo    firebase use your-project-id
echo.
echo 5. Billing not enabled:
echo    Enable billing in Firebase Console
echo.
echo 6. Invalid LINE tokens:
echo    Check Channel Access Token and Secret
echo.

cd ..

echo ========================================
echo 🔚 Debug Complete
echo ========================================
echo.
echo Press any key to exit...
pause >nul
