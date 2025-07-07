#!/bin/bash

# Check if required AWS infrastructure exists

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="goalaroo"
AWS_REGION="us-east-2"
CLUSTER_NAME="${PROJECT_NAME}-cluster"
SERVICE_NAME="${PROJECT_NAME}-service"
TASK_DEFINITION="${PROJECT_NAME}-task"

echo -e "${YELLOW}🔍 Checking AWS infrastructure...${NC}"

# Check if ECS cluster exists
echo -e "${YELLOW}📋 Checking ECS cluster...${NC}"
if aws ecs describe-clusters --clusters ${CLUSTER_NAME} --region ${AWS_REGION} --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
    echo -e "${GREEN}✅ ECS cluster exists: ${CLUSTER_NAME}${NC}"
else
    echo -e "${RED}❌ ECS cluster not found: ${CLUSTER_NAME}${NC}"
    echo "   Run: ./deploy-github.sh to create infrastructure"
    exit 1
fi

# Check if ECS service exists
echo -e "${YELLOW}📋 Checking ECS service...${NC}"
if aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --region ${AWS_REGION} --query 'services[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
    echo -e "${GREEN}✅ ECS service exists: ${SERVICE_NAME}${NC}"
else
    echo -e "${RED}❌ ECS service not found: ${SERVICE_NAME}${NC}"
    echo "   Run: ./deploy-github.sh to create infrastructure"
    exit 1
fi

# Check if ECR repository exists
echo -e "${YELLOW}📋 Checking ECR repository...${NC}"
if aws ecr describe-repositories --repository-names ${PROJECT_NAME}-app --region ${AWS_REGION} >/dev/null 2>&1; then
    echo -e "${GREEN}✅ ECR repository exists: ${PROJECT_NAME}-app${NC}"
else
    echo -e "${RED}❌ ECR repository not found: ${PROJECT_NAME}-app${NC}"
    echo "   Run: ./deploy-github.sh to create infrastructure"
    exit 1
fi

# Check if IAM roles exist
echo -e "${YELLOW}📋 Checking IAM roles...${NC}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

if aws iam get-role --role-name ${PROJECT_NAME}-ecs-execution-role --region ${AWS_REGION} >/dev/null 2>&1; then
    echo -e "${GREEN}✅ IAM role exists: ${PROJECT_NAME}-ecs-execution-role${NC}"
else
    echo -e "${RED}❌ IAM role not found: ${PROJECT_NAME}-ecs-execution-role${NC}"
    echo "   Run: ./deploy-github.sh to create infrastructure"
    exit 1
fi

if aws iam get-role --role-name ${PROJECT_NAME}-ecs-task-role --region ${AWS_REGION} >/dev/null 2>&1; then
    echo -e "${GREEN}✅ IAM role exists: ${PROJECT_NAME}-ecs-task-role${NC}"
else
    echo -e "${RED}❌ IAM role not found: ${PROJECT_NAME}-ecs-task-role${NC}"
    echo "   Run: ./deploy-github.sh to create infrastructure"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All required infrastructure exists!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Push your code to GitHub to trigger the deployment"
echo "2. Monitor the deployment in GitHub Actions"
echo "3. Check your application at the API URL"
echo ""
echo -e "${YELLOW}📋 Useful commands:${NC}"
echo "  View logs: aws logs tail /ecs/${PROJECT_NAME} --follow"
echo "  Check service: aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME}" 