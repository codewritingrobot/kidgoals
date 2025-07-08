#!/bin/bash

echo "🔒 Fixing HTTPS configuration for API..."

cd terraform

echo "📋 Current load balancer listeners:"
aws elbv2 describe-listeners \
  --load-balancer-arn $(aws elbv2 describe-load-balancers --region us-east-2 --query 'LoadBalancers[?contains(LoadBalancerName, `goalaroo`)].LoadBalancerArn' --output text) \
  --region us-east-2 \
  --query 'Listeners[*].{Port:Port,Protocol:Protocol}' \
  --output table

echo ""
echo "🔄 Applying Terraform changes..."
terraform apply -auto-approve

echo ""
echo "⏳ Waiting for changes to propagate..."
sleep 30

echo ""
echo "🧪 Testing HTTPS endpoint:"
curl -I --connect-timeout 10 https://api.mcsoko.com/api/health 2>&1

echo ""
echo "✅ HTTPS should now be working!"
echo "🌐 Frontend: https://goalaroo.mcsoko.com"
echo "🚀 API: https://api.mcsoko.com" 