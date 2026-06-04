# ─────────────────────────────────────────────────────────────────────────────
# Outputs — displayed after terraform apply
# ─────────────────────────────────────────────────────────────────────────────

output "public_ip" {
  description = "Public IP address of the dashboard server"
  value       = aws_eip.dashboard.public_ip
}

output "ssh_command" {
  description = "SSH command to connect to the server"
  value       = "ssh ubuntu@${aws_eip.dashboard.public_ip}"
}

output "dashboard_url_http" {
  description = "Dashboard URL (HTTP)"
  value       = "http://${aws_eip.dashboard.public_ip}"
}

output "dashboard_url_https" {
  description = "Dashboard URL (HTTPS — requires domain_name to be set)"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "(set domain_name variable for HTTPS)"
}

output "instance_id" {
  description = "EC2 instance ID (for AWS console)"
  value       = aws_instance.dashboard.id
}
