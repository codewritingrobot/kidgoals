#!/bin/bash

# Clean up existing task definitions that might conflict

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="goalaroo"
AWS_REGION="us-east-2"

echo -e "${YELLOW}🧹 Cleaning up task definitions...${NC}"

# List all task definitions for this project
echo -e "${YELLOW}📋 Checking existing task definitions...${NC}"

TASK_DEFS=$(aws ecs list-task-definitions --family-prefix ${PROJECT_NAME} --region ${AWS_REGION} --query 'taskDefinitionArns' --output text 2>/dev/null || echo "")

if [ -z "$TASK_DEFS" ]; then
    echo -e "${GREEN}✅ No existing task definitions found${NC}"
else
    echo -e "${YELLOW}Found task definitions:${NC}"
    echo "$TASK_DEFS"
    
    echo -e "${YELLOW}⚠️  Do you want to deregister these task definitions? (y/N)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        for task_def in $TASK_DEFS; do
            echo -e "${YELLOW}Deregistering: $task_def${NC}"
            aws ecs deregister-task-definition --task-definition "$task_def" --region ${AWS_REGION}
        done
        echo -e "${GREEN}✅ Task definitions cleaned up${NC}"
    else
        echo -e "${YELLOW}⚠️  Skipping cleanup${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Cleanup completed!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Push the updated GitHub Actions workflow"
echo "2. Trigger a new deployment"
echo "3. The workflow will create a new task definition with correct container names" 