# Stock Stalk Infrastructure

This directory contains the Infrastructure as Code (IaC) configuration for deploying Stock Stalk to AWS using Terraform.

## Architecture Overview

The infrastructure deploys a containerized full-stack application on AWS with the following components:

- **VPC**: Isolated network with public and private subnets
- **ECS Fargate**: Serverless container orchestration
- **Application Load Balancer**: Distributes traffic between frontend and backend
- **ECR**: Container registry for Docker images
- **CloudWatch**: Monitoring and logging
- **Route 53**: DNS management (optional)

## Prerequisites

Before deploying, ensure you have:

1. **AWS Account** with appropriate permissions
2. **Terraform** installed (v1.5+)
3. **AWS CLI** configured with your credentials
4. **GitHub repository** (for CI/CD)
5. **Google Gemini API key**

## Quick Start

### 1. Local Development

For local development, use Docker Compose:

```bash
# Copy environment file
cp backend/example.env backend/.env

# Edit .env with your Google API key
nano backend/.env

# Start services
docker-compose up --build
```

Access your application at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

### 2. Cloud Deployment

#### Initial Setup

```bash
# Clone repository
git clone <your-repo>
cd stock-stalk

# Navigate to infrastructure
cd infrastructure

# Copy terraform variables
cp terraform.tfvars.example terraform.tfvars

# Edit variables
nano terraform.tfvars
```

#### Configure AWS

```bash
# Configure AWS CLI
aws configure

# Create S3 bucket for Terraform state (optional but recommended)
aws s3 mb s3://your-terraform-state-bucket --region us-east-1

# Update backend configuration in main.tf
```

#### Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Apply changes
terraform apply
```

### 3. CI/CD Setup

#### GitHub Secrets

Add these secrets to your GitHub repository:

- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `GOOGLE_API_KEY`: Your Google Gemini API key

#### Automatic Deployment

Once configured, push to the `main` branch will:

1. Run tests and linting
2. Build Docker images
3. Push to Amazon ECR
4. Deploy to ECS via Terraform
5. Comment deployment URL on commit

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `project_name` | Name of the project | `stock-stalk` |
| `environment` | Environment (dev/staging/prod) | `dev` |
| `aws_region` | AWS region | `us-east-1` |
| `vpc_cidr` | VPC CIDR block | `10.0.0.0/16` |
| `backend_cpu` | Backend CPU units | `256` |
| `backend_memory` | Backend memory (MiB) | `512` |
| `frontend_cpu` | Frontend CPU units | `256` |
| `frontend_memory` | Frontend memory (MiB) | `512` |

### Scaling

Adjust the desired count of tasks:

```terraform
backend_desired_count  = 2  # Increase for higher load
frontend_desired_count = 2  # Increase for higher load
```

### Custom Domain

To use a custom domain:

```terraform
domain_name           = "yourdomain.com"
create_route53_record = true
```

## Monitoring

### CloudWatch Logs

View application logs:

```bash
# Backend logs
aws logs tail /ecs/stock-stalk-backend-dev --follow

# Frontend logs
aws logs tail /ecs/stock-stalk-frontend-dev --follow
```

### Application Metrics

Monitor via CloudWatch:
- ECS service metrics
- ALB request metrics
- Container health checks

## Troubleshooting

### Common Issues

1. **ECR Push Fails**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
   ```

2. **Terraform State Lock**
   ```bash
   terraform force-unlock <lock-id>
   ```

3. **Service Health Checks Fail**
   - Check security groups
   - Verify health check paths
   - Review CloudWatch logs

### Rollback

To rollback a deployment:

```bash
# Update task definition to previous version
aws ecs update-service --cluster stock-stalk-dev --service stock-stalk-backend-dev --task-definition stock-stalk-backend-dev:1

# Or redeploy previous commit
git revert HEAD~1
git push origin main
```

## Cost Optimization

### Development Environment
- Use smaller instance sizes
- Set desired count to 1
- Enable auto-scaling based on metrics

### Production Environment
- Use larger instance sizes for better performance
- Implement auto-scaling policies
- Use reserved instances for cost savings

## Security

### Best Practices

1. **IAM**: Use least-privilege principles
2. **Security Groups**: Restrict inbound traffic
3. **Secrets**: Store sensitive data in AWS Secrets Manager
4. **VPC**: Isolate resources in private subnets
5. **CloudTrail**: Enable audit logging

### Compliance

- Enable encryption at rest
- Use HTTPS for all communications
- Implement proper access controls
- Regular security assessments

## Support

For issues or questions:

1. Check CloudWatch logs
2. Review Terraform state
3. Verify AWS service limits
4. Check application health endpoints

## Contributing

1. Test changes locally with Docker Compose
2. Update documentation for infrastructure changes
3. Use descriptive commit messages
4. Follow Terraform best practices

