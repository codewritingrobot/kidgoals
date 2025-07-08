#!/bin/bash

echo "🔒 Testing SSL certificate for api.mcsoko.com..."

echo ""
echo "1. Testing HTTPS connection:"
curl -I --connect-timeout 10 https://api.mcsoko.com/api/health 2>&1

echo ""
echo "2. Testing HTTP connection (should work):"
curl -I --connect-timeout 10 http://goalaroo-alb-1541648613.us-east-2.elb.amazonaws.com/api/health 2>&1

echo ""
echo "3. Checking if certificate exists in ACM:"
aws acm list-certificates --region us-east-2 --query 'CertificateSummaryList[?contains(DomainName, `api.mcsoko.com`)].{DomainName:DomainName,Status:Status}' --output table

echo ""
echo "4. Checking Route53 record:"
aws route53 list-resource-record-sets --hosted-zone-id $(aws route53 list-hosted-zones --query 'HostedZones[?Name==`mcsoko.com.`].Id' --output text) --query 'ResourceRecordSets[?Name==`api.mcsoko.com.`]' --output table 