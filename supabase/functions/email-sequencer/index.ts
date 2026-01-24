import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const resend = new Resend(RESEND_API_KEY)
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

const CHECKOUT_URL = 'https://appmillionbots.com/quieroserpro'
const APP_URL = 'https://appmillionbots.com'

Deno.serve(async (req) => {
    if (!RESEND_API_KEY) {
        return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500 })
    }

    try {
        // 1. Get all free users
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, created_at, email_history, plan_type, trial_ends_at')
            .eq('plan_type', 'free')

        if (error) throw error

        const results = []
        const now = new Date()

        for (const user of users) {
            const emailHistory = user.email_history || []
            const createdAt = new Date(user.created_at)

            // Default to 3 days trial if not set
            const trialEndsAt = user.trial_ends_at
                ? new Date(user.trial_ends_at)
                : new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000)

            const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
            const hoursUntilTrialEnds = (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60)

            // LOGIC 1: Welcome (Immediate - < 24h)
            if (hoursSinceCreation < 24 && !emailHistory.includes('welcome_sent')) {
                await sendWelcomeEmail(user)
                results.push({ userId: user.id, type: 'welcome_sent' })
                continue
            }

            // LOGIC 2: Warning (24h left)
            if (hoursUntilTrialEnds > 0 && hoursUntilTrialEnds <= 24 && !emailHistory.includes('warning_sent')) {
                await sendWarningEmail(user)
                results.push({ userId: user.id, type: 'warning_sent' })
                continue
            }

            // LOGIC 3: Expired (Expired)
            if (hoursUntilTrialEnds <= 0 && !emailHistory.includes('expired_sent')) {
                await sendExpiredEmail(user)
                results.push({ userId: user.id, type: 'expired_sent' })
                continue
            }
        }

        return new Response(
            JSON.stringify({ success: true, processed: results.length, details: results }),
            { headers: { 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})

// --- SENDING FUNCTIONS ---

async function sendWelcomeEmail(user: any) {
    const { error } = await resend.emails.send({
        from: 'Million Bots <noreply@appmillionbots.com>',
        to: [user.email],
        subject: '🚀 Bienvenido al Million Bots: Tu acceso está listo',
        html: getWelcomeTemplate(user.full_name || 'Trader')
    })

    if (!error) {
        await updateEmailHistory(user.id, user.email_history, 'welcome_sent')
    } else {
        console.error('Error sending welcome:', error)
    }
}

async function sendWarningEmail(user: any) {
    const { error } = await resend.emails.send({
        from: 'Million Bots <noreply@appmillionbots.com>',
        to: [user.email],
        subject: '⏳ Tu prueba gratuita termina en 24 horas',
        html: getWarningTemplate(user.full_name || 'Trader')
    })

    if (!error) {
        await updateEmailHistory(user.id, user.email_history, 'warning_sent')
    } else {
        console.error('Error sending warning:', error)
    }
}

async function sendExpiredEmail(user: any) {
    const { error } = await resend.emails.send({
        from: 'Million Bots <noreply@appmillionbots.com>',
        to: [user.email],
        subject: '🔒 Acceso Pausado: Recupera tus Bots',
        html: getExpiredTemplate(user.full_name || 'Trader')
    })

    if (!error) {
        await updateEmailHistory(user.id, user.email_history, 'expired_sent')
    } else {
        console.error('Error sending expired:', error)
    }
}

async function updateEmailHistory(userId: string, currentHistory: any[], event: string) {
    const newHistory = [...(currentHistory || []), event]
    await supabase.from('profiles').update({ email_history: newHistory }).eq('id', userId)
}

// --- HTML TEMPLATES ---

function getWelcomeTemplate(userName: string) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acceso Liberado</title>
</head>
<body style="margin: 0; padding: 0; background-color: #020617; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #e2e8f0; line-height: 1.6;">
  
  <!-- Container Principal -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #020617;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        
        <!-- Card do E-mail -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #1e293b; text-align: center;">
              <h1 style="margin: 0; color: #22d3ee; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">MILLION BOTS</h1>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">Trading Intelligence Suite</p>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin-bottom: 20px; font-size: 16px;">Bienvenido a la Resistencia, <strong>${userName}</strong>.</p>
              
              <p style="margin-bottom: 20px; font-size: 16px;">
                Voy a ser directo. No te acabas de registrar en "otro robot de trading". La mayoría de la gente entra al mercado a apostar. 
                <span style="color: #4ade80; font-weight: bold;">Tú acabas de acceder a una herramienta diseñada para explotar una falla de latencia.</span>
              </p>

              <div style="background-color: #1e293b; padding: 20px; border-left: 4px solid #22d3ee; border-radius: 4px; margin-bottom: 25px;">
                <p style="margin: 0; font-size: 15px; color: #fff;">
                  ⚙️ <strong>Lo que tienes en tus manos es el Bug Deriv.</strong><br><br>
                  Este algoritmo no adivina. Él detecta un retraso microscópico (aprox. 200ms) entre la explosión del precio y la actualización de la barrera. Es en esa fracción de segundo donde nosotros operamos.
                </p>
              </div>

              <p style="margin-bottom: 20px; font-size: 16px;">
                Tu cuenta actual es <strong>Free</strong>, pero la tecnología que corre por debajo es <em>Elite</em>. Estás conectado a nuestros servidores de Alta Frecuencia, protegidos por el sistema <strong>Quant Shield</strong>.
              </p>

              <p style="margin-bottom: 25px; font-size: 16px; color: #f87171; font-weight: bold;">
                ⚠️ PERO NADA DE ESTO FUNCIONA SI NO HACES ESTO AHORA:
              </p>

              <p style="margin-bottom: 30px; font-size: 16px;">
                El algoritmo necesita una "llave" para comunicarse con tu cuenta. Sin el <strong>Token de API</strong>, el sistema es un Ferrari sin gasolina.
              </p>

              <ol style="margin-bottom: 30px; padding-left: 20px; color: #cbd5e1;">
                <li style="margin-bottom: 10px;">Entra al <strong>Centro de Comando</strong>.</li>
                <li style="margin-bottom: 10px;">Ve a la sección <strong>"Conectar con Deriv"</strong>.</li>
                <li style="margin-bottom: 10px;">Sigue el tutorial de 1 minuto y pega tu Token.</li>
              </ol>

              <!-- Botão CTA -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}" style="display: inline-block; padding: 16px 32px; background-color: #22d3ee; color: #0f172a; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 8px; transition: all 0.3s ease;">
                      👉 ACCEDER AL CENTRO DE COMANDO
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin-top: 30px; font-size: 14px; text-align: center; color: #94a3b8;">
                No dejes la herramienta inactiva. El mercado está abierto y la latencia está a nuestro favor en este momento.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #020617; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; font-size: 14px; font-weight: bold; color: #e2e8f0;">Miguel | CEO Million Bots</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">Trading Intelligence • High Frequency • Quant</p>
              <p style="margin-top: 20px; font-size: 10px; color: #475569;">
                Si ya no deseas recibir inteligencia de mercado, puedes <a href="#" style="color: #64748b; text-decoration: underline;">darte de baja</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}

function getWarningTemplate(userName: string) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificación Final</title>
</head>
<body style="margin: 0; padding: 0; background-color: #020617; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #e2e8f0; line-height: 1.6;">
  
  <!-- Container Principal -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #020617;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        
        <!-- Card do E-mail -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0f172a; border-radius: 12px; border: 1px solid #7f1d1d; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(220, 38, 38, 0.2);">
          
          <!-- Header (Tema Alerta/Vermelho) -->
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #7f1d1d; text-align: center; background-color: #450a0a;">
              <h1 style="margin: 0; color: #f87171; font-size: 24px; letter-spacing: 1px; text-transform: uppercase;">⚠️ NOTIFICACIÓN FINAL</h1>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #fca5a5; text-transform: uppercase; letter-spacing: 1px;">Downgrade Automático en 24h</p>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin-bottom: 20px; font-size: 16px;">Hola, <strong>${userName}</strong>.</p>
              
              <p style="margin-bottom: 20px; font-size: 16px;">
                Te escribo para avisarte que el "Modo Invitado" se cierra mañana.
              </p>

              <p style="margin-bottom: 25px; font-size: 16px;">
                Has tenido en tus manos el <strong>Efecto Midas</strong> y el <strong>Bug Deriv</strong>. Has visto la precisión del <em>Quant Shield</em>. Pero a menos que actúes hoy, tu cuenta sufrirá un <strong>Downgrade Automático</strong>.
              </p>

              <!-- Box de Perda -->
              <div style="background-color: #1e293b; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ef4444;">
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">
                  LO QUE SUCEDERÁ MAÑANA:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #cbd5e1;">
                  <li style="margin-bottom: 10px;">🔒 <strong>Bloqueo de Bots VIP:</strong> El Midas y Vector Flow quedarán inaccesibles (Icono de candado).</li>
                  <li style="margin-bottom: 10px;">📉 <strong>Límite de $5:</strong> La traba de ganancia se mantendrá activa.</li>
                  <li style="margin-bottom: 10px;">🚫 <strong>Cuenta Real:</strong> Seguirá desactivada para retiros.</li>
                </ul>
              </div>

              <p style="margin-bottom: 20px; font-size: 16px;">
                No te voy a presionar con <em>"última oportunidad"</em> falsa.
              </p>

              <p style="margin-bottom: 25px; font-size: 16px;">
                Pero sí te voy a decir la verdad: <strong>El acceso que tienes ahora no volverá a estar disponible en modo gratuito.</strong>
              </p>

              <p style="margin-bottom: 30px; font-size: 16px; border-bottom: 1px dashed #334155; padding-bottom: 20px;">
                Si decides quedarte en FREE, está bien. El Bug Deriv seguirá funcionando (con límites). Pero el Midas, el Sigma, y el Vector Flow se bloquearán permanentemente.
              </p>

              <!-- Botão CTA -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${CHECKOUT_URL}" style="display: inline-block; padding: 16px 32px; background-color: #ef4444; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 8px; transition: all 0.3s ease; box-shadow: 0 0 15px rgba(239, 68, 68, 0.3);">
                      🔓 MANTENER ACCESO COMPLETO
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin-top: 30px; font-size: 14px; text-align: center; color: #94a3b8;">
                La decisión es tuya. Pero hazla consciente.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #020617; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; font-size: 14px; font-weight: bold; color: #e2e8f0;">Miguel | CEO Million Bots</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">Trading Intelligence • High Frequency • Quant</p>
              <p style="margin-top: 20px; font-size: 10px; color: #475569;">
                Si ya no deseas recibir inteligencia de mercado, puedes <a href="#" style="color: #64748b; text-decoration: underline;">darte de baja</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}

function getExpiredTemplate(userName: string) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acceso Pausado</title>
</head>
<body style="margin: 0; padding: 0; background-color: #020617; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #e2e8f0; line-height: 1.6;">
  
  <!-- Container Principal -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #020617;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        
        <!-- Card do E-mail -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0f172a; border-radius: 12px; border: 1px solid #fbbf24; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
          
          <!-- Header (Tema Gold/Paused) -->
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #fbbf24; text-align: center; background-color: #451a03;">
              <h1 style="margin: 0; color: #fbbf24; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">🔒 ACCESO PAUSADO</h1>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #d97706; text-transform: uppercase; letter-spacing: 1px;">Periodo de Prueba Finalizado</p>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin-bottom: 20px; font-size: 16px;">Hola, <strong>${userName}</strong>.</p>
              
              <p style="margin-bottom: 20px; font-size: 16px;">
                Tu periodo de prueba ha finalizado y tus bots premium han sido <strong>pausados temporalmente</strong>.
              </p>

              <div style="background-color: #1e293b; padding: 20px; border-left: 4px solid #fbbf24; border-radius: 4px; margin-bottom: 25px;">
                <p style="margin: 0; font-size: 14px; color: #e2e8f0;">
                  ⚠️ <strong>Estatus Actual: LIMITADO</strong><br><br>
                  Tus herramientas de inteligencia artificial están en espera. La latencia del mercado sigue, pero tu conexión de alta frecuencia ha sido interrumpida.
                </p>
              </div>

              <p style="margin-bottom: 30px; font-size: 16px;">
                Para recuperar el acceso inmediato y eliminar todos los límites, actualiza a <strong>PRO</strong> ahora.
              </p>

              <!-- Botão CTA -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${CHECKOUT_URL}" style="display: inline-block; padding: 16px 32px; background-color: #fbbf24; color: #0f172a; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 8px; transition: all 0.3s ease; box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);">
                      ⚡ RECUPERAR MIS BOTS
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin-top: 30px; font-size: 14px; text-align: center; color: #94a3b8;">
                La tecnología está lista. Solo falta tu decisión.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #020617; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; font-size: 14px; font-weight: bold; color: #e2e8f0;">Miguel | CEO Million Bots</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">Trading Intelligence • High Frequency • Quant</p>
              <p style="margin-top: 20px; font-size: 10px; color: #475569;">
                Si ya no deseas recibir inteligencia de mercado, puedes <a href="#" style="color: #64748b; text-decoration: underline;">darte de baja</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}
