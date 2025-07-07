# GitHub Actions Deployment Guide

This guide will help you deploy Goalaroo using GitHub Actions instead of AWS CodeBuild, which is much more reliable and easier to debug.

## 🚀 Why GitHub Actions?

- **Better YAML parsing** - No more YAML_FILE_ERROR issues
- **Easier debugging** - Clear error messages and step-by-step logs
- **Faster builds** - GitHub Actions runners are optimized for Docker builds
- **Better integration** - Native Git integration and automatic triggers
- **Free tier** - 2000 minutes/month for public repositories

## 📋 Prerequisites

1. **GitHub Repository** with your code
2. **AWS Account** with appropriate permissions
3. **AWS CLI** configured locally
4. **Terraform** installed

## 🔧 Setup Instructions

### 1. Set up GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `AWS_ACCESS_KEY_ID` - Your AWS access key
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret key

### 2. Deploy Infrastructure First

The GitHub Actions workflow expects the ECS cluster and service to already exist. Run this first:

```bash
./deploy-github.sh
```

This script will:
1. Deploy AWS infrastructure with Terraform (creates ECS cluster, service, etc.)
2. Push changes to GitHub
3. Trigger the GitHub Actions workflow

### 3. Monitor the Deployment

1. Go to your GitHub repository → Actions tab
2. Click on the "Deploy to AWS ECS" workflow
3. Monitor the build and deployment steps

## 🔄 How It Works

### GitHub Actions Workflow Steps:

1. **Checkout code** - Gets your latest code
2. **Configure AWS credentials** - Uses your GitHub secrets
3. **Login to ECR** - Authenticates with Amazon ECR
4. **Build and push Docker image** - Builds your backend and pushes to ECR
5. **Update ECS task definition** - Updates the task definition with new image
6. **Deploy to ECS** - Updates the ECS service
7. **Update frontend** - Updates the API URL in your frontend code

### Automatic Triggers:

- **Push to main branch** - Automatically deploys
- **Manual trigger** - Use "workflow_dispatch" to deploy manually

## 🛠️ Troubleshooting

### Common Issues:

#### 1. GitHub Secrets Not Set
```
Error: AWS credentials not configured
```
**Solution:** Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to GitHub secrets

#### 2. ECR Repository Not Found
```
Error: Repository does not exist
```
**Solution:** Run Terraform first to create the ECR repository

#### 3. ECS Service Not Found
```
Error: Service not found
```
**Solution:** Ensure the ECS cluster and service are created by Terraform

### Debugging:

1. **Check GitHub Actions logs** - Detailed step-by-step logs
2. **Check AWS CloudWatch logs** - Application logs
3. **Check ECS service status** - Service health and events

## 📊 Benefits Over CodeBuild

| Feature | CodeBuild | GitHub Actions |
|---------|-----------|----------------|
| YAML Parsing | ❌ Problematic | ✅ Reliable |
| Error Messages | ❌ Vague | ✅ Clear |
| Debugging | ❌ Difficult | ✅ Easy |
| Git Integration | ❌ Manual | ✅ Native |
| Build Speed | ⚠️ Variable | ✅ Fast |
| Cost | 💰 Per build | ✅ Free tier |

## 🔄 Migration from CodeBuild

If you're migrating from CodeBuild:

1. **Keep your Terraform infrastructure** - No changes needed
2. **Remove CodeBuild resources** - You can delete the CodeBuild project
3. **Use GitHub Actions workflow** - Replace buildspec.yml with .github/workflows/deploy.yml
4. **Update deployment scripts** - Use deploy-github.sh instead of deploy.sh

## 🎯 Next Steps

1. **Set up GitHub secrets** with your AWS credentials
2. **Run the deployment script** to deploy infrastructure and trigger GitHub Actions
3. **Monitor the deployment** in the GitHub Actions tab
4. **Test your application** once deployment completes

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS ECS GitHub Actions](https://github.com/aws-actions/amazon-ecs-deploy-task-definition)
- [Docker GitHub Actions](https://github.com/docker/build-push-action)

---

**Note:** This approach eliminates the YAML parsing issues you were experiencing with CodeBuild and provides a much more reliable deployment process. 