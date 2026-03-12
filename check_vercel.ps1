# Vercel API - Check project settings (with full error output)
$token = $env:VERCEL_TOKEN
$projectId = "prj_a8nRSoK1ySPgRMsq2fvBNvsmphDZ"
$teamId = "team_d2rHUSssNJYHsAlG89ZH9bzL"

if (-not $token) {
    throw "Missing VERCEL_TOKEN environment variable."
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

Write-Host "=== CHECKING PROJECT SETTINGS ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}" -Headers $headers -Method Get -UseBasicParsing
    $project = $response.Content | ConvertFrom-Json
    Write-Host "Project Name: $($project.name)"
    Write-Host "Root Directory: [$($project.rootDirectory)]"
    Write-Host "Build Command: [$($project.buildCommand)]"
    Write-Host "Output Directory: [$($project.outputDirectory)]"
    Write-Host "Framework: [$($project.framework)]"
    Write-Host "Node Version: [$($project.nodeVersion)]"
    Write-Host "Install Command: [$($project.installCommand)]"
    Write-Host "Dev Command: [$($project.devCommand)]"
    
    # Check latest deployment
    Write-Host "`n=== LATEST DEPLOYMENTS ===" -ForegroundColor Cyan
    $deps = Invoke-WebRequest -Uri "https://api.vercel.com/v6/deployments?projectId=${projectId}&teamId=${teamId}&limit=3" -Headers $headers -Method Get -UseBasicParsing
    $depsJson = $deps.Content | ConvertFrom-Json
    foreach ($d in $depsJson.deployments) {
        Write-Host "  Deploy: $($d.uid) | State: $($d.readyState) | URL: $($d.url) | Created: $($d.createdAt)"
    }
}
catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}
