// ─────────────────────────────────────────────────────────────────────────────
// PI Health Dashboard — Azure Infrastructure (Bicep)
//
// Deploys:
//   - Azure Container Registry (Basic SKU)
//   - Azure Container Apps Environment (Consumption plan)
//   - Container App: backend (FastAPI)
//   - Container App: frontend (Next.js) with Entra ID authentication
//   - Azure Database for PostgreSQL Flexible Server (Burstable B1ms)
//   - Managed Identity for ACR access
//
// Usage:
//   az deployment group create \
//     --resource-group <rg-name> \
//     --template-file main.bicep \
//     --parameters @parameters.uat.bicepparam
//
// ─────────────────────────────────────────────────────────────────────────────

targetScope = 'resourceGroup'

// ─── Parameters ──────────────────────────────────────────────────────────────

@description('Environment name (e.g. uat, prod)')
param environmentName string

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Project name used as prefix for resource names')
param projectName string = 'pi-dashboard'

@description('PostgreSQL administrator login')
param dbAdminLogin string = 'pidashboardadmin'

@description('PostgreSQL administrator password')
@secure()
param dbAdminPassword string

@description('Upload API key for the backend')
@secure()
param uploadApiKey string

@description('CORS origins (comma-separated)')
param corsOrigins string = ''

@description('Container image tag (defaults to latest)')
param imageTag string = 'latest'

@description('Use a public placeholder image (set true on first deploy before images exist in ACR)')
param useDefaultImage bool = false

@description('Azure AD (Entra ID) client ID for frontend authentication')
param entraClientId string = ''

@description('Azure AD (Entra ID) tenant ID for frontend authentication')
param entraTenantId string = ''

@description('Backend minimum replicas (0 for scale-to-zero)')
@minValue(0)
@maxValue(5)
param backendMinReplicas int = 1

@description('Backend maximum replicas')
@minValue(1)
@maxValue(10)
param backendMaxReplicas int = 3

@description('Frontend minimum replicas (0 for scale-to-zero)')
@minValue(0)
@maxValue(5)
param frontendMinReplicas int = 1

@description('Frontend maximum replicas')
@minValue(1)
@maxValue(10)
param frontendMaxReplicas int = 3

// ─── Variables ───────────────────────────────────────────────────────────────

var envNameLower = toLower(environmentName)
var resourcePrefix = '${projectName}-${envNameLower}'
var acrName = replace('${projectName}${envNameLower}acr', '-', '')
var dbServerName = '${resourcePrefix}-db'
var dbName = 'pidashboard'
var containerEnvName = '${resourcePrefix}-env'
var backendAppName = '${resourcePrefix}-backend'
var frontendAppName = '${resourcePrefix}-frontend'
var logAnalyticsName = '${resourcePrefix}-logs'
var managedIdentityName = '${resourcePrefix}-identity'

// Container images — use placeholder on first deploy before ACR has images
var backendImage = useDefaultImage ? 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest' : '${acr.properties.loginServer}/pi-dashboard-backend:${imageTag}'
var frontendImage = useDefaultImage ? 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest' : '${acr.properties.loginServer}/pi-dashboard-frontend:${imageTag}'

// Construct the CORS origins — include the frontend app URL
var defaultCorsOrigin = 'https://${frontendAppName}.${containerEnv.properties.defaultDomain}'
var effectiveCorsOrigins = corsOrigins != '' ? '${corsOrigins},${defaultCorsOrigin}' : defaultCorsOrigin

// Database connection string for SQLAlchemy
var dbConnectionString = 'postgresql://${dbAdminLogin}:${dbAdminPassword}@${dbServer.properties.fullyQualifiedDomainName}:5432/${dbName}?sslmode=require'

// Whether Entra ID auth is configured
var entraAuthEnabled = entraClientId != '' && entraTenantId != ''

// Azure OpenAI resource name
var openaiName = '${resourcePrefix}-openai'

// ─── Log Analytics Workspace ─────────────────────────────────────────────────

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ─── Managed Identity (for ACR pull) ─────────────────────────────────────────

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: managedIdentityName
  location: location
}

// ─── Container Registry ──────────────────────────────────────────────────────

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false  // Security: use managed identity instead
  }
}

// Assign AcrPull role to the managed identity
resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, managedIdentity.id, 'acrpull')
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d') // AcrPull
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// ─── PostgreSQL Flexible Server ──────────────────────────────────────────────

resource dbServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: dbServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: dbAdminLogin
    administratorLoginPassword: dbAdminPassword
    storage: {
      storageSizeGB: 32
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

// Allow Azure services (Container Apps) to connect
resource dbFirewallAllowAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: dbServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Create the application database
resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: dbServer
  name: dbName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// ─── Container Apps Environment ──────────────────────────────────────────────

resource containerEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerEnvName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
    zoneRedundant: false
  }
}

// ─── Backend Container App ───────────────────────────────────────────────────

resource backendApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: backendAppName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: false  // Internal only — frontend proxies to it
        targetPort: 8000
        transport: 'http'
        allowInsecure: true
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: managedIdentity.id
        }
      ]
      secrets: [
        {
          name: 'db-url'
          value: dbConnectionString
        }
        {
          name: 'upload-api-key'
          value: uploadApiKey
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'backend'
          image: backendImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'DB_URL'
              secretRef: 'db-url'
            }
            {
              name: 'UPLOAD_API_KEY'
              secretRef: 'upload-api-key'
            }
            {
              name: 'CORS_ORIGINS'
              value: effectiveCorsOrigins
            }
            {
              name: 'AZURE_OPENAI_ENDPOINT'
              value: openai.properties.endpoint
            }
            {
              name: 'AZURE_OPENAI_DEPLOYMENT'
              value: gpt4oMiniDeployment.name
            }
            {
              name: 'AZURE_CLIENT_ID'
              value: managedIdentity.properties.clientId
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 8000
              }
              periodSeconds: 30
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/health'
                port: 8000
              }
              initialDelaySeconds: 5
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: backendMinReplicas
        maxReplicas: backendMaxReplicas
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
  dependsOn: [
    acrPullRoleAssignment
  ]
}

// ─── Frontend Container App ──────────────────────────────────────────────────

resource frontendApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: frontendAppName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true  // Public-facing
        targetPort: 3000
        transport: 'http'
        corsPolicy: {
          allowedOrigins: [defaultCorsOrigin, 'https://runwaypoint.app']
          allowedMethods: ['GET', 'POST', 'OPTIONS']
          allowedHeaders: ['Content-Type', 'Authorization', 'X-Upload-Key']
        }
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: managedIdentity.id
        }
      ]
      secrets: []
    }
    template: {
      containers: [
        {
          name: 'frontend'
          image: frontendImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'BACKEND_URL'
              value: 'https://${backendApp.properties.configuration.ingress.fqdn}'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 3000
              }
              periodSeconds: 30
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health'
                port: 3000
              }
              initialDelaySeconds: 10
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: frontendMinReplicas
        maxReplicas: frontendMaxReplicas
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
  dependsOn: [
    acrPullRoleAssignment
  ]
}

// ─── Entra ID Authentication (EasyAuth) on Frontend ──────────────────────────

resource frontendAuth 'Microsoft.App/containerApps/authConfigs@2024-03-01' = if (entraAuthEnabled) {
  parent: frontendApp
  name: 'current'
  properties: {
    platform: {
      enabled: true
    }
    globalValidation: {
      unauthenticatedClientAction: 'RedirectToLoginPage'
      excludedPaths: [
        '/api/health'
        '/api/seed-demo'
        '/api/enrich/findings'
        '/api/enrich/briefing'
        '/api/enrich/status'
      ]
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        registration: {
          clientId: entraClientId
          openIdIssuer: 'https://login.microsoftonline.com/${entraTenantId}/v2.0'
        }
        validation: {
          allowedAudiences: [
            'api://${entraClientId}'
          ]
        }
      }
    }
  }
}

// ─── Azure OpenAI Service ────────────────────────────────────────────────────

resource openai 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: openaiName
  location: location
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: openaiName
    publicNetworkAccess: 'Enabled'
  }
}

// Deploy GPT-4o-mini model
resource gpt4oMiniDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: openai
  name: 'gpt-4o-mini'
  sku: {
    name: 'GlobalStandard'
    capacity: 30  // 30K tokens per minute
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o-mini'
      version: '2024-07-18'
    }
  }
}

// Assign Cognitive Services OpenAI User role to the managed identity
resource openaiRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(openai.id, managedIdentity.id, 'openai-user')
  scope: openai
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd') // Cognitive Services OpenAI User
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// ─── Outputs ─────────────────────────────────────────────────────────────────

output acrLoginServer string = acr.properties.loginServer
output acrName string = acr.name
output frontendUrl string = 'https://${frontendApp.properties.configuration.ingress.fqdn}'
output backendInternalUrl string = 'https://${backendApp.properties.configuration.ingress.fqdn}'
output dbServerFqdn string = dbServer.properties.fullyQualifiedDomainName
output containerEnvName string = containerEnv.name
output resourceGroupName string = resourceGroup().name
output managedIdentityClientId string = managedIdentity.properties.clientId
output authEnabled bool = entraAuthEnabled
output openaiEndpoint string = openai.properties.endpoint
output openaiDeploymentName string = gpt4oMiniDeployment.name
