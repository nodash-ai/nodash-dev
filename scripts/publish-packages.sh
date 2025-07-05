#!/bin/bash

set -e

echo "🚀 Publishing Nodash packages to npm..."

# Generate latest SDK
echo "📋 Generating SDK from server definitions..."
npm run generate-sdk

# Build all packages
echo "🔨 Building packages..."
npm run build

# Publish SDK
echo "📦 Publishing @nodash/sdk..."
cd packages/nodash-sdk
npm publish --access public
cd ../..

# Publish CLI
echo "📦 Publishing @nodash/cli..."
cd packages/nodash-cli
npm publish --access public
cd ../..

echo "✅ All packages published successfully!"
echo ""
echo "📋 Published packages:"
echo "  - @nodash/sdk"
echo "  - @nodash/cli"
echo ""
echo "🔗 Install with:"
echo "  npm install @nodash/sdk"
echo "  npm install -g @nodash/cli"
