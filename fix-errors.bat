@echo off
echo 🔧 Fixing BaanTK Common Errors...

echo.
echo 📦 Installing missing dependencies...
cd functions
call npm install @google-cloud/storage axios uuid cors express-rate-limit jsonwebtoken validator --save

echo.
echo 🧹 Cleaning node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    call npm install
)

echo.
echo 🔍 Checking for syntax errors...
call npm run lint --silent
if %errorlevel% neq 0 (
    echo ⚠️ Found linting issues, but continuing...
)

echo.
echo 🧪 Running basic tests...
call npm test --silent
if %errorlevel% neq 0 (
    echo ⚠️ Some tests failed, but continuing...
)

echo.
echo 🔥 Testing Firebase functions locally...
call firebase functions:shell --non-interactive < nul
if %errorlevel% neq 0 (
    echo ❌ Functions shell test failed
    echo 💡 Please check your .env file and Firebase configuration
)

cd ..

echo.
echo ✅ Error fixing completed!
echo.
echo 🔧 If you're still getting errors, please check:
echo   1. .env file is properly configured
echo   2. Firebase project is set up correctly
echo   3. LINE Bot tokens are valid
echo   4. Firebase billing is enabled
echo.
pause
