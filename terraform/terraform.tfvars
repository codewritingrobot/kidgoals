# Copy this file to terraform.tfvars and customize the values

aws_region = "us-east-2"
project_name = "goalaroo"
domain_name = "mcsoko.com"
environment = "production"

# Generate a secure JWT secret (you can use: openssl rand -base64 32)
jwt_secret = "2gKExI76D+PjeUmUdi/SPl2zGcPrDAiotG+/77YGeSI="

# Development mode (set to "true" to bypass email sending and show magic codes)
development_mode = "true"

# Optional: Override defaults
# availability_zones = ["us-east-1a", "us-east-1b"]
# task_cpu = 256
# task_memory = 512
# service_desired_count = 1 