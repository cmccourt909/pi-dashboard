// ─────────────────────────────────────────────────────────────────────────────
// PI Health Dashboard — UAT Environment Parameters
//
// Usage:
//   az deployment group create \
//     --resource-group rg-pi-dashboard-uat \
//     --template-file main.bicep \
//     --parameters @parameters.uat.bicepparam
//
// Secure parameters (dbAdminPassword, uploadApiKey, anthropicApiKey)
// should be provided via command line or CI/CD pipeline secrets:
//   --parameters dbAdminPassword='<value>' uploadApiKey='<value>'
// ─────────────────────────────────────────────────────────────────────────────

using './main.bicep'

param environmentName = 'uat'
param location = 'uksouth'
param projectName = 'pi-dashboard'

// Database
param dbAdminLogin = 'pidashboardadmin'
param dbAdminPassword = readEnvironmentVariable('DB_ADMIN_PASSWORD', '')

// Application secrets
param uploadApiKey = readEnvironmentVariable('UPLOAD_API_KEY', '')
param anthropicApiKey = readEnvironmentVariable('ANTHROPIC_API_KEY', '')

// CORS — empty means auto-detected from frontend URL
param corsOrigins = ''

// Container image tag — set via CI/CD
param imageTag = readEnvironmentVariable('IMAGE_TAG', 'latest')

// Scaling — scale-to-zero for UAT to minimize costs
param backendMinReplicas = 0
param backendMaxReplicas = 2
param frontendMinReplicas = 0
param frontendMaxReplicas = 2
