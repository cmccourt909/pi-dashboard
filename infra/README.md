# Deploying PI Dashboard to AWS

A single EC2 instance running Docker Compose. Estimated cost: **~$10-15/month**.

---

## Prerequisites

Install on your local machine:

1. **Terraform** — [download](https://developer.hashicorp.com/terraform/downloads)
   ```bash
   # Mac
   brew install terraform

   # Windows
   choco install terraform

   # Linux
   sudo apt-get install terraform
   ```

2. **AWS CLI** — [download](https://aws.amazon.com/cli/)
   ```bash
   # Mac
   brew install awscli

   # Windows — download MSI from link above

   # Linux
   sudo apt-get install awscli
   ```

3. **Configure AWS credentials:**
   ```bash
   aws configure
   # Enter your Access Key ID, Secret Key, region (e.g. us-east-1)
   ```

4. **An SSH key pair** (if you don't have one):
   ```bash
   ssh-keygen -t ed25519 -C "your-email@example.com"
   # Creates ~/.ssh/id_ed25519 (private) and ~/.ssh/id_ed25519.pub (public)
   ```

---

## Step-by-Step Deployment

### 1. Configure variables

```bash
cd infra/
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:
- Paste your SSH **public** key (contents of `~/.ssh/id_ed25519.pub`)
- Set your IP for SSH access (find it at https://whatismyip.com, add `/32`)
- Set a secure `upload_api_key` and `app_password`
- Optionally set a `domain_name` for HTTPS

### 2. Initialize Terraform

```bash
terraform init
```

This downloads the AWS provider plugin. One-time step.

### 3. Preview what will be created

```bash
terraform plan
```

You'll see a list of resources (EC2 instance, security group, elastic IP, key pair). Review and confirm it looks right.

### 4. Deploy!

```bash
terraform apply
```

Type `yes` when prompted. Takes ~3 minutes. When done, you'll see:

```
Outputs:

dashboard_url_http = "http://54.123.45.67"
public_ip          = "54.123.45.67"
ssh_command        = "ssh ubuntu@54.123.45.67"
```

### 5. Wait for provisioning (~5 minutes)

The instance needs to install Docker, clone your repo, and build containers. Monitor progress:

```bash
ssh ubuntu@<your-ip>
tail -f /var/log/pi-dashboard-setup.log
```

Once you see `=== PI Dashboard Setup Complete ===`, it's ready!

### 6. Access the dashboard

Open `http://<your-ip>` in a browser.
- **Username:** `admin`
- **Password:** whatever you set in `app_password`

---

## Automated Deploys (GitHub Actions)

Push to `main` → automatically deploys to your server.

### Setup (one-time):

1. Go to your repo on GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:
   - `EC2_HOST` — your server's Elastic IP (from terraform output)
   - `EC2_SSH_KEY` — your **private** SSH key (contents of `~/.ssh/id_ed25519`)

Now every push to `main` triggers a deploy via SSH.

---

## Common Commands

| Task | Command |
|------|---------|
| SSH into server | `ssh ubuntu@<ip>` |
| View app logs | `ssh ubuntu@<ip> "cd /opt/pi-dashboard && docker compose -f docker-compose.prod.yml logs -f"` |
| Manual deploy | `ssh ubuntu@<ip> "cd /opt/pi-dashboard && ./deploy-prod.sh"` |
| Restart services | `ssh ubuntu@<ip> "cd /opt/pi-dashboard && docker compose -f docker-compose.prod.yml restart"` |
| Check service health | `ssh ubuntu@<ip> "cd /opt/pi-dashboard && docker compose -f docker-compose.prod.yml ps"` |
| Destroy everything | `cd infra/ && terraform destroy` |

---

## Adding a Domain + HTTPS

1. Set `domain_name` and `admin_email` in `terraform.tfvars`
2. Point your domain's DNS A record to the Elastic IP
3. Run `terraform apply` (or re-run on existing instance)
4. Let's Encrypt will auto-issue a certificate
5. Certs auto-renew via cron

---

## Cost Breakdown

| Resource | Monthly Cost |
|----------|-------------|
| EC2 t4g.small (on-demand) | ~$6.12 |
| EBS 20GB gp3 | ~$1.60 |
| Elastic IP (attached) | ~$3.60 |
| Data transfer (light) | ~$1-2 |
| **Total** | **~$12-14** |

Tip: If your AWS account is < 12 months old, `t4g.micro` (1GB RAM) is free-tier eligible. Change `instance_type` in `terraform.tfvars` — but 1GB is tight for building Docker images.

---

## Tear Down

When you're done with UAT:

```bash
cd infra/
terraform destroy
```

Type `yes`. All AWS resources are deleted and billing stops immediately.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Can't SSH | Check your IP in `ssh_allowed_cidrs` matches your current IP |
| Containers not starting | SSH in, check `/var/log/pi-dashboard-setup.log` |
| 502 Bad Gateway | Containers still building. Wait 2-3 min, check `docker compose ps` |
| "database is locked" | Only one upload at a time with SQLite. Wait and retry. |
| Let's Encrypt fails | Ensure DNS A record points to the Elastic IP, wait for propagation |
