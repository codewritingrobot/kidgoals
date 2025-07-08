#!/bin/bash

echo "🎨 Goalaroo Icon Setup"
echo "======================"

# Check if ImageMagick is installed
if command -v convert &> /dev/null; then
    echo "✅ ImageMagick is installed!"
    echo ""
    echo "🚀 Generating Goalaroo icons..."
    ./generate-icons.sh
else
    echo "❌ ImageMagick is not installed."
    echo ""
    echo "📦 Please install ImageMagick first:"
    echo ""
    echo "   macOS:"
    echo "   brew install imagemagick"
    echo ""
    echo "   Ubuntu/Debian:"
    echo "   sudo apt-get update && sudo apt-get install imagemagick"
    echo ""
    echo "   Windows:"
    echo "   Download from https://imagemagick.org/script/download.php#windows"
    echo ""
    echo "   After installation, run: ./install-icons.sh"
    echo ""
    echo "🎯 Alternative: Manual Setup"
    echo "If you can't install ImageMagick, you can:"
    echo "1. Use an online SVG to PNG converter"
    echo "2. Convert icon.svg to the required sizes manually"
    echo "3. Place them in an 'icons' directory"
    echo "4. Update manifest.json with the icon paths"
fi 