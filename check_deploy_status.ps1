# Check latest Vercel deployments status
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

Write-Host "=== VERCEL DEPLOYMENT STATUS ===" -ForegroundColor Cyan

# Get latest 5 deployments
try {
    $r = Invoke-WebRequest -Uri "https://api.vercel.com/v6/deployments?projectId=${projectId}&teamId=${teamId}&limit=5" -Headers $headers -Method Get -UseBasicParsing
    $deps = ($r.Content | ConvertFrom-Json).deployments

    foreach ($d in $deps) {
        $created = [DateTimeOffset]::FromUnixTimeMilliseconds($d.createdAt).ToString("yyyy-MM-dd HH:mm:ss")
        $state = $d.readyState
        $color = if ($state -eq "READY") { "Green" } elseif ($state -eq "ERROR") { "Red" } else { "Yellow" }
        Write-Host "`n--- Deploy: $($d.uid) ---" -ForegroundColor $color
        Write-Host "  State:   $state" -ForegroundColor $color
        Write-Host "  URL:     $($d.url)"
        Write-Host "  Created: $created UTC"
        Write-Host "  Target:  $($d.target)"
        Write-Host "  Source:  $($d.meta.githubCommitMessage)"
        Write-Host "  SHA:     $($d.meta.githubCommitSha)"
    }

    # If latest deploy has error, get build logs
    $latest = $deps[0]
    if ($latest.readyState -eq "ERROR" -or $latest.readyState -eq "BUILDING") {
        Write-Host "`n=== BUILD EVENTS for $($latest.uid) ===" -ForegroundColor Yellow
        try {
            $evts = Invoke-WebRequest -Uri "https://api.vercel.com/v2/deployments/$($latest.uid)/events?teamId=${teamId}" -Headers $headers -Method Get -UseBasicParsing
            $events = $evts.Content | ConvertFrom-Json
            # Show last 30 events
            $lastEvents = $events | Select-Object -Last 30
            foreach ($evt in $lastEvents) {
                if ($evt.text) {
                    Write-Host "  $($evt.text)"
                }
            }
        }
        catch {
            Write-Host "  Could not fetch events: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}
catch {
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())" -ForegroundColor Yellow
    }
}
