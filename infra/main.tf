# ─────────────────────────────────────────────────────────────────────────────
# PI Health Dashboard — AWS Infrastructure (Terraform)
#
# Creates a single EC2 instance running Docker Compose with:
#   - Elastic IP (static address)
#   - Security group (HTTP, HTTPS, SSH)
#   - Cloud-init provisioning (Docker, app deploy)
#   - Optional: SSH key pair for access
#
# Usage:
#   cd infra/
#   terraform init
#   terraform plan
#   terraform apply
#
# Tear down:
#   terraform destroy
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ─── Data Sources ─────────────────────────────────────────────────────────────

# Latest Ubuntu 24.04 LTS ARM64 AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-arm64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ─── SSH Key Pair ─────────────────────────────────────────────────────────────

resource "aws_key_pair" "deploy" {
  key_name   = "${var.project_name}-key"
  public_key = var.ssh_public_key
}

# ─── Security Group ──────────────────────────────────────────────────────────

resource "aws_security_group" "dashboard" {
  name        = "${var.project_name}-sg"
  description = "PI Dashboard - HTTP, HTTPS, SSH"

  # SSH - restricted to your IP
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_cidrs
  }

  # HTTP (for Let's Encrypt challenge + redirect)
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-sg"
    Project = var.project_name
  }
}

# ─── EC2 Instance ────────────────────────────────────────────────────────────

resource "aws_instance" "dashboard" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.deploy.key_name
  vpc_security_group_ids = [aws_security_group.dashboard.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  user_data = templatefile("${path.module}/user-data.sh", {
    github_repo    = var.github_repo
    github_branch  = var.github_branch
    domain_name    = var.domain_name
    admin_email    = var.admin_email
    upload_api_key = var.upload_api_key
    app_password   = var.app_password
  })

  tags = {
    Name    = "${var.project_name}-server"
    Project = var.project_name
  }
}

# ─── Elastic IP ──────────────────────────────────────────────────────────────

resource "aws_eip" "dashboard" {
  instance = aws_instance.dashboard.id
  domain   = "vpc"

  tags = {
    Name    = "${var.project_name}-eip"
    Project = var.project_name
  }
}
