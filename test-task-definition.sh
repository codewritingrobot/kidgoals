#!/bin/bash

# Test task definition locally

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="goalaroo"
AWS_REGION="us-east-2"
TASK_DEFINITION="${PROJECT_NAME}-task"

echo -e "${YELLOW}🧪 Testing task definition...${NC}"

# Check if task definition exists
if aws ecs describe-task-definition --task-definition ${TASK_DEFINITION} --region ${AWS_REGION} >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Task definition exists${NC}"
    
    # Download and clean the task definition
    aws ecs describe-task-definition --task-definition ${TASK_DEFINITION} --region ${AWS_REGION} --query taskDefinition > task-definition.json
    
    # Clean up metadata fields
    jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' task-definition.json > cleaned-task-definition.json
    
    echo -e "${GREEN}✅ Task definition cleaned${NC}"
    echo "Cleaned task definition:"
    cat cleaned-task-definition.json
    
    # Clean up additional problematic fields
    jq 'del(.containerDefinitions[0].portMappings[0].hostPort, .containerDefinitions[0].mountPoints, .containerDefinitions[0].volumesFrom, .containerDefinitions[0].systemControls, .volumes, .placementConstraints)' cleaned-task-definition.json > final-task-definition.json
    
    echo -e "${GREEN}✅ Task definition further cleaned${NC}"
    echo "Final task definition:"
    cat final-task-definition.json
    
    # Test validation (without dry-run as it might not work)
    echo -e "${YELLOW}📋 Testing task definition validation...${NC}"
    if aws ecs register-task-definition --cli-input-json file://final-task-definition.json --region ${AWS_REGION} >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Task definition is valid and registered successfully${NC}"
        # Deregister it immediately to avoid clutter
        aws ecs deregister-task-definition --task-definition ${TASK_DEFINITION} --region ${AWS_REGION} >/dev/null 2>&1 || true
    else
        echo -e "${RED}❌ Task definition validation failed${NC}"
        exit 1
    fi
    
    # Clean up
    rm -f task-definition.json cleaned-task-definition.json final-task-definition.json
    
else
    echo -e "${YELLOW}⚠️  Task definition does not exist yet${NC}"
    echo "This is normal for the first deployment"
fi

echo ""
echo -e "${GREEN}🎉 Task definition test completed!${NC}" 