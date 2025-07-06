#!/bin/bash

# BaanTK Production Deployment Script
# This script deploys the enhanced loan management system to Firebase

echo "🚀 Starting BaanTK Production Deployment..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Please login to Firebase first:"
    echo "firebase login"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd functions
npm install

# Run linter
echo "🔍 Running linter..."
npm run lint

# Build project
echo "🔨 Building project..."
npm run build

# Deploy Firestore rules and indexes
echo "📝 Deploying Firestore rules and indexes..."
cd ..
firebase deploy --only firestore:rules,firestore:indexes

# Deploy storage rules
echo "🗄️ Deploying storage rules..."
firebase deploy --only storage

# Deploy Cloud Functions
echo "☁️ Deploying Cloud Functions..."
firebase deploy --only functions

# Deploy hosting (if applicable)
echo "🌐 Deploying hosting..."
firebase deploy --only hosting

echo "✅ Deployment completed successfully!"
echo ""
echo "🔗 Your application is now live:"
echo "📱 LIFF URL: https://liff.line.me/YOUR_LIFF_ID"
echo "🌐 Web Dashboard: https://YOUR_PROJECT.web.app"
echo "🔧 Admin Dashboard: https://YOUR_PROJECT.web.app/admin.html"
echo ""
echo "📊 Next steps:"
echo "1. Update LINE LIFF endpoint URL"
echo "2. Test all endpoints and flows"
echo "3. Monitor logs and performance"
echo "4. Set up monitoring and alerts"
echo ""
echo "🔒 Security checklist:"
echo "1. ✅ CORS configured"
echo "2. ✅ Rate limiting enabled"
echo "3. ✅ Input validation implemented"
echo "4. ✅ Authentication required for admin"
echo "5. ✅ Firestore security rules applied"
echo "6. ✅ Error logging enabled"
echo ""
echo "Happy lending! 💰"
