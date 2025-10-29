# Project Configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "stock-stalk"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

# AWS Configuration
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to use"
  type        = number
  default     = 2
}

# ECS Configuration
variable "backend_cpu" {
  description = "CPU units for backend task (256 = 0.25 vCPU, 512 = 0.5 vCPU, etc.)"
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Memory for backend task (in MiB)"
  type        = number
  default     = 512
}

variable "frontend_cpu" {
  description = "CPU units for frontend task"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Memory for frontend task (in MiB)"
  type        = number
  default     = 512
}

variable "backend_desired_count" {
  description = "Desired number of backend tasks"
  type        = number
  default     = 1
}

variable "frontend_desired_count" {
  description = "Desired number of frontend tasks"
  type        = number
  default     = 1
}

# Application Configuration
variable "google_api_key" {
  description = "Google Gemini API key"
  type        = string
  sensitive   = true
}

# Domain Configuration (optional)
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "create_route53_record" {
  description = "Whether to create Route53 record"
  type        = bool
  default     = false
}

