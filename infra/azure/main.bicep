// ─────────────────────────────────────────────────────────────────────────────
// PI Health Dashboard — Azure Infrastructure (Bicep)
//
// Deploys:
//   - Azure Container Registry (Basic SKU)
//   - Azure Container Apps Environment (Consumption plan)
//   - Container App: backend (FastAPI)
//   - Container App: frontend (Next.js)
//   - Azure Database for PostgreSQL Flexible Server (Burstable B1ms)
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

@description('Anthropic API key for AI sync parsing (optional)')
@secure()
param anthropicApiKey string = ''

@description('Container image tag (defaults to latest)')
param imageTag string = 'latest'

@description('Backend minimum replicas (0 for scale-to-zero)')
@minValue(0)
@maxValue(5)
param backendMinReplicas int = 0

@description('Backend maximum replicas')
@minValue(1)
@maxValue(10)
param backendMaxReplicas int = 3

@description('Frontend minimum replicas (0 for scale-to-zero)')
@minValue(0)
@maxValue(5)
param frontendMinReplicas int = 0

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

// Construct the CORS origins — include the frontend app URL
var defaultCorsOrigin = 'https://${frontendAppName}.${containerEnv.properties.defaultDomain}'
var effectiveCorsOrigins = corsOrigins != '' ? '${corsOrigins},${defaultCorsOrigin}' : defaultCorsOrigin

// Database connection string for SQLAlchemy
var dbConnectionString = 'postgresql://${dbAdminLogin}:${dbAdminPassword}@${dbServer.properties.fullyQualifiedDomainName}:5432/${dbName}?sslmode=require'

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

// ─── Container Registry ──────────────────────────────────────────────────────

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
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
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
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
          image: '${acr.properties.loginServer}/pi-dashboard-backend:${imageTag}'
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
}

// ─── Frontend Container App ──────────────────────────────────────────────────

resource frontendApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: frontendAppName
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true  // Public-facing
        targetPort: 3000
        transport: 'http'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'OPTIONS']
          allowedHeaders: ['*']
        }
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
        {
          name: 'anthropic-api-key'
          value: anthropicApiKey
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'frontend'
          image: '${acr.properties.loginServer}/pi-dashboard-frontend:${imageTag}'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'BACKEND_URL'
              value: 'https://${backendApp.properties.configuration.ingress.fqdn}'
            }
            {
              name: 'ANTHROPIC_API_KEY'
              secretRef: 'anthropic-api-key'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/'
                port: 3000
              }
              periodSeconds: 30
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/'
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
}

// ─── Outputs ─────────────────────────────────────────────────────────────────

output acrLoginServer string = acr.properties.loginServer
output acrName string = acr.name
output frontendUrl string = 'https://${frontendApp.properties.configuration.ingress.fqdn}'
output backendInternalUrl string = 'https://${backendApp.properties.configuration.ingress.fqdn}'
output dbServerFqdn string = dbServer.properties.fullyQualifiedDomainName
output containerEnvName string = containerEnv.name
output resourceGroupName string = resourceGroup().name
