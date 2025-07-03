#!/bin/bash

# Create server/public directory if it doesn't exist
mkdir -p server/public

# Copy essential assets from client/public to server/public
cp client/public/dam-logo-new.png server/public/ 2>/dev/null || echo "Warning: dam-logo-new.png not found"
cp client/public/dam-logo.png server/public/ 2>/dev/null || echo "Warning: dam-logo.png not found"

# Copy default profile images directory
if [ -d "client/public/default-profile-images" ]; then
    cp -r client/public/default-profile-images server/public/
    echo "Copied default profile images"
fi

echo "Assets copied to server/public for production deployment"