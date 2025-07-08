#!/bin/bash

echo "🎨 Generating Goalaroo icons..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is required. Please install it first:"
    echo "   macOS: brew install imagemagick"
    echo "   Ubuntu: sudo apt-get install imagemagick"
    echo "   Windows: Download from https://imagemagick.org/"
    exit 1
fi

# Create icons directory
mkdir -p icons

echo "📱 Generating icon sizes..."

# Generate different sizes
convert icon.svg -resize 192x192 icons/icon-192x192.png
convert icon.svg -resize 512x512 icons/icon-512x512.png
convert icon.svg -resize 72x72 icons/icon-72x72.png
convert icon.svg -resize 96x96 icons/icon-96x96.png
convert icon.svg -resize 128x128 icons/icon-128x128.png
convert icon.svg -resize 144x144 icons/icon-144x144.png
convert icon.svg -resize 152x152 icons/icon-152x152.png
convert icon.svg -resize 384x384 icons/icon-384x384.png

# Generate Apple touch icons
convert icon.svg -resize 180x180 icons/apple-touch-icon.png
convert icon.svg -resize 167x167 icons/apple-touch-icon-167x167.png
convert icon.svg -resize 152x152 icons/apple-touch-icon-152x152.png
convert icon.svg -resize 120x120 icons/apple-touch-icon-120x120.png

# Generate favicon
convert icon.svg -resize 32x32 icons/favicon-32x32.png
convert icon.svg -resize 16x16 icons/favicon-16x16.png

echo "✅ Icons generated successfully!"
echo "📁 Icons saved in the 'icons' directory"

# Create base64 encoded versions for the manifest
echo ""
echo "🔧 Creating base64 encoded versions for manifest..."

# Convert SVG to base64
ICON_192_BASE64=$(base64 -i icon.svg | tr -d '\n')
ICON_512_BASE64=$(base64 -i icon.svg | tr -d '\n')

echo "📝 Updating manifest.json..."

# Create a temporary manifest with the new icons
cat > manifest.json << EOF
{
    "name": "Goalaroo",
    "short_name": "Goalaroo",
    "description": "Track your child's behavioral goals with fun progress tracking",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#667eea",
    "theme_color": "#007AFF",
    "orientation": "portrait",
    "icons": [
        {
            "src": "icons/icon-72x72.png",
            "sizes": "72x72",
            "type": "image/png",
            "purpose": "any"
        },
        {
            "src": "icons/icon-96x96.png",
            "sizes": "96x96",
            "type": "image/png",
            "purpose": "any"
        },
        {
            "src": "icons/icon-128x128.png",
            "sizes": "128x128",
            "type": "image/png",
            "purpose": "any"
        },
        {
            "src": "icons/icon-144x144.png",
            "sizes": "144x144",
            "type": "image/png",
            "purpose": "any"
        },
        {
            "src": "icons/icon-152x152.png",
            "sizes": "152x152",
            "type": "image/png",
            "purpose": "any"
        },
        {
            "src": "icons/icon-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
        },
        {
            "src": "icons/icon-384x384.png",
            "sizes": "384x384",
            "type": "image/png",
            "purpose": "any"
        },
        {
            "src": "icons/icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ],
    "categories": ["productivity", "education", "family"],
    "lang": "en",
    "scope": "/",
    "prefer_related_applications": false
}
EOF

echo "✅ Manifest updated with new icons!"
echo ""
echo "🎯 Next steps:"
echo "1. Deploy the icons to your S3 bucket"
echo "2. Update your GitHub Actions workflow to include the icons directory"
echo "3. Test the PWA installation on mobile devices" 