variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "goalaroo"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "mcsoko.com"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-2a", "us-east-2b"]
}

variable "task_cpu" {
  description = "CPU units for the ECS task"
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "Memory for the ECS task in MB"
  type        = number
  default     = 512
}

variable "service_desired_count" {
  description = "Desired number of ECS service instances"
  type        = number
  default     = 1
}

variable "jwt_secret" {
  description = "JWT secret for authentication"
  type        = string
  sensitive   = true
}

variable "bypass_auth" {
  description = "Bypass authentication and use default user for development"
  type        = string
  default     = "false"
} 