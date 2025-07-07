# Goalaroo Deployment Guide

This guide will help you deploy Goalaroo with server-side state management while maintaining local storage for offline functionality. The deployment uses AWS services for scalability and reliability.

## 🏗️ Architecture Overview

The deployment includes:

- **Backend API**: Node.js/Express server running on AWS ECS Fargate
- **Database**: DynamoDB for user data, magic codes, and user sessions
- **Email Service**: AWS SES for sending magic codes
- **Load Balancer**: Application Load Balancer with SSL termination
- **Container Registry**: ECR for Docker image storage
- **Build System**: AWS CodeBuild for cross-platform Docker builds
- **Monitoring**: CloudWatch logs and metrics
- **DNS**: Route53 for domain management

## 📋 Prerequisites

Before deploying, ensure you have:

1. **AWS Account** with appropriate permissions
2. **Domain Name** (e.g., `mcsoko.com`) with Route53 hosted zone
3. **AWS CLI** installed and configured
4. **Terraform** installed (version >= 1.0)
5. **GitHub Repository** with your code (for CodeBuild)

## 🔧 Setup Instructions

### 1. Configure Terraform Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your specific values:

```hcl
aws_region = "us-east-2"
project_name = "goalaroo"
domain_name = "mcsoko.com"
environment = "production"

# Generate a secure JWT secret
jwt_secret = "your-super-secure-jwt-secret-here"
```

Generate a secure JWT secret:
```bash
openssl rand -base64 32
```

### 2. Configure AWS Credentials

Ensure your AWS CLI is configured with appropriate permissions:

```bash
aws configure
```

Required permissions:
- ECS (Full access)
- ECR (Full access)
- CodeBuild (Full access)
- DynamoDB (Full access)
- SES (Full access)
- Route53 (Full access)
- IAM (Limited - for ECS roles)
- CloudWatch (Limited - for logs)
- SSM (Limited - for parameters)

### 3. Deploy the Application

Run the deployment script:

```bash
./deploy.sh
```

This script will:
1. Deploy all AWS infrastructure using Terraform
2. Start a CodeBuild project to build the Docker image
3. Deploy the application to ECS
4. Update the frontend with the new API URL

## 🚀 Manual Deployment Steps

If you prefer to deploy manually:

### Step 1: Deploy Infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### Step 2: Start CodeBuild

```bash
# Get the build project name from Terraform output
BUILD_PROJECT_NAME="goalaroo-build"

# Start the build
BUILD_ID=$(aws codebuild start-build --project-name ${BUILD_PROJECT_NAME} --region us-east-2 --query 'build.id' --output text)

# Wait for completion
aws codebuild wait build-complete --id ${BUILD_ID} --region us-east-2
```

### Step 3: Update ECS Service

```bash
aws ecs update-service \
    --cluster goalaroo-cluster \
    --service goalaroo-service \
    --force-new-deployment \
    --region us-east-2
```

## 🔐 Security Configuration

### SES Email Verification

After deployment, verify your domain in SES:

1. Go to AWS SES Console
2. Navigate to "Verified identities"
3. Verify your domain
4. Add the required DNS records (automated by Terraform)

### Domain Verification

The Terraform deployment automatically:
- Creates SSL certificates for `api.yourdomain.com`
- Sets up DNS records for the API
- Configures SES domain verification

## 📊 Monitoring and Logs

### View Application Logs

```bash
aws logs tail /ecs/goalaroo --follow
```

### Check Service Status

```bash
aws ecs describe-services \
    --cluster goalaroo-cluster \
    --services goalaroo-service
```

### View Build Logs

```bash
aws codebuild batch-get-builds --ids BUILD_ID --region us-east-2
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. CodeBuild Fails
- Check the build logs in AWS CodeBuild console
- Verify the GitHub repository URL in `terraform/codebuild.tf`
- Ensure the `buildspec.yml` file is in the root of your repository

#### 2. ECS Service Not Starting
```bash
# Check service events
aws ecs describe-services --cluster goalaroo-cluster --services goalaroo-service

# Check task logs
aws logs tail /ecs/goalaroo --follow
```

#### 3. Email Not Sending
- Verify SES domain verification
- Check SES sending limits
- Review CloudWatch logs for errors

#### 4. API Not Accessible
- Verify ALB health checks
- Check security group rules
- Confirm DNS resolution

#### 5. DynamoDB Errors
- Check IAM permissions
- Verify table names
- Review CloudWatch logs

### Scaling

#### Scale ECS Service
```bash
aws ecs update-service \
    --cluster goalaroo-cluster \
    --service goalaroo-service \
    --desired-count 2
```

## 💰 Cost Optimization

### Estimated Monthly Costs (us-east-2)
- **ECS Fargate**: ~$15-30 (1 task, 0.25 vCPU, 0.5GB RAM)
- **ALB**: ~$20
- **DynamoDB**: ~$5-15 (on-demand billing)
- **SES**: ~$1-5 (depending on email volume)
- **Route53**: ~$1
- **CloudWatch**: ~$5-10
- **ECR**: ~$1-5
- **CodeBuild**: ~$1-5

**Total**: ~$50-90/month

## 🔄 Updates and Maintenance

### Update Application
```bash
# Simply run the deployment script again
./deploy.sh
```

### Update Infrastructure
```bash
cd terraform
terraform plan
terraform apply
```

## 🧪 Testing

### Health Check
```bash
curl https://api.mcsoko.com/api/health
```

### Authentication Test
```bash
# Send magic code
curl -X POST https://api.mcsoko.com/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## 📚 Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS CodeBuild Documentation](https://docs.aws.amazon.com/codebuild/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

---

**Note**: This deployment creates production-ready infrastructure. For development, consider using smaller instance sizes and single AZ deployment to reduce costs. 