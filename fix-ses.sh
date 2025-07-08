#!/bin/bash

echo "📧 Checking and fixing SES configuration..."

echo ""
echo "1. Checking if SES domain is verified:"
aws ses list-identities --region us-east-2 --output text

echo ""
echo "2. Checking domain verification status:"
aws ses get-identity-verification-attributes --identities "mcsoko.com" --region us-east-2 --output json

echo ""
echo "3. If domain is not verified, you need to:"
echo "   a) Go to AWS SES Console (us-east-2 region)"
echo "   b) Add 'mcsoko.com' as a verified domain"
echo "   c) Add the DNS verification record to Route53"
echo "   d) Wait for verification to complete"

echo ""
echo "4. For testing, you can also verify a specific email address:"
echo "   aws ses verify-email-identity --email-address noreply@mcsoko.com --region us-east-2"

echo ""
echo "5. Checking current SSM parameter:"
aws ssm get-parameter --name "/goalaroo/from-email" --region us-east-2 --query 'Parameter.Value' --output text 2>/dev/null || echo "Parameter not found"

echo ""
echo "6. Alternative: Use a verified email address for testing"
echo "   You can verify your own email address for testing:"
echo "   aws ses verify-email-identity --email-address your-email@example.com --region us-east-2" 