# 🔐 Sistema de Saldo Pendiente - Guía de Liberación

## Resumen del Sistema de Seguridad

El sistema ahora usa un **saldo pendiente (pending_balance)** para proteger contra reembolsos:

| Evento | Saldo Pendiente | Saldo Disponible |
|--------|-----------------|------------------|
| Nueva venta | **+$18** (60%) | $0 |
| Después de 20 días | -$18 | **+$18** |
| Cliente puede retirar | ❌ Bloqueado | ✅ Disponible |

---

## 🔄 Cómo Liberar Comisiones Manualmente

### Opción 1: SQL Editor (Supabase Dashboard)

1. Accede al dashboard de Supabase: https://supabase.com/dashboard/project/xwclmxjeombwabfdvyij/editor
2. Abre el **SQL Editor**
3. Ejecuta:

```sql
SELECT release_pending_commissions();
```

4. Verifica el resultado en los logs

**Resultado esperado:**
- Comisiones con más de 20 días se mueven de `pending_balance` → `affiliate_balance`
- Transacciones se marcan como `'available'` en lugar de `'pending'`

---

### Opción 2: Script Node.js

Crea un archivo `release_commissions.js`:

```javascript
import postgres from 'postgres'

const sql = postgres('postgresql://postgres:[PASSWORD]@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres', {
  ssl: { rejectUnauthorized: false }
})

async function run() {
  console.log('🔄 Liberando comisiones pendientes...')
  
  await sql`SELECT release_pending_commissions();`
  
  console.log('✅ Comisiones liberadas!')
  await sql.end()
}

run()
```

**Ejecutar:** `node release_commissions.js`

---

## ⏰ Configurar Cron Job (Ejecutar Diariamente)

### En Supabase (Recomendado - Próximamente)

Supabase agregará soporte para Edge Cron en 2024. Mientras tanto, usa una de estas opciones:

### GitHub Actions (Gratis)

Crea `.github/workflows/release-commissions.yml`:

```yaml
name: Release Pending Commissions

on:
  schedule:
    - cron: '0 3 * * *'  # Todos los días a las 3 AM UTC

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Run release function
        run: |
          curl -X POST \
          https://xwclmxjeombwabfdvyij.supabase.co/rest/v1/rpc/release_pending_commissions \
          -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}" \
          -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

**Configurar Secrets:**
- `SUPABASE_ANON_KEY`: Tu anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Tu service role key

### Vercel Cron (Si usas Vercel)

Crea `api/cron/release.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Verificar header de autorización de Vercel
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase.rpc('release_pending_commissions')
  
  return res.json({ success: true })
}
```

En `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/release",
    "schedule": "0 3 * * *"
  }]
}
```

---

## 📊 Verificar Liberaciones

### Ver transacciones pendientes:

```sql
SELECT 
  t.id,
  p.email as affiliate_email,
  t.amount,
  t.created_at,
  NOW() - t.created_at as days_pending,
  t.status
FROM referral_transactions t
JOIN profiles p ON t.user_id = p.id
WHERE t.status = 'pending'
ORDER BY t.created_at DESC;
```

### Ver saldos de afiliados:

```sql
SELECT 
  email,
  pending_balance,
  affiliate_balance,
  total_earnings
FROM profiles
WHERE pending_balance > 0 OR affiliate_balance > 0
ORDER BY total_earnings DESC;
```

---

## 🛡️ Seguridad del Sistema

**Por qué 20 días?**
- Hotmart permite reembolsos dentro de 7-30 días
- 20 días es un balance entre seguridad y liquidez
- Si hay reembolso, el dinero nunca salió de pending

**Flujo completo:**

```mermaid
graph TD
    A[Cliente compra $30] --> B[Webhook recibe]
    B --> C[+$18 a pending_balance]
    C --> D{Han pasado 20 días?}
    D -->|No| E[Sigue bloqueado]
    D -->|Sí| F[Release function]
    F --> G[pending_balance - $18]
    F --> H[affiliate_balance + $18]
    H --> I[Afiliado puede retirar]
```

---

## ⚙️ Configuración Aplicada

### Base de Datos
- ✅ Columna `pending_balance` agregada a `profiles`
- ✅ Función `release_pending_commissions()` creada
- ✅ Constraint de 20 días configurado

### Webhook Hotmart
- ✅ Actualizado para usar `pending_balance`
- ✅ Logs mejorados con "bloqueado por 20 días"

### Frontend
- ✅ Dashboard muestra saldo pendiente separado
- ✅ Advertencia en español explicando el bloqueo
- ✅ Solo `affiliate_balance` permite retiro

---

## 🚨 Casos Especiales

### Reembolso después de liberar

Si un cliente solicita reembolso DESPUÉS de 20 días (poco común):
1. El afiliado ya recibió el dinero
2. Tendrás que recuperarlo manualmente o absorber la pérdida
3. **Solución:** Revisar transacciones de alto valor antes de liberar

### Liberar manualmente una transacción específica

```sql
-- Mover de pending a available para un usuario específico
UPDATE profiles
SET 
  affiliate_balance = affiliate_balance + 18.00,
  pending_balance = pending_balance - 18.00
WHERE id = 'uuid-del-afiliado';

-- Marcar la transacción como liberada
UPDATE referral_transactions
SET status = 'available'
WHERE id = 'uuid-de-la-transaccion';
```

---

## 📅 Recomendación de Operación

**Ejecutar liberación:**
- **Frecuencia:** Diariamente a las 3 AM
- **Método:** GitHub Actions (gratis) o Vercel Cron
- **Monitoreo:** Revisar logs semanalmente

**Dashboard manual:**
- Revisar pendientes cada semana
- Identificar patrones de reembolso
- Ajustar período si es necesario (de 20 a 15 o 30 días)

---

## 📞 Soporte

**Logs del webhook:**
https://supabase.com/dashboard/project/xwclmxjeombwabfdvyij/functions/<parameter name="Complexity">3
