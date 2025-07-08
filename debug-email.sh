#!/bin/bash

echo "📧 Debugging email sending issue..."

echo ""
echo "1. Checking ECS service logs for email errors:"
TASK_ARNS=$(aws ecs list-tasks --cluster goalaroo-cluster --service-name goalaroo-service --region us-east-2 --query 'taskArns' --output text 2>/dev/null)

if [ ! -z "$TASK_ARNS" ] && [ "$TASK_ARNS" != "None" ]; then
  LATEST_TASK=$(echo $TASK_ARNS | tr ' ' '\n' | head -1)
  echo "Latest task: $LATEST_TASK"
  
  echo ""
  echo "Recent logs (last 10 minutes):"
  aws logs get-log-events \
    --log-group-name "/ecs/goalaroo" \
    --log-stream-name "ecs/goalaroo-container/$LATEST_TASK" \
    --region us-east-2 \
    --start-time $(date -v-10M +%s)000 \
    --query 'events[*].message' \
    --output text 2>/dev/null | grep -i "email\|ses\|error" || echo "No email-related logs found"
else
  echo "❌ No running tasks found"
fi

echo ""
echo "2. Checking SES domain verification status:"
aws ses get-identity-verification-attributes \
  --identities "mcsoko.com" \
  --region us-east-2 \
  --query 'VerificationAttributes.mcsoko.com.{VerificationStatus:VerificationStatus,VerificationToken:VerificationToken}' \
  --output table

echo ""
echo "3. Checking SES sending limits:"
aws ses get-send-quota --region us-east-2 --output table

echo ""
echo "4. Testing SES configuration:"
aws ses get-identity-verification-attributes \
  --identities "noreply@mcsoko.com" \
  --region us-east-2 \
  --query 'VerificationAttributes.noreply@mcsoko.com.VerificationStatus' \
  --output text

echo ""
echo "5. Checking SSM parameters:"
aws ssm get-parameter --name "/goalaroo/from-email" --region us-east-2 --query 'Parameter.Value' --output text 2>/dev/null || echo "❌ FROM_EMAIL parameter not found"

echo ""
echo "6. Testing API endpoint directly:"
curl -X POST https://api.mcsoko.com/api/auth/send-code \
  -H "Content-Type: application/json" \
  -H "Origin: https://goalaroo.mcsoko.com" \
  -d '{"email":"test@example.com"}' \
  -v 2>&1 