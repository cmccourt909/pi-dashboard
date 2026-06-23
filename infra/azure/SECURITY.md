# PI Health Dashboard — Azure Security Guide

## Production Security Checklist

This document covers security hardening steps for the Azure Container Apps deployment.

---

## 1. Network Isolation (VNet Integration)

For production, deploy Container Apps and PostgreSQL into a VNet with private endpoints:

```bash
# Create a VNet for the environment
az network vnet create \
  --resource-group rg-pi-dashboard-prod \
  --name vnet-pi-dashboard \
  --address-prefix 10.0.0.0/16 \
  --subnet-name snet-container-apps \
  --subnet-prefix 10.0.0.0/23

# Create a subnet for PostgreSQL private endpoint
az network vnet subnet create \
  --resource-group rg-pi-dashboard-prod \
  --vnet-name vnet-pi-dashboard \
  --name snet-postgres \
  --address-prefix 10.0.2.0/24
```

Then update the Bicep template to use VNet integration for the Container Apps Environment.

---

## 2. Restrict Database Firewall

The current deployment uses `AllowAzureServices` (0.0.0.0/0.0.0.0) which allows any Azure service to connect. For production:

### Option A: Use Container Apps outbound IPs

```bash
# Get the Container Apps Environment outbound IPs
az containerapp env show \
  --resource-group rg-pi-dashboard-uat \
  --name pi-dashboard-uat-env \
  --query "properties.staticIp" -o tsv

# Replace the AllowAzureServices rule with specific IPs
az postgres flexible-server firewall-rule delete \
  --resource-group rg-pi-dashboard-uat \
  --name pi-dashboard-uat-db \
  --rule-name AllowAzureServices --yes

az postgres flexible-server firewall-rule create \
  --resource-group rg-pi-dashboard-uat \
  --name pi-dashboard-uat-db \
  --rule-name AllowContainerApps \
  --start-ip-address <OUTBOUND_IP> \
  --end-ip-address <OUTBOUND_IP>
```

### Option B: Private endpoints (recommended for production)

Deploy PostgreSQL with a private endpoint in the same VNet as Container Apps. No public firewall rules needed.

---

## 3. OIDC Federated Credentials (No Client Secret)

Replace the client secret with OIDC federated credentials for GitHub Actions:

### Setup

```bash
# 1. Create a federated identity credential on the service principal
APP_OBJECT_ID=$(az ad app show --id 7da72ba6-f0b8-4300-b315-2246806d1486 --query id -o tsv)

# For the main branch
az ad app federated-credential create \
  --id $APP_OBJECT_ID \
  --parameters '{
    "name": "github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:cmccourt909/pi-dashboard:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# For the uat environment
az ad app federated-credential create \
  --id $APP_OBJECT_ID \
  --parameters '{
    "name": "github-uat",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:cmccourt909/pi-dashboard:environment:uat",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### Update workflow to use OIDC

Replace:
```yaml
- uses: azure/login@v2
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}
```

With:
```yaml
permissions:
  id-token: write
  contents: read

- uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

Then delete the `AZURE_CREDENTIALS` secret (no more client secret stored in GitHub).

---

## 4. Managed Identity for Database Authentication

Instead of a password in the connection string, use Azure AD authentication:

### Setup

```bash
# Enable Azure AD auth on the PostgreSQL server
az postgres flexible-server update \
  --resource-group rg-pi-dashboard-uat \
  --name pi-dashboard-uat-db \
  --active-directory-auth Enabled

# Create an AD admin for the server
az postgres flexible-server ad-admin create \
  --resource-group rg-pi-dashboard-uat \
  --server-name pi-dashboard-uat-db \
  --display-name "pi-dashboard-identity" \
  --object-id <MANAGED_IDENTITY_PRINCIPAL_ID> \
  --type ServicePrincipal

# Grant the managed identity access
az postgres flexible-server ad-admin create \
  --resource-group rg-pi-dashboard-uat \
  --server-name pi-dashboard-uat-db \
  --display-name "pi-dashboard-uat-identity" \
  --object-id $(az identity show --name pi-dashboard-uat-identity --resource-group rg-pi-dashboard-uat --query principalId -o tsv) \
  --type ServicePrincipal
```

### Application code change

Update `app/models.py` to use token-based auth:

```python
import os
from azure.identity import ManagedIdentityCredential

def get_engine():
    url = os.environ.get("DB_URL", "sqlite:///app.db")
    if "azure" in url or os.environ.get("AZURE_USE_MANAGED_IDENTITY"):
        credential = ManagedIdentityCredential(
            client_id=os.environ.get("AZURE_CLIENT_ID")
        )
        token = credential.get_token("https://ossrdbms-aad.database.windows.net/.default")
        # Use token as password in connection string
        url = url.replace("<PASSWORD>", token.token)
    return create_engine(url, echo=False, future=True)
```

**Note:** This requires adding `azure-identity` to requirements.txt and is recommended for production only.

---

## 5. Enable Azure Defender for PostgreSQL

Azure Defender provides threat detection, vulnerability assessment, and anomaly alerting.

### Enable via Azure Portal

1. Go to **Microsoft Defender for Cloud** → **Environment settings**
2. Select your subscription
3. Enable **Databases** protection plan
4. Select **Azure Database for PostgreSQL**

### Enable via CLI

```bash
az security pricing create \
  --name OpenSourceRelationalDatabases \
  --tier Standard
```

### What it detects

- Brute-force login attempts
- Anomalous database access patterns
- SQL injection attempts
- Suspicious database operations
- Data exfiltration indicators

### Cost

~$15/month per protected PostgreSQL server (charged by Microsoft Defender).

---

## 6. Key Vault for Secrets Management (Future Enhancement)

Currently, secrets are stored in Container App secrets (encrypted at rest). For additional security:

```bicep
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${resourcePrefix}-kv'
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: tenant().tenantId
    accessPolicies: []
    enableRbacAuthorization: true
  }
}
```

Then reference secrets from Key Vault in Container App configuration instead of inline values.

---

## Summary of Security Posture

| Layer | UAT (Current) | Production (Recommended) |
|-------|---------------|--------------------------|
| Authentication | Entra ID EasyAuth | Entra ID EasyAuth + Conditional Access |
| Network | Public ingress + AllowAzureServices DB | VNet + Private Endpoints |
| Secrets | Container App secrets | Azure Key Vault |
| CI/CD auth | Client secret | OIDC federated credential |
| DB auth | Password in connection string | Managed Identity token |
| Container | Non-root user | Non-root + read-only filesystem |
| Monitoring | Log Analytics | Log Analytics + Defender for Cloud |
| Rate limiting | 60 req/min per IP | 60 req/min + WAF (via Front Door) |
