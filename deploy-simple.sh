#!/bin/bash

# Simplified Goalaroo Deployment Script

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
BUILD_PROJECT_NAME="${PROJECT_NAME}-build"

echo -e "${GREEN}🚀 Starting Goalaroo deployment...${NC}"

# Step 1: Deploy infrastructure with Terraform
echo -e "${YELLOW}🏗️  Deploying infrastructure with Terraform...${NC}"
cd terraform

# Initialize Terraform
terraform init

# Plan and apply
terraform plan -out=tfplan
terraform apply tfplan

# Get outputs
API_URL=$(terraform output -raw api_url)
ECR_REPO_URL=$(terraform output -raw ecr_repository_url)

echo -e "${GREEN}✅ Infrastructure deployed successfully!${NC}"
echo "  API URL: ${API_URL}"
echo "  ECR Repo: ${ECR_REPO_URL}"

cd ..

# Step 2: Start CodeBuild project
echo -e "${YELLOW}🐳 Starting Docker build on AWS...${NC}"

# Start the build
BUILD_ID=$(aws codebuild start-build --project-name ${BUILD_PROJECT_NAME} --region ${AWS_REGION} --query 'build.id' --output text)

echo "Build started with ID: ${BUILD_ID}"

# Step 3: Wait for build to complete with better error handling
echo -e "${YELLOW}⏳ Waiting for build to complete...${NC}"

# Use a loop to check build status
while true; do
    # Get build status with error handling
    BUILD_STATUS_CMD="aws codebuild batch-get-builds --ids ${BUILD_ID} --region ${AWS_REGION} --query 'builds[0].buildStatus' --output text"
    BUILD_STATUS=$(eval $BUILD_STATUS_CMD 2>/dev/null || echo "UNKNOWN")
    
    echo "Current build status: ${BUILD_STATUS}"
    
    if [ "$BUILD_STATUS" = "SUCCEEDED" ]; then
        echo -e "${GREEN}✅ Build completed successfully!${NC}"
        break
    elif [ "$BUILD_STATUS" = "FAILED" ] || [ "$BUILD_STATUS" = "FAULT" ] || [ "$BUILD_STATUS" = "STOPPED" ] || [ "$BUILD_STATUS" = "TIMED_OUT" ]; then
        echo -e "${RED}❌ Build failed with status: ${BUILD_STATUS}${NC}"
        echo "Check the build logs in AWS CodeBuild console"
        echo "Build ID: ${BUILD_ID}"
        exit 1
    elif [ "$BUILD_STATUS" = "IN_PROGRESS" ] || [ "$BUILD_STATUS" = "QUEUED" ]; then
        echo "Build in progress... waiting 30 seconds"
        sleep 30
    else
        echo "Unknown build status: ${BUILD_STATUS} - waiting 30 seconds"
        sleep 30
    fi
done

# Step 4: Update ECS service
echo -e "${YELLOW}🔄 Updating ECS service...${NC}"

# Force new deployment
aws ecs update-service \
    --cluster ${CLUSTER_NAME} \
    --service ${SERVICE_NAME} \
    --force-new-deployment \
    --region ${AWS_REGION}

echo -e "${GREEN}✅ ECS service updated!${NC}"

# Step 5: Wait for deployment to complete
echo -e "${YELLOW}⏳ Waiting for deployment to complete...${NC}"

# Wait for service to be stable
aws ecs wait services-stable \
    --cluster ${CLUSTER_NAME} \
    --services ${SERVICE_NAME} \
    --region ${AWS_REGION}

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"

# Step 6: Update frontend API URL
echo -e "${YELLOW}📝 Updating frontend API URL...${NC}"

# Update the API_BASE_URL in app.js
sed -i.bak "s|const API_BASE_URL = '.*'|const API_BASE_URL = '${API_URL}'|" app.js

echo -e "${GREEN}✅ Frontend updated with new API URL!${NC}"

# Final status
echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo ""
echo -e "${YELLOW}📊 Deployment Summary:${NC}"
echo "  API URL: ${API_URL}"
echo "  Frontend: https://${PROJECT_NAME}.mcsoko.com"
echo "  Cluster: ${CLUSTER_NAME}"
echo "  Service: ${SERVICE_NAME}"
echo "  Build Project: ${BUILD_PROJECT_NAME}"
echo "  Build ID: ${BUILD_ID}"
echo ""
echo -e "${YELLOW}🔧 Next steps:${NC}"
echo "  1. Deploy the frontend to your hosting provider"
echo "  2. Update your domain DNS to point to the frontend"
echo "  3. Test the application"
echo ""
echo -e "${YELLOW}📋 Useful commands:${NC}"
echo "  View logs: aws logs tail /ecs/${PROJECT_NAME} --follow"
echo "  Check service: aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME}"
echo "  View build logs: aws codebuild batch-get-builds --ids ${BUILD_ID}"
echo "  Scale service: aws ecs update-service --cluster ${CLUSTER_NAME} --service ${SERVICE_NAME} --desired-count 2" 