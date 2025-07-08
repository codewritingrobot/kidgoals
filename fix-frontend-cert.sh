#!/bin/bash

echo "🔧 Fixing frontend certificate for CloudFront..."

cd terraform

echo "📋 Current Terraform state:"
terraform state list | grep -E "(certificate|cloudfront|s3)" || echo "No frontend resources found"

echo ""
echo "🗑️ Destroying any existing frontend resources..."
terraform destroy -target=aws_cloudfront_distribution.frontend -target=aws_s3_bucket.frontend -auto-approve 2>/dev/null || echo "No frontend resources to destroy"

echo ""
echo "🔄 Applying Terraform configuration for us-east-2..."
terraform apply -auto-approve

echo ""
echo "✅ Frontend infrastructure should now be properly configured!"
echo "🌐 Frontend URL: https://goalaroo.mcsoko.com"
echo "🚀 API URL: https://api.mcsoko.com"
echo "📍 Region: us-east-2 (with CloudFront certificate in us-east-1)" 