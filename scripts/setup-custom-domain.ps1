# ─────────────────────────────────────────────────────────────────────────────
# Setup custom domain for Azure Container Apps
# Run after each deploy if the custom domain gets removed
#
# Usage: .\scripts\setup-custom-domain.ps1
# ─────────────────────────────────────────────────────────────────────────────

$ResourceGroup = "rg-pi-dashboard-UAT"
$AppName = "pi-dashboard-uat-frontend"
$Domain = "runwaypoint.app"
$EnvName = "pi-dashboard-uat-env"

Write-Host "Setting up custom domain: $Domain" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if domain already exists
Write-Host "[1/4] Checking existing custom domains..." -ForegroundColor Yellow
$existing = az containerapp hostname list `
    --name $AppName `
    --resource-group $ResourceGroup `
    --query "[?name=='$Domain'].name" `
    -o tsv 2>$null

if ($existing -eq $Domain) {
    Write-Host "  Domain already bound. Checking certificate status..." -ForegroundColor Green
    $bindingType = az containerapp hostname list `
        --name $AppName `
        --resource-group $ResourceGroup `
        --query "[?name=='$Domain'].bindingType" `
        -o tsv 2>$null
    
    if ($bindingType -eq "SniEnabled") {
        Write-Host "  Certificate is active (SNI enabled). Domain is ready!" -ForegroundColor Green
        Write-Host ""
        Write-Host "  https://$Domain" -ForegroundColor Cyan
        exit 0
    }
    Write-Host "  Domain exists but cert may need rebinding. Continuing..." -ForegroundColor Yellow
}

# Step 2: Add hostname
Write-Host "[2/4] Adding hostname to container app..." -ForegroundColor Yellow
az containerapp hostname add `
    --name $AppName `
    --resource-group $ResourceGroup `
    --hostname $Domain 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "  Hostname add failed (may already exist). Continuing..." -ForegroundColor Yellow
}
else {
    Write-Host "  Hostname added." -ForegroundColor Green
}

# Step 3: Bind with managed certificate
Write-Host "[3/4] Binding managed certificate (CNAME validation)..." -ForegroundColor Yellow
az containerapp hostname bind `
    --name $AppName `
    --resource-group $ResourceGroup `
    --hostname $Domain `
    --validation-method CNAME 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "  Bind failed. The cert may still be provisioning." -ForegroundColor Red
    Write-Host "  Wait 5 minutes and re-run this script." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  If DNS is not set up, add these records in Cloudflare:" -ForegroundColor Yellow
    Write-Host "    CNAME  @     -> pi-dashboard-uat-frontend.salmonrock-91ab3950.uksouth.azurecontainerapps.io" -ForegroundColor White
    Write-Host "    TXT    asuid -> EA6E1844C79E60F6FC42345ACA3FBD8F452D4D8AEBDD1C28AF5B4F4B792F94AA" -ForegroundColor White
    exit 1
}
else {
    Write-Host "  Certificate bound successfully." -ForegroundColor Green
}

# Step 4: Verify
Write-Host "[4/4] Verifying..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
$status = az containerapp hostname list `
    --name $AppName `
    --resource-group $ResourceGroup `
    --query "[?name=='$Domain'].bindingType" `
    -o tsv 2>$null

if ($status -eq "SniEnabled") {
    Write-Host ""
    Write-Host "  Custom domain ready!" -ForegroundColor Green
    Write-Host "  https://$Domain" -ForegroundColor Cyan
}
else {
    Write-Host "  Certificate still provisioning. Try https://$Domain in 5-10 minutes." -ForegroundColor Yellow
}
