#!/bin/bash

echo "🔍 Checking API service status..."

echo ""
echo "1. Checking ECS service status:"
aws ecs describe-services \
  --cluster goalaroo-cluster \
  --services goalaroo-service \
  --region us-east-2 \
  --query 'services[0].{status:status,runningCount:runningCount,desiredCount:desiredCount,pendingCount:pendingCount}' \
  --output table

echo ""
echo "2. Checking if tasks are running:"
TASK_ARNS=$(aws ecs list-tasks --cluster goalaroo-cluster --service-name goalaroo-service --region us-east-2 --query 'taskArns' --output text 2>/dev/null)

if [ ! -z "$TASK_ARNS" ] && [ "$TASK_ARNS" != "None" ]; then
  echo "Found tasks: $TASK_ARNS"
  
  echo ""
  echo "3. Task details:"
  aws ecs describe-tasks \
    --cluster goalaroo-cluster \
    --tasks $TASK_ARNS \
    --region us-east-2 \
    --query 'tasks[0].{lastStatus:lastStatus,healthStatus:healthStatus,stoppedReason:stoppedReason}' \
    --output table
  
  echo ""
  echo "4. Recent logs:"
  LATEST_TASK=$(echo $TASK_ARNS | tr ' ' '\n' | head -1)
  aws logs get-log-events \
    --log-group-name "/ecs/goalaroo" \
    --log-stream-name "ecs/goalaroo-container/$LATEST_TASK" \
    --region us-east-2 \
    --start-time $(date -d '10 minutes ago' +%s)000 \
    --query 'events[-5:].message' \
    --output text 2>/dev/null || echo "Could not retrieve logs"
else
  echo "❌ No running tasks found"
fi

echo ""
echo "5. Testing load balancer directly:"
ALB_DNS=$(aws elbv2 describe-load-balancers --region us-east-2 --query 'LoadBalancers[?contains(LoadBalancerName, `goalaroo`)].DNSName' --output text 2>/dev/null)

if [ ! -z "$ALB_DNS" ] && [ "$ALB_DNS" != "None" ]; then
  echo "Load balancer DNS: $ALB_DNS"
  echo "Testing connection to load balancer..."
  curl -I --connect-timeout 10 "http://$ALB_DNS/api/health" 2>/dev/null || echo "❌ Load balancer not responding"
else
  echo "❌ Could not find load balancer"
fi

echo ""
echo "6. Checking Route53 DNS:"
nslookup api.mcsoko.com

echo ""
echo "7. Testing API endpoint with timeout:"
curl -I --connect-timeout 10 https://api.mcsoko.com/api/health 2>/dev/null || echo "❌ API endpoint not accessible" 