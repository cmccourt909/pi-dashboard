# ─────────────────────────────────────────────────────────────────────────────
# Variables — customize in terraform.tfvars
# ─────────────────────────────────────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region to deploy in"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name (used for resource naming)"
  type        = string
  default     = "pi-dashboard"
}

variable "instance_type" {
  description = "EC2 instance type (t4g = ARM, cheapest)"
  type        = string
  default     = "t4g.small"
}

variable "ssh_public_key" {
  description = "Your SSH public key (contents of ~/.ssh/id_rsa.pub or id_ed25519.pub)"
  type        = string
}

variable "ssh_allowed_cidrs" {
  description = "CIDR blocks allowed to SSH (e.g., your IP + /32)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "github_repo" {
  description = "GitHub repository (owner/repo format)"
  type        = string
  default     = "cmccourt909/pi-dashboard"
}

variable "github_branch" {
  description = "Branch to deploy"
  type        = string
  default     = "main"
}

variable "domain_name" {
  description = "Domain name for HTTPS (leave empty for IP-only access)"
  type        = string
  default     = ""
}

variable "admin_email" {
  description = "Email for Let's Encrypt certificate notifications"
  type        = string
  default     = ""
}

variable "upload_api_key" {
  description = "Secret key for the /api/upload endpoint"
  type        = string
  sensitive   = true
}

variable "app_password" {
  description = "Password for nginx basic auth (username: admin)"
  type        = string
  sensitive   = true
}
