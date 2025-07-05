#!/bin/bash

# Publish API Interfaces Script
# This script builds and publishes the API interface package to npm

set -e

echo "🚀 Publishing Nodash API Interfaces..."

# Change to the API interfaces directory
cd packages/api-interfaces

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the package
echo "🔨 Building package..."
npm run build

# Check if we're logged in to npm
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ Not logged in to npm. Please run 'npm login' first."
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📋 Current version: $CURRENT_VERSION"

# Check if this version already exists on npm
if npm view @nodash/api-interfaces@$CURRENT_VERSION > /dev/null 2>&1; then
    echo "⚠️  Version $CURRENT_VERSION already exists on npm"
    echo "🔄 Bumping patch version..."
    npm version patch --no-git-tag-version
    NEW_VERSION=$(node -p "require('./package.json').version")
    echo "📋 New version: $NEW_VERSION"
fi

# Publish to npm
echo "📤 Publishing to npm..."
npm publish

echo "✅ API interfaces published successfully!"

# Update the main package.json if needed
cd ../..
if [ -f "package.json" ]; then
    echo "📝 Updating workspace dependencies..."
    # This could be enhanced to automatically update dependent packages
fi

echo "�� Publish complete!" 