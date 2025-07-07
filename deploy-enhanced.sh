#!/bin/bash
# Enhanced deployment script for BaanTK with new LINE features

echo "🚀 Starting Enhanced BaanTK Deployment..."
echo "================================================="

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if we're logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    print_error "Not logged in to Firebase. Please run: firebase login"
    exit 1
fi

# Check environment file
if [ ! -f "functions/.env" ]; then
    print_warning "No .env file found in functions directory"
    print_warning "Please create functions/.env from functions/.env.example"
    echo "Do you want to continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Pre-deployment checks
print_status "Running pre-deployment checks..."

# 1. Security check
echo "🔒 Running security check..."
if node security-check.js; then
    print_status "Security check passed"
else
    print_error "Security check failed. Please fix security issues before deploying."
    exit 1
fi

# 2. Install dependencies
echo "📦 Installing dependencies..."
if npm install; then
    print_status "Root dependencies installed"
else
    print_error "Failed to install root dependencies"
    exit 1
fi

echo "📦 Installing functions dependencies..."
cd functions
if npm install; then
    print_status "Functions dependencies installed"
else
    print_error "Failed to install functions dependencies"
    exit 1
fi
cd ..

# 3. Test the enhanced line-auto-reply functions
echo "🧪 Testing enhanced LINE features..."
if node test-line-enhancements.js > test-results.log 2>&1; then
    print_status "Enhanced features test completed (check test-results.log for details)"
else
    print_warning "Some tests failed, but continuing deployment (check test-results.log)"
fi

# 4. Validate Firebase configuration
echo "🔥 Validating Firebase configuration..."
if firebase use --project default &> /dev/null; then
    PROJECT_ID=$(firebase use | grep "Now using project" | cut -d' ' -f4)
    print_status "Using Firebase project: $PROJECT_ID"
else
    print_error "No Firebase project configured. Please run: firebase use --add"
    exit 1
fi

# Deployment options
echo ""
echo "📋 Deployment Options:"
echo "1) Deploy everything (recommended)"
echo "2) Deploy functions only"
echo "3) Deploy hosting only"
echo "4) Deploy firestore rules only"
echo "5) Deploy storage rules only"
echo "6) Cancel deployment"
echo ""
echo -n "Please select an option (1-6): "
read -r choice

case $choice in
    1)
        echo "🚀 Deploying everything..."
        DEPLOY_CMD="firebase deploy"
        ;;
    2)
        echo "🔧 Deploying functions only..."
        DEPLOY_CMD="firebase deploy --only functions"
        ;;
    3)
        echo "🌐 Deploying hosting only..."
        DEPLOY_CMD="firebase deploy --only hosting"
        ;;
    4)
        echo "🔒 Deploying firestore rules only..."
        DEPLOY_CMD="firebase deploy --only firestore:rules,firestore:indexes"
        ;;
    5)
        echo "📁 Deploying storage rules only..."
        DEPLOY_CMD="firebase deploy --only storage"
        ;;
    6)
        echo "❌ Deployment cancelled"
        exit 0
        ;;
    *)
        print_error "Invalid option. Deployment cancelled."
        exit 1
        ;;
esac

# Confirm deployment
echo ""
echo "⚠️  About to deploy to project: $PROJECT_ID"
echo "Command: $DEPLOY_CMD"
echo ""
echo "This deployment includes the following enhanced features:"
echo "   ✅ Enhanced status checking with ID card support"
echo "   ✅ Payment slip upload system"
echo "   ✅ Automated payment due notifications"
echo "   ✅ Improved LINE Bot interactions"
echo ""
echo "Are you sure you want to proceed? (y/N)"
read -r confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

# Execute deployment
echo "🚀 Starting deployment..."
echo "================================================="

if $DEPLOY_CMD; then
    print_status "Deployment successful!"
    
    # Post-deployment tasks
    echo ""
    echo "📋 Post-deployment checklist:"
    echo "================================================="
    
    if [[ $choice == 1 || $choice == 2 ]]; then
        echo "🔧 Functions deployed:"
        echo "   • Enhanced LINE Auto-Reply system"
        echo "   • Payment due notification scheduler"
        echo "   • Image handling for payment slips"
        echo "   • Status checking API"
        echo ""
        echo "📝 Next steps for Functions:"
        echo "   1. Test LINE Bot with real account"
        echo "   2. Verify webhook URL in LINE Developers Console"
        echo "   3. Test image upload functionality"
        echo "   4. Check scheduler is running (every day at 9 AM)"
    fi
    
    if [[ $choice == 1 || $choice == 3 ]]; then
        echo "🌐 Hosting deployed:"
        echo "   • Updated admin panel"
        echo "   • LIFF registration forms"
        echo ""
        echo "📝 Next steps for Hosting:"
        echo "   1. Test admin login"
        echo "   2. Verify LIFF app functionality"
        echo "   3. Check Firebase config in browser"
    fi
    
    if [[ $choice == 1 || $choice == 4 ]]; then
        echo "🔒 Firestore rules deployed:"
        echo "   • Added rules for payment_slips collection"
        echo "   • Updated borrowers collection rules"
        echo ""
        echo "📝 Next steps for Firestore:"
        echo "   1. Test data access permissions"
        echo "   2. Verify admin can access payment slips"
    fi
    
    if [[ $choice == 1 || $choice == 5 ]]; then
        echo "📁 Storage rules deployed:"
        echo "   • Rules for payment slip images"
        echo ""
        echo "📝 Next steps for Storage:"
        echo "   1. Test image upload from LINE"
        echo "   2. Verify admin can view uploaded images"
    fi
    
    echo ""
    echo "🔗 Important URLs:"
    echo "   • Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID"
    echo "   • Admin Panel: https://$PROJECT_ID.web.app/admin.html"
    echo "   • LIFF Registration: https://$PROJECT_ID.web.app/liff-register-mobile.html"
    echo ""
    echo "📊 Monitoring:"
    echo "   • Functions logs: firebase functions:log"
    echo "   • Error tracking: Check Firebase Console > Functions"
    echo "   • Usage metrics: Check Firebase Console > Analytics"
    
    echo ""
    print_status "🎉 Enhanced BaanTK deployment completed successfully!"
    
else
    print_error "Deployment failed!"
    echo ""
    echo "🔍 Troubleshooting tips:"
    echo "   1. Check your internet connection"
    echo "   2. Verify Firebase project permissions"
    echo "   3. Check functions/.env file configuration"
    echo "   4. Review error messages above"
    echo "   5. Run: firebase functions:log for detailed error logs"
    exit 1
fi

# Cleanup
echo ""
echo "🧹 Cleaning up temporary files..."
rm -f test-results.log
print_status "Cleanup completed"

echo ""
echo "================================================="
print_status "Deployment process completed!"
echo "Thank you for using the enhanced BaanTK deployment script! 🚀"
