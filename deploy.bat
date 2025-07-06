@echo off
title BaanTK Deployment
color 0B
echo ========================================
echo 🚀 Starting BaanTK Deployment...
echo ========================================

echo.
echo 🔍 Pre-deployment checks...
echo 📍 Current directory: %cd%
echo 💻 Node version:
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js first.
    echo 💡 Download from: https://nodejs.org
    pause
    exit /b 1
)

echo 🔥 Firebase CLI version:
firebase --version
if %errorlevel% neq 0 (
    echo ❌ Firebase CLI not found! Installing...
    call npm install -g firebase-tools
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Firebase CLI
        pause
        exit /b 1
    )
)

echo.
echo 🔐 Checking Firebase authentication...
firebase projects:list --non-interactive >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Not logged in to Firebase!
    echo 💡 Running firebase login...
    call firebase login
    if %errorlevel% neq 0 (
        echo ❌ Firebase login failed
        pause
        exit /b 1
    )
)

echo.
echo ✅ Pre-checks completed successfully!
echo.

echo.
echo 📦 Installing dependencies...
if not exist "functions" (
    echo ❌ functions/ directory not found!
    echo 💡 Make sure you're in the correct project directory
    pause
    exit /b 1
)

cd functions

if not exist "package.json" (
    echo ❌ package.json not found in functions/
    echo 💡 This doesn't look like a Firebase Functions project
    pause
    exit /b 1
)

call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    echo 💡 Common solutions:
    echo   - Check your internet connection
    echo   - Try: npm cache clean --force
    echo   - Delete node_modules and try again
    echo   - Check if package.json is valid
    pause
    exit /b %errorlevel%
)
echo ✅ Dependencies installed successfully!

echo.
echo 🔍 Running linter...
call npm run lint --silent
if %errorlevel% neq 0 (
    echo ⚠️ Linting failed!
    echo 💡 Code quality issues found. Details:
    call npm run lint
    echo 🤔 Continue anyway? (Y/N)
    set /p continue="Choice: "
    if /i not "%continue%"=="Y" (
        echo ❌ Deployment cancelled by user
        pause
        exit /b 1
    )
) else (
    echo ✅ Code linting passed!
)

echo.
echo 🧪 Running tests...
call npm test --silent
if %errorlevel% neq 0 (
    echo ⚠️ Tests failed!
    echo 💡 Some tests are not passing. Details:
    call npm test
    echo 🤔 Continue deployment anyway? (Y/N)
    set /p continue="Choice: "
    if /i not "%continue%"=="Y" (
        echo ❌ Deployment cancelled by user
        pause
        exit /b 1
    )
) else (
    echo ✅ All tests passed!
)

cd ..

echo.
echo 🔥 Deploying to Firebase...
echo 📋 Checking current Firebase project...
firebase use --non-interactive
echo.

echo 🚀 Starting deployment (this may take a few minutes)...
call firebase deploy --non-interactive

if %errorlevel% neq 0 (
    echo.
    echo ❌ Deployment failed with error code: %errorlevel%
    echo.
    echo 🔍 Common deployment errors and solutions:
    echo ----------------------------------------
    echo 1. Authentication Error:
    echo    - Run: firebase login
    echo    - Make sure you have access to the project
    echo.
    echo 2. Billing Not Enabled:
    echo    - Enable billing in Firebase Console
    echo    - Cloud Functions require Blaze plan
    echo.
    echo 3. Function Errors:
    echo    - Check functions logs: firebase functions:log
    echo    - Look for syntax errors in index.js
    echo.
    echo 4. Permission Issues:
    echo    - Make sure you're owner/editor of the project
    echo    - Check IAM permissions in Google Cloud Console
    echo.
    echo 5. Quota Exceeded:
    echo    - Check Firebase quotas and limits
    echo    - Wait and try again later
    echo.
    echo 💡 For detailed logs, run: firebase functions:log
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================
echo ✅ Deployment completed successfully!
echo ========================================
echo.

echo 📊 Getting deployment information...
firebase use --non-interactive

echo.
echo 🌐 Your app is now live at:
echo    https://baan-tk.web.app
echo    https://baan-tk.firebaseapp.com
echo.

echo 🤖 LINE Bot webhook URL:
for /f "tokens=2" %%i in ('firebase use --non-interactive') do set PROJECT_ID=%%i
echo    https://asia-southeast1-%PROJECT_ID%.cloudfunctions.net/webhook
echo    (Copy this URL to LINE Developer Console)
echo.

echo 👨‍💼 Admin Dashboard:
echo    https://baan-tk.web.app/admin
echo.

echo 📋 Next steps:
echo ----------------------------------------
echo 1. Set LINE Bot webhook URL in LINE Developer Console
echo 2. Test the bot by adding it to LINE
echo 3. Access admin dashboard to manage users
echo 4. Monitor logs with: firebase functions:log
echo.

echo 💡 Useful commands:
echo    firebase functions:log  - View function logs
echo    firebase hosting:open  - Open hosted site
echo    firebase console       - Open Firebase Console
echo.

echo Press any key to exit...
pause >nul
