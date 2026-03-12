# Check HFT Supabase for trade data
$hftUrl = "https://ypqekkkrfklaqlzhkbwg.supabase.co"
$hftServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwcWVra2tyZmtsYXFsemhrYndnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAzMTcxMiwiZXhwIjoyMDg3NjA3NzEyfQ.dToc9a9Pb_D3eYXCcRQzL4KcGoxE-UYvsM3NI4krsjs"

$headers = @{
    "apikey"        = $hftServiceKey
    "Authorization" = "Bearer $hftServiceKey"
    "Content-Type"  = "application/json"
    "Prefer"        = "count=exact"
}

Write-Host "=== HFT SUPABASE - TRADE DATA CHECK ===" -ForegroundColor Cyan

# 1. Check hft_audit_logs
Write-Host "`n--- hft_audit_logs (ultimos 10) ---" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri "$hftUrl/rest/v1/hft_audit_logs?select=*&order=created_at.desc&limit=10" -Headers $headers -Method Get -UseBasicParsing
    $data = $r.Content | ConvertFrom-Json
    if ($data.Count -eq 0) { Write-Host "  VAZIO - Nenhum registro" -ForegroundColor Red }
    else {
        foreach ($row in $data) {
            Write-Host "  ID=$($row.id) | ativo=$($row.ativo) | status=$($row.status) | lucro=$($row.lucro_liquido) | bot=$($row.bot_id)" -ForegroundColor Green
        }
    }
}
catch {
    Write-Host "  ERRO ou tabela nao existe: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Check hft_catalogo_estrategias (signals)
Write-Host "`n--- hft_catalogo_estrategias (ultimos 10 CONFIRMED) ---" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri "$hftUrl/rest/v1/hft_catalogo_estrategias?select=id,ativo,direcao,status,estrategia,created_at&status=eq.CONFIRMED&order=created_at.desc&limit=10" -Headers $headers -Method Get -UseBasicParsing
    $data = $r.Content | ConvertFrom-Json
    if ($data.Count -eq 0) { Write-Host "  VAZIO - Nenhum sinal CONFIRMED" -ForegroundColor Red }
    else {
        foreach ($row in $data) {
            Write-Host "  ID=$($row.id) | $($row.ativo) $($row.direcao) | strat=$($row.estrategia) | $($row.created_at)" -ForegroundColor Green
        }
    }
}
catch {
    Write-Host "  ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Check agent_cycles
Write-Host "`n--- agent_cycles (ultimos 5) ---" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri "$hftUrl/rest/v1/agent_cycles?select=*&order=created_at.desc&limit=5" -Headers $headers -Method Get -UseBasicParsing
    $data = $r.Content | ConvertFrom-Json
    if ($data.Count -eq 0) { Write-Host "  VAZIO" -ForegroundColor Red }
    else {
        foreach ($row in $data) {
            Write-Host "  cycle=$($row.id) | status=$($row.status) | $($row.created_at)" -ForegroundColor Green
        }
    }
}
catch {
    Write-Host "  ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Check hft_oracle_results
Write-Host "`n--- hft_oracle_results (ultimos 5) ---" -ForegroundColor Yellow
try {
    $r = Invoke-WebRequest -Uri "$hftUrl/rest/v1/hft_oracle_results?select=id,ativo,estrategia,status,win_rate,n_amostral,last_update&order=last_update.desc&limit=5" -Headers $headers -Method Get -UseBasicParsing
    $data = $r.Content | ConvertFrom-Json
    if ($data.Count -eq 0) { Write-Host "  VAZIO" -ForegroundColor Red }
    else {
        foreach ($row in $data) {
            Write-Host "  $($row.ativo) | strat=$($row.estrategia) | WR=$($row.win_rate) | N=$($row.n_amostral) | status=$($row.status)" -ForegroundColor Green
        }
    }
}
catch {
    Write-Host "  ERRO: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== FIM ===" -ForegroundColor Cyan
