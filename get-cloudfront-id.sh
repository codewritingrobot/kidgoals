#!/bin/bash

# Script to get CloudFront distribution ID for frontend deployment

echo "🔍 Getting CloudFront distribution ID..."

# Get the distribution ID
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items[?contains(@, 'goalaroo.mcsoko.com')]].Id" \
  --output text \
  --region us-east-2)

if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" = "None" ]; then
  echo "❌ No CloudFront distribution found for goalaroo.mcsoko.com"
  echo "Please run 'terraform apply' first to create the infrastructure"
  exit 1
fi

echo "✅ Found CloudFront distribution ID: $DISTRIBUTION_ID"
echo ""
echo "📝 Update your GitHub Actions workflow (.github/workflows/deploy.yml) with this ID:"
echo "Replace 'E2XXXXXXXXXXXXX' with: $DISTRIBUTION_ID"
echo ""
echo "The line should look like:"
echo "--distribution-id $DISTRIBUTION_ID \\" 