#!/bin/bash

# Goalaroo GitHub Actions Deployment Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="goalaroo"
AWS_REGION="us-east-2"

echo -e "${GREEN}🚀 Starting Goalaroo deployment with GitHub Actions...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed. Please install it first.${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  Project: ${PROJECT_NAME}"
echo "  Region: ${AWS_REGION}"

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
API_URL=$(terraform output -raw api_url)
ECR_REPO_URL=$(terraform output -raw ecr_repository_url)

echo -e "${GREEN}✅ Infrastructure deployed successfully!${NC}"
echo "  API URL: ${API_URL}"
echo "  ECR Repo: ${ECR_REPO_URL}"

cd ..

# Step 2: Check if GitHub repository is configured
echo -e "${YELLOW}📋 Checking GitHub repository...${NC}"
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ This is not a Git repository. Please initialize Git and push to GitHub.${NC}"
    exit 1
fi

REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [[ $REMOTE_URL != *"github.com"* ]]; then
    echo -e "${RED}❌ GitHub remote not found. Please add GitHub as origin remote.${NC}"
    echo "  Example: git remote add origin https://github.com/codewritingrobot/kidgoals.git"
    exit 1
fi

echo -e "${GREEN}✅ GitHub repository configured${NC}"

# Step 3: Push changes to trigger GitHub Actions
echo -e "${YELLOW}📤 Pushing changes to trigger GitHub Actions deployment...${NC}"

# Add all changes
git add .

# Commit changes
git commit -m "Deploy infrastructure and update deployment workflow" || echo "No changes to commit"

# Push to trigger GitHub Actions
git push origin main

echo -e "${GREEN}✅ Changes pushed to GitHub!${NC}"

# Step 4: Instructions for GitHub Actions
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo -e "${BLUE}1. Set up GitHub Secrets:${NC}"
echo "   Go to your GitHub repository → Settings → Secrets and variables → Actions"
echo "   Add these secrets:"
echo "   - AWS_ACCESS_KEY_ID: Your AWS access key"
echo "   - AWS_SECRET_ACCESS_KEY: Your AWS secret key"
echo ""
echo -e "${BLUE}2. Monitor the deployment:${NC}"
echo "   Go to your GitHub repository → Actions tab"
echo "   You should see a 'Deploy to AWS ECS' workflow running"
echo ""
echo -e "${BLUE}3. Check deployment status:${NC}"
echo "   API URL: ${API_URL}"
echo "   ECR Repository: ${ECR_REPO_URL}"
echo ""
echo -e "${GREEN}🎉 Deployment process started!${NC}"
echo ""
echo -e "${YELLOW}📋 Useful commands:${NC}"
echo "  View logs: aws logs tail /ecs/${PROJECT_NAME} --follow"
echo "  Check service: aws ecs describe-services --cluster ${PROJECT_NAME}-cluster --services ${PROJECT_NAME}-service"
echo "  Scale service: aws ecs update-service --cluster ${PROJECT_NAME}-cluster --service ${PROJECT_NAME}-service --desired-count 2" 