#!/bin/bash

# Goalaroo Deployment Script
# This script builds and deploys the backend to AWS ECS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="goalaroo"
AWS_REGION="us-east-2"
ECR_REPO_NAME="${PROJECT_NAME}-app"
CLUSTER_NAME="${PROJECT_NAME}-cluster"
SERVICE_NAME="${PROJECT_NAME}-service"

echo -e "${GREEN}🚀 Starting Goalaroo deployment...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed. Please install it first.${NC}"
    exit 1
fi

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  Project: ${PROJECT_NAME}"
echo "  Region: ${AWS_REGION}"
echo "  Account: ${AWS_ACCOUNT_ID}"
echo "  ECR Repo: ${ECR_REPO_URI}"

# Step 1: Deploy infrastructure with Terraform
echo -e "${YELLOW}🏗️  Deploying infrastructure with Terraform...${NC}"
cd terraform

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    echo -e "${RED}❌ terraform.tfvars not found. Please copy terraform.tfvars.example and customize it.${NC}"
    exit 1
fi

# Initialize Terraform
terraform init

# Plan and apply
terraform plan -out=tfplan
terraform apply tfplan

# Get outputs
ECR_REPO_URL=$(terraform output -raw ecr_repository_url)
API_URL=$(terraform output -raw api_url)

echo -e "${GREEN}✅ Infrastructure deployed successfully!${NC}"
echo "  API URL: ${API_URL}"
echo "  ECR Repo: ${ECR_REPO_URL}"

cd ..

# Step 2: Build and push Docker image
echo -e "${YELLOW}🐳 Building and pushing Docker image...${NC}"

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPO_URI}

# Build image
echo "Building Docker image..."
docker build --platform linux/amd64 -t ${ECR_REPO_NAME}:latest backend/

# Tag image
docker tag ${ECR_REPO_NAME}:latest ${ECR_REPO_URI}:latest

# Push image
echo "Pushing image to ECR..."
docker push ${ECR_REPO_URI}:latest

echo -e "${GREEN}✅ Docker image pushed successfully!${NC}"

# Step 3: Update ECS service
echo -e "${YELLOW}🔄 Updating ECS service...${NC}"

# Force new deployment
aws ecs update-service \
    --cluster ${CLUSTER_NAME} \
    --service ${SERVICE_NAME} \
    --force-new-deployment \
    --region ${AWS_REGION}

echo -e "${GREEN}✅ ECS service updated!${NC}"

# Step 4: Wait for deployment to complete
echo -e "${YELLOW}⏳ Waiting for deployment to complete...${NC}"

# Wait for service to be stable
aws ecs wait services-stable \
    --cluster ${CLUSTER_NAME} \
    --services ${SERVICE_NAME} \
    --region ${AWS_REGION}

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"

# Step 5: Update frontend API URL
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
echo "  ECR Repo: ${ECR_REPO_URL}"
echo "  Cluster: ${CLUSTER_NAME}"
echo "  Service: ${SERVICE_NAME}"
echo ""
echo -e "${YELLOW}🔧 Next steps:${NC}"
echo "  1. Deploy the frontend to your hosting provider"
echo "  2. Update your domain DNS to point to the frontend"
echo "  3. Test the application"
echo ""
echo -e "${YELLOW}📋 Useful commands:${NC}"
echo "  View logs: aws logs tail /ecs/${PROJECT_NAME} --follow"
echo "  Check service: aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME}"
echo "  Scale service: aws ecs update-service --cluster ${CLUSTER_NAME} --service ${SERVICE_NAME} --desired-count 2" 