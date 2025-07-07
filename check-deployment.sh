#!/bin/bash

# Goalaroo Deployment Health Check Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="goalaroo"
AWS_REGION="us-east-2"
CLUSTER_NAME="${PROJECT_NAME}-cluster"
SERVICE_NAME="${PROJECT_NAME}-service"
BUILD_PROJECT_NAME="${PROJECT_NAME}-build"

echo -e "${BLUE}🔍 Goalaroo Deployment Health Check${NC}"
echo "=================================="

# Check AWS CLI
echo -e "${YELLOW}📋 Checking AWS CLI...${NC}"
if command -v aws &> /dev/null; then
    echo -e "${GREEN}✅ AWS CLI is installed${NC}"
    
    # Check AWS credentials
    if aws sts get-caller-identity &> /dev/null; then
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
        echo -e "${GREEN}✅ AWS credentials are valid${NC}"
        echo "  Account: ${ACCOUNT_ID}"
        echo "  User: ${USER_ARN}"
    else
        echo -e "${RED}❌ AWS credentials are invalid or expired${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    exit 1
fi

# Check Terraform
echo -e "${YELLOW}📋 Checking Terraform...${NC}"
if command -v terraform &> /dev/null; then
    echo -e "${GREEN}✅ Terraform is installed${NC}"
    
    # Check if terraform.tfvars exists
    if [ -f "terraform/terraform.tfvars" ]; then
        echo -e "${GREEN}✅ terraform.tfvars exists${NC}"
    else
        echo -e "${RED}❌ terraform.tfvars not found${NC}"
        echo "  Please copy terraform.tfvars.example to terraform.tfvars and configure it"
    fi
else
    echo -e "${RED}❌ Terraform is not installed${NC}"
    exit 1
fi

# Check infrastructure status
echo -e "${YELLOW}📋 Checking infrastructure...${NC}"
cd terraform

if [ -f "terraform.tfstate" ]; then
    echo -e "${GREEN}✅ Terraform state exists${NC}"
    
    # Get outputs
    if terraform output api_url &> /dev/null; then
        API_URL=$(terraform output -raw api_url)
        echo -e "${GREEN}✅ API URL: ${API_URL}${NC}"
    else
        echo -e "${RED}❌ API URL not found in Terraform outputs${NC}"
    fi
    
    if terraform output ecr_repository_url &> /dev/null; then
        ECR_REPO_URL=$(terraform output -raw ecr_repository_url)
        echo -e "${GREEN}✅ ECR Repository: ${ECR_REPO_URL}${NC}"
    else
        echo -e "${RED}❌ ECR Repository URL not found in Terraform outputs${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Terraform state not found - infrastructure may not be deployed${NC}"
fi

cd ..

# Check ECS service status
echo -e "${YELLOW}📋 Checking ECS service...${NC}"
if aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --region ${AWS_REGION} &> /dev/null; then
    SERVICE_STATUS=$(aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --region ${AWS_REGION} --query 'services[0].status' --output text)
    DESIRED_COUNT=$(aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --region ${AWS_REGION} --query 'services[0].desiredCount' --output text)
    RUNNING_COUNT=$(aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --region ${AWS_REGION} --query 'services[0].runningCount' --output text)
    
    echo -e "${GREEN}✅ ECS Service Status: ${SERVICE_STATUS}${NC}"
    echo "  Desired: ${DESIRED_COUNT}, Running: ${RUNNING_COUNT}"
    
    if [ "$SERVICE_STATUS" = "ACTIVE" ] && [ "$RUNNING_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ Service is running${NC}"
    else
        echo -e "${RED}❌ Service is not running properly${NC}"
    fi
else
    echo -e "${RED}❌ ECS service not found${NC}"
fi

# Check CodeBuild project
echo -e "${YELLOW}📋 Checking CodeBuild project...${NC}"
if aws codebuild batch-get-projects --names ${BUILD_PROJECT_NAME} --region ${AWS_REGION} &> /dev/null; then
    echo -e "${GREEN}✅ CodeBuild project exists${NC}"
    
    # Get last build
    LAST_BUILD=$(aws codebuild list-builds-for-project --project-name ${BUILD_PROJECT_NAME} --region ${AWS_REGION} --query 'ids[0]' --output text 2>/dev/null || echo "none")
    
    if [ "$LAST_BUILD" != "none" ] && [ "$LAST_BUILD" != "None" ]; then
        BUILD_STATUS=$(aws codebuild batch-get-builds --ids ${LAST_BUILD} --region ${AWS_REGION} --query 'builds[0].buildStatus' --output text)
        echo -e "${GREEN}✅ Last build status: ${BUILD_STATUS}${NC}"
    else
        echo -e "${YELLOW}⚠️  No builds found${NC}"
    fi
else
    echo -e "${RED}❌ CodeBuild project not found${NC}"
fi

# Check API health
echo -e "${YELLOW}📋 Checking API health...${NC}"
if [ ! -z "$API_URL" ]; then
    if curl -s -f "${API_URL}/api/health" &> /dev/null; then
        echo -e "${GREEN}✅ API is responding${NC}"
    else
        echo -e "${RED}❌ API is not responding${NC}"
        echo "  URL: ${API_URL}/api/health"
    fi
else
    echo -e "${YELLOW}⚠️  API URL not available${NC}"
fi

# Check required files
echo -e "${YELLOW}📋 Checking required files...${NC}"
REQUIRED_FILES=("buildspec.yml" "appspec.yml" "taskdef.json" "backend/Dockerfile")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
    else
        echo -e "${RED}❌ $file missing${NC}"
    fi
done

echo ""
echo -e "${BLUE}🎯 Summary${NC}"
echo "=========="
echo -e "${YELLOW}To deploy:${NC} ./deploy.sh"
echo -e "${YELLOW}To view logs:${NC} aws logs tail /ecs/${PROJECT_NAME} --follow"
echo -e "${YELLOW}To check service:${NC} aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME}"
echo -e "${YELLOW}To scale service:${NC} aws ecs update-service --cluster ${CLUSTER_NAME} --service ${SERVICE_NAME} --desired-count 2" 