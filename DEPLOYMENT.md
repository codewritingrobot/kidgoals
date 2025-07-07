# Goalaroo Server-Side Deployment Guide

This guide will help you deploy Goalaroo with server-side state management while maintaining local storage for offline functionality. The deployment uses AWS services for scalability and reliability.

## 🏗️ Architecture Overview

The deployment includes:

- **Backend API**: Node.js/Express server running on AWS ECS Fargate
- **Database**: DynamoDB for user data, magic codes, and user sessions
- **Email Service**: AWS SES for sending magic codes
- **Load Balancer**: Application Load Balancer with SSL termination
- **Container Registry**: ECR for Docker image storage
- **Monitoring**: CloudWatch logs and metrics
- **DNS**: Route53 for domain managementcd 

## 📋 Prerequisites

Before deploying, ensure you have:

1. **AWS Account** with appropriate permissions
2. **Domain Name** (e.g., `mcsoko.com`) with Route53 hosted zone
3. **AWS CLI** installed and configured
4. **Docker** installed
5. **Terraform** installed (version >= 1.0)
6. **Node.js** (for local development)

## 🔧 Setup Instructions

### 1. Clone and Prepare the Repository

```bash
git clone <your-repo-url>
cd KidGoals
```

### 2. Configure Terraform Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your specific values:

```hcl
aws_region = "us-east-1"
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

### 3. Configure AWS Credentials

Ensure your AWS CLI is configured with appropriate permissions:

```bash
aws configure
```

Required permissions:
- ECS (Full access)
- ECR (Full access)
- DynamoDB (Full access)
- SES (Full access)
- Route53 (Full access)
- IAM (Limited - for ECS roles)
- CloudWatch (Limited - for logs)
- SSM (Limited - for parameters)

### 4. Deploy the Infrastructure

Run the deployment script:

```bash
./deploy.sh
```

This script will:
1. Deploy all AWS infrastructure using Terraform
2. Build and push the Docker image to ECR
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

### Step 2: Build and Push Docker Image

```bash
# Get ECR repository URL from Terraform output
ECR_REPO_URL=$(terraform output -raw ecr_repository_url)

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REPO_URL

# Build and push
docker build -t goalaroo-app:latest backend/
docker tag goalaroo-app:latest $ECR_REPO_URL:latest
docker push $ECR_REPO_URL:latest
```

### Step 3: Update ECS Service

```bash
aws ecs update-service \
    --cluster goalaroo-cluster \
    --service goalaroo-service \
    --force-new-deployment
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

### Monitor Metrics

- **ECS**: CPU/Memory utilization
- **ALB**: Request count, response time
- **DynamoDB**: Read/Write capacity
- **SES**: Email delivery rates

## 🔄 Data Synchronization

The application implements a hybrid approach:

### Online Mode
- Data is saved to both local storage and server
- Real-time synchronization between devices
- Automatic conflict resolution

### Offline Mode
- Data is saved locally only
- Automatic sync when connection is restored
- No data loss during network issues

### Sync Strategy
1. **Local First**: Always save to local storage
2. **Server Sync**: Attempt server sync when online
3. **Conflict Resolution**: Use timestamp-based resolution
4. **Background Sync**: Sync in background when connection restored

## 🛠️ Troubleshooting

### Common Issues

#### 1. ECS Service Not Starting
```bash
# Check service events
aws ecs describe-services --cluster goalaroo-cluster --services goalaroo-service

# Check task logs
aws logs tail /ecs/goalaroo --follow
```

#### 2. Email Not Sending
- Verify SES domain verification
- Check SES sending limits
- Review CloudWatch logs for errors

#### 3. API Not Accessible
- Verify ALB health checks
- Check security group rules
- Confirm DNS resolution

#### 4. DynamoDB Errors
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

#### Scale DynamoDB
- Tables use on-demand billing (auto-scaling)
- Monitor CloudWatch metrics for performance

## 💰 Cost Optimization

### Estimated Monthly Costs (us-east-1)
- **ECS Fargate**: ~$15-30 (1 task, 0.25 vCPU, 0.5GB RAM)
- **ALB**: ~$20
- **DynamoDB**: ~$5-15 (on-demand billing)
- **SES**: ~$1-5 (depending on email volume)
- **Route53**: ~$1
- **CloudWatch**: ~$5-10
- **ECR**: ~$1-5

**Total**: ~$50-90/month

### Cost Reduction Tips
1. Use Spot instances for development
2. Implement auto-scaling based on demand
3. Monitor and optimize DynamoDB usage
4. Use CloudWatch alarms for cost monitoring

## 🔄 Updates and Maintenance

### Update Application
```bash
# Build new image
docker build -t goalaroo-app:latest backend/

# Push to ECR
docker tag goalaroo-app:latest $ECR_REPO_URL:latest
docker push $ECR_REPO_URL:latest

# Update service
aws ecs update-service --cluster goalaroo-cluster --service goalaroo-service --force-new-deployment
```

### Update Infrastructure
```bash
cd terraform
terraform plan
terraform apply
```

### Backup Strategy
- **DynamoDB**: Point-in-time recovery enabled
- **Application**: Docker images in ECR
- **Configuration**: Terraform state files

## 🧪 Testing

### Health Check
```bash
curl https://api.yourdomain.com/api/health
```

### Authentication Test
```bash
# Send magic code
curl -X POST https://api.yourdomain.com/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### API Test (with token)
```bash
curl -X GET https://api.yourdomain.com/api/user/data \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📚 Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [SES Setup Guide](https://docs.aws.amazon.com/ses/latest/dg/setting-up.html)

## 🆘 Support

For issues or questions:
1. Check CloudWatch logs first
2. Review this documentation
3. Check AWS service status
4. Create an issue in the repository

---

**Note**: This deployment creates production-ready infrastructure. For development, consider using smaller instance sizes and single AZ deployment to reduce costs. 