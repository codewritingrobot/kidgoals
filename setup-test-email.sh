#!/bin/bash

echo "📧 Setting up test email for immediate testing..."

echo ""
echo "Enter your email address for testing (e.g., your-email@gmail.com):"
read TEST_EMAIL

if [ -z "$TEST_EMAIL" ]; then
  echo "❌ No email provided"
  exit 1
fi

echo ""
echo "🔍 Verifying email address in SES..."
aws ses verify-email-identity --email-address "$TEST_EMAIL" --region us-east-2

echo ""
echo "📝 Updating SSM parameter..."
aws ssm put-parameter \
  --name "/goalaroo/from-email" \
  --value "$TEST_EMAIL" \
  --type "String" \
  --region us-east-2 \
  --overwrite

echo ""
echo "🔄 Redeploying ECS service to pick up new email configuration..."
aws ecs update-service \
  --cluster goalaroo-cluster \
  --service goalaroo-service \
  --force-new-deployment \
  --region us-east-2

echo ""
echo "✅ Setup complete!"
echo "📧 Check your email ($TEST_EMAIL) for a verification link from AWS"
echo "🔗 Click the verification link to enable email sending"
echo ""
echo "⏳ After verification, your app will be able to send magic codes!" 