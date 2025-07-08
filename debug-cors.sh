#!/bin/bash

echo "🔍 Debugging CORS issue between frontend and backend..."

echo ""
echo "1. Testing API health endpoint:"
curl -v -H "Origin: https://goalaroo.mcsoko.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS https://api.mcsoko.com/api/health

echo ""
echo "2. Testing actual API call:"
curl -v -H "Origin: https://goalaroo.mcsoko.com" \
  -H "Content-Type: application/json" \
  -X POST https://api.mcsoko.com/api/health

echo ""
echo "3. Checking ECS service logs for CORS errors:"
TASK_ARNS=$(aws ecs list-tasks --cluster goalaroo-cluster --service-name goalaroo-service --region us-east-2 --query 'taskArns' --output text 2>/dev/null)

if [ ! -z "$TASK_ARNS" ]; then
  LATEST_TASK=$(echo $TASK_ARNS | tr ' ' '\n' | head -1)
  echo "Latest task: $LATEST_TASK"
  
  aws logs get-log-events \
    --log-group-name "/ecs/goalaroo" \
    --log-stream-name "ecs/goalaroo-container/$LATEST_TASK" \
    --region us-east-2 \
    --start-time $(date -d '5 minutes ago' +%s)000 \
    --query 'events[*].message' \
    --output text | grep -i "cors\|origin" || echo "No CORS-related logs found"
else
  echo "No running tasks found"
fi

echo ""
echo "4. Checking environment variables in ECS task:"
if [ ! -z "$TASK_ARNS" ]; then
  aws ecs describe-tasks --cluster goalaroo-cluster --tasks $LATEST_TASK --region us-east-2 \
    --query 'tasks[0].overrides.containerOverrides[0].environment' --output table
fi

echo ""
echo "5. Testing from browser perspective:"
echo "Open browser dev tools and try:"
echo "fetch('https://api.mcsoko.com/api/health', {"
echo "  method: 'POST',"
echo "  headers: { 'Content-Type': 'application/json' },"
echo "  body: JSON.stringify({})"
echo "})" 