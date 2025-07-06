@echo off
title BaanTK Error Troubleshooter
color 0C

echo ========================================
echo 🩺 BaanTK Error Troubleshooter
echo ========================================
echo.

echo Select the error you're experiencing:
echo.
echo 1. npm install failed
echo 2. Linting errors
echo 3. Test failures  
echo 4. Firebase deployment failed
echo 5. Node.js not found
echo 6. Firebase CLI not found
echo 7. Authentication errors
echo 8. Billing/quota errors
echo 9. Function runtime errors
echo 0. Run full diagnostic
echo.

set /p choice="Enter your choice (0-9): "

if "%choice%"=="1" goto npm_error
if "%choice%"=="2" goto lint_error
if "%choice%"=="3" goto test_error
if "%choice%"=="4" goto deploy_error
if "%choice%"=="5" goto node_error
if "%choice%"=="6" goto firebase_error
if "%choice%"=="7" goto auth_error
if "%choice%"=="8" goto billing_error
if "%choice%"=="9" goto runtime_error
if "%choice%"=="0" goto full_diagnostic
goto invalid_choice

:npm_error
echo.
echo 🔧 Fixing npm install issues...
echo ----------------------------------------
cd functions
echo 1. Clearing npm cache...
call npm cache clean --force
echo 2. Removing node_modules...
if exist node_modules rmdir /s /q node_modules
echo 3. Removing package-lock.json...
if exist package-lock.json del package-lock.json
echo 4. Reinstalling dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Still failing. Try:
    echo   - Check internet connection
    echo   - Use different npm registry: npm config set registry https://registry.npmjs.org/
    echo   - Run as administrator
) else (
    echo ✅ Dependencies installed successfully!
)
goto end

:lint_error
echo.
echo 🔧 Fixing linting issues...
echo ----------------------------------------
cd functions
echo Running ESLint with auto-fix...
call npm run lint -- --fix
echo.
echo Common linting fixes:
echo - Missing semicolons
echo - Incorrect indentation  
echo - Unused variables
echo - Console.log statements
echo.
echo If errors persist, check .eslintrc.json configuration
goto end

:test_error
echo.
echo 🔧 Fixing test issues...
echo ----------------------------------------
cd functions
echo Installing test dependencies...
call npm install --save-dev mocha chai sinon
echo.
echo Running tests with verbose output...
call npm test -- --reporter spec
echo.
echo If tests still fail:
echo - Check test files in test/ directory
echo - Verify test environment setup
echo - Mock external dependencies
goto end

:deploy_error
echo.
echo 🔧 Fixing deployment issues...
echo ----------------------------------------
echo 1. Checking Firebase login...
firebase whoami
if %errorlevel% neq 0 (
    echo Running firebase login...
    firebase login
)
echo.
echo 2. Checking current project...
firebase use --non-interactive
echo.
echo 3. Checking billing status...
echo Please verify billing is enabled in Firebase Console
echo.
echo 4. Testing functions locally...
cd functions
firebase functions:shell --non-interactive < nul
goto end

:node_error
echo.
echo 🔧 Installing Node.js...
echo ----------------------------------------
echo Node.js is required for this project.
echo.
echo Download and install Node.js 18+ from:
echo https://nodejs.org/
echo.
echo After installation, restart your command prompt.
goto end

:firebase_error
echo.
echo 🔧 Installing Firebase CLI...
echo ----------------------------------------
echo Installing Firebase CLI globally...
call npm install -g firebase-tools
if %errorlevel% neq 0 (
    echo ❌ Installation failed. Try running as administrator.
) else (
    echo ✅ Firebase CLI installed successfully!
    echo Running firebase login...
    firebase login
)
goto end

:auth_error
echo.
echo 🔧 Fixing authentication issues...
echo ----------------------------------------
echo 1. Logging out and back in...
firebase logout
firebase login
echo.
echo 2. Checking project access...
firebase projects:list
echo.
echo 3. Setting correct project...
firebase use baan-tk
if %errorlevel% neq 0 (
    echo ❌ Project 'baan-tk' not found or no access
    echo Please check project ID and permissions
)
goto end

:billing_error
echo.
echo 🔧 Billing and quota issues...
echo ----------------------------------------
echo Cloud Functions require Firebase Blaze plan.
echo.
echo Steps to enable billing:
echo 1. Go to Firebase Console: https://console.firebase.google.com
echo 2. Select your project
echo 3. Go to Settings ^> Usage and billing
echo 4. Upgrade to Blaze plan
echo 5. Set spending limits if needed
echo.
echo Common quota limits:
echo - Function invocations per day
echo - Function execution time
echo - Network egress
goto end

:runtime_error
echo.
echo 🔧 Function runtime errors...
echo ----------------------------------------
echo 1. Checking function logs...
firebase functions:log --limit 50
echo.
echo 2. Common runtime fixes:
echo   - Check .env file exists and has correct values
echo   - Verify Firebase Admin SDK setup
echo   - Check LINE Bot credentials
echo   - Verify database rules
echo.
echo 3. Test function locally:
cd functions
firebase emulators:start --only functions
goto end

:full_diagnostic
echo.
echo 🔬 Running full diagnostic...
echo ========================================
echo.
echo 📋 System Information:
echo Node.js version:
node --version
echo npm version:
npm --version
echo Firebase CLI version:
firebase --version
echo.
echo 📁 Project Structure:
if exist "functions" (echo ✅ functions/) else (echo ❌ functions/)
if exist "functions\package.json" (echo ✅ package.json) else (echo ❌ package.json)
if exist "functions\.env" (echo ✅ .env) else (echo ⚠️ .env missing)
if exist "functions\node_modules" (echo ✅ node_modules) else (echo ❌ node_modules)
if exist "firebase.json" (echo ✅ firebase.json) else (echo ❌ firebase.json)
echo.
echo 🔐 Firebase Status:
firebase whoami
firebase use --non-interactive
echo.
echo 📦 Dependencies Status:
cd functions
call npm list --depth=0
echo.
echo 🧪 Syntax Check:
node -c index.js
if %errorlevel% neq 0 (
    echo ❌ Syntax errors found in index.js
) else (
    echo ✅ index.js syntax OK
)
goto end

:invalid_choice
echo ❌ Invalid choice. Please select 0-9.
pause
goto start

:end
echo.
echo ========================================
echo 🏁 Troubleshooting Complete
echo ========================================
echo.
echo If problems persist:
echo 1. Check Firebase Console for errors
echo 2. Review function logs: firebase functions:log
echo 3. Test locally: firebase emulators:start
echo 4. Check GitHub issues or documentation
echo.
pause
