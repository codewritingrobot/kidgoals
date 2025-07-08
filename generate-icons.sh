#!/bin/bash

set -e

echo "🎨 Generating PWA and iOS icons from icon.png..."

# Check for ImageMagick
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is required. Install it with 'brew install imagemagick' or 'sudo apt-get install imagemagick'."
    exit 1
fi

mkdir -p icons

# Standard PWA icon sizes
convert icon.png -resize 72x72 icons/icon-72x72.png
convert icon.png -resize 96x96 icons/icon-96x96.png
convert icon.png -resize 128x128 icons/icon-128x128.png
convert icon.png -resize 144x144 icons/icon-144x144.png
convert icon.png -resize 152x152 icons/icon-152x152.png
convert icon.png -resize 192x192 icons/icon-192x192.png
convert icon.png -resize 384x384 icons/icon-384x384.png
convert icon.png -resize 512x512 icons/icon-512x512.png

# Apple touch icons
convert icon.png -resize 120x120 icons/apple-touch-icon-120x120.png
convert icon.png -resize 152x152 icons/apple-touch-icon-152x152.png
convert icon.png -resize 167x167 icons/apple-touch-icon-167x167.png
convert icon.png -resize 180x180 icons/apple-touch-icon.png

# Favicons
convert icon.png -resize 32x32 icons/favicon-32x32.png
convert icon.png -resize 16x16 icons/favicon-16x16.png

echo "✅ All icons generated in the 'icons/' directory."

# --- Update manifest.json ---

echo "📝 Updating manifest.json..."

# Use jq to update the icons array if jq is available
if command -v jq &> /dev/null; then
  jq '.icons = [
    { "src": "icons/icon-72x72.png", "sizes": "72x72", "type": "image/png" },
    { "src": "icons/icon-96x96.png", "sizes": "96x96", "type": "image/png" },
    { "src": "icons/icon-128x128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "icons/icon-144x144.png", "sizes": "144x144", "type": "image/png" },
    { "src": "icons/icon-152x152.png", "sizes": "152x152", "type": "image/png" },
    { "src": "icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "icons/icon-384x384.png", "sizes": "384x384", "type": "image/png" },
    { "src": "icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]' manifest.json > manifest.json.tmp && mv manifest.json.tmp manifest.json
  echo "✅ manifest.json icons updated."
else
  echo "⚠️ jq not found. Please update the icons array in manifest.json manually."
fi

# --- Update index.html ---

echo "📝 Updating index.html with apple-touch-icon links..."

# Remove existing apple-touch-icon lines
sed -i.bak '/apple-touch-icon/d' index.html

# Insert new apple-touch-icon lines after the <head> tag
awk '
/<head>/ {
  print;
  print "    <link rel=\"apple-touch-icon\" href=\"icons/apple-touch-icon.png\">";
  print "    <link rel=\"apple-touch-icon\" sizes=\"120x120\" href=\"icons/apple-touch-icon-120x120.png\">";
  print "    <link rel=\"apple-touch-icon\" sizes=\"152x152\" href=\"icons/apple-touch-icon-152x152.png\">";
  print "    <link rel=\"apple-touch-icon\" sizes=\"167x167\" href=\"icons/apple-touch-icon-167x167.png\">";
  print "    <link rel=\"apple-touch-icon\" sizes=\"180x180\" href=\"icons/apple-touch-icon.png\">";
  next
}
{ print }
' index.html > index.html.tmp && mv index.html.tmp index.html

echo "✅ index.html apple-touch-icon links updated."

echo ""
echo "🎉 Done! Commit, push, and redeploy to see your new icon on all platforms."