# Test Hotmart Webhook Edge Function Locally
# Certifique-se de que a função está rodando com: supabase functions serve hotmart-webhook

Write-Host "🧪 Testando Hotmart Webhook Edge Function..." -ForegroundColor Cyan
Write-Host ""

# URL local da função
$FUNCTION_URL = "http://localhost:54321/functions/v1/hotmart-webhook"

# Token de teste (deve corresponder ao HOTMART_SECRET no .env.local)
$HOTMART_TOKEN = "seu_token_secreto_hotmart_aqui"

# Email de um usuário existente no seu sistema para teste
$TEST_EMAIL = "teste@example.com"

# ========== TESTE 1: Compra MENSUAL ==========
Write-Host "📦 Teste 1: Compra do Plano Mensual (c1pgsg6o)" -ForegroundColor Yellow

$payload1 = @{
    event = "PURCHASE_APPROVED"
    data = @{
        buyer = @{
            email = $TEST_EMAIL
            name = "João Silva Teste"
        }
        product = @{
            id = "PROD_MENSUAL"
            name = "Million Bots - Mensual"
        }
        purchase = @{
            order_id = "HP123456789"
            status = "approved"
            offer = @{
                code = "c1pgsg6o"
            }
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $response1 = Invoke-RestMethod -Uri $FUNCTION_URL -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "x-hotmart-hottok" = $HOTMART_TOKEN
        } `
        -Body $payload1

    Write-Host "✅ Sucesso!" -ForegroundColor Green
    Write-Host ($response1 | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "❌ Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# ========== TESTE 2: Compra ANUAL ==========
Write-Host "📦 Teste 2: Compra do Plano Anual (zouponhf)" -ForegroundColor Yellow

$payload2 = @{
    event = "PURCHASE_COMPLETE"
    data = @{
        buyer = @{
            email = $TEST_EMAIL
            name = "Maria Santos Teste"
        }
        product = @{
            id = "PROD_ANUAL"
            name = "Million Bots - Pro Anual"
        }
        purchase = @{
            order_id = "HP987654321"
            status = "approved"
            offer = @{
                code = "zouponhf"
            }
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $response2 = Invoke-RestMethod -Uri $FUNCTION_URL -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "x-hotmart-hottok" = $HOTMART_TOKEN
        } `
        -Body $payload2

    Write-Host "✅ Sucesso!" -ForegroundColor Green
    Write-Host ($response2 | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "❌ Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# ========== TESTE 3: Compra VITALICIO ==========
Write-Host "📦 Teste 3: Compra do Plano Vitalicio (5v9syrd5)" -ForegroundColor Yellow

$payload3 = @{
    event = "PURCHASE_APPROVED"
    data = @{
        buyer = @{
            email = $TEST_EMAIL
            name = "Carlos Trader Teste"
        }
        product = @{
            id = "PROD_LIFETIME"
            name = "Million Bots - Vitalicio"
        }
        purchase = @{
            order_id = "HP555444333"
            status = "approved"
            offer = @{
                code = "5v9syrd5"
            }
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $response3 = Invoke-RestMethod -Uri $FUNCTION_URL -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "x-hotmart-hottok" = $HOTMART_TOKEN
        } `
        -Body $payload3

    Write-Host "✅ Sucesso!" -ForegroundColor Green
    Write-Host ($response3 | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "❌ Erro:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# ========== TESTE 4: Token Inválido (deve falhar com 401) ==========
Write-Host "🔒 Teste 4: Token Inválido (deve retornar 401)" -ForegroundColor Yellow

$payload4 = @{
    event = "PURCHASE_APPROVED"
    data = @{
        buyer = @{
            email = $TEST_EMAIL
            name = "Teste Segurança"
        }
        product = @{
            id = "PROD_TEST"
            name = "Test Product"
        }
        purchase = @{
            order_id = "HP000000000"
            status = "approved"
            offer = @{
                code = "c1pgsg6o"
            }
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $response4 = Invoke-RestMethod -Uri $FUNCTION_URL -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "x-hotmart-hottok" = "TOKEN_INVALIDO_123"
        } `
        -Body $payload4

    Write-Host "❌ Falhou! Deveria retornar 401" -ForegroundColor Red
    Write-Host ($response4 | ConvertTo-Json -Depth 5)
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Sucesso! Retornou 401 como esperado" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro inesperado:" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Testes Concluídos!" -ForegroundColor Green
