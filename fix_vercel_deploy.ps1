# ============================================================
# VERCEL FIX - Configura Root Directory e faz redeploy
# Execute este script no PowerShell dentro de:
# c:\Users\brend\Videos\bot-strategy-hub\million-bots-frontend
# ============================================================

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

# ── STEP 1: Check current settings ──
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " STEP 1: Verificando configuracoes atuais" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}" -Headers $headers -Method Get -UseBasicParsing
    $project = $response.Content | ConvertFrom-Json
    Write-Host "Project Name:     $($project.name)"
    Write-Host "Root Directory:   [$($project.rootDirectory)]"
    Write-Host "Build Command:    [$($project.buildCommand)]"
    Write-Host "Output Directory: [$($project.outputDirectory)]"
    Write-Host "Framework:        [$($project.framework)]"
}
catch {
    Write-Host "ERRO ao ler projeto: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ── STEP 2: Fix Root Directory to FRONTEND ──
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host " STEP 2: Configurando Root Directory = FRONTEND" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$body = @{
    rootDirectory   = "FRONTEND"
    framework       = "vite"
    buildCommand    = $null
    outputDirectory = $null
} | ConvertTo-Json

try {
    $patchResponse = Invoke-WebRequest -Uri "https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}" -Headers $headers -Method Patch -Body $body -UseBasicParsing
    $updated = $patchResponse.Content | ConvertFrom-Json
    Write-Host "SUCESSO! Root Directory atualizado para: [$($updated.rootDirectory)]" -ForegroundColor Green
    Write-Host "Framework: [$($updated.framework)]"
}
catch {
    Write-Host "ERRO ao atualizar: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())" -ForegroundColor Yellow
    }
    exit 1
}

# ── STEP 3: Verify the update ──
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " STEP 3: Confirmando configuracao" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    $verifyResponse = Invoke-WebRequest -Uri "https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}" -Headers $headers -Method Get -UseBasicParsing
    $verified = $verifyResponse.Content | ConvertFrom-Json
    Write-Host "Root Directory:   [$($verified.rootDirectory)]"
    Write-Host "Build Command:    [$($verified.buildCommand)]"  
    Write-Host "Output Directory: [$($verified.outputDirectory)]"
    Write-Host "Framework:        [$($verified.framework)]"
    
    if ($verified.rootDirectory -eq "FRONTEND") {
        Write-Host "`n✅ CONFIGURACAO CORRETA! Root Directory = FRONTEND" -ForegroundColor Green
    }
    else {
        Write-Host "`n❌ ALGO DEU ERRADO. Root Directory nao foi atualizado." -ForegroundColor Red
    }
}
catch {
    Write-Host "ERRO ao verificar: $($_.Exception.Message)" -ForegroundColor Red
}

# ── STEP 4: Trigger redeploy ──
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host " STEP 4: Triggering redeploy..." -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

$deployBody = @{
    name      = "bot-strategy-hub"
    project   = $projectId
    target    = "production"
    gitSource = @{
        type   = "github"
        repoId = "910218015"
        ref    = "main"
    }
} | ConvertTo-Json -Depth 3

try {
    $deployResponse = Invoke-WebRequest -Uri "https://api.vercel.com/v13/deployments?teamId=${teamId}&forceNew=1" -Headers $headers -Method Post -Body $deployBody -UseBasicParsing
    $deploy = $deployResponse.Content | ConvertFrom-Json
    Write-Host "REDEPLOY INICIADO!" -ForegroundColor Green
    Write-Host "Deploy ID: $($deploy.id)"
    Write-Host "URL: $($deploy.url)"
    Write-Host "Status: $($deploy.readyState)"
    Write-Host "`nAguarde alguns minutos para o deploy completar..." -ForegroundColor Yellow
}
catch {
    Write-Host "ERRO ao fazer redeploy: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())" -ForegroundColor Yellow
    }
    Write-Host "`nTente fazer push de um commit vazio para triggerar:" -ForegroundColor Yellow
    Write-Host "git commit --allow-empty -m 'trigger: redeploy with FRONTEND root'" -ForegroundColor White
    Write-Host "git push" -ForegroundColor White
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host " CONCLUIDO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Apos o deploy completar, acesse: https://bot-strategy-hub.vercel.app"
Write-Host "Verifique que a sidebar tem a aba 'Mis Brokers'"
